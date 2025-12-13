import type { Express, Request, Response } from "express";
import { db } from "./db";
import {
  chessRatings,
  chessMatches,
  chessMatchmakingQueue,
  TIME_CONTROL_SECONDS,
  ChessTimeControl,
} from "@shared/schema";
import { eq, and, sql, desc, ne, lte, gte } from "drizzle-orm";
import { Chess } from "chess.js";

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const MATCHMAKING_TIMEOUT_MS = 30000;
const RATING_RANGE = 200;

async function getOrCreateRating(walletAddress: string) {
  const existing = await db.select().from(chessRatings).where(eq(chessRatings.walletAddress, walletAddress)).limit(1);
  if (existing.length > 0) return existing[0];
  
  const [newRating] = await db.insert(chessRatings).values({
    walletAddress,
    rating: 1200,
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    gamesDraw: 0,
  }).returning();
  return newRating;
}

function calculateNewRatings(winner: number, loser: number, isDraw: boolean = false): { winnerNew: number; loserNew: number } {
  const K = 32;
  const expectedWinner = 1 / (1 + Math.pow(10, (loser - winner) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winner - loser) / 400));
  
  if (isDraw) {
    return {
      winnerNew: Math.round(winner + K * (0.5 - expectedWinner)),
      loserNew: Math.round(loser + K * (0.5 - expectedLoser)),
    };
  }
  
  return {
    winnerNew: Math.round(winner + K * (1 - expectedWinner)),
    loserNew: Math.round(loser + K * (0 - expectedLoser)),
  };
}

// Piece values for evaluation (centipawns)
const PIECE_VALUES: Record<string, number> = {
  p: 100,   // Pawn
  n: 320,   // Knight
  b: 330,   // Bishop
  r: 500,   // Rook
  q: 900,   // Queen
  k: 20000, // King
};

// Piece-square tables for positional evaluation (from black's perspective, flipped for white)
const PAWN_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5,  5, 10, 25, 25, 10,  5,  5,
  0,  0,  0, 20, 20,  0,  0,  0,
  5, -5,-10,  0,  0,-10, -5,  5,
  5, 10, 10,-20,-20, 10, 10,  5,
  0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_TABLE = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50
];

const BISHOP_TABLE = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20
];

const ROOK_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  0,  0,  0,  5,  5,  0,  0,  0
];

const QUEEN_TABLE = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
  -5,  0,  5,  5,  5,  5,  0, -5,
  0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20
];

const KING_MIDDLE_TABLE = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
  20, 20,  0,  0,  0,  0, 20, 20,
  20, 30, 10,  0,  0, 10, 30, 20
];

const KING_END_TABLE = [
  -50,-40,-30,-20,-20,-30,-40,-50,
  -30,-20,-10,  0,  0,-10,-20,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-30,  0,  0,  0,  0,-30,-30,
  -50,-30,-30,-30,-30,-30,-30,-50
];

function getPieceSquareValue(pieceType: string, pieceColor: 'w' | 'b', square: string, isEndgame: boolean): number {
  const file = square.charCodeAt(0) - 97; // a=0, h=7
  const rank = parseInt(square[1]) - 1;   // 1=0, 8=7
  const isWhite = pieceColor === 'w';
  
  // For white, we need to flip the table (rank 0 becomes rank 7)
  const index = isWhite ? ((7 - rank) * 8 + file) : (rank * 8 + file);
  
  let table: number[];
  switch (pieceType) {
    case 'p': table = PAWN_TABLE; break;
    case 'n': table = KNIGHT_TABLE; break;
    case 'b': table = BISHOP_TABLE; break;
    case 'r': table = ROOK_TABLE; break;
    case 'q': table = QUEEN_TABLE; break;
    case 'k': table = isEndgame ? KING_END_TABLE : KING_MIDDLE_TABLE; break;
    default: return 0;
  }
  
  return table[index] || 0;
}

function isEndgame(game: Chess): boolean {
  const fen = game.fen();
  const board = fen.split(' ')[0];
  let queens = 0;
  let minorPieces = 0;
  
  for (const char of board) {
    if (char === 'q' || char === 'Q') queens++;
    if (char === 'n' || char === 'N' || char === 'b' || char === 'B') minorPieces++;
  }
  
  // Endgame if no queens, or if queens exist but very few pieces
  return queens === 0 || (queens <= 2 && minorPieces <= 2);
}

function evaluatePosition(game: Chess): number {
  if (game.isCheckmate()) {
    return game.turn() === 'w' ? -100000 : 100000;
  }
  if (game.isDraw()) return 0;
  
  const endgame = isEndgame(game);
  let score = 0;
  
  const board = game.board();
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece) {
        const pieceValue = PIECE_VALUES[piece.type] || 0;
        const square = String.fromCharCode(97 + file) + (8 - rank);
        const posValue = getPieceSquareValue(piece.type, piece.color, square, endgame);
        
        if (piece.color === 'w') {
          score += pieceValue + posValue;
        } else {
          score -= pieceValue + posValue;
        }
      }
    }
  }
  
  // Mobility bonus
  const currentMoves = game.moves().length;
  const mobilityBonus = currentMoves * 2;
  score += game.turn() === 'w' ? mobilityBonus : -mobilityBonus;
  
  // Check bonus
  if (game.inCheck()) {
    score += game.turn() === 'w' ? -30 : 30;
  }
  
  return score;
}

function orderMoves(game: Chess) {
  const moves = game.moves({ verbose: true });
  
  // Score moves for ordering (captures, checks, promotions first)
  return moves.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;
    
    // Captures with MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
    if (a.captured) {
      scoreA += 10 * (PIECE_VALUES[a.captured] || 0) - (PIECE_VALUES[a.piece] || 0);
    }
    if (b.captured) {
      scoreB += 10 * (PIECE_VALUES[b.captured] || 0) - (PIECE_VALUES[b.piece] || 0);
    }
    
    // Promotions
    if (a.promotion) scoreA += PIECE_VALUES[a.promotion] || 0;
    if (b.promotion) scoreB += PIECE_VALUES[b.promotion] || 0;
    
    // Check if move gives check
    const testA = new Chess(game.fen());
    testA.move(a);
    if (testA.inCheck()) scoreA += 500;
    
    const testB = new Chess(game.fen());
    testB.move(b);
    if (testB.inCheck()) scoreB += 500;
    
    return scoreB - scoreA;
  });
}

function minimax(game: Chess, depth: number, alpha: number, beta: number, isMaximizing: boolean): number {
  if (depth === 0 || game.isGameOver()) {
    return evaluatePosition(game);
  }
  
  const moves = orderMoves(game);
  
  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      game.move(move);
      const evaluation = minimax(game, depth - 1, alpha, beta, false);
      game.undo();
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break; // Beta cutoff
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      game.move(move);
      const evaluation = minimax(game, depth - 1, alpha, beta, true);
      game.undo();
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break; // Alpha cutoff
    }
    return minEval;
  }
}

function makeBotMove(game: Chess): string | null {
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;
  
  // Magnus-level: Deep search with alpha-beta pruning
  // Depth 5-6 is very strong, comparable to grandmaster play
  const SEARCH_DEPTH = 5;
  const isBlack = game.turn() === 'b';
  
  let bestMove = moves[0];
  let bestEval = isBlack ? Infinity : -Infinity;
  
  const orderedMoves = orderMoves(game);
  
  for (const move of orderedMoves) {
    game.move(move);
    const evaluation = minimax(game, SEARCH_DEPTH - 1, -Infinity, Infinity, !isBlack);
    game.undo();
    
    if (isBlack) {
      if (evaluation < bestEval) {
        bestEval = evaluation;
        bestMove = move;
      }
    } else {
      if (evaluation > bestEval) {
        bestEval = evaluation;
        bestMove = move;
      }
    }
  }
  
  console.log(`[Bot] Selected move: ${bestMove.san} (eval: ${bestEval})`);
  return bestMove.from + bestMove.to + (bestMove.promotion || '');
}

export function registerChessRoutes(app: Express) {
  app.get("/api/chess/rating/:walletAddress", async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      const rating = await getOrCreateRating(walletAddress);
      res.json({ success: true, rating });
    } catch (error) {
      console.error("Error fetching chess rating:", error);
      res.status(500).json({ success: false, error: "Failed to fetch rating" });
    }
  });

  app.post("/api/chess/matchmaking/join", async (req: Request, res: Response) => {
    try {
      const { walletAddress, gameMode, timeControl, wagerAmount = 0 } = req.body;
      
      if (!walletAddress || !gameMode || !timeControl) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }
      
      const rating = await getOrCreateRating(walletAddress);
      
      await db.delete(chessMatchmakingQueue).where(eq(chessMatchmakingQueue.walletAddress, walletAddress));
      
      await db.insert(chessMatchmakingQueue).values({
        walletAddress,
        gameMode,
        timeControl,
        wagerAmount: wagerAmount || 0,
        rating: rating.rating,
      });
      
      const potentialMatches = await db.select()
        .from(chessMatchmakingQueue)
        .where(
          and(
            eq(chessMatchmakingQueue.gameMode, gameMode),
            eq(chessMatchmakingQueue.timeControl, timeControl),
            eq(chessMatchmakingQueue.wagerAmount, wagerAmount || 0),
            ne(chessMatchmakingQueue.walletAddress, walletAddress),
            gte(chessMatchmakingQueue.rating, rating.rating - RATING_RANGE),
            lte(chessMatchmakingQueue.rating, rating.rating + RATING_RANGE)
          )
        )
        .orderBy(chessMatchmakingQueue.joinedAt)
        .limit(1);
      
      if (potentialMatches.length > 0) {
        const opponent = potentialMatches[0];
        const timeSeconds = TIME_CONTROL_SECONDS[timeControl as ChessTimeControl] || 600;
        
        const player1IsWhite = Math.random() < 0.5;
        const [match] = await db.insert(chessMatches).values({
          player1Wallet: player1IsWhite ? walletAddress : opponent.walletAddress,
          player2Wallet: player1IsWhite ? opponent.walletAddress : walletAddress,
          gameMode,
          timeControl,
          status: 'active',
          fen: STARTING_FEN,
          currentTurn: 'white',
          player1TimeRemaining: timeSeconds,
          player2TimeRemaining: timeSeconds,
          wagerAmount: wagerAmount || 0,
          startedAt: new Date(),
        }).returning();
        
        await db.delete(chessMatchmakingQueue).where(eq(chessMatchmakingQueue.walletAddress, walletAddress));
        await db.delete(chessMatchmakingQueue).where(eq(chessMatchmakingQueue.walletAddress, opponent.walletAddress));
        
        return res.json({ success: true, matchFound: true, match });
      }
      
      res.json({ success: true, matchFound: false });
    } catch (error) {
      console.error("Error joining matchmaking:", error);
      res.status(500).json({ success: false, error: "Failed to join matchmaking" });
    }
  });

  app.get("/api/chess/matchmaking/check/:walletAddress", async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      
      const queueEntry = await db.select()
        .from(chessMatchmakingQueue)
        .where(eq(chessMatchmakingQueue.walletAddress, walletAddress))
        .limit(1);
      
      if (queueEntry.length === 0) {
        const activeMatch = await db.select()
          .from(chessMatches)
          .where(
            and(
              eq(chessMatches.status, 'active'),
              sql`(${chessMatches.player1Wallet} = ${walletAddress} OR ${chessMatches.player2Wallet} = ${walletAddress})`
            )
          )
          .orderBy(desc(chessMatches.createdAt))
          .limit(1);
        
        if (activeMatch.length > 0) {
          return res.json({ matchFound: true, match: activeMatch[0] });
        }
        return res.json({ matchFound: false, notInQueue: true });
      }
      
      const entry = queueEntry[0];
      const waitTime = Date.now() - new Date(entry.joinedAt).getTime();
      
      if (waitTime > MATCHMAKING_TIMEOUT_MS && entry.gameMode !== 'wager') {
        const timeSeconds = TIME_CONTROL_SECONDS[entry.timeControl as ChessTimeControl] || 600;
        
        const [match] = await db.insert(chessMatches).values({
          player1Wallet: walletAddress,
          player2Wallet: 'bot',
          gameMode: entry.gameMode,
          timeControl: entry.timeControl,
          status: 'active',
          fen: STARTING_FEN,
          currentTurn: 'white',
          player1TimeRemaining: timeSeconds,
          player2TimeRemaining: timeSeconds,
          wagerAmount: 0,
          isAgainstBot: true,
          startedAt: new Date(),
        }).returning();
        
        await db.delete(chessMatchmakingQueue).where(eq(chessMatchmakingQueue.walletAddress, walletAddress));
        
        return res.json({ matchFound: true, match });
      }
      
      res.json({ matchFound: false, waitTime });
    } catch (error) {
      console.error("Error checking matchmaking:", error);
      res.status(500).json({ success: false, error: "Failed to check matchmaking" });
    }
  });

  app.post("/api/chess/matchmaking/leave", async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.body;
      await db.delete(chessMatchmakingQueue).where(eq(chessMatchmakingQueue.walletAddress, walletAddress));
      res.json({ success: true });
    } catch (error) {
      console.error("Error leaving matchmaking:", error);
      res.status(500).json({ success: false, error: "Failed to leave matchmaking" });
    }
  });

  app.get("/api/chess/match/:matchId", async (req: Request, res: Response) => {
    try {
      const { matchId } = req.params;
      const matches = await db.select().from(chessMatches).where(eq(chessMatches.id, matchId)).limit(1);
      
      if (matches.length === 0) {
        return res.status(404).json({ success: false, error: "Match not found" });
      }
      
      res.json({ success: true, match: matches[0] });
    } catch (error) {
      console.error("Error fetching match:", error);
      res.status(500).json({ success: false, error: "Failed to fetch match" });
    }
  });

  app.post("/api/chess/move", async (req: Request, res: Response) => {
    try {
      const { matchId, walletAddress, moveUci, thinkTimeMs = 0 } = req.body;
      
      const matches = await db.select().from(chessMatches).where(eq(chessMatches.id, matchId)).limit(1);
      if (matches.length === 0) {
        return res.status(404).json({ success: false, error: "Match not found" });
      }
      
      const match = matches[0];
      
      if (match.status !== 'active') {
        return res.status(400).json({ success: false, error: "Match is not active" });
      }
      
      const isPlayer1 = match.player1Wallet === walletAddress;
      const isPlayer2 = match.player2Wallet === walletAddress;
      
      if (!isPlayer1 && !isPlayer2) {
        return res.status(403).json({ success: false, error: "Not a player in this match" });
      }
      
      const isWhiteTurn = match.currentTurn === 'white';
      const playerIsWhite = isPlayer1;
      
      if (isWhiteTurn !== playerIsWhite) {
        return res.status(400).json({ success: false, error: "Not your turn" });
      }
      
      const game = new Chess(match.fen);
      const from = moveUci.slice(0, 2);
      const to = moveUci.slice(2, 4);
      const promotion = moveUci.length > 4 ? moveUci[4] : undefined;
      
      try {
        game.move({ from, to, promotion });
      } catch {
        return res.status(400).json({ success: false, error: "Invalid move" });
      }
      
      const newFen = game.fen();
      const newTurn = game.turn() === 'w' ? 'white' : 'black';
      const moveHistory = match.moveHistory ? match.moveHistory + ',' + moveUci : moveUci;
      
      const timeDeduction = Math.ceil(thinkTimeMs / 1000);
      const newPlayer1Time = isPlayer1 ? Math.max(0, match.player1TimeRemaining - timeDeduction) : match.player1TimeRemaining;
      const newPlayer2Time = isPlayer2 ? Math.max(0, match.player2TimeRemaining - timeDeduction) : match.player2TimeRemaining;
      
      let gameOver = false;
      let winner: string | undefined;
      let reason: string | undefined;
      let botMove: { san: string } | undefined;
      
      if (game.isGameOver()) {
        gameOver = true;
        if (game.isCheckmate()) {
          winner = walletAddress;
          reason = 'checkmate';
        } else if (game.isDraw()) {
          reason = game.isStalemate() ? 'stalemate' : 
                   game.isThreefoldRepetition() ? 'threefold_repetition' : 
                   game.isInsufficientMaterial() ? 'insufficient_material' : 'draw';
        }
      }
      
      await db.update(chessMatches)
        .set({
          fen: newFen,
          currentTurn: newTurn,
          player1TimeRemaining: newPlayer1Time,
          player2TimeRemaining: newPlayer2Time,
          moveHistory,
          ...(gameOver ? {
            status: 'completed',
            winnerWallet: winner,
            winReason: reason,
            endedAt: new Date(),
          } : {}),
        })
        .where(eq(chessMatches.id, matchId));
      
      if (!gameOver && match.isAgainstBot && newTurn === 'black') {
        const botMoveUci = makeBotMove(game);
        if (botMoveUci) {
          const botFrom = botMoveUci.slice(0, 2);
          const botTo = botMoveUci.slice(2, 4);
          const botPromo = botMoveUci.length > 4 ? botMoveUci[4] : undefined;
          
          const moveResult = game.move({ from: botFrom, to: botTo, promotion: botPromo });
          if (moveResult) {
            botMove = { san: moveResult.san };
            const botNewFen = game.fen();
            const botNewTurn = game.turn() === 'w' ? 'white' : 'black';
            const botMoveHistory = moveHistory + ',' + botMoveUci;
            
            if (game.isGameOver()) {
              gameOver = true;
              if (game.isCheckmate()) {
                winner = 'bot';
                reason = 'checkmate';
              } else if (game.isDraw()) {
                reason = 'draw';
              }
            }
            
            await db.update(chessMatches)
              .set({
                fen: botNewFen,
                currentTurn: botNewTurn,
                moveHistory: botMoveHistory,
                ...(gameOver ? {
                  status: 'completed',
                  winnerWallet: winner,
                  winReason: reason,
                  endedAt: new Date(),
                } : {}),
              })
              .where(eq(chessMatches.id, matchId));
          }
        }
      }
      
      const updatedMatches = await db.select().from(chessMatches).where(eq(chessMatches.id, matchId)).limit(1);
      
      res.json({
        success: true,
        match: updatedMatches[0],
        botMove,
        gameOver,
        winner,
        reason,
      });
    } catch (error) {
      console.error("Error processing move:", error);
      res.status(500).json({ success: false, error: "Failed to process move" });
    }
  });

  app.post("/api/chess/end", async (req: Request, res: Response) => {
    try {
      const { matchId, winnerWallet, winReason } = req.body;
      
      await db.update(chessMatches)
        .set({
          status: 'completed',
          winnerWallet,
          winReason,
          endedAt: new Date(),
        })
        .where(eq(chessMatches.id, matchId));
      
      const matches = await db.select().from(chessMatches).where(eq(chessMatches.id, matchId)).limit(1);
      
      if (matches.length > 0 && matches[0].gameMode === 'ranked' && !matches[0].isAgainstBot) {
        const match = matches[0];
        const player1Rating = await getOrCreateRating(match.player1Wallet);
        const player2Rating = match.player2Wallet ? await getOrCreateRating(match.player2Wallet) : null;
        
        if (player2Rating && winnerWallet) {
          const isDraw = winReason === 'draw' || winReason === 'stalemate';
          const { winnerNew, loserNew } = calculateNewRatings(
            winnerWallet === match.player1Wallet ? player1Rating.rating : player2Rating.rating,
            winnerWallet === match.player1Wallet ? player2Rating.rating : player1Rating.rating,
            isDraw
          );
          
          if (winnerWallet === match.player1Wallet) {
            await db.update(chessRatings)
              .set({
                rating: winnerNew,
                gamesPlayed: player1Rating.gamesPlayed + 1,
                gamesWon: isDraw ? player1Rating.gamesWon : player1Rating.gamesWon + 1,
                gamesDraw: isDraw ? player1Rating.gamesDraw + 1 : player1Rating.gamesDraw,
                winStreak: isDraw ? 0 : player1Rating.winStreak + 1,
                bestWinStreak: Math.max(player1Rating.bestWinStreak, isDraw ? 0 : player1Rating.winStreak + 1),
                lastPlayedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(chessRatings.walletAddress, match.player1Wallet));
            
            await db.update(chessRatings)
              .set({
                rating: loserNew,
                gamesPlayed: player2Rating.gamesPlayed + 1,
                gamesLost: isDraw ? player2Rating.gamesLost : player2Rating.gamesLost + 1,
                gamesDraw: isDraw ? player2Rating.gamesDraw + 1 : player2Rating.gamesDraw,
                winStreak: 0,
                lastPlayedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(chessRatings.walletAddress, match.player2Wallet!));
          } else {
            await db.update(chessRatings)
              .set({
                rating: loserNew,
                gamesPlayed: player1Rating.gamesPlayed + 1,
                gamesLost: isDraw ? player1Rating.gamesLost : player1Rating.gamesLost + 1,
                gamesDraw: isDraw ? player1Rating.gamesDraw + 1 : player1Rating.gamesDraw,
                winStreak: 0,
                lastPlayedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(chessRatings.walletAddress, match.player1Wallet));
            
            await db.update(chessRatings)
              .set({
                rating: winnerNew,
                gamesPlayed: player2Rating.gamesPlayed + 1,
                gamesWon: isDraw ? player2Rating.gamesWon : player2Rating.gamesWon + 1,
                gamesDraw: isDraw ? player2Rating.gamesDraw + 1 : player2Rating.gamesDraw,
                winStreak: isDraw ? 0 : player2Rating.winStreak + 1,
                bestWinStreak: Math.max(player2Rating.bestWinStreak, isDraw ? 0 : player2Rating.winStreak + 1),
                lastPlayedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(chessRatings.walletAddress, match.player2Wallet!));
          }
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error ending match:", error);
      res.status(500).json({ success: false, error: "Failed to end match" });
    }
  });

  app.post("/api/chess/demo-match", async (req: Request, res: Response) => {
    try {
      const { walletAddress, gameMode = 'casual', timeControl = 'rapid' } = req.body;
      
      const timeSeconds = TIME_CONTROL_SECONDS[timeControl as ChessTimeControl] || 600;
      
      const [match] = await db.insert(chessMatches).values({
        player1Wallet: walletAddress,
        player2Wallet: 'bot',
        gameMode,
        timeControl,
        status: 'active',
        fen: STARTING_FEN,
        currentTurn: 'white',
        player1TimeRemaining: timeSeconds,
        player2TimeRemaining: timeSeconds,
        wagerAmount: 0,
        isAgainstBot: true,
        startedAt: new Date(),
      }).returning();
      
      res.json({ success: true, match });
    } catch (error) {
      console.error("Error creating demo match:", error);
      res.status(500).json({ success: false, error: "Failed to create demo match" });
    }
  });

  app.get("/api/chess/leaderboard", async (req: Request, res: Response) => {
    try {
      const leaderboard = await db.select()
        .from(chessRatings)
        .orderBy(desc(chessRatings.rating))
        .limit(50);
      
      res.json({ success: true, leaderboard });
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ success: false, error: "Failed to fetch leaderboard" });
    }
  });

  // Get live player counts for games
  app.get("/api/games/player-counts", async (req: Request, res: Response) => {
    try {
      // Count active chess matches (each match has 2 players, but bot matches have 1)
      const [activeMatches] = await db.select({ count: sql<number>`count(*)` })
        .from(chessMatches)
        .where(eq(chessMatches.status, 'active'));
      
      const [botMatches] = await db.select({ count: sql<number>`count(*)` })
        .from(chessMatches)
        .where(and(eq(chessMatches.status, 'active'), eq(chessMatches.isAgainstBot, true)));
      
      // Count players in matchmaking queue
      const [queueCount] = await db.select({ count: sql<number>`count(*)` })
        .from(chessMatchmakingQueue);
      
      const humanMatches = Number(activeMatches?.count || 0) - Number(botMatches?.count || 0);
      const botMatchCount = Number(botMatches?.count || 0);
      const queuePlayers = Number(queueCount?.count || 0);
      
      // Active players = (human matches * 2) + (bot matches * 1) + queue players
      const chessActivePlayers = (humanMatches * 2) + botMatchCount + queuePlayers;
      
      res.json({
        success: true,
        counts: {
          "roachy-mate": chessActivePlayers,
          "roachy-hunt": 0, // Not tracking yet
          "flappy-roach": 0,
          "roachy-battles": 0,
        }
      });
    } catch (error) {
      console.error("Error fetching player counts:", error);
      res.status(500).json({ success: false, error: "Failed to fetch player counts" });
    }
  });
}
