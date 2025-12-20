import type { Express, Request, Response, NextFunction } from "express";
import { db } from "./db";
import {
  users,
  chessMatches,
  chessRatings,
  chessTournaments,
  chessTournamentParticipants,
  huntCaughtCreatures,
  huntActivityLog,
  huntLeaderboard,
  huntEconomyStats,
  huntEggs,
} from "@shared/schema";
import { desc, eq, sql, and, gte, lte, count } from "drizzle-orm";

function adminAuth(req: Request, res: Response, next: NextFunction) {
  const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
  
  if (!ADMIN_API_KEY) {
    console.error("[Admin] ADMIN_API_KEY environment variable is not set");
    return res.status(503).json({ error: "Admin API not configured" });
  }
  
  const apiKey = req.headers["x-admin-api-key"];
  
  if (!apiKey || apiKey !== ADMIN_API_KEY) {
    return res.status(401).json({ error: "Unauthorized - Invalid admin API key" });
  }
  
  next();
}

export function registerAdminRoutes(app: Express) {
  app.get("/api/admin/stats/overview", adminAuth, async (req, res) => {
    try {
      const [userCount] = await db.select({ count: count() }).from(users);
      const [matchCount] = await db.select({ count: count() }).from(chessMatches);
      const [tournamentCount] = await db.select({ count: count() }).from(chessTournaments);
      const [creatureCount] = await db.select({ count: count() }).from(huntCaughtCreatures);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const [todayMatches] = await db
        .select({ count: count() })
        .from(chessMatches)
        .where(gte(chessMatches.createdAt, today));

      const [activeTournaments] = await db
        .select({ count: count() })
        .from(chessTournaments)
        .where(eq(chessTournaments.status, "registering"));

      res.json({
        totalUsers: userCount?.count || 0,
        totalChessMatches: matchCount?.count || 0,
        totalTournaments: tournamentCount?.count || 0,
        totalCreaturesCaught: creatureCount?.count || 0,
        matchesToday: todayMatches?.count || 0,
        activeTournaments: activeTournaments?.count || 0,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Admin] Overview stats error:", error);
      res.status(500).json({ error: "Failed to fetch overview stats" });
    }
  });

  app.get("/api/admin/users", adminAuth, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;
      const search = req.query.search as string;

      let query = db
        .select({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          walletAddress: users.walletAddress,
          authProvider: users.authProvider,
          chyBalance: users.chyBalance,
          diamondBalance: users.diamondBalance,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      const userList = await query;

      const [totalCount] = await db.select({ count: count() }).from(users);

      res.json({
        users: userList,
        pagination: {
          total: totalCount?.count || 0,
          limit,
          offset,
          hasMore: offset + userList.length < (totalCount?.count || 0),
        },
      });
    } catch (error) {
      console.error("[Admin] Users list error:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/users/:userId", adminAuth, async (req, res) => {
    try {
      const { userId } = req.params;

      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          walletAddress: users.walletAddress,
          authProvider: users.authProvider,
          chyBalance: users.chyBalance,
          diamondBalance: users.diamondBalance,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const walletAddress = user.walletAddress || user.id;

      const [chessStats] = await db
        .select()
        .from(chessRatings)
        .where(eq(chessRatings.walletAddress, walletAddress));

      const recentMatches = await db
        .select()
        .from(chessMatches)
        .where(
          sql`${chessMatches.player1Wallet} = ${walletAddress} OR ${chessMatches.player2Wallet} = ${walletAddress}`
        )
        .orderBy(desc(chessMatches.createdAt))
        .limit(10);

      const tournaments = await db
        .select({
          participantId: chessTournamentParticipants.id,
          tournamentId: chessTournamentParticipants.tournamentId,
          wins: chessTournamentParticipants.wins,
          losses: chessTournamentParticipants.losses,
          draws: chessTournamentParticipants.draws,
          points: chessTournamentParticipants.points,
          finalPlacement: chessTournamentParticipants.finalPlacement,
          prizesWon: chessTournamentParticipants.prizesWon,
          joinedAt: chessTournamentParticipants.joinedAt,
          tournamentName: chessTournaments.name,
          entryFee: chessTournaments.entryFee,
          status: chessTournaments.status,
        })
        .from(chessTournamentParticipants)
        .innerJoin(chessTournaments, eq(chessTournamentParticipants.tournamentId, chessTournaments.id))
        .where(eq(chessTournamentParticipants.walletAddress, walletAddress))
        .orderBy(desc(chessTournamentParticipants.joinedAt))
        .limit(20);

      const [huntStats] = await db
        .select()
        .from(huntLeaderboard)
        .where(eq(huntLeaderboard.walletAddress, walletAddress));

      const recentCatches = await db
        .select()
        .from(huntCaughtCreatures)
        .where(eq(huntCaughtCreatures.walletAddress, walletAddress))
        .orderBy(desc(huntCaughtCreatures.caughtAt))
        .limit(10);

      res.json({
        user,
        chess: {
          stats: chessStats || null,
          recentMatches,
        },
        tournaments,
        hunt: {
          stats: huntStats || null,
          recentCatches,
        },
      });
    } catch (error) {
      console.error("[Admin] User detail error:", error);
      res.status(500).json({ error: "Failed to fetch user details" });
    }
  });

  app.get("/api/admin/chess/matches", adminAuth, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status as string;
      const gameMode = req.query.gameMode as string;

      let conditions = [];
      if (status) {
        conditions.push(eq(chessMatches.status, status));
      }
      if (gameMode) {
        conditions.push(eq(chessMatches.gameMode, gameMode));
      }

      const matches = await db
        .select()
        .from(chessMatches)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(chessMatches.createdAt))
        .limit(limit)
        .offset(offset);

      const [totalCount] = await db
        .select({ count: count() })
        .from(chessMatches)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      res.json({
        matches,
        pagination: {
          total: totalCount?.count || 0,
          limit,
          offset,
          hasMore: offset + matches.length < (totalCount?.count || 0),
        },
      });
    } catch (error) {
      console.error("[Admin] Chess matches error:", error);
      res.status(500).json({ error: "Failed to fetch chess matches" });
    }
  });

  app.get("/api/admin/chess/leaderboard", adminAuth, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      const leaderboard = await db
        .select()
        .from(chessRatings)
        .orderBy(desc(chessRatings.rating))
        .limit(limit);

      res.json({ leaderboard });
    } catch (error) {
      console.error("[Admin] Chess leaderboard error:", error);
      res.status(500).json({ error: "Failed to fetch chess leaderboard" });
    }
  });

  app.get("/api/admin/tournaments", adminAuth, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status as string;

      let conditions = [];
      if (status) {
        conditions.push(eq(chessTournaments.status, status));
      }

      const tournamentList = await db
        .select()
        .from(chessTournaments)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(chessTournaments.createdAt))
        .limit(limit)
        .offset(offset);

      const [totalCount] = await db
        .select({ count: count() })
        .from(chessTournaments)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      res.json({
        tournaments: tournamentList,
        pagination: {
          total: totalCount?.count || 0,
          limit,
          offset,
          hasMore: offset + tournamentList.length < (totalCount?.count || 0),
        },
      });
    } catch (error) {
      console.error("[Admin] Tournaments list error:", error);
      res.status(500).json({ error: "Failed to fetch tournaments" });
    }
  });

  app.get("/api/admin/tournaments/:tournamentId", adminAuth, async (req, res) => {
    try {
      const { tournamentId } = req.params;

      const [tournament] = await db
        .select()
        .from(chessTournaments)
        .where(eq(chessTournaments.id, tournamentId));

      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }

      const participants = await db
        .select({
          participant: chessTournamentParticipants,
          userDisplayName: users.displayName,
        })
        .from(chessTournamentParticipants)
        .leftJoin(users, sql`${chessTournamentParticipants.walletAddress} = ${users.walletAddress} OR ${chessTournamentParticipants.walletAddress} = ${users.id}`)
        .where(eq(chessTournamentParticipants.tournamentId, tournamentId))
        .orderBy(desc(chessTournamentParticipants.points));

      res.json({
        tournament,
        participants: participants.map((p) => ({
          ...p.participant,
          displayName: p.userDisplayName,
        })),
      });
    } catch (error) {
      console.error("[Admin] Tournament detail error:", error);
      res.status(500).json({ error: "Failed to fetch tournament details" });
    }
  });

  app.get("/api/admin/hunt/activity", adminAuth, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;
      const activityType = req.query.type as string;

      let conditions = [];
      if (activityType) {
        conditions.push(eq(huntActivityLog.activityType, activityType));
      }

      const activities = await db
        .select()
        .from(huntActivityLog)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(huntActivityLog.createdAt))
        .limit(limit)
        .offset(offset);

      const [totalCount] = await db
        .select({ count: count() })
        .from(huntActivityLog)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      res.json({
        activities,
        pagination: {
          total: totalCount?.count || 0,
          limit,
          offset,
          hasMore: offset + activities.length < (totalCount?.count || 0),
        },
      });
    } catch (error) {
      console.error("[Admin] Hunt activity error:", error);
      res.status(500).json({ error: "Failed to fetch hunt activity" });
    }
  });

  app.get("/api/admin/hunt/leaderboard", adminAuth, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      const leaderboard = await db
        .select()
        .from(huntLeaderboard)
        .orderBy(desc(huntLeaderboard.totalCaught))
        .limit(limit);

      res.json({ leaderboard });
    } catch (error) {
      console.error("[Admin] Hunt leaderboard error:", error);
      res.status(500).json({ error: "Failed to fetch hunt leaderboard" });
    }
  });

  app.get("/api/admin/hunt/catches", adminAuth, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;
      const rarity = req.query.rarity as string;

      let conditions = [];
      if (rarity) {
        conditions.push(eq(huntCaughtCreatures.rarity, rarity));
      }

      const catches = await db
        .select()
        .from(huntCaughtCreatures)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(huntCaughtCreatures.caughtAt))
        .limit(limit)
        .offset(offset);

      const [totalCount] = await db
        .select({ count: count() })
        .from(huntCaughtCreatures)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      res.json({
        catches,
        pagination: {
          total: totalCount?.count || 0,
          limit,
          offset,
          hasMore: offset + catches.length < (totalCount?.count || 0),
        },
      });
    } catch (error) {
      console.error("[Admin] Hunt catches error:", error);
      res.status(500).json({ error: "Failed to fetch hunt catches" });
    }
  });

  app.get("/api/admin/hunt/eggs", adminAuth, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const eggs = await db
        .select()
        .from(huntEggs)
        .orderBy(desc(huntEggs.foundAt))
        .limit(limit)
        .offset(offset);

      const [totalCount] = await db.select({ count: count() }).from(huntEggs);

      res.json({
        eggs,
        pagination: {
          total: totalCount?.count || 0,
          limit,
          offset,
          hasMore: offset + eggs.length < (totalCount?.count || 0),
        },
      });
    } catch (error) {
      console.error("[Admin] Hunt eggs error:", error);
      res.status(500).json({ error: "Failed to fetch hunt eggs" });
    }
  });

  console.log("[Admin] Admin routes registered");
}
