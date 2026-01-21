import type { Express, Request } from "express";
import { db } from "./db";
import { playerEconomy, dailyLoginBonus, dailyLoginHistory, dailyBonusFraudTracking, users, userActivityLog } from "../shared/schema";
import { eq, sql, and, or, gte, desc } from "drizzle-orm";
import { getAllTokenBalances, getRoachyBalance, getDiamondBalance, isValidSolanaAddress } from "./solana-service";
import { SOLANA_TOKENS } from "../shared/solana-tokens";
import { distributeDailyBonus } from "./rewards-integration";

const DAILY_BONUS_REWARDS: Record<number, number> = {
  1: 0.1,
  2: 0.15,
  3: 0.2,
  4: 0.25,
  5: 0.3,
  6: 0.4,
  7: 0.6,
};

const MAX_CLAIMS_PER_DEVICE_PER_DAY = 1;
const MAX_CLAIMS_PER_IP_SUBNET_PER_DAY = 3;
const MAX_WALLETS_PER_DEVICE = 3;
const NEW_ACCOUNT_COOLDOWN_HOURS = 24;

function getIpSubnet(ip: string): string {
  if (!ip) return "unknown";
  const parts = ip.split(".");
  if (parts.length >= 3) {
    return `${parts[0]}.${parts[1]}.${parts[2]}`;
  }
  return ip.split(":").slice(0, 4).join(":");
}

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

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
          .values({ walletAddress, diamonds: "0", chy: "0" })
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
            totalDiamondsFromBonus: "0",
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
          coins: DAILY_BONUS_REWARDS[i],
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
      const { walletAddress, deviceFingerprint, userId } = req.body;
      
      if (!walletAddress) {
        return res.status(401).json({ error: "UNAUTHORIZED" });
      }
      
      const clientIp = getClientIp(req);
      const ipSubnet = getIpSubnet(clientIp);
      const userAgent = req.headers["user-agent"] || "unknown";
      const today = getTodayDateString();
      const yesterday = getYesterdayDateString();
      
      const fraudFlags: string[] = [];
      
      const isIPv6 = clientIp.includes(':');
      const subnetPattern = isIPv6 ? `${ipSubnet}:%` : `${ipSubnet}.%`;
      
      const ipSubnetClaims = await db.query.dailyLoginHistory.findMany({
        where: and(
          eq(dailyLoginHistory.claimDate, today),
          sql`${dailyLoginHistory.ipAddress} LIKE ${subnetPattern}`
        ),
      });
      
      if (ipSubnetClaims.length >= MAX_CLAIMS_PER_IP_SUBNET_PER_DAY) {
        console.log(`[AntiExploit] IP subnet ${ipSubnet} blocked - ${ipSubnetClaims.length} claims today`);
        return res.status(429).json({ 
          error: "Too many claims from this network today",
          fraudBlocked: true,
          retryAfter: "24 hours"
        });
      }
      
      if (deviceFingerprint) {
        const existingFraudRecord = await db.query.dailyBonusFraudTracking.findFirst({
          where: eq(dailyBonusFraudTracking.deviceFingerprint, deviceFingerprint),
        });
        
        if (existingFraudRecord) {
          const lastResetDate = existingFraudRecord.lastResetDate;
          const needsReset = lastResetDate !== today;
          
          if (needsReset) {
            await db.update(dailyBonusFraudTracking)
              .set({ 
                claimsToday: 0, 
                lastResetDate: today,
                updatedAt: sql`now()`,
              })
              .where(eq(dailyBonusFraudTracking.id, existingFraudRecord.id));
          } else if (existingFraudRecord.claimsToday >= MAX_CLAIMS_PER_DEVICE_PER_DAY) {
            console.log(`[AntiExploit] Device ${deviceFingerprint} blocked - exceeded daily limit`);
            fraudFlags.push("device_limit_exceeded");
            return res.status(429).json({ 
              error: "Daily bonus limit reached for this device",
              fraudBlocked: true,
              retryAfter: "24 hours"
            });
          }
          
          if (existingFraudRecord.isFlagged) {
            console.log(`[AntiExploit] Flagged device attempting claim: ${deviceFingerprint}`);
            fraudFlags.push("flagged_device");
          }
          
          const linkedWallets = existingFraudRecord.linkedWallets 
            ? JSON.parse(existingFraudRecord.linkedWallets) as string[]
            : [];
          if (!linkedWallets.includes(walletAddress)) {
            if (linkedWallets.length >= MAX_WALLETS_PER_DEVICE - 1) {
              console.log(`[AntiExploit] Device ${deviceFingerprint} BLOCKED - already has ${linkedWallets.length} wallets (max ${MAX_WALLETS_PER_DEVICE - 1} allowed for new)`);
              return res.status(429).json({ 
                error: "Too many accounts on this device",
                fraudBlocked: true,
                retryAfter: "permanent"
              });
            }
            linkedWallets.push(walletAddress);
            await db.update(dailyBonusFraudTracking)
              .set({ 
                linkedWallets: JSON.stringify(linkedWallets),
                updatedAt: sql`now()`,
              })
              .where(eq(dailyBonusFraudTracking.id, existingFraudRecord.id));
          }
        } else {
          await db.insert(dailyBonusFraudTracking).values({
            deviceFingerprint,
            ipSubnet,
            claimsToday: 0,
            claimsThisWeek: 0,
            linkedWallets: JSON.stringify([walletAddress]),
            lastResetDate: today,
          });
        }
      }
      
      let bonusRecord = await db.query.dailyLoginBonus.findFirst({
        where: eq(dailyLoginBonus.walletAddress, walletAddress),
      });
      
      if (!bonusRecord) {
        const [newRecord] = await db.insert(dailyLoginBonus)
          .values({ walletAddress, currentStreak: 0 })
          .returning();
        bonusRecord = newRecord;
      }
      
      const bonusAccountAge = (Date.now() - bonusRecord.createdAt.getTime()) / (1000 * 60 * 60);
      if (bonusAccountAge < NEW_ACCOUNT_COOLDOWN_HOURS) {
        const hoursRemaining = Math.ceil(NEW_ACCOUNT_COOLDOWN_HOURS - bonusAccountAge);
        console.log(`[AntiExploit] New account cooldown: ${walletAddress}, ${hoursRemaining}h remaining`);
        return res.status(403).json({ 
          error: `New accounts must wait ${hoursRemaining} hours before claiming daily bonus`,
          newAccountCooldown: true,
          hoursRemaining
        });
      }
      
      if (bonusRecord.lastClaimDate === today) {
        return res.status(400).json({ error: "Already claimed today", alreadyClaimed: true });
      }
      
      let newStreak = 1;
      if (bonusRecord.lastClaimDate === yesterday) {
        if (bonusRecord.currentStreak >= 7) {
          newStreak = 1;
        } else {
          newStreak = bonusRecord.currentStreak + 1;
        }
      }
      
      const diamondReward = getDiamondRewardForDay(newStreak);
      const newLongestStreak = Math.max(bonusRecord.longestStreak, newStreak);
      const currentTotalFromBonus = parseFloat(bonusRecord.totalDiamondsFromBonus) || 0;
      
      await db.update(dailyLoginBonus)
        .set({
          currentStreak: newStreak,
          longestStreak: newLongestStreak,
          lastClaimDate: today,
          totalClaims: bonusRecord.totalClaims + 1,
          totalDiamondsFromBonus: String(currentTotalFromBonus + diamondReward),
          updatedAt: sql`now()`,
        })
        .where(eq(dailyLoginBonus.walletAddress, walletAddress));
      
      await db.insert(dailyLoginHistory).values({
        walletAddress,
        claimDate: today,
        streakDay: newStreak,
        diamondsAwarded: String(diamondReward),
        deviceFingerprint: deviceFingerprint || null,
        ipAddress: clientIp,
        userAgent: userAgent,
        fraudFlags: fraudFlags.length > 0 ? JSON.stringify(fraudFlags) : null,
      });
      
      if (deviceFingerprint) {
        await db.update(dailyBonusFraudTracking)
          .set({ 
            claimsToday: sql`claims_today + 1`,
            claimsThisWeek: sql`claims_this_week + 1`,
            lastClaimAt: sql`now()`,
            updatedAt: sql`now()`,
          })
          .where(eq(dailyBonusFraudTracking.deviceFingerprint, deviceFingerprint));
      }
      
      let economy = await db.query.playerEconomy.findFirst({
        where: eq(playerEconomy.walletAddress, walletAddress),
      });
      
      if (!economy) {
        await db.insert(playerEconomy)
          .values({ walletAddress, diamonds: String(diamondReward), chy: "0", totalDiamondsEarned: String(diamondReward) });
      } else {
        const currentDiamonds = parseFloat(economy.diamonds) || 0;
        const currentTotalEarned = parseFloat(economy.totalDiamondsEarned) || 0;
        await db.update(playerEconomy)
          .set({
            diamonds: String(currentDiamonds + diamondReward),
            totalDiamondsEarned: String(currentTotalEarned + diamondReward),
            updatedAt: sql`now()`,
          })
          .where(eq(playerEconomy.walletAddress, walletAddress));
      }
      
      const updatedEconomy = await db.query.playerEconomy.findFirst({
        where: eq(playerEconomy.walletAddress, walletAddress),
      });
      
      console.log(`[DailyBonus] ${walletAddress} claimed day ${newStreak} bonus: ${diamondReward} diamonds${fraudFlags.length > 0 ? ` (flags: ${fraudFlags.join(", ")})` : ""}`);
      
      let blockchainResult: { success: boolean; transactionSignature?: string; error?: string } = { success: false };
      try {
        blockchainResult = await distributeDailyBonus(walletAddress, diamondReward, newStreak);
        if (blockchainResult.success) {
          console.log(`[DailyBonus] CHY distribution successful: ${blockchainResult.transactionSignature}`);
        } else {
          console.error(`[DailyBonus] CHY distribution failed: ${blockchainResult.error || 'Unknown error'}`);
        }
      } catch (err) {
        console.error(`[DailyBonus] CHY distribution error:`, err);
        blockchainResult = { success: false, error: err instanceof Error ? err.message : 'Distribution failed' };
      }
      
      if (userId) {
        await logUserActivity(
          userId,
          "reward",
          "Daily Bonus",
          `Login streak: ${newStreak} days`,
          diamondReward,
          "diamond"
        );
      }
      
      const totalCoinsValue = updatedEconomy ? parseFloat(updatedEconomy.diamonds) : diamondReward;
      
      res.json({
        success: true,
        coinsAwarded: diamondReward,
        diamondsAwarded: diamondReward,
        newStreak,
        longestStreak: newLongestStreak,
        totalCoins: totalCoinsValue,
        totalDiamonds: totalCoinsValue,
        blockchain: {
          success: blockchainResult.success,
          transactionSignature: blockchainResult.transactionSignature,
          error: blockchainResult.error,
        },
        chyDistributed: blockchainResult.success,
        distributionNote: blockchainResult.success 
          ? "CHY credited to your account" 
          : "Bonus recorded - CHY will be credited shortly",
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

  app.get("/api/blockchain/balances/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      if (!isValidSolanaAddress(walletAddress)) {
        return res.status(400).json({ error: "Invalid Solana wallet address" });
      }
      
      const balances = await getAllTokenBalances(walletAddress);
      
      res.json({
        wallet: walletAddress,
        tokens: {
          roachy: {
            balance: balances.roachy,
            mint: SOLANA_TOKENS.ROACHY.mint,
            symbol: SOLANA_TOKENS.ROACHY.symbol,
            decimals: SOLANA_TOKENS.ROACHY.decimals,
          },
          diamond: {
            balance: balances.diamond,
            mint: SOLANA_TOKENS.DIAMOND.mint,
            symbol: SOLANA_TOKENS.DIAMOND.symbol,
            decimals: SOLANA_TOKENS.DIAMOND.decimals,
          },
        },
        sol: balances.solBalance,
        source: "blockchain",
        network: "mainnet-beta",
      });
    } catch (error) {
      console.error("[Blockchain] Error fetching balances:", error);
      res.status(500).json({ error: "Failed to fetch blockchain balances" });
    }
  });

  app.get("/api/blockchain/token-info", async (req, res) => {
    res.json({
      tokens: [
        {
          name: SOLANA_TOKENS.ROACHY.name,
          symbol: SOLANA_TOKENS.ROACHY.symbol,
          mint: SOLANA_TOKENS.ROACHY.mint,
          decimals: SOLANA_TOKENS.ROACHY.decimals,
          description: SOLANA_TOKENS.ROACHY.description,
        },
        {
          name: SOLANA_TOKENS.DIAMOND.name,
          symbol: SOLANA_TOKENS.DIAMOND.symbol,
          mint: SOLANA_TOKENS.DIAMOND.mint,
          decimals: SOLANA_TOKENS.DIAMOND.decimals,
          description: SOLANA_TOKENS.DIAMOND.description,
        },
      ],
      network: "mainnet-beta",
    });
  });

  app.get("/api/earnings/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const walletAddress = user.walletAddress;
      
      if (!walletAddress) {
        return res.json({
          today: 0,
          week: 0,
          allTime: 0,
          todayChange: 0,
          weekChange: 0,
        });
      }

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];

      const yesterdayDate = new Date(today);
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

      const twoWeeksAgo = new Date(today);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const twoWeeksAgoStr = twoWeeksAgo.toISOString().split('T')[0];

      const allHistory = await db.select()
        .from(dailyLoginHistory)
        .where(eq(dailyLoginHistory.walletAddress, walletAddress));

      let todayEarnings = 0;
      let yesterdayEarnings = 0;
      let weekEarnings = 0;
      let lastWeekEarnings = 0;
      let allTimeEarnings = 0;

      for (const record of allHistory) {
        const diamonds = parseFloat(record.diamondsAwarded) || 0;
        allTimeEarnings += diamonds;

        if (record.claimDate === todayStr) {
          todayEarnings += diamonds;
        }
        if (record.claimDate === yesterdayStr) {
          yesterdayEarnings += diamonds;
        }
        if (record.claimDate >= weekAgoStr) {
          weekEarnings += diamonds;
        }
        if (record.claimDate >= twoWeeksAgoStr && record.claimDate < weekAgoStr) {
          lastWeekEarnings += diamonds;
        }
      }

      const todayChange = yesterdayEarnings > 0 
        ? Math.round(((todayEarnings - yesterdayEarnings) / yesterdayEarnings) * 100)
        : todayEarnings > 0 ? 100 : 0;

      const weekChange = lastWeekEarnings > 0
        ? Math.round(((weekEarnings - lastWeekEarnings) / lastWeekEarnings) * 100)
        : weekEarnings > 0 ? 100 : 0;

      res.json({
        today: todayEarnings,
        week: weekEarnings,
        allTime: allTimeEarnings,
        todayChange: Math.max(0, todayChange),
        weekChange: Math.max(0, weekChange),
      });
    } catch (error) {
      console.error("[Earnings] Error fetching earnings:", error);
      res.status(500).json({ error: "Failed to fetch earnings" });
    }
  });

  app.post("/api/dev/give-diamonds", async (req, res) => {
    try {
      const { userId, amount = 500 } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "userId required" });
      }
      
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const newBalance = user.diamondBalance + amount;
      
      await db.update(users)
        .set({ diamondBalance: newBalance, updatedAt: sql`now()` })
        .where(eq(users.id, userId));
      
      console.log(`[Dev] Gave ${amount} diamonds to user ${userId}. New balance: ${newBalance}`);
      
      res.json({ 
        success: true, 
        previousBalance: user.diamondBalance,
        added: amount,
        newBalance 
      });
    } catch (error) {
      console.error("[Dev] Error giving diamonds:", error);
      res.status(500).json({ error: "Failed to give diamonds" });
    }
  });

  app.get("/api/user/:userId/diamonds", async (req, res) => {
    try {
      const { userId } = req.params;
      
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({ 
        success: true, 
        userId,
        diamondBalance: user.diamondBalance 
      });
    } catch (error) {
      console.error("[Economy] Error fetching diamond balance:", error);
      res.status(500).json({ error: "Failed to fetch diamond balance" });
    }
  });

  app.get("/api/user/:userId/activity", async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const activities = await db
        .select()
        .from(userActivityLog)
        .where(eq(userActivityLog.userId, userId))
        .orderBy(desc(userActivityLog.createdAt))
        .limit(limit);
      
      const formattedActivities = activities.map(activity => ({
        id: activity.id,
        type: activity.activityType,
        title: activity.title,
        subtitle: activity.subtitle || "",
        amount: activity.amount ? `+${activity.amount} CHY` : undefined,
        timestamp: getRelativeTime(activity.createdAt),
      }));
      
      res.json({ 
        success: true, 
        activities: formattedActivities 
      });
    } catch (error) {
      console.error("[Economy] Error fetching activity:", error);
      res.status(500).json({ error: "Failed to fetch activity" });
    }
  });
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export async function logUserActivity(
  userId: string,
  activityType: string,
  title: string,
  subtitle?: string,
  amount?: number,
  amountType: string = "chy",
  metadata?: Record<string, any>
) {
  try {
    await db.insert(userActivityLog).values({
      userId,
      activityType,
      title,
      subtitle,
      amount,
      amountType,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });
  } catch (error) {
    console.error("[Activity] Error logging activity:", error);
  }
}
