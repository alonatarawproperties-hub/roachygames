import type { Express, Request } from "express";
import { db } from "./db";
import { playerEconomy, dailyLoginBonus, dailyLoginHistory, dailyBonusFraudTracking, users } from "../shared/schema";
import { eq, sql, and, or, gte } from "drizzle-orm";
import { getAllTokenBalances, getRoachyBalance, getDiamondBalance, isValidSolanaAddress } from "./solana-service";
import { SOLANA_TOKENS } from "../shared/solana-tokens";
import { distributeDailyBonus } from "./rewards-integration";

const DAILY_BONUS_REWARDS: Record<number, number> = {
  1: 1,
  2: 1,
  3: 1,
  4: 2,
  5: 2,
  6: 2,
  7: 3,
};

const MAX_CLAIMS_PER_DEVICE_PER_DAY = 1;
const NEW_ACCOUNT_COOLDOWN_HOURS = 24;
const EMAIL_VERIFICATION_REQUIRED_AFTER_DAY = 3;

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
      const { walletAddress, deviceFingerprint, userId } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address required" });
      }
      
      const clientIp = getClientIp(req);
      const ipSubnet = getIpSubnet(clientIp);
      const userAgent = req.headers["user-agent"] || "unknown";
      const today = getTodayDateString();
      const yesterday = getYesterdayDateString();
      
      const fraudFlags: string[] = [];
      
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
            if (linkedWallets.length >= 3) {
              console.log(`[AntiExploit] Device ${deviceFingerprint} has ${linkedWallets.length} linked wallets - suspicious`);
              fraudFlags.push("multiple_wallets");
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
        newStreak = bonusRecord.currentStreak + 1;
      }
      
      if (newStreak > EMAIL_VERIFICATION_REQUIRED_AFTER_DAY && userId) {
        const user = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });
        
        if (user && !user.isEmailVerified) {
          console.log(`[AntiExploit] Email verification required for day ${newStreak} bonus: ${walletAddress}`);
          return res.status(403).json({ 
            error: `Email verification required for Day ${newStreak}+ bonuses`,
            emailVerificationRequired: true,
            currentStreak: newStreak - 1
          });
        }
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
      
      console.log(`[DailyBonus] ${walletAddress} claimed day ${newStreak} bonus: ${diamondReward} diamonds${fraudFlags.length > 0 ? ` (flags: ${fraudFlags.join(", ")})` : ""}`);
      
      let blockchainResult: { success: boolean; transactionSignature?: string } = { success: false };
      try {
        blockchainResult = await distributeDailyBonus(walletAddress, diamondReward, newStreak);
        if (blockchainResult.success) {
          console.log(`[DailyBonus] On-chain transfer successful: ${blockchainResult.transactionSignature}`);
        } else {
          console.log(`[DailyBonus] On-chain transfer failed, rewards tracked in database only`);
        }
      } catch (err) {
        console.error(`[DailyBonus] On-chain transfer error:`, err);
      }
      
      res.json({
        success: true,
        diamondsAwarded: diamondReward,
        newStreak,
        longestStreak: newLongestStreak,
        totalDiamonds: updatedEconomy?.diamonds || diamondReward,
        blockchain: {
          success: blockchainResult.success,
          transactionSignature: blockchainResult.transactionSignature,
        },
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
        const diamonds = record.diamondsAwarded || 0;
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
}
