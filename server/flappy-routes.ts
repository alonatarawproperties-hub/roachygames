import { Express, Request, Response } from "express";
import { db } from "./db";
import {
  flappyScores,
  flappyLeaderboard,
  flappyPowerUpInventory,
  flappyRankedCompetitions,
  users,
} from "@shared/schema";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";

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
      const { userId, score, coinsCollected = 0, isRanked = false, diamondEntryFee = 0 } = req.body;
      
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
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ success: false, error: "Missing userId" });
      }
      
      const ENTRY_FEE = 1;
      
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      
      if (user.length === 0) {
        return res.status(404).json({ success: false, error: "User not found" });
      }
      
      if (user[0].diamondBalance < ENTRY_FEE) {
        return res.status(400).json({ success: false, error: "Not enough diamonds" });
      }
      
      await db.update(users)
        .set({ diamondBalance: user[0].diamondBalance - ENTRY_FEE })
        .where(eq(users.id, userId));
      
      res.json({ success: true, entryFee: ENTRY_FEE, newBalance: user[0].diamondBalance - ENTRY_FEE });
    } catch (error) {
      console.error("Ranked entry error:", error);
      res.status(500).json({ success: false, error: "Failed to enter ranked" });
    }
  });

  app.get("/api/flappy/ranked/status", async (_req: Request, res: Response) => {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      const dailyParticipants = await db.select({ count: sql<number>`count(*)` })
        .from(flappyLeaderboard)
        .where(eq(flappyLeaderboard.dailyBestDate, today));
      
      const dailyTopScore = await db.select()
        .from(flappyLeaderboard)
        .where(eq(flappyLeaderboard.dailyBestDate, today))
        .orderBy(desc(flappyLeaderboard.dailyBestScore))
        .limit(1);
      
      res.json({
        success: true,
        entryFee: 1,
        participants: Number(dailyParticipants[0]?.count || 0),
        topScore: dailyTopScore[0]?.dailyBestScore || 0,
        endsIn: getTimeUntilMidnight(),
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

function getTimeUntilMidnight(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.getTime() - now.getTime();
}
