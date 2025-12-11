import type { Express, Request, Response } from "express";
import { db } from "./db";
import {
  chessTournaments,
  chessTournamentParticipants,
  chessTournamentMatches,
  chessMatches,
  chessRatings,
  TIME_CONTROL_SECONDS,
  ChessTimeControl,
} from "@shared/schema";
import { eq, and, sql, desc, asc, gte, lte, or } from "drizzle-orm";

const RAKE_PERCENTAGE = 15;
const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function calculatePrizeDistribution(prizePool: number, playerCount: number): number[] {
  if (playerCount <= 2) return [prizePool];
  if (playerCount <= 4) return [Math.floor(prizePool * 0.7), Math.floor(prizePool * 0.3)];
  if (playerCount <= 8) return [
    Math.floor(prizePool * 0.5),
    Math.floor(prizePool * 0.3),
    Math.floor(prizePool * 0.2),
  ];
  return [
    Math.floor(prizePool * 0.4),
    Math.floor(prizePool * 0.25),
    Math.floor(prizePool * 0.15),
    Math.floor(prizePool * 0.1),
    Math.floor(prizePool * 0.1),
  ];
}

function calculateTotalRounds(playerCount: number): number {
  return Math.ceil(Math.log2(playerCount));
}

async function generateBracket(tournamentId: string, participants: any[]) {
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  const totalRounds = calculateTotalRounds(shuffled.length);
  const bracketSize = Math.pow(2, totalRounds);
  
  for (let i = 0; i < shuffled.length; i++) {
    await db.update(chessTournamentParticipants)
      .set({ seed: i + 1 })
      .where(eq(chessTournamentParticipants.id, shuffled[i].id));
  }
  
  const round1Matches = bracketSize / 2;
  for (let i = 0; i < round1Matches; i++) {
    const player1 = shuffled[i * 2] || null;
    const player2 = shuffled[i * 2 + 1] || null;
    
    await db.insert(chessTournamentMatches).values({
      tournamentId,
      roundNumber: 1,
      matchNumber: i + 1,
      player1Wallet: player1?.walletAddress || null,
      player2Wallet: player2?.walletAddress || null,
      status: player1 && player2 ? 'pending' : (player1 ? 'bye' : 'empty'),
    });
  }
  
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round);
    for (let i = 0; i < matchesInRound; i++) {
      await db.insert(chessTournamentMatches).values({
        tournamentId,
        roundNumber: round,
        matchNumber: i + 1,
        status: 'pending',
      });
    }
  }
  
  await db.update(chessTournaments)
    .set({ totalRounds })
    .where(eq(chessTournaments.id, tournamentId));
}

async function advanceWinner(tournamentId: string, roundNumber: number, matchNumber: number, winnerWallet: string) {
  const tournament = await db.select().from(chessTournaments).where(eq(chessTournaments.id, tournamentId)).limit(1);
  if (tournament.length === 0) return;
  
  const totalRounds = tournament[0].totalRounds;
  
  if (roundNumber >= totalRounds) {
    await db.update(chessTournaments)
      .set({
        status: 'completed',
        winnerWallet,
        endedAt: new Date(),
      })
      .where(eq(chessTournaments.id, tournamentId));
    
    const participants = await db.select()
      .from(chessTournamentParticipants)
      .where(eq(chessTournamentParticipants.tournamentId, tournamentId));
    
    const prizePool = tournament[0].prizePool;
    const prizes = calculatePrizeDistribution(prizePool, participants.length);
    
    const sortedByWins = participants.sort((a, b) => b.wins - a.wins);
    for (let i = 0; i < Math.min(prizes.length, sortedByWins.length); i++) {
      await db.update(chessTournamentParticipants)
        .set({
          finalPlacement: i + 1,
          prizesWon: prizes[i],
        })
        .where(eq(chessTournamentParticipants.id, sortedByWins[i].id));
    }
    
    return;
  }
  
  const nextRound = roundNumber + 1;
  const nextMatchNumber = Math.ceil(matchNumber / 2);
  const isPlayer1 = matchNumber % 2 === 1;
  
  const nextMatch = await db.select()
    .from(chessTournamentMatches)
    .where(
      and(
        eq(chessTournamentMatches.tournamentId, tournamentId),
        eq(chessTournamentMatches.roundNumber, nextRound),
        eq(chessTournamentMatches.matchNumber, nextMatchNumber)
      )
    )
    .limit(1);
  
  if (nextMatch.length > 0) {
    await db.update(chessTournamentMatches)
      .set(isPlayer1 ? { player1Wallet: winnerWallet } : { player2Wallet: winnerWallet })
      .where(eq(chessTournamentMatches.id, nextMatch[0].id));
  }
}

export function registerTournamentRoutes(app: Express) {
  app.get("/api/tournaments", async (req: Request, res: Response) => {
    try {
      const { status, type } = req.query;
      
      let query = db.select().from(chessTournaments);
      
      if (status) {
        query = query.where(eq(chessTournaments.status, status as string)) as any;
      }
      
      if (type) {
        query = query.where(eq(chessTournaments.tournamentType, type as string)) as any;
      }
      
      const tournaments = await query.orderBy(desc(chessTournaments.createdAt)).limit(50);
      
      res.json({ success: true, tournaments });
    } catch (error) {
      console.error("Error fetching tournaments:", error);
      res.status(500).json({ success: false, error: "Failed to fetch tournaments" });
    }
  });

  app.get("/api/tournaments/active", async (req: Request, res: Response) => {
    try {
      const tournaments = await db.select()
        .from(chessTournaments)
        .where(
          or(
            eq(chessTournaments.status, 'registering'),
            eq(chessTournaments.status, 'active'),
            eq(chessTournaments.status, 'scheduled')
          )
        )
        .orderBy(asc(chessTournaments.scheduledStartAt))
        .limit(20);
      
      res.json({ success: true, tournaments });
    } catch (error) {
      console.error("Error fetching active tournaments:", error);
      res.status(500).json({ success: false, error: "Failed to fetch active tournaments" });
    }
  });

  app.get("/api/tournaments/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const tournaments = await db.select()
        .from(chessTournaments)
        .where(eq(chessTournaments.id, id))
        .limit(1);
      
      if (tournaments.length === 0) {
        return res.status(404).json({ success: false, error: "Tournament not found" });
      }
      
      const participants = await db.select()
        .from(chessTournamentParticipants)
        .where(eq(chessTournamentParticipants.tournamentId, id))
        .orderBy(asc(chessTournamentParticipants.seed));
      
      const matches = await db.select()
        .from(chessTournamentMatches)
        .where(eq(chessTournamentMatches.tournamentId, id))
        .orderBy(asc(chessTournamentMatches.roundNumber), asc(chessTournamentMatches.matchNumber));
      
      res.json({
        success: true,
        tournament: tournaments[0],
        participants,
        matches,
      });
    } catch (error) {
      console.error("Error fetching tournament:", error);
      res.status(500).json({ success: false, error: "Failed to fetch tournament" });
    }
  });

  app.post("/api/tournaments/create", async (req: Request, res: Response) => {
    try {
      const {
        name,
        tournamentType = 'sit_and_go',
        timeControl = 'blitz',
        entryFee = 0,
        maxPlayers = 8,
        minPlayers = 2,
        scheduledStartAt,
        registrationEndsAt,
      } = req.body;
      
      if (!name) {
        return res.status(400).json({ success: false, error: "Tournament name required" });
      }
      
      const rakeAmount = Math.floor(entryFee * maxPlayers * RAKE_PERCENTAGE / 100);
      const prizePool = entryFee * maxPlayers - rakeAmount;
      
      const [tournament] = await db.insert(chessTournaments).values({
        name,
        tournamentType,
        timeControl,
        entryFee,
        prizePool,
        rakeAmount,
        maxPlayers,
        minPlayers,
        status: tournamentType === 'sit_and_go' ? 'registering' : 'scheduled',
        scheduledStartAt: scheduledStartAt ? new Date(scheduledStartAt) : null,
        registrationEndsAt: registrationEndsAt ? new Date(registrationEndsAt) : null,
      }).returning();
      
      res.json({ success: true, tournament });
    } catch (error) {
      console.error("Error creating tournament:", error);
      res.status(500).json({ success: false, error: "Failed to create tournament" });
    }
  });

  app.post("/api/tournaments/:id/join", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { walletAddress } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ success: false, error: "Wallet address required" });
      }
      
      const tournaments = await db.select()
        .from(chessTournaments)
        .where(eq(chessTournaments.id, id))
        .limit(1);
      
      if (tournaments.length === 0) {
        return res.status(404).json({ success: false, error: "Tournament not found" });
      }
      
      const tournament = tournaments[0];
      
      if (tournament.status !== 'registering' && tournament.status !== 'scheduled') {
        return res.status(400).json({ success: false, error: "Tournament not accepting registrations" });
      }
      
      if (tournament.currentPlayers >= tournament.maxPlayers) {
        return res.status(400).json({ success: false, error: "Tournament is full" });
      }
      
      const existing = await db.select()
        .from(chessTournamentParticipants)
        .where(
          and(
            eq(chessTournamentParticipants.tournamentId, id),
            eq(chessTournamentParticipants.walletAddress, walletAddress)
          )
        )
        .limit(1);
      
      if (existing.length > 0) {
        return res.status(400).json({ success: false, error: "Already registered" });
      }
      
      await db.insert(chessTournamentParticipants).values({
        tournamentId: id,
        walletAddress,
      });
      
      const newPlayerCount = tournament.currentPlayers + 1;
      
      await db.update(chessTournaments)
        .set({
          currentPlayers: newPlayerCount,
          status: newPlayerCount >= tournament.minPlayers ? 'registering' : tournament.status,
        })
        .where(eq(chessTournaments.id, id));
      
      if (tournament.tournamentType === 'sit_and_go' && newPlayerCount >= tournament.maxPlayers) {
        const participants = await db.select()
          .from(chessTournamentParticipants)
          .where(eq(chessTournamentParticipants.tournamentId, id));
        
        await generateBracket(id, participants);
        
        await db.update(chessTournaments)
          .set({
            status: 'active',
            currentRound: 1,
            startedAt: new Date(),
          })
          .where(eq(chessTournaments.id, id));
      }
      
      const updated = await db.select()
        .from(chessTournaments)
        .where(eq(chessTournaments.id, id))
        .limit(1);
      
      res.json({ success: true, tournament: updated[0] });
    } catch (error) {
      console.error("Error joining tournament:", error);
      res.status(500).json({ success: false, error: "Failed to join tournament" });
    }
  });

  app.post("/api/tournaments/:id/leave", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { walletAddress } = req.body;
      
      const tournaments = await db.select()
        .from(chessTournaments)
        .where(eq(chessTournaments.id, id))
        .limit(1);
      
      if (tournaments.length === 0) {
        return res.status(404).json({ success: false, error: "Tournament not found" });
      }
      
      const tournament = tournaments[0];
      
      if (tournament.status === 'active' || tournament.status === 'completed') {
        return res.status(400).json({ success: false, error: "Cannot leave active/completed tournament" });
      }
      
      await db.delete(chessTournamentParticipants)
        .where(
          and(
            eq(chessTournamentParticipants.tournamentId, id),
            eq(chessTournamentParticipants.walletAddress, walletAddress)
          )
        );
      
      await db.update(chessTournaments)
        .set({ currentPlayers: Math.max(0, tournament.currentPlayers - 1) })
        .where(eq(chessTournaments.id, id));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error leaving tournament:", error);
      res.status(500).json({ success: false, error: "Failed to leave tournament" });
    }
  });

  app.post("/api/tournaments/:id/start", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const tournaments = await db.select()
        .from(chessTournaments)
        .where(eq(chessTournaments.id, id))
        .limit(1);
      
      if (tournaments.length === 0) {
        return res.status(404).json({ success: false, error: "Tournament not found" });
      }
      
      const tournament = tournaments[0];
      
      if (tournament.status === 'active') {
        return res.status(400).json({ success: false, error: "Tournament already started" });
      }
      
      if (tournament.currentPlayers < tournament.minPlayers) {
        return res.status(400).json({ success: false, error: "Not enough players" });
      }
      
      const participants = await db.select()
        .from(chessTournamentParticipants)
        .where(eq(chessTournamentParticipants.tournamentId, id));
      
      await generateBracket(id, participants);
      
      await db.update(chessTournaments)
        .set({
          status: 'active',
          currentRound: 1,
          startedAt: new Date(),
        })
        .where(eq(chessTournaments.id, id));
      
      const updated = await db.select()
        .from(chessTournaments)
        .where(eq(chessTournaments.id, id))
        .limit(1);
      
      res.json({ success: true, tournament: updated[0] });
    } catch (error) {
      console.error("Error starting tournament:", error);
      res.status(500).json({ success: false, error: "Failed to start tournament" });
    }
  });

  app.post("/api/tournaments/match/:matchId/start", async (req: Request, res: Response) => {
    try {
      const { matchId } = req.params;
      
      const tournamentMatches = await db.select()
        .from(chessTournamentMatches)
        .where(eq(chessTournamentMatches.id, matchId))
        .limit(1);
      
      if (tournamentMatches.length === 0) {
        return res.status(404).json({ success: false, error: "Tournament match not found" });
      }
      
      const tournamentMatch = tournamentMatches[0];
      
      if (!tournamentMatch.player1Wallet || !tournamentMatch.player2Wallet) {
        return res.status(400).json({ success: false, error: "Match players not set" });
      }
      
      const tournaments = await db.select()
        .from(chessTournaments)
        .where(eq(chessTournaments.id, tournamentMatch.tournamentId))
        .limit(1);
      
      const timeControl = tournaments[0]?.timeControl || 'blitz';
      const timeSeconds = TIME_CONTROL_SECONDS[timeControl as ChessTimeControl] || 300;
      
      const [chessMatch] = await db.insert(chessMatches).values({
        player1Wallet: tournamentMatch.player1Wallet,
        player2Wallet: tournamentMatch.player2Wallet,
        gameMode: 'tournament',
        timeControl,
        status: 'active',
        fen: STARTING_FEN,
        currentTurn: 'white',
        player1TimeRemaining: timeSeconds,
        player2TimeRemaining: timeSeconds,
        wagerAmount: 0,
        startedAt: new Date(),
      }).returning();
      
      await db.update(chessTournamentMatches)
        .set({
          chessMatchId: chessMatch.id,
          status: 'active',
          startedAt: new Date(),
        })
        .where(eq(chessTournamentMatches.id, matchId));
      
      res.json({ success: true, match: chessMatch });
    } catch (error) {
      console.error("Error starting tournament match:", error);
      res.status(500).json({ success: false, error: "Failed to start match" });
    }
  });

  app.post("/api/tournaments/match/:matchId/complete", async (req: Request, res: Response) => {
    try {
      const { matchId } = req.params;
      const { winnerWallet } = req.body;
      
      const tournamentMatches = await db.select()
        .from(chessTournamentMatches)
        .where(eq(chessTournamentMatches.id, matchId))
        .limit(1);
      
      if (tournamentMatches.length === 0) {
        return res.status(404).json({ success: false, error: "Tournament match not found" });
      }
      
      const tournamentMatch = tournamentMatches[0];
      const loserWallet = tournamentMatch.player1Wallet === winnerWallet 
        ? tournamentMatch.player2Wallet 
        : tournamentMatch.player1Wallet;
      
      await db.update(chessTournamentMatches)
        .set({
          winnerWallet,
          status: 'completed',
          endedAt: new Date(),
        })
        .where(eq(chessTournamentMatches.id, matchId));
      
      await db.update(chessTournamentParticipants)
        .set({ wins: sql`wins + 1` })
        .where(
          and(
            eq(chessTournamentParticipants.tournamentId, tournamentMatch.tournamentId),
            eq(chessTournamentParticipants.walletAddress, winnerWallet)
          )
        );
      
      if (loserWallet) {
        await db.update(chessTournamentParticipants)
          .set({
            losses: sql`losses + 1`,
            isEliminated: true,
          })
          .where(
            and(
              eq(chessTournamentParticipants.tournamentId, tournamentMatch.tournamentId),
              eq(chessTournamentParticipants.walletAddress, loserWallet)
            )
          );
      }
      
      await advanceWinner(
        tournamentMatch.tournamentId,
        tournamentMatch.roundNumber,
        tournamentMatch.matchNumber,
        winnerWallet
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error completing tournament match:", error);
      res.status(500).json({ success: false, error: "Failed to complete match" });
    }
  });

  app.get("/api/tournaments/:id/my-match", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { walletAddress } = req.query;
      
      if (!walletAddress) {
        return res.status(400).json({ success: false, error: "Wallet address required" });
      }
      
      const matches = await db.select()
        .from(chessTournamentMatches)
        .where(
          and(
            eq(chessTournamentMatches.tournamentId, id),
            eq(chessTournamentMatches.status, 'pending'),
            or(
              eq(chessTournamentMatches.player1Wallet, walletAddress as string),
              eq(chessTournamentMatches.player2Wallet, walletAddress as string)
            )
          )
        )
        .orderBy(asc(chessTournamentMatches.roundNumber))
        .limit(1);
      
      res.json({
        success: true,
        match: matches.length > 0 ? matches[0] : null,
      });
    } catch (error) {
      console.error("Error fetching player match:", error);
      res.status(500).json({ success: false, error: "Failed to fetch match" });
    }
  });

  app.post("/api/tournaments/seed-demo", async (req: Request, res: Response) => {
    try {
      const now = new Date();
      const dailyStart = new Date(now);
      dailyStart.setHours(20, 0, 0, 0);
      if (dailyStart <= now) dailyStart.setDate(dailyStart.getDate() + 1);
      
      const weeklyStart = new Date(now);
      weeklyStart.setDate(weeklyStart.getDate() + (6 - weeklyStart.getDay()));
      weeklyStart.setHours(18, 0, 0, 0);
      
      await db.insert(chessTournaments).values([
        {
          name: "Sit & Go Blitz #1",
          tournamentType: 'sit_and_go',
          timeControl: 'blitz',
          entryFee: 20,
          prizePool: 136,
          rakeAmount: 24,
          maxPlayers: 8,
          minPlayers: 4,
          status: 'registering',
        },
        {
          name: "Daily Blitz Arena",
          tournamentType: 'daily',
          timeControl: 'blitz',
          entryFee: 10,
          prizePool: 680,
          rakeAmount: 120,
          maxPlayers: 64,
          minPlayers: 8,
          status: 'scheduled',
          scheduledStartAt: dailyStart,
          registrationEndsAt: new Date(dailyStart.getTime() - 30 * 60 * 1000),
        },
        {
          name: "Weekend Championship",
          tournamentType: 'weekly',
          timeControl: 'rapid',
          entryFee: 100,
          prizePool: 5440,
          rakeAmount: 960,
          maxPlayers: 64,
          minPlayers: 16,
          status: 'scheduled',
          scheduledStartAt: weeklyStart,
          registrationEndsAt: new Date(weeklyStart.getTime() - 60 * 60 * 1000),
        },
      ]);
      
      res.json({ success: true, message: "Demo tournaments created" });
    } catch (error) {
      console.error("Error seeding tournaments:", error);
      res.status(500).json({ success: false, error: "Failed to seed tournaments" });
    }
  });
}
