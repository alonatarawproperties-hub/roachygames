import type { Express } from "express";
import { db } from "./db";
import { playerEconomy, dailyLoginBonus, dailyLoginHistory } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

const DAILY_BONUS_REWARDS: Record<number, number> = {
  1: 1,
  2: 1,
  3: 1,
  4: 2,
  5: 2,
  6: 2,
  7: 3,
};

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

function getDiamondRewardForDay(streakDay: number): number {
  const dayInCycle = ((streakDay - 1) % 7) + 1;
  return DAILY_BONUS_REWARDS[dayInCycle] || 1;
}

export function registerEconomyRoutes(app: Express) {
  app.get("/api/economy/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      let economy = await db.query.playerEconomy.findFirst({
        where: eq(playerEconomy.walletAddress, walletAddress),
      });
      
      if (!economy) {
        const [newEconomy] = await db.insert(playerEconomy)
          .values({ walletAddress, diamonds: 0, chy: 0 })
          .returning();
        economy = newEconomy;
      }
      
      res.json(economy);
    } catch (error) {
      console.error("[Economy] Error fetching economy:", error);
      res.status(500).json({ error: "Failed to fetch economy" });
    }
  });

  app.get("/api/daily-bonus/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const today = getTodayDateString();
      const yesterday = getYesterdayDateString();
      
      let bonusRecord = await db.query.dailyLoginBonus.findFirst({
        where: eq(dailyLoginBonus.walletAddress, walletAddress),
      });
      
      if (!bonusRecord) {
        const [newRecord] = await db.insert(dailyLoginBonus)
          .values({ 
            walletAddress, 
            currentStreak: 0,
            longestStreak: 0,
            lastClaimDate: null,
            totalClaims: 0,
            totalDiamondsFromBonus: 0,
          })
          .returning();
        bonusRecord = newRecord;
      }
      
      const canClaim = bonusRecord.lastClaimDate !== today;
      
      let effectiveStreak = bonusRecord.currentStreak;
      if (bonusRecord.lastClaimDate && bonusRecord.lastClaimDate !== yesterday && bonusRecord.lastClaimDate !== today) {
        effectiveStreak = 0;
      }
      
      const nextStreakDay = effectiveStreak + 1;
      const nextReward = getDiamondRewardForDay(nextStreakDay);
      
      const weeklyRewards = [];
      for (let i = 1; i <= 7; i++) {
        weeklyRewards.push({
          day: i,
          diamonds: DAILY_BONUS_REWARDS[i],
          claimed: canClaim ? i <= effectiveStreak : i <= bonusRecord.currentStreak,
          isToday: canClaim && i === nextStreakDay,
        });
      }
      
      res.json({
        currentStreak: effectiveStreak,
        longestStreak: bonusRecord.longestStreak,
        lastClaimDate: bonusRecord.lastClaimDate,
        canClaim,
        nextReward,
        nextStreakDay,
        weeklyRewards,
        totalClaims: bonusRecord.totalClaims,
        totalDiamondsFromBonus: bonusRecord.totalDiamondsFromBonus,
      });
    } catch (error) {
      console.error("[DailyBonus] Error fetching bonus status:", error);
      res.status(500).json({ error: "Failed to fetch daily bonus status" });
    }
  });

  app.post("/api/daily-bonus/claim", async (req, res) => {
    try {
      const { walletAddress } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address required" });
      }
      
      const today = getTodayDateString();
      const yesterday = getYesterdayDateString();
      
      let bonusRecord = await db.query.dailyLoginBonus.findFirst({
        where: eq(dailyLoginBonus.walletAddress, walletAddress),
      });
      
      if (!bonusRecord) {
        const [newRecord] = await db.insert(dailyLoginBonus)
          .values({ walletAddress, currentStreak: 0 })
          .returning();
        bonusRecord = newRecord;
      }
      
      if (bonusRecord.lastClaimDate === today) {
        return res.status(400).json({ error: "Already claimed today", alreadyClaimed: true });
      }
      
      let newStreak = 1;
      if (bonusRecord.lastClaimDate === yesterday) {
        newStreak = bonusRecord.currentStreak + 1;
      }
      
      const diamondReward = getDiamondRewardForDay(newStreak);
      const newLongestStreak = Math.max(bonusRecord.longestStreak, newStreak);
      
      await db.update(dailyLoginBonus)
        .set({
          currentStreak: newStreak,
          longestStreak: newLongestStreak,
          lastClaimDate: today,
          totalClaims: bonusRecord.totalClaims + 1,
          totalDiamondsFromBonus: bonusRecord.totalDiamondsFromBonus + diamondReward,
          updatedAt: sql`now()`,
        })
        .where(eq(dailyLoginBonus.walletAddress, walletAddress));
      
      await db.insert(dailyLoginHistory).values({
        walletAddress,
        claimDate: today,
        streakDay: newStreak,
        diamondsAwarded: diamondReward,
      });
      
      let economy = await db.query.playerEconomy.findFirst({
        where: eq(playerEconomy.walletAddress, walletAddress),
      });
      
      if (!economy) {
        await db.insert(playerEconomy)
          .values({ walletAddress, diamonds: diamondReward, chy: 0, totalDiamondsEarned: diamondReward });
      } else {
        await db.update(playerEconomy)
          .set({
            diamonds: economy.diamonds + diamondReward,
            totalDiamondsEarned: economy.totalDiamondsEarned + diamondReward,
            updatedAt: sql`now()`,
          })
          .where(eq(playerEconomy.walletAddress, walletAddress));
      }
      
      const updatedEconomy = await db.query.playerEconomy.findFirst({
        where: eq(playerEconomy.walletAddress, walletAddress),
      });
      
      console.log(`[DailyBonus] ${walletAddress} claimed day ${newStreak} bonus: ${diamondReward} diamonds`);
      
      res.json({
        success: true,
        diamondsAwarded: diamondReward,
        newStreak,
        longestStreak: newLongestStreak,
        totalDiamonds: updatedEconomy?.diamonds || diamondReward,
      });
    } catch (error) {
      console.error("[DailyBonus] Error claiming bonus:", error);
      res.status(500).json({ error: "Failed to claim daily bonus" });
    }
  });

  app.get("/api/economy/leaderboard/diamonds", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      
      const leaderboard = await db.select()
        .from(playerEconomy)
        .orderBy(sql`${playerEconomy.diamonds} DESC`)
        .limit(limit);
      
      res.json(leaderboard);
    } catch (error) {
      console.error("[Economy] Error fetching leaderboard:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });
}
