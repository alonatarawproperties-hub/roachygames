import type { Express, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { users, playerEconomy } from "../shared/schema";
import { eq, sql } from "drizzle-orm";
import { logUserActivity } from "./economy-routes";

const EXCHANGE_RATES = {
  CHY_TO_DIAMOND: 1,
  ROACHY_TO_DIAMOND: 5000,
};

function verifyWebappSecret(req: Request, res: Response, next: NextFunction) {
  const secret = req.headers["x-api-secret"] || req.headers["x-mobile-app-secret"];
  const expectedSecret = process.env.MOBILE_APP_SECRET;
  
  if (!expectedSecret) {
    console.error("[WebappAPI] MOBILE_APP_SECRET not configured");
    return res.status(500).json({ error: "Server configuration error" });
  }
  
  if (secret !== expectedSecret) {
    console.warn("[WebappAPI] Invalid secret attempted");
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  next();
}

export function registerWebappRoutes(app: Express) {
  app.post("/api/web/oauth/exchange", verifyWebappSecret, async (req: Request, res: Response) => {
    try {
      const { googleId, email, displayName } = req.body;
      
      if (!googleId || !email) {
        return res.status(400).json({ error: "googleId and email required" });
      }
      
      let user = await db.query.users.findFirst({
        where: eq(users.googleId, googleId),
      });
      
      if (!user) {
        user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });
        
        if (user) {
          await db.update(users)
            .set({ googleId, updatedAt: sql`now()` })
            .where(eq(users.id, user.id));
        }
      }
      
      if (!user) {
        const [newUser] = await db.insert(users).values({
          email,
          googleId,
          displayName: displayName || email.split("@")[0],
          authProvider: "google",
        }).returning();
        user = newUser;
        console.log(`[WebappAPI] Created new user from webapp: ${email}`);
      }
      
      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          walletAddress: user.walletAddress,
          diamondBalance: user.diamondBalance,
          chyBalance: user.chyBalance || 0,
        },
      });
    } catch (error) {
      console.error("[WebappAPI] OAuth exchange error:", error);
      res.status(500).json({ error: "Failed to exchange OAuth token" });
    }
  });

  app.post("/api/web/users/:userId/link-wallet", verifyWebappSecret, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { walletAddress, signature, message } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ error: "walletAddress required" });
      }
      
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const existingWallet = await db.query.users.findFirst({
        where: eq(users.walletAddress, walletAddress),
      });
      
      if (existingWallet && existingWallet.id !== userId) {
        return res.status(409).json({ error: "Wallet already linked to another account" });
      }
      
      await db.update(users)
        .set({ walletAddress, updatedAt: sql`now()` })
        .where(eq(users.id, userId));
      
      console.log(`[WebappAPI] Linked wallet ${walletAddress} to user ${userId}`);
      
      res.json({
        success: true,
        walletAddress,
      });
    } catch (error) {
      console.error("[WebappAPI] Link wallet error:", error);
      res.status(500).json({ error: "Failed to link wallet" });
    }
  });

  app.get("/api/web/users/:userId/balances", verifyWebappSecret, async (req: Request, res: Response) => {
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
        balances: {
          diamonds: user.diamondBalance || 0,
          chy: user.chyBalance || 0,
        },
        walletAddress: user.walletAddress,
      });
    } catch (error) {
      console.error("[WebappAPI] Get balances error:", error);
      res.status(500).json({ error: "Failed to fetch balances" });
    }
  });

  app.get("/api/web/users/:userId/diamonds", verifyWebappSecret, async (req: Request, res: Response) => {
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
        diamonds: user.diamondBalance || 0,
      });
    } catch (error) {
      console.error("[WebappAPI] Get diamonds error:", error);
      res.status(500).json({ error: "Failed to fetch diamond balance" });
    }
  });

  app.post("/api/web/trades/chy-to-diamonds", verifyWebappSecret, async (req: Request, res: Response) => {
    try {
      const { userId, chyAmount } = req.body;
      
      if (!userId || !chyAmount || chyAmount <= 0) {
        return res.status(400).json({ error: "userId and positive chyAmount required" });
      }
      
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const currentChy = user.chyBalance || 0;
      if (currentChy < chyAmount) {
        return res.status(400).json({ 
          error: "Insufficient CHY balance",
          required: chyAmount,
          available: currentChy,
        });
      }
      
      const diamondsToAdd = Math.floor(chyAmount / EXCHANGE_RATES.CHY_TO_DIAMOND);
      const chyToDeduct = diamondsToAdd * EXCHANGE_RATES.CHY_TO_DIAMOND;
      
      if (diamondsToAdd <= 0) {
        return res.status(400).json({ error: "Amount too small for conversion" });
      }
      
      await db.update(users)
        .set({
          chyBalance: currentChy - chyToDeduct,
          diamondBalance: (user.diamondBalance || 0) + diamondsToAdd,
          updatedAt: sql`now()`,
        })
        .where(eq(users.id, userId));
      
      await logUserActivity(
        userId,
        "trade",
        "CHY to Diamond Trade",
        `Traded ${chyToDeduct} CHY for ${diamondsToAdd} Diamonds`,
        diamondsToAdd,
        "diamond"
      );
      
      console.log(`[WebappAPI] Trade: ${userId} converted ${chyToDeduct} CHY to ${diamondsToAdd} diamonds`);
      
      res.json({
        success: true,
        trade: {
          chySpent: chyToDeduct,
          diamondsReceived: diamondsToAdd,
        },
        newBalances: {
          chy: currentChy - chyToDeduct,
          diamonds: (user.diamondBalance || 0) + diamondsToAdd,
        },
      });
    } catch (error) {
      console.error("[WebappAPI] CHY to diamonds trade error:", error);
      res.status(500).json({ error: "Failed to complete trade" });
    }
  });

  app.post("/api/web/trades/roachy-to-diamonds", verifyWebappSecret, async (req: Request, res: Response) => {
    try {
      const { userId, roachyAmount } = req.body;
      
      if (!userId || !roachyAmount || roachyAmount <= 0) {
        return res.status(400).json({ error: "userId and positive roachyAmount required" });
      }
      
      if (roachyAmount < EXCHANGE_RATES.ROACHY_TO_DIAMOND) {
        return res.status(400).json({ 
          error: `Minimum ${EXCHANGE_RATES.ROACHY_TO_DIAMOND} ROACHY required for 1 Diamond`,
          minimum: EXCHANGE_RATES.ROACHY_TO_DIAMOND,
        });
      }
      
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const diamondsToAdd = Math.floor(roachyAmount / EXCHANGE_RATES.ROACHY_TO_DIAMOND);
      const roachyToDeduct = diamondsToAdd * EXCHANGE_RATES.ROACHY_TO_DIAMOND;
      
      await db.update(users)
        .set({
          diamondBalance: (user.diamondBalance || 0) + diamondsToAdd,
          updatedAt: sql`now()`,
        })
        .where(eq(users.id, userId));
      
      await logUserActivity(
        userId,
        "trade",
        "ROACHY to Diamond Trade",
        `Traded ${roachyToDeduct} ROACHY for ${diamondsToAdd} Diamonds`,
        diamondsToAdd,
        "diamond"
      );
      
      console.log(`[WebappAPI] Trade: ${userId} converted ${roachyToDeduct} ROACHY to ${diamondsToAdd} diamonds`);
      
      res.json({
        success: true,
        trade: {
          roachySpent: roachyToDeduct,
          diamondsReceived: diamondsToAdd,
        },
        newDiamondBalance: (user.diamondBalance || 0) + diamondsToAdd,
        note: "ROACHY tokens should be burned/transferred on-chain by the webapp",
      });
    } catch (error) {
      console.error("[WebappAPI] ROACHY to diamonds trade error:", error);
      res.status(500).json({ error: "Failed to complete trade" });
    }
  });

  app.post("/api/web/powerups/purchase", verifyWebappSecret, async (req: Request, res: Response) => {
    try {
      const { userId, powerupType, diamondCost, quantity = 1 } = req.body;
      
      if (!userId || !powerupType || !diamondCost || diamondCost <= 0) {
        return res.status(400).json({ error: "userId, powerupType, and positive diamondCost required" });
      }
      
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const totalCost = diamondCost * quantity;
      const currentDiamonds = user.diamondBalance || 0;
      
      if (currentDiamonds < totalCost) {
        return res.status(400).json({ 
          error: "Insufficient diamond balance",
          required: totalCost,
          available: currentDiamonds,
        });
      }
      
      await db.update(users)
        .set({
          diamondBalance: currentDiamonds - totalCost,
          updatedAt: sql`now()`,
        })
        .where(eq(users.id, userId));
      
      await logUserActivity(
        userId,
        "trade",
        "Powerup Purchase",
        `Bought ${quantity}x ${powerupType} for ${totalCost} Diamonds`,
        -totalCost,
        "diamond"
      );
      
      console.log(`[WebappAPI] Purchase: ${userId} bought ${quantity}x ${powerupType} for ${totalCost} diamonds`);
      
      res.json({
        success: true,
        purchase: {
          powerupType,
          quantity,
          diamondCost: totalCost,
        },
        newDiamondBalance: currentDiamonds - totalCost,
      });
    } catch (error) {
      console.error("[WebappAPI] Powerup purchase error:", error);
      res.status(500).json({ error: "Failed to complete purchase" });
    }
  });

  app.get("/api/web/exchange-rates", async (req: Request, res: Response) => {
    res.json({
      success: true,
      rates: {
        chyToDiamond: EXCHANGE_RATES.CHY_TO_DIAMOND,
        roachyToDiamond: EXCHANGE_RATES.ROACHY_TO_DIAMOND,
      },
      description: {
        chyToDiamond: `${EXCHANGE_RATES.CHY_TO_DIAMOND} CHY = 1 Diamond`,
        roachyToDiamond: `${EXCHANGE_RATES.ROACHY_TO_DIAMOND} ROACHY = 1 Diamond`,
      },
    });
  });

  console.log("[WebappAPI] Webapp integration routes registered");
}
