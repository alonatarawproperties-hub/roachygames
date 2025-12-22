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
import { rateLimit, logSecurityEvent } from "./security";
import { makeStockfishMove, BOT_DIFFICULTIES, BotDifficulty } from "./stockfish-engine";

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
  
  // Fast move ordering - captures and promotions only (no expensive check detection)
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
    
    // Center pawn moves in opening
    if (a.piece === 'p' && (a.to === 'e4' || a.to === 'd4' || a.to === 'e5' || a.to === 'd5')) scoreA += 50;
    if (b.piece === 'p' && (b.to === 'e4' || b.to === 'd4' || b.to === 'e5' || b.to === 'd5')) scoreB += 50;
    
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

function makeBotMove(game: Chess): { move: string; thinkTimeMs: number } | null {
  const startTime = Date.now();
  const MAX_THINK_TIME_MS = 3000; // Max 3 seconds per move
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;
  
  const isBlack = game.turn() === 'b';
  const orderedMoves = orderMoves(game);
  
  let bestMove = orderedMoves[0];
  let bestEval = isBlack ? Infinity : -Infinity;
  
  // Iterative deepening with time limit - stops when time runs out
  for (let depth = 1; depth <= 5; depth++) {
    const depthStartTime = Date.now();
    let depthBestMove = orderedMoves[0];
    let depthBestEval = isBlack ? Infinity : -Infinity;
    let completedDepth = true;
    
    for (const move of orderedMoves) {
      // Check time limit before each move evaluation
      if (Date.now() - startTime > MAX_THINK_TIME_MS) {
        completedDepth = false;
        break;
      }
      
      game.move(move);
      const evaluation = minimax(game, depth - 1, -Infinity, Infinity, !isBlack);
      game.undo();
      
      if (isBlack) {
        if (evaluation < depthBestEval) {
          depthBestEval = evaluation;
          depthBestMove = move;
        }
      } else {
        if (evaluation > depthBestEval) {
          depthBestEval = evaluation;
          depthBestMove = move;
        }
      }
    }
    
    // Only update best move if we completed this depth
    if (completedDepth) {
      bestMove = depthBestMove;
      bestEval = depthBestEval;
    }
    
    // Stop if we're out of time
    if (Date.now() - startTime > MAX_THINK_TIME_MS) {
      console.log(`[Bot GM] Time limit reached at depth ${depth}`);
      break;
    }
  }
  
  const thinkTimeMs = Date.now() - startTime;
  // Minimum 2-3 seconds to feel like thinking
  const humanizedThinkTime = Math.max(thinkTimeMs, 2000 + Math.random() * 1000);
  
  console.log(`[Bot GM] Selected move: ${bestMove.san} (eval: ${bestEval}, think: ${thinkTimeMs}ms)`);
  return { 
    move: bestMove.from + bestMove.to + (bestMove.promotion || ''),
    thinkTimeMs: humanizedThinkTime
  };
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
          botDifficulty: 'magnus',
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
      
      const match = matches[0];
      
      // Check for timeout if game is still active
      if (match.status === 'active' && match.startedAt) {
        const now = Date.now();
        const matchStart = new Date(match.startedAt).getTime();
        const moveHistory = match.moveHistory || '';
        const moves = moveHistory ? moveHistory.split(',') : [];
        
        // Calculate elapsed time since last move/turn change
        // For simplicity, check if current player's time has run out
        const isWhiteTurn = match.currentTurn === 'white';
        const currentPlayerTime = isWhiteTurn ? match.player1TimeRemaining : match.player2TimeRemaining;
        
        // If the current player's time is 0 or less, they lose on time
        if (currentPlayerTime <= 0) {
          const winner = isWhiteTurn ? match.player2Wallet : match.player1Wallet;
          
          await db.update(chessMatches)
            .set({
              status: 'completed',
              winnerWallet: winner,
              winReason: 'timeout',
              endedAt: new Date(),
              player1TimeRemaining: Math.max(0, match.player1TimeRemaining),
              player2TimeRemaining: Math.max(0, match.player2TimeRemaining),
            })
            .where(eq(chessMatches.id, matchId));
          
          const updatedMatches = await db.select().from(chessMatches).where(eq(chessMatches.id, matchId)).limit(1);
          return res.json({ success: true, match: updatedMatches[0] });
        }
      }
      
      res.json({ success: true, match });
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
      
      // Check if it's the bot's turn to move
      // Bot can be player1 (white) or player2 (black) - check wallet prefix
      const player1IsBot = match.player1Wallet?.startsWith('BOT_') ?? false;
      const player2IsBot = match.player2Wallet?.startsWith('BOT_') ?? false;
      const botIsWhite = player1IsBot;
      const botIsBlack = player2IsBot || (match.isAgainstBot && !player1IsBot);
      
      const shouldBotMove = !gameOver && match.isAgainstBot && (
        (botIsBlack && newTurn === 'black') || 
        (botIsWhite && newTurn === 'white')
      );
      
      if (shouldBotMove) {
        const botDifficulty = (match.botDifficulty as BotDifficulty) || 'magnus';
        const botResult = await makeStockfishMove(game.fen(), botDifficulty);
        if (botResult) {
          const botMoveUci = botResult.move;
          const botFrom = botMoveUci.slice(0, 2);
          const botTo = botMoveUci.slice(2, 4);
          const botPromo = botMoveUci.length > 4 ? botMoveUci[4] : undefined;
          
          const moveResult = game.move({ from: botFrom, to: botTo, promotion: botPromo });
          if (moveResult) {
            botMove = { san: moveResult.san };
            const botNewFen = game.fen();
            const botNewTurn = game.turn() === 'w' ? 'white' : 'black';
            const botMoveHistory = moveHistory + ',' + botMoveUci;
            
            const botThinkSeconds = Math.ceil(botResult.thinkTimeMs / 1000);
            const botPlayerIsP1 = botIsWhite;
            const botNewTimeP1 = botPlayerIsP1 ? Math.max(0, newPlayer1Time - botThinkSeconds) : newPlayer1Time;
            const botNewTimeP2 = !botPlayerIsP1 ? Math.max(0, newPlayer2Time - botThinkSeconds) : newPlayer2Time;
            const botWallet = botPlayerIsP1 ? match.player1Wallet : match.player2Wallet;
            
            if (game.isGameOver()) {
              gameOver = true;
              if (game.isCheckmate()) {
                winner = botWallet ?? undefined;
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
                player1TimeRemaining: botNewTimeP1,
                player2TimeRemaining: botNewTimeP2,
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
      const { walletAddress, gameMode = 'casual', timeControl = 'rapid', difficulty = 'magnus' } = req.body;
      
      const validDifficulties = ['rookie', 'club', 'expert', 'magnus'];
      const botDifficulty = validDifficulties.includes(difficulty) ? difficulty : 'magnus';
      
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
        botDifficulty,
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
