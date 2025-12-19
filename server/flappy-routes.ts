import { Express, Request, Response } from "express";
import { db } from "./db";
import {
  flappyScores,
  flappyLeaderboard,
  flappyPowerUpInventory,
  flappyRankedCompetitions,
  flappyRankedEntries,
  users,
} from "@shared/schema";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { logUserActivity } from "./economy-routes";
import { webappRequest } from "./webapp-routes";

// Helper to fetch CHY balance from webapp using googleId/email
async function getWebappChyBalanceForUser(user: { googleId: string | null; email: string | null; displayName: string | null }): Promise<number> {
  try {
    if (!user.googleId || !user.email) {
      console.log(`[Flappy] User has no googleId/email, cannot fetch webapp CHY`);
      return 0;
    }
    
    // First, exchange OAuth credentials to get webappUserId
    const exchangeResult = await webappRequest("POST", "/api/web/oauth/exchange", {
      googleId: user.googleId,
      email: user.email,
      displayName: user.displayName || user.email.split("@")[0],
    });
    
    if (exchangeResult.status !== 200 || !exchangeResult.data?.success) {
      console.log(`[Flappy] OAuth exchange failed:`, exchangeResult);
      return 0;
    }
    
    const webappUserId = exchangeResult.data.user?.id;
    if (!webappUserId) {
      console.log(`[Flappy] No webappUserId returned from exchange`);
      return 0;
    }
    
    // Now fetch balances using the webappUserId
    const balanceResult = await webappRequest("GET", `/api/web/users/${webappUserId}/balances`);
    if (balanceResult.status === 200) {
      const chy = balanceResult.data?.chyBalance ?? balanceResult.data?.chy ?? 0;
      console.log(`[Flappy] Fetched CHY balance for webapp user ${webappUserId}: ${chy}`);
      return chy;
    }
    
    console.log(`[Flappy] Could not fetch CHY for webapp user ${webappUserId}:`, balanceResult);
    return 0;
  } catch (error) {
    console.error(`[Flappy] Error fetching CHY balance:`, error);
    return 0;
  }
}

// Helper to deduct CHY from webapp
async function deductWebappChy(user: { googleId: string | null; email: string | null; displayName: string | null }, amount: number, reason: string): Promise<boolean> {
  try {
    if (!user.googleId || !user.email) {
      return false;
    }
    
    // Get webappUserId first
    const exchangeResult = await webappRequest("POST", "/api/web/oauth/exchange", {
      googleId: user.googleId,
      email: user.email,
      displayName: user.displayName || user.email.split("@")[0],
    });
    
    if (exchangeResult.status !== 200 || !exchangeResult.data?.success) {
      return false;
    }
    
    const webappUserId = exchangeResult.data.user?.id;
    if (!webappUserId) {
      return false;
    }
    
    // Deduct CHY
    const deductResult = await webappRequest("POST", "/api/web/economy/deduct", {
      userId: webappUserId,
      amount,
      reason,
    });
    
    return deductResult.status === 200 && deductResult.data?.success === true;
  } catch (error) {
    console.error(`[Flappy] Error deducting CHY:`, error);
    return false;
  }
}

export function registerFlappyRoutes(app: Express) {
  app.get("/api/flappy/leaderboard", async (req: Request, res: Response) => {
    try {
      const { period = "alltime", limit = 50 } = req.query;
      
      let leaderboardData;
      
      if (period === "daily") {
        const today = new Date().toISOString().split('T')[0];
        leaderboardData = await db.select()
          .from(flappyLeaderboard)
          .where(eq(flappyLeaderboard.dailyBestDate, today))
          .orderBy(desc(flappyLeaderboard.dailyBestScore))
          .limit(Number(limit));
      } else if (period === "weekly") {
        const weekStart = getWeekStart();
        leaderboardData = await db.select()
          .from(flappyLeaderboard)
          .where(gte(flappyLeaderboard.weeklyBestDate, weekStart))
          .orderBy(desc(flappyLeaderboard.weeklyBestScore))
          .limit(Number(limit));
      } else {
        leaderboardData = await db.select()
          .from(flappyLeaderboard)
          .orderBy(desc(flappyLeaderboard.bestScore))
          .limit(Number(limit));
      }
      
      res.json({ success: true, leaderboard: leaderboardData });
    } catch (error) {
      console.error("Leaderboard fetch error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch leaderboard" });
    }
  });

  app.get("/api/flappy/leaderboard/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      const userStats = await db.select()
        .from(flappyLeaderboard)
        .where(eq(flappyLeaderboard.userId, userId))
        .limit(1);
      
      if (userStats.length === 0) {
        return res.json({ 
          success: true, 
          stats: {
            bestScore: 0,
            bestRankedScore: 0,
            totalGamesPlayed: 0,
            totalRankedGames: 0,
            rank: null,
          }
        });
      }
      
      const allTimeRank = await db.select({ count: sql<number>`count(*)` })
        .from(flappyLeaderboard)
        .where(gte(flappyLeaderboard.bestScore, userStats[0].bestScore));
      
      res.json({ 
        success: true, 
        stats: {
          ...userStats[0],
          rank: Number(allTimeRank[0]?.count || 0),
        }
      });
    } catch (error) {
      console.error("User stats fetch error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch user stats" });
    }
  });

  app.post("/api/flappy/score", async (req: Request, res: Response) => {
    try {
      const { userId, score, coinsCollected = 0, isRanked = false, rankedPeriod = null, diamondEntryFee = 0 } = req.body;
      
      if (!userId || score === undefined) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }
      
      await db.insert(flappyScores).values({
        userId,
        score,
        coinsCollected,
        isRanked,
        diamondEntryFee,
      });
      
      const today = new Date().toISOString().split('T')[0];
      const weekStart = getWeekStart();
      
      const existing = await db.select()
        .from(flappyLeaderboard)
        .where(eq(flappyLeaderboard.userId, userId))
        .limit(1);
      
      if (existing.length > 0) {
        const current = existing[0];
        const updates: any = {
          totalGamesPlayed: current.totalGamesPlayed + 1,
          totalCoinsCollected: current.totalCoinsCollected + coinsCollected,
          updatedAt: new Date(),
        };
        
        if (score > current.bestScore) {
          updates.bestScore = score;
        }
        
        if (isRanked) {
          updates.totalRankedGames = current.totalRankedGames + 1;
          if (score > current.bestRankedScore) {
            updates.bestRankedScore = score;
          }
        }
        
        if (current.dailyBestDate !== today) {
          updates.dailyBestScore = score;
          updates.dailyBestDate = today;
        } else if (score > current.dailyBestScore) {
          updates.dailyBestScore = score;
        }
        
        if (!current.weeklyBestDate || current.weeklyBestDate < weekStart) {
          updates.weeklyBestScore = score;
          updates.weeklyBestDate = today;
        } else if (score > current.weeklyBestScore) {
          updates.weeklyBestScore = score;
        }
        
        await db.update(flappyLeaderboard)
          .set(updates)
          .where(eq(flappyLeaderboard.userId, userId));
      } else {
        const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        
        await db.insert(flappyLeaderboard).values({
          userId,
          displayName: user[0]?.displayName || null,
          bestScore: score,
          bestRankedScore: isRanked ? score : 0,
          totalGamesPlayed: 1,
          totalRankedGames: isRanked ? 1 : 0,
          totalCoinsCollected: coinsCollected,
          dailyBestScore: score,
          dailyBestDate: today,
          weeklyBestScore: score,
          weeklyBestDate: today,
        });
      }
      
      // Update competition entry if this is a ranked game
      if (isRanked && rankedPeriod) {
        const periodDate = rankedPeriod === 'daily' ? today : getWeekNumber();
        
        // Find the user's entry in the competition
        const entryResult = await db.select()
          .from(flappyRankedEntries)
          .where(and(
            eq(flappyRankedEntries.userId, userId),
            eq(flappyRankedEntries.period, rankedPeriod),
            eq(flappyRankedEntries.periodDate, periodDate)
          ))
          .limit(1);
        
        if (entryResult.length > 0) {
          const entry = entryResult[0];
          // Update best score if this score is higher
          if (score > entry.bestScore) {
            await db.update(flappyRankedEntries)
              .set({ 
                bestScore: score, 
                gamesPlayed: entry.gamesPlayed + 1
              })
              .where(eq(flappyRankedEntries.id, entry.id));
          } else {
            // Just increment games played
            await db.update(flappyRankedEntries)
              .set({ 
                gamesPlayed: entry.gamesPlayed + 1
              })
              .where(eq(flappyRankedEntries.id, entry.id));
          }
        }
      }
      
      await logUserActivity(
        userId,
        "game",
        "Flappy Roachy",
        `Score: ${score} points${isRanked ? " (Ranked)" : ""}`,
        coinsCollected,
        "coins"
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error("Score submit error:", error);
      res.status(500).json({ success: false, error: "Failed to submit score" });
    }
  });

  app.get("/api/flappy/inventory/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      const inventory = await db.select()
        .from(flappyPowerUpInventory)
        .where(eq(flappyPowerUpInventory.userId, userId))
        .limit(1);
      
      if (inventory.length === 0) {
        return res.json({
          success: true,
          inventory: { shieldCount: 0, doubleCount: 0, magnetCount: 0 }
        });
      }
      
      res.json({ success: true, inventory: inventory[0] });
    } catch (error) {
      console.error("Inventory fetch error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch inventory" });
    }
  });

  app.post("/api/flappy/inventory/add", async (req: Request, res: Response) => {
    try {
      const { userId, powerUpType, quantity = 1 } = req.body;
      
      if (!userId || !powerUpType) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }
      
      const existing = await db.select()
        .from(flappyPowerUpInventory)
        .where(eq(flappyPowerUpInventory.userId, userId))
        .limit(1);
      
      const columnMap: Record<string, string> = {
        shield: 'shieldCount',
        double: 'doubleCount',
        magnet: 'magnetCount',
      };
      
      const column = columnMap[powerUpType];
      if (!column) {
        return res.status(400).json({ success: false, error: "Invalid power-up type" });
      }
      
      if (existing.length > 0) {
        const current = existing[0] as any;
        const newValue = (current[column] || 0) + quantity;
        
        await db.update(flappyPowerUpInventory)
          .set({ [column]: newValue, updatedAt: new Date() })
          .where(eq(flappyPowerUpInventory.userId, userId));
      } else {
        await db.insert(flappyPowerUpInventory).values({
          userId,
          shieldCount: powerUpType === 'shield' ? quantity : 0,
          doubleCount: powerUpType === 'double' ? quantity : 0,
          magnetCount: powerUpType === 'magnet' ? quantity : 0,
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Inventory add error:", error);
      res.status(500).json({ success: false, error: "Failed to add to inventory" });
    }
  });

  app.post("/api/flappy/inventory/use", async (req: Request, res: Response) => {
    try {
      const { userId, powerUpType } = req.body;
      
      if (!userId || !powerUpType) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }
      
      const existing = await db.select()
        .from(flappyPowerUpInventory)
        .where(eq(flappyPowerUpInventory.userId, userId))
        .limit(1);
      
      if (existing.length === 0) {
        return res.status(400).json({ success: false, error: "No inventory found" });
      }
      
      const columnMap: Record<string, keyof typeof existing[0]> = {
        shield: 'shieldCount',
        double: 'doubleCount',
        magnet: 'magnetCount',
      };
      
      const column = columnMap[powerUpType];
      if (!column) {
        return res.status(400).json({ success: false, error: "Invalid power-up type" });
      }
      
      const current = existing[0][column] as number;
      if (current <= 0) {
        return res.status(400).json({ success: false, error: "Not enough power-ups" });
      }
      
      await db.update(flappyPowerUpInventory)
        .set({ [column]: current - 1, updatedAt: new Date() })
        .where(eq(flappyPowerUpInventory.userId, userId));
      
      res.json({ success: true, remaining: current - 1 });
    } catch (error) {
      console.error("Inventory use error:", error);
      res.status(500).json({ success: false, error: "Failed to use power-up" });
    }
  });

  app.post("/api/flappy/ranked/enter", async (req: Request, res: Response) => {
    try {
      const { userId, period = 'daily' } = req.body;
      
      if (!userId) {
        return res.status(400).json({ success: false, error: "Missing userId" });
      }
      
      if (period !== 'daily' && period !== 'weekly') {
        return res.status(400).json({ success: false, error: "Invalid period" });
      }
      
      const ENTRY_FEE = period === 'daily' ? 1 : 3;
      const periodDate = period === 'daily' ? getTodayDate() : getWeekNumber();
      
      const existingEntry = await db.select()
        .from(flappyRankedEntries)
        .where(and(
          eq(flappyRankedEntries.userId, userId),
          eq(flappyRankedEntries.period, period),
          eq(flappyRankedEntries.periodDate, periodDate)
        ))
        .limit(1);
      
      if (existingEntry.length > 0) {
        return res.json({ 
          success: true, 
          alreadyJoined: true,
          entryId: existingEntry[0].id,
          period,
          periodDate,
        });
      }
      
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      
      if (user.length === 0) {
        return res.status(404).json({ success: false, error: "User not found" });
      }
      
      const userData = user[0];
      console.log(`[Flappy] User lookup result:`, {
        userId,
        email: userData.email,
        googleId: userData.googleId,
        authProvider: userData.authProvider,
        displayName: userData.displayName,
      });
      
      // Check if user has Google credentials for webapp lookup
      if (!userData.googleId || !userData.email) {
        console.error(`[Flappy] User ${userId} has no Google credentials - cannot fetch webapp CHY`);
        return res.status(400).json({ 
          success: false, 
          error: "Google sign-in required for competitions. Please log out and sign in with Google." 
        });
      }
      
      // Fetch CHY balance from webapp using user's googleId/email
      const chyBalance = await getWebappChyBalanceForUser({
        googleId: userData.googleId,
        email: userData.email,
        displayName: userData.displayName,
      });
      console.log(`[Flappy] User ${userId} (${userData.email}) CHY balance from webapp: ${chyBalance}, entry fee: ${ENTRY_FEE}`);
      
      if (chyBalance < ENTRY_FEE) {
        return res.status(400).json({ success: false, error: "Not enough CHY" });
      }
      
      // Deduct entry fee via webapp
      const deductSuccess = await deductWebappChy(
        { googleId: userData.googleId, email: userData.email, displayName: userData.displayName },
        ENTRY_FEE,
        `Flappy ${period} competition entry`
      );
      
      if (!deductSuccess) {
        console.error(`[Flappy] Failed to deduct CHY for user ${userId}`);
        return res.status(400).json({ success: false, error: "Failed to deduct CHY entry fee" });
      }
      
      const [newEntry] = await db.insert(flappyRankedEntries).values({
        userId,
        period,
        periodDate,
        entryFee: ENTRY_FEE,
        bestScore: 0,
        gamesPlayed: 0,
      }).returning();
      
      res.json({ 
        success: true, 
        alreadyJoined: false,
        entryFee: ENTRY_FEE, 
        newBalance: chyBalance - ENTRY_FEE,
        entryId: newEntry.id,
        period,
        periodDate,
      });
    } catch (error) {
      console.error("Ranked entry error:", error);
      res.status(500).json({ success: false, error: "Failed to enter ranked" });
    }
  });

  app.get("/api/flappy/ranked/status", async (req: Request, res: Response) => {
    try {
      const { userId } = req.query;
      const today = getTodayDate();
      const weekNumber = getWeekNumber();
      
      const dailyParticipants = await db.select({ count: sql<number>`count(*)` })
        .from(flappyRankedEntries)
        .where(and(
          eq(flappyRankedEntries.period, 'daily'),
          eq(flappyRankedEntries.periodDate, today)
        ));
      
      const weeklyParticipants = await db.select({ count: sql<number>`count(*)` })
        .from(flappyRankedEntries)
        .where(and(
          eq(flappyRankedEntries.period, 'weekly'),
          eq(flappyRankedEntries.periodDate, weekNumber)
        ));
      
      const dailyTopScore = await db.select()
        .from(flappyRankedEntries)
        .where(and(
          eq(flappyRankedEntries.period, 'daily'),
          eq(flappyRankedEntries.periodDate, today)
        ))
        .orderBy(desc(flappyRankedEntries.bestScore))
        .limit(1);
      
      const weeklyTopScore = await db.select()
        .from(flappyRankedEntries)
        .where(and(
          eq(flappyRankedEntries.period, 'weekly'),
          eq(flappyRankedEntries.periodDate, weekNumber)
        ))
        .orderBy(desc(flappyRankedEntries.bestScore))
        .limit(1);
      
      let hasJoinedDaily = false;
      let hasJoinedWeekly = false;
      let userDailyScore = 0;
      let userDailyRank = 0;
      let userWeeklyScore = 0;
      let userWeeklyRank = 0;
      
      if (userId && typeof userId === 'string') {
        const dailyEntry = await db.select()
          .from(flappyRankedEntries)
          .where(and(
            eq(flappyRankedEntries.userId, userId),
            eq(flappyRankedEntries.period, 'daily'),
            eq(flappyRankedEntries.periodDate, today)
          ))
          .limit(1);
        
        const weeklyEntry = await db.select()
          .from(flappyRankedEntries)
          .where(and(
            eq(flappyRankedEntries.userId, userId),
            eq(flappyRankedEntries.period, 'weekly'),
            eq(flappyRankedEntries.periodDate, weekNumber)
          ))
          .limit(1);
        
        hasJoinedDaily = dailyEntry.length > 0;
        hasJoinedWeekly = weeklyEntry.length > 0;
        
        if (hasJoinedDaily && dailyEntry[0]) {
          userDailyScore = dailyEntry[0].bestScore;
          const dailyRankResult = await db.select({ count: sql<number>`count(*)` })
            .from(flappyRankedEntries)
            .where(and(
              eq(flappyRankedEntries.period, 'daily'),
              eq(flappyRankedEntries.periodDate, today),
              sql`${flappyRankedEntries.bestScore} > ${userDailyScore}`
            ));
          userDailyRank = Number(dailyRankResult[0]?.count || 0) + 1;
        }
        
        if (hasJoinedWeekly && weeklyEntry[0]) {
          userWeeklyScore = weeklyEntry[0].bestScore;
          const weeklyRankResult = await db.select({ count: sql<number>`count(*)` })
            .from(flappyRankedEntries)
            .where(and(
              eq(flappyRankedEntries.period, 'weekly'),
              eq(flappyRankedEntries.periodDate, weekNumber),
              sql`${flappyRankedEntries.bestScore} > ${userWeeklyScore}`
            ));
          userWeeklyRank = Number(weeklyRankResult[0]?.count || 0) + 1;
        }
      }
      
      const dailyParticipantCount = Number(dailyParticipants[0]?.count || 0);
      const weeklyParticipantCount = Number(weeklyParticipants[0]?.count || 0);
      const dailyPrizePool = dailyParticipantCount * 1;
      const weeklyPrizePool = weeklyParticipantCount * 3;
      
      res.json({
        success: true,
        daily: {
          entryFee: 1,
          participants: dailyParticipantCount,
          prizePool: dailyPrizePool,
          topScore: dailyTopScore[0]?.bestScore || 0,
          endsIn: getTimeUntilMidnight(),
          hasJoined: hasJoinedDaily,
          periodDate: today,
          userScore: userDailyScore,
          userRank: userDailyRank,
        },
        weekly: {
          entryFee: 3,
          participants: weeklyParticipantCount,
          prizePool: weeklyPrizePool,
          topScore: weeklyTopScore[0]?.bestScore || 0,
          endsIn: getTimeUntilWeekEnd(),
          hasJoined: hasJoinedWeekly,
          periodDate: weekNumber,
          userScore: userWeeklyScore,
          userRank: userWeeklyRank,
        },
      });
    } catch (error) {
      console.error("Ranked status error:", error);
      res.status(500).json({ success: false, error: "Failed to get ranked status" });
    }
  });
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(now.setDate(diff));
  return weekStart.toISOString().split('T')[0];
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getWeekNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

function getTimeUntilMidnight(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.getTime() - now.getTime();
}

function getTimeUntilWeekEnd(): number {
  const now = new Date();
  const day = now.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);
  return nextMonday.getTime() - now.getTime();
}
