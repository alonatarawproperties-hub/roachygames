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
  huntIncubators,
  huntRaids,
  huntRaidParticipants,
  huntClaims,
  huntWeeklyLeaderboard,
  huntPlayerLocations,
  huntHotspotPlayerState,
  huntNodes,
  huntNodePlayerState,
  huntLocationSamples,
  huntEventWindows,
  wildCreatureSpawns,
  chyTransactions,
  securityAuditLog,
  gameSessionTokens,
  rateLimitTracking,
  flappyRankedEntries,
  flappyLeaderboard,
  flappyScores,
} from "@shared/schema";
import { desc, eq, sql, and, gte, lte, lt, like, count } from "drizzle-orm";
import { getSecurityLogs, getSecurityStats } from "./security";
import { reconcileBalance, getTransactionHistory } from "./secure-economy";

function getClientIp(req: Request): string {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length) return xf.split(",")[0].trim();
  return (req.ip || "").toString();
}

async function safeAudit(
  req: Request,
  eventType: string,
  severity: string,
  detailsObj: Record<string, unknown>
): Promise<void> {
  try {
    await db.insert(securityAuditLog).values({
      userId: null,
      eventType,
      severity,
      details: JSON.stringify(detailsObj),
      clientIp: getClientIp(req),
      userAgent: (req.headers["user-agent"] as string) || null,
    });
  } catch (e) {
    console.error("[Audit] Failed to write security audit log:", e);
  }
}

function isHuntWipeRoute(req: Request): boolean {
  return req.originalUrl.startsWith("/api/admin/hunt/wipe");
}

function adminAuth(req: Request, res: Response, next: NextFunction) {
  const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
  const nodeEnv = process.env.NODE_ENV;
  const adminWipeEnabled = process.env.ADMIN_WIPE_ENABLED === "true";
  
  if (!ADMIN_API_KEY) {
    console.error("[Admin] ADMIN_API_KEY environment variable is not set");
    if (isHuntWipeRoute(req)) {
      safeAudit(req, "admin_hunt_wipe_denied", "critical", {
        route: "/api/admin/hunt/wipe",
        dryRun: false,
        reason: "ADMIN_API_KEY_MISSING",
        confirmOk: false,
        confirm2Ok: false,
        blockedByProduction: false,
        nodeEnv,
        adminWipeEnabled,
        timestamp: new Date().toISOString(),
      });
    }
    return res.status(503).json({ error: "Admin API not configured" });
  }
  
  const apiKey = req.headers["x-admin-api-key"];
  
  if (!apiKey || apiKey !== ADMIN_API_KEY) {
    if (isHuntWipeRoute(req)) {
      safeAudit(req, "admin_hunt_wipe_denied", "warning", {
        route: "/api/admin/hunt/wipe",
        dryRun: false,
        reason: "INVALID_ADMIN_KEY",
        confirmOk: false,
        confirm2Ok: false,
        blockedByProduction: false,
        nodeEnv,
        adminWipeEnabled,
        timestamp: new Date().toISOString(),
      });
    }
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

  // ===============================
  // SECURITY MONITORING ENDPOINTS
  // ===============================

  // Get security log statistics/summary
  app.get("/api/admin/security/stats", adminAuth, async (req, res) => {
    try {
      const stats = getSecurityStats();
      res.json(stats);
    } catch (error) {
      console.error("[Admin] Security stats error:", error);
      res.status(500).json({ error: "Failed to fetch security stats" });
    }
  });

  // Get security logs with filtering
  app.get("/api/admin/security/logs", adminAuth, async (req, res) => {
    try {
      const severity = req.query.severity as "info" | "warn" | "critical" | undefined;
      const eventType = req.query.eventType as string | undefined;
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
      const since = req.query.since as string | undefined;

      const logs = getSecurityLogs({
        severity,
        eventType,
        limit,
        since,
      });

      res.json({
        logs,
        count: logs.length,
        filters: { severity, eventType, limit, since },
      });
    } catch (error) {
      console.error("[Admin] Security logs error:", error);
      res.status(500).json({ error: "Failed to fetch security logs" });
    }
  });

  // Get only critical/warning security events (for alerts)
  app.get("/api/admin/security/alerts", adminAuth, async (req, res) => {
    try {
      const criticalLogs = getSecurityLogs({ severity: "critical", limit: 50 });
      const warnLogs = getSecurityLogs({ severity: "warn", limit: 50 });

      res.json({
        critical: criticalLogs,
        warnings: warnLogs,
        summary: {
          criticalCount: criticalLogs.length,
          warningCount: warnLogs.length,
        },
      });
    } catch (error) {
      console.error("[Admin] Security alerts error:", error);
      res.status(500).json({ error: "Failed to fetch security alerts" });
    }
  });

  // ===============================
  // CHY TRANSACTION MONITORING
  // ===============================

  // Get CHY transaction ledger (all transactions)
  app.get("/api/admin/chy/transactions", adminAuth, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
      const offset = parseInt(req.query.offset as string) || 0;
      const userId = req.query.userId as string | undefined;
      const txType = req.query.txType as string | undefined;

      // Build filter conditions
      const conditions = [];
      if (userId) {
        conditions.push(eq(chyTransactions.userId, userId));
      }
      if (txType) {
        conditions.push(eq(chyTransactions.txType, txType));
      }

      let transactions;
      let totalCount;
      
      // Handle filters - single condition doesn't need and()
      const whereClause = conditions.length === 1 
        ? conditions[0] 
        : conditions.length > 1 
          ? and(...conditions) 
          : undefined;
      
      if (whereClause) {
        transactions = await db.select().from(chyTransactions)
          .where(whereClause)
          .orderBy(desc(chyTransactions.createdAt))
          .limit(limit)
          .offset(offset);
        [totalCount] = await db.select({ count: count() }).from(chyTransactions)
          .where(whereClause);
      } else {
        transactions = await db.select().from(chyTransactions)
          .orderBy(desc(chyTransactions.createdAt))
          .limit(limit)
          .offset(offset);
        [totalCount] = await db.select({ count: count() }).from(chyTransactions);
      }

      res.json({
        transactions,
        filters: { userId, txType },
        pagination: {
          total: totalCount?.count || 0,
          limit,
          offset,
          hasMore: offset + transactions.length < (totalCount?.count || 0),
        },
      });
    } catch (error) {
      console.error("[Admin] CHY transactions error:", error);
      res.status(500).json({ error: "Failed to fetch CHY transactions" });
    }
  });

  // Get transaction history for specific user
  app.get("/api/admin/chy/transactions/:userId", adminAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

      const transactions = await getTransactionHistory(userId, limit);
      
      res.json({
        userId,
        transactions,
        count: transactions.length,
      });
    } catch (error) {
      console.error("[Admin] User CHY transactions error:", error);
      res.status(500).json({ error: "Failed to fetch user transactions" });
    }
  });

  // Reconcile user balance (check ledger vs stored balance)
  app.get("/api/admin/chy/reconcile/:userId", adminAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await reconcileBalance(userId);
      
      res.json({
        userId,
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Admin] Reconciliation error:", error);
      res.status(500).json({ error: "Failed to reconcile balance" });
    }
  });

  // Get security audit log (persistent database log)
  app.get("/api/admin/security/audit", adminAuth, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
      const offset = parseInt(req.query.offset as string) || 0;
      const severity = req.query.severity as string | undefined;
      const eventType = req.query.eventType as string | undefined;
      const userId = req.query.userId as string | undefined;

      // Build filter conditions
      const conditions = [];
      if (severity) {
        conditions.push(eq(securityAuditLog.severity, severity));
      }
      if (eventType) {
        conditions.push(eq(securityAuditLog.eventType, eventType));
      }
      if (userId) {
        conditions.push(eq(securityAuditLog.userId, userId));
      }

      // Handle filters - single condition doesn't need and()
      const whereClause = conditions.length === 1 
        ? conditions[0] 
        : conditions.length > 1 
          ? and(...conditions) 
          : undefined;

      let logs;
      if (whereClause) {
        logs = await db.select().from(securityAuditLog)
          .where(whereClause)
          .orderBy(desc(securityAuditLog.createdAt))
          .limit(limit)
          .offset(offset);
      } else {
        logs = await db.select().from(securityAuditLog)
          .orderBy(desc(securityAuditLog.createdAt))
          .limit(limit)
          .offset(offset);
      }

      res.json({
        logs,
        count: logs.length,
        filters: { severity, eventType, userId, limit, offset },
      });
    } catch (error) {
      console.error("[Admin] Security audit error:", error);
      res.status(500).json({ error: "Failed to fetch security audit log" });
    }
  });

  // Get active game sessions (for fraud detection)
  app.get("/api/admin/sessions/active", adminAuth, async (req, res) => {
    try {
      const now = new Date();
      const activeSessions = await db.select()
        .from(gameSessionTokens)
        .where(and(
          gte(gameSessionTokens.expiresAt, now),
          sql`${gameSessionTokens.usedAt} IS NULL`
        ))
        .orderBy(desc(gameSessionTokens.startedAt))
        .limit(100);

      res.json({
        sessions: activeSessions,
        count: activeSessions.length,
      });
    } catch (error) {
      console.error("[Admin] Active sessions error:", error);
      res.status(500).json({ error: "Failed to fetch active sessions" });
    }
  });

  // Get rate limit violations
  app.get("/api/admin/ratelimit/violations", adminAuth, async (req, res) => {
    try {
      const highViolations = await db.select()
        .from(rateLimitTracking)
        .where(gte(rateLimitTracking.requestCount, 50))
        .orderBy(desc(rateLimitTracking.requestCount))
        .limit(50);

      res.json({
        violations: highViolations,
        count: highViolations.length,
      });
    } catch (error) {
      console.error("[Admin] Rate limit violations error:", error);
      res.status(500).json({ error: "Failed to fetch rate limit data" });
    }
  });

  // CHY economy summary
  app.get("/api/admin/chy/summary", adminAuth, async (req, res) => {
    try {
      const [totalTransactions] = await db.select({ count: count() }).from(chyTransactions);
      
      const entryFees = await db.select({
        total: sql<number>`SUM(ABS(amount))`,
      }).from(chyTransactions).where(eq(chyTransactions.txType, 'entry_fee'));
      
      const payouts = await db.select({
        total: sql<number>`SUM(amount)`,
      }).from(chyTransactions).where(eq(chyTransactions.txType, 'prize_payout'));

      res.json({
        totalTransactions: totalTransactions?.count || 0,
        totalEntryFees: entryFees[0]?.total || 0,
        totalPayouts: payouts[0]?.total || 0,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Admin] CHY summary error:", error);
      res.status(500).json({ error: "Failed to fetch CHY summary" });
    }
  });

  app.post("/api/admin/flappy/reset", adminAuth, async (req, res) => {
    try {
      const { confirm } = req.body;
      
      if (confirm !== "wipe") {
        return res.status(400).json({ 
          error: "Confirmation required. Send { confirm: 'wipe' } to proceed." 
        });
      }
      
      console.log("[Admin] Wiping Flappy competition data...");
      
      const entriesDeleted = await db.delete(flappyRankedEntries);
      const leaderboardDeleted = await db.delete(flappyLeaderboard);
      const scoresDeleted = await db.delete(flappyScores);
      
      console.log("[Admin] Flappy competition data wiped successfully");
      
      res.json({
        success: true,
        message: "Flappy competition data cleared",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Admin] Flappy reset error:", error);
      res.status(500).json({ error: "Failed to reset Flappy data" });
    }
  });

  app.post("/api/admin/hunt/wipe", adminAuth, async (req, res) => {
    const nodeEnv = process.env.NODE_ENV;
    const adminWipeEnabled = process.env.ADMIN_WIPE_ENABLED === "true";
    const dryRun = req.query.dryRun === "1" || req.query.dryRun === "true";
    const route = "/api/admin/hunt/wipe";
    const confirmOk = req.body?.confirm === "wipe";
    const confirm2Ok = req.body?.confirm2 === "I_UNDERSTAND_THIS_DELETES_HUNT_DATA";

    try {
      if (nodeEnv === "production" && !adminWipeEnabled) {
        console.warn("[Admin] Hunt wipe BLOCKED in production (ADMIN_WIPE_ENABLED not set)");
        await safeAudit(req, "admin_hunt_wipe_denied", "warning", {
          route,
          dryRun,
          reason: "PRODUCTION_BLOCKED",
          confirmOk,
          confirm2Ok,
          blockedByProduction: true,
          nodeEnv,
          adminWipeEnabled,
          timestamp: new Date().toISOString(),
        });
        return res.status(403).json({ error: "WIPE_DISABLED_IN_PRODUCTION" });
      }

      if (!confirmOk || !confirm2Ok) {
        await safeAudit(req, "admin_hunt_wipe_denied", "warning", {
          route,
          dryRun,
          reason: "CONFIRMATION_FAILED",
          confirmOk,
          confirm2Ok,
          blockedByProduction: false,
          nodeEnv,
          adminWipeEnabled,
          timestamp: new Date().toISOString(),
        });
        return res.status(400).json({
          error: "CONFIRMATION_REQUIRED",
          required: ["confirm=wipe", "confirm2=I_UNDERSTAND_THIS_DELETES_HUNT_DATA"],
        });
      }

      console.log("[Admin] Hunt wipe initiated", { dryRun, nodeEnv, adminWipeEnabled });

      const tables = [
        { name: "huntRaidParticipants", table: huntRaidParticipants },
        { name: "huntRaids", table: huntRaids },
        { name: "huntCaughtCreatures", table: huntCaughtCreatures },
        { name: "huntActivityLog", table: huntActivityLog },
        { name: "huntClaims", table: huntClaims },
        { name: "huntEggs", table: huntEggs },
        { name: "huntIncubators", table: huntIncubators },
        { name: "huntLeaderboard", table: huntLeaderboard },
        { name: "huntWeeklyLeaderboard", table: huntWeeklyLeaderboard },
        { name: "huntEconomyStats", table: huntEconomyStats },
        { name: "huntHotspotPlayerState", table: huntHotspotPlayerState },
        { name: "huntNodePlayerState", table: huntNodePlayerState },
        { name: "huntNodes", table: huntNodes },
        { name: "huntLocationSamples", table: huntLocationSamples },
        { name: "huntEventWindows", table: huntEventWindows },
        { name: "wildCreatureSpawns", table: wildCreatureSpawns },
        { name: "huntPlayerLocations", table: huntPlayerLocations },
        { name: "rateLimitTracking", table: rateLimitTracking },
      ] as const;

      const results: Record<string, { before: number; after: number; deleted: number }> = {};

      await db.transaction(async (tx) => {
        for (const { name, table } of tables) {
          const [row] = await tx.select({ count: count() }).from(table);
          results[name] = { before: Number(row?.count ?? 0), after: 0, deleted: 0 };
        }

        if (!dryRun) {
          await tx.execute(sql`
            TRUNCATE TABLE
              "hunt_raid_participants",
              "hunt_raids",
              "hunt_caught_creatures",
              "hunt_activity_log",
              "hunt_claims",
              "hunt_eggs",
              "hunt_incubators",
              "hunt_leaderboard",
              "hunt_weekly_leaderboard",
              "hunt_economy_stats",
              "hunt_hotspot_player_state",
              "hunt_node_player_state",
              "hunt_nodes",
              "hunt_location_samples",
              "hunt_event_windows",
              "wild_creature_spawns",
              "hunt_player_locations",
              "rate_limit_tracking"
            RESTART IDENTITY CASCADE
          `);

          for (const { name, table } of tables) {
            const [row] = await tx.select({ count: count() }).from(table);
            const after = Number(row?.count ?? 0);
            const before = results[name].before;
            results[name].after = after;
            results[name].deleted = before - after;
          }
        } else {
          for (const name of Object.keys(results)) {
            results[name].after = results[name].before;
            results[name].deleted = 0;
          }
        }
      });

      const totalDeleted = Object.values(results).reduce((sum, r) => sum + r.deleted, 0);
      const totalWouldDelete = Object.values(results).reduce((sum, r) => sum + r.before, 0);

      console.log("[Admin] Hunt wipe completed", { dryRun, totalDeleted, totalWouldDelete });

      if (dryRun) {
        await safeAudit(req, "admin_hunt_wipe_dry_run", "info", {
          route,
          dryRun: true,
          reason: "DRY_RUN",
          confirmOk,
          confirm2Ok,
          blockedByProduction: false,
          nodeEnv,
          adminWipeEnabled,
          results,
          totalWouldDelete,
          totalDeleted: 0,
          timestamp: new Date().toISOString(),
        });
      } else {
        await safeAudit(req, "admin_hunt_wipe_success", "warning", {
          route,
          dryRun: false,
          reason: "SUCCESS",
          confirmOk,
          confirm2Ok,
          blockedByProduction: false,
          nodeEnv,
          adminWipeEnabled,
          results,
          totalDeleted,
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        dryRun,
        message: dryRun
          ? `DRY RUN: Would delete ${totalWouldDelete} rows (no changes made)`
          : "Hunt data cleared (TRUNCATE CASCADE)",
        wiped: results,
        totalDeleted: dryRun ? 0 : totalDeleted,
        totalWouldDelete,
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("[Admin] Hunt wipe error:", error);
      await safeAudit(req, "admin_hunt_wipe_failed", "critical", {
        route,
        dryRun,
        reason: "ERROR",
        errorMessage: errMsg,
        confirmOk,
        confirm2Ok,
        blockedByProduction: false,
        nodeEnv,
        adminWipeEnabled,
        timestamp: new Date().toISOString(),
      });
      res.status(500).json({ error: "Failed to wipe Hunt data" });
    }
  });

  app.get("/api/admin/security-audit", adminAuth, async (req, res) => {
    try {
      const {
        eventPrefix,
        eventType,
        severity,
        userId,
        sinceIso,
        cursorIso,
      } = req.query;

      let limit = parseInt(req.query.limit as string, 10);
      if (!Number.isFinite(limit) || limit < 1) limit = 50;
      if (limit > 200) limit = 200;

      let sinceDate: Date | null = null;
      let cursorDate: Date | null = null;

      if (sinceIso && typeof sinceIso === "string") {
        sinceDate = new Date(sinceIso);
        if (isNaN(sinceDate.getTime())) {
          return res.status(400).json({ error: "INVALID_DATE" });
        }
      }

      if (cursorIso && typeof cursorIso === "string") {
        cursorDate = new Date(cursorIso);
        if (isNaN(cursorDate.getTime())) {
          return res.status(400).json({ error: "INVALID_DATE" });
        }
      }

      const filters: ReturnType<typeof eq>[] = [];

      if (eventType && typeof eventType === "string") {
        filters.push(eq(securityAuditLog.eventType, eventType));
      } else if (eventPrefix && typeof eventPrefix === "string") {
        filters.push(like(securityAuditLog.eventType, `${eventPrefix}%`));
      }

      if (severity && typeof severity === "string") {
        filters.push(eq(securityAuditLog.severity, severity));
      }

      if (userId && typeof userId === "string") {
        filters.push(eq(securityAuditLog.userId, userId));
      }

      if (sinceDate) {
        filters.push(gte(securityAuditLog.createdAt, sinceDate));
      }

      if (cursorDate) {
        filters.push(lt(securityAuditLog.createdAt, cursorDate));
      }

      const whereClause = filters.length ? and(...filters) : undefined;

      const rows = await db
        .select()
        .from(securityAuditLog)
        .where(whereClause)
        .orderBy(desc(securityAuditLog.createdAt))
        .limit(limit);

      const items = rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        eventType: row.eventType,
        severity: row.severity,
        details: row.details,
        clientIp: row.clientIp,
        userAgent: row.userAgent,
        createdAt: row.createdAt.toISOString(),
      }));

      const nextCursorIso =
        items.length === limit ? items[items.length - 1].createdAt : null;

      res.json({
        success: true,
        count: items.length,
        nextCursorIso,
        items,
      });
    } catch (error) {
      console.error("[Admin] Security audit fetch error:", error);
      res.status(500).json({ error: "FAILED_TO_FETCH_AUDIT_LOGS" });
    }
  });

  // Debug endpoint to check JWT user identity
  app.get("/api/admin/debug/jwt-user", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No Bearer token" });
      }

      const token = authHeader.substring(7);
      const jwt = require("jsonwebtoken");
      const JWT_SECRET = process.env.JWT_SECRET;
      
      if (!JWT_SECRET) {
        return res.status(500).json({ error: "JWT_SECRET not configured" });
      }

      try {
        const payload = jwt.verify(token, JWT_SECRET);
        
        // Also lookup user in database
        const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
        
        // Get egg counts for this user
        const eggCounts = await db.select({
          rarity: huntEggs.rarity,
          count: sql<number>`count(*)::int`,
        })
          .from(huntEggs)
          .where(and(
            eq(huntEggs.userId, payload.userId),
            sql`${huntEggs.hatchedAt} IS NULL`
          ))
          .groupBy(huntEggs.rarity);

        res.json({
          jwtPayload: payload,
          userFound: !!user,
          user: user ? {
            id: user.id,
            email: user.email,
            googleId: user.googleId,
          } : null,
          eggCounts,
        });
      } catch (jwtError: any) {
        return res.status(401).json({ error: "Invalid JWT", details: jwtError.message });
      }
    } catch (error) {
      console.error("[Admin] Debug JWT error:", error);
      res.status(500).json({ error: "Failed to debug JWT" });
    }
  });

  // Admin endpoint to check user eggs
  app.get("/api/admin/hunt/user-eggs", adminAuth, async (req: Request, res: Response) => {
    try {
      const { userId } = req.query;
      
      if (!userId) {
        return res.status(400).json({ error: "userId required" });
      }

      const eggs = await db.select({
        rarity: huntEggs.rarity,
        count: sql<number>`count(*)::int`,
      })
        .from(huntEggs)
        .where(and(
          eq(huntEggs.userId, userId as string),
          sql`${huntEggs.hatchedAt} IS NULL`
        ))
        .groupBy(huntEggs.rarity);

      // Also get raw egg list (limited)
      const rawEggs = await db.select()
        .from(huntEggs)
        .where(and(
          eq(huntEggs.userId, userId as string),
          sql`${huntEggs.hatchedAt} IS NULL`
        ))
        .limit(10);

      res.json({ userId, eggs, sampleEggs: rawEggs });
    } catch (error) {
      console.error("[Admin] User eggs check error:", error);
      res.status(500).json({ error: "Failed to check user eggs" });
    }
  });

  // Admin endpoint to lookup user by Google ID
  app.get("/api/admin/user/lookup", adminAuth, async (req: Request, res: Response) => {
    try {
      const { googleId, email } = req.query;
      
      if (!googleId && !email) {
        return res.status(400).json({ error: "googleId or email required" });
      }

      let user;
      if (googleId) {
        [user] = await db.select().from(users).where(eq(users.googleId, googleId as string)).limit(1);
      } else if (email) {
        [user] = await db.select().from(users).where(eq(users.email, email as string)).limit(1);
      }

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        id: user.id,
        email: user.email,
        googleId: user.googleId,
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error("[Admin] User lookup error:", error);
      res.status(500).json({ error: "Failed to lookup user" });
    }
  });

  // Admin endpoint to grant eggs to a user
  app.post("/api/admin/hunt/grant-eggs", adminAuth, async (req: Request, res: Response) => {
    try {
      const { userId, common = 0, rare = 0, epic = 0, legendary = 0 } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const eggsToInsert: Array<{
        id: string;
        userId: string;
        rarity: string;
        foundAt: Date;
        latitude: number;
        longitude: number;
      }> = [];

      const now = new Date();
      const rarities = [
        { name: 'common', count: common },
        { name: 'rare', count: rare },
        { name: 'epic', count: epic },
        { name: 'legendary', count: legendary },
      ];

      for (const { name, count } of rarities) {
        for (let i = 0; i < count; i++) {
          eggsToInsert.push({
            id: crypto.randomUUID(),
            userId,
            rarity: name,
            foundAt: now,
            latitude: 0,
            longitude: 0,
          });
        }
      }

      if (eggsToInsert.length > 0) {
        await db.insert(huntEggs).values(eggsToInsert);
      }

      // Also update economy stats egg counts (this is what the UI displays)
      const [existingEconomy] = await db.select().from(huntEconomyStats)
        .where(eq(huntEconomyStats.walletAddress, userId))
        .limit(1);

      if (existingEconomy) {
        await db.update(huntEconomyStats)
          .set({
            eggCommon: sql`${huntEconomyStats.eggCommon} + ${common}`,
            eggRare: sql`${huntEconomyStats.eggRare} + ${rare}`,
            eggEpic: sql`${huntEconomyStats.eggEpic} + ${epic}`,
            eggLegendary: sql`${huntEconomyStats.eggLegendary} + ${legendary}`,
            updatedAt: new Date(),
          })
          .where(eq(huntEconomyStats.walletAddress, userId));
      } else {
        // Create economy stats if doesn't exist
        await db.insert(huntEconomyStats).values({
          walletAddress: userId,
          energy: 30,
          maxEnergy: 30,
          eggCommon: common,
          eggRare: rare,
          eggEpic: epic,
          eggLegendary: legendary,
        });
      }

      await safeAudit(req, "admin_grant_eggs", "info", {
        userId,
        common,
        rare,
        epic,
        legendary,
        totalGranted: eggsToInsert.length,
      });

      res.json({
        success: true,
        granted: {
          common,
          rare,
          epic,
          legendary,
          total: eggsToInsert.length,
        },
      });
    } catch (error) {
      console.error("[Admin] Grant eggs error:", error);
      res.status(500).json({ error: "Failed to grant eggs" });
    }
  });

  // Admin endpoint to sync eggs from hunt_eggs table to economy stats
  app.post("/api/admin/hunt/sync-eggs", adminAuth, async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      // Count eggs in hunt_eggs table (not hatched)
      const eggCounts = await db.select({
        rarity: huntEggs.rarity,
        count: sql<number>`count(*)::int`,
      })
        .from(huntEggs)
        .where(and(
          eq(huntEggs.userId, userId),
          sql`${huntEggs.hatchedAt} IS NULL`
        ))
        .groupBy(huntEggs.rarity);

      const counts = {
        common: 0,
        rare: 0,
        epic: 0,
        legendary: 0,
      };

      for (const row of eggCounts) {
        if (row.rarity in counts) {
          counts[row.rarity as keyof typeof counts] = row.count;
        }
      }

      // Update economy stats
      const [existingEconomy] = await db.select().from(huntEconomyStats)
        .where(eq(huntEconomyStats.walletAddress, userId))
        .limit(1);

      if (existingEconomy) {
        await db.update(huntEconomyStats)
          .set({
            eggCommon: counts.common,
            eggRare: counts.rare,
            eggEpic: counts.epic,
            eggLegendary: counts.legendary,
            updatedAt: new Date(),
          })
          .where(eq(huntEconomyStats.walletAddress, userId));
      } else {
        await db.insert(huntEconomyStats).values({
          walletAddress: userId,
          energy: 30,
          maxEnergy: 30,
          eggCommon: counts.common,
          eggRare: counts.rare,
          eggEpic: counts.epic,
          eggLegendary: counts.legendary,
        });
      }

      res.json({
        success: true,
        synced: counts,
        total: counts.common + counts.rare + counts.epic + counts.legendary,
      });
    } catch (error) {
      console.error("[Admin] Sync eggs error:", error);
      res.status(500).json({ error: "Failed to sync eggs" });
    }
  });

  console.log("[Admin] Admin routes registered (including security monitoring)");
}
