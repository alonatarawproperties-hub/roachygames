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

function makeBotMove(game: Chess): string | null {
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;
  
  const captureMoves = moves.filter(m => m.captured);
  const checkMoves = moves.filter(m => {
    const testGame = new Chess(game.fen());
    testGame.move(m);
    return testGame.inCheck();
  });
  
  let selectedMove;
  if (checkMoves.length > 0 && Math.random() < 0.7) {
    selectedMove = checkMoves[Math.floor(Math.random() * checkMoves.length)];
  } else if (captureMoves.length > 0 && Math.random() < 0.6) {
    selectedMove = captureMoves[Math.floor(Math.random() * captureMoves.length)];
  } else {
    selectedMove = moves[Math.floor(Math.random() * moves.length)];
  }
  
  return selectedMove.from + selectedMove.to + (selectedMove.promotion || '');
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
