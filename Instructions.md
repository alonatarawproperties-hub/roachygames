# Roachy Mate Bug Analysis & Fix Plan

## Problem Statement

The user reports two issues with Roachy Mate (chess game):
1. **Piece Bouncing**: When moving a piece, it visually goes back to original position then bounces to the selected move position
2. **Bot Not Moving**: After the player makes a move, the bot (Stockfish) doesn't respond, but the timer continues counting down

---

## Related Files & Functions

### Client-Side Files

| File | Purpose | Key Functions |
|------|---------|---------------|
| `client/games/chess/ChessBoard.tsx` | Renders chess board, handles piece selection and movement | `handleSquarePress()`, `detectMoveFromFenChange()`, `useEffect` for FEN sync |
| `client/screens/ChessGameScreen.tsx` | Main game screen, handles API calls, timers, game state | `handleMove()`, `moveMutation`, timer intervals |

### Server-Side Files

| File | Purpose | Key Functions |
|------|---------|---------------|
| `server/chess-routes.ts` | API endpoints for chess moves | `POST /api/chess/move` handler, bot move triggering logic |
| `server/stockfish-engine.ts` | Stockfish integration | `makeStockfishMove()`, `getBestMove()` |

---

## Root Cause Analysis

### Issue 1: Piece Bouncing

**Flow Analysis:**

1. User taps a piece, then taps destination square
2. `handleSquarePress()` in ChessBoard.tsx:
   - Calls `game.move()` (updates internal chess.js state)
   - Sets `pendingMoveRef.current = true`
   - Calls `onMove()` callback with new FEN
3. ChessGameScreen's `handleMove()` is called
4. `moveMutation.mutate()` sends move to server
5. `onMutate` immediately sets `setIsMyTurn(false)` (optimistic update)
6. Server responds with updated FEN
7. `setCurrentFen(data.match.fen)` updates the FEN prop
8. ChessBoard's `useEffect` triggers because `fen` changed:

```typescript
useEffect(() => {
  if (pendingMoveRef.current) {
    pendingMoveRef.current = false;
    lastFenRef.current = fen;
    const newGame = new Chess(fen);
    setGame(newGame);
    return; // <-- Returns early, no animation
  }
  
  if (fen !== lastFenRef.current) {
    // This path triggers for external FEN changes (bot moves)
    const detectedMove = detectMoveFromFenChange(lastFenRef.current, fen);
    // ... animation logic
  }
}, [fen, triggerMoveAnimation]);
```

**The Bug:**
- The `pendingMoveRef` is set to `true` when the player makes a move
- But when server returns the same FEN (player's move), the useEffect still runs and creates a new Chess instance
- The visual "bounce" occurs because:
  1. Internal `game` state already has the move applied
  2. The component re-renders with pieces in new positions
  3. FEN prop arrives (same as internal state)
  4. useEffect creates NEW Chess instance, triggering another render
  5. This double-render creates the visual "snap back then forward" effect

**Additionally:**
- The `triggerMoveAnimation()` is called BEFORE the `onMove` callback in `handleSquarePress`
- This means the animation starts, then the FEN update causes a re-render that resets the animation

### Issue 2: Bot Not Moving

**Flow Analysis:**

1. After player's move, server checks if bot should move (line 633-636 in chess-routes.ts):
```typescript
const shouldBotMove = !gameOver && match.isAgainstBot && (
  (botIsBlack && newTurn === 'black') || 
  (botIsWhite && newTurn === 'white')
);
```

2. If `shouldBotMove` is true, it calls `makeStockfishMove()`
3. Stockfish calculates move and returns it
4. Server applies bot's move and updates database

**The Bug:**
- Looking at the determination of `botIsBlack`:
```typescript
const player1IsBot = match.player1Wallet?.startsWith('BOT_') ?? false;
const player2IsBot = match.player2Wallet?.startsWith('BOT_') ?? false;
const botIsWhite = player1IsBot;
const botIsBlack = player2IsBot || (match.isAgainstBot && !player1IsBot);
```

- When matched against bot, `player2Wallet` is set to `'bot'` (lowercase), NOT `'BOT_'`
- So `player2IsBot` is `false` because `'bot'.startsWith('BOT_')` is `false`
- The `botIsBlack` becomes `false || (true && true)` = `true` ✓ (This is correct)

**The Real Issue:**
- After bot makes its move, the server updates the database BUT...
- Looking at lines 638-706, the bot move updates are applied to the database
- The response to the client includes `data.match` from the FIRST database update (line 610-624)
- The bot's move is applied AFTER the response is sent back!

```typescript
// Lines 610-624: First update (player move)
await db.update(chessMatches)
  .set({ fen: newFen, currentTurn: newTurn, ... })
  .where(eq(chessMatches.id, matchId));

// Lines 638-706: Bot move calculation and second update
if (shouldBotMove) {
  const botResult = await makeStockfishMove(game.fen(), botDifficulty);
  // ... updates database again with bot's move
}
```

Wait - actually looking more carefully, the server DOES send bot move info back:

```typescript
// Line 702-710
const updatedMatches = await db.select()
  .from(chessMatches)
  .where(eq(chessMatches.id, matchId))
  .limit(1);

res.json({
  success: true,
  match: updatedMatches[0],
  gameOver,
  winner,
  reason,
});
```

The issue is the sequence:
1. Player makes move → DB updated with player's move
2. Bot should move → calls `makeStockfishMove()` 
3. **Stockfish might fail or take too long**
4. If Stockfish returns null, no bot move is applied

**Checking Stockfish:**
- `sendCommandWait()` has a 10-second timeout
- If response doesn't include "bestmove", returns `null`
- If `bestMoveMatch` is null, `makeStockfishMove` returns `null`

**The likely cause:**
- Stockfish engine process might have crashed or not initialized
- The `isReady` flag could be stale
- Network/process communication issues between Node.js and Stockfish WASM

---

## Fix Plan

### Fix 1: Eliminate Piece Bouncing

**Problem:** Double render causes visual bounce due to game state being set twice.

**Solution:** Modify ChessBoard.tsx to avoid redundant state updates:

```typescript
useEffect(() => {
  // Skip if this is our own move that we already applied
  if (pendingMoveRef.current) {
    pendingMoveRef.current = false;
    lastFenRef.current = fen;
    // DON'T recreate game - our internal state is already correct
    return;
  }
  
  // Only update if FEN actually changed (external change like bot move)
  if (fen !== lastFenRef.current) {
    const detectedMove = detectMoveFromFenChange(lastFenRef.current, fen);
    lastFenRef.current = fen;
    const newGame = new Chess(fen);
    setGame(newGame);
    setSelectedSquare(null);
    setValidMoves([]);
    
    if (detectedMove) {
      setLastMove(detectedMove);
      lastMoveSquareRef.current = detectedMove.to;
      triggerMoveAnimation();
    }
  }
}, [fen, triggerMoveAnimation]);
```

**Key Change:** Remove `setGame(newGame)` from the `pendingMoveRef.current` branch since internal state is already correct.

### Fix 2: Ensure Bot Responds

**Problem:** Stockfish engine may silently fail or not be ready.

**Solutions:**

A. **Add robust error handling and retry logic in stockfish-engine.ts:**

```typescript
async getBestMove(fen: string, difficulty: BotDifficulty, retries = 2): Promise<EngineMove | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (!this.isReady || !this.process) {
        console.log('[Stockfish] Engine not ready, reinitializing...');
        await this.initialize();
      }
      
      // ... existing logic ...
      
      const response = await this.sendCommandWait(`go depth ${minDepth} movetime ${actualThinkTime}`);
      
      if (!response || !response.includes('bestmove')) {
        console.error(`[Stockfish] Invalid response on attempt ${attempt + 1}`);
        if (attempt < retries) {
          this.isReady = false;
          continue;
        }
      }
      
      // ... parse and return move ...
      
    } catch (error) {
      console.error(`[Stockfish] Error on attempt ${attempt + 1}:`, error);
      this.isReady = false;
      if (attempt === retries) throw error;
    }
  }
  return null;
}
```

B. **Add fallback to internal minimax bot in chess-routes.ts:**

```typescript
if (shouldBotMove) {
  let botResult = await makeStockfishMove(game.fen(), botDifficulty);
  
  // Fallback to internal bot if Stockfish fails
  if (!botResult) {
    console.warn('[Chess] Stockfish failed, using fallback bot');
    botResult = makeBotMove(game); // Internal minimax implementation
  }
  
  if (botResult) {
    // ... apply bot move ...
  }
}
```

C. **Add client-side polling/retry for bot moves in ChessGameScreen.tsx:**

The current polling (refetchInterval: 1500ms) should pick up bot moves, but we should ensure the client doesn't think it's still their turn:

```typescript
onSuccess: (data: any) => {
  if (data.match) {
    setCurrentFen(data.match.fen);
    // ... 
    
    // Force recalculate turn from server state
    const isPlayer1 = data.match.player1Wallet === walletAddress;
    const myTurn = (data.match.currentTurn === 'white' && isPlayer1) || 
                   (data.match.currentTurn === 'black' && !isPlayer1);
    setIsMyTurn(myTurn);
  }
}
```

This is already implemented correctly, so the issue is definitely server-side Stockfish.

---

## Implementation Steps

### Step 1: Fix ChessBoard.tsx (Bouncing)

1. Open `client/games/chess/ChessBoard.tsx`
2. Modify the `useEffect` that handles FEN changes (lines 113-136)
3. Remove `setGame(newGame)` from the early return branch

### Step 2: Add Stockfish Resilience (Bot Not Moving)

1. Open `server/stockfish-engine.ts`
2. Add retry logic to `getBestMove()`
3. Add process health check before each move
4. Add automatic reinitialization on failure

### Step 3: Add Fallback Bot (Safety Net)

1. Open `server/chess-routes.ts`
2. Wrap Stockfish call in try-catch
3. Fall back to internal `makeBotMove()` if Stockfish fails

### Step 4: Test & Verify

1. Play a game against bot
2. Verify pieces don't bounce on player moves
3. Verify bot responds within reasonable time
4. Verify timer continues correctly for both players

---

## Feasibility Assessment

| Task | Feasibility | Notes |
|------|-------------|-------|
| Fix bouncing | ✅ High | Simple useEffect modification |
| Stockfish resilience | ✅ High | Add retry/reinit logic |
| Fallback bot | ✅ High | Internal implementation already exists |
| Timer sync | ✅ Already implemented | Polling handles this |

**All proposed fixes are achievable with the current codebase and tools.**

---

## Files to Modify

1. `client/games/chess/ChessBoard.tsx` - Fix bouncing
2. `server/stockfish-engine.ts` - Add resilience
3. `server/chess-routes.ts` - Add fallback

---

## Implementation Status

All fixes have been implemented:

1. **ChessBoard.tsx** - Fixed bouncing by comparing `fen === game.fen()` before skipping state recreation
2. **stockfish-engine.ts** - Added retry logic (2 retries) with automatic reinitialization
3. **chess-routes.ts** - Added fallback to internal `makeBotMove()` when Stockfish fails

## Testing Checklist

- [ ] Move a pawn - no visual bounce
- [ ] Bot responds within 5 seconds
- [ ] Timer counts correctly for active player
- [ ] Bot move appears on board automatically
- [ ] Multiple games work without Stockfish degradation
- [ ] Works on both iOS and Android
