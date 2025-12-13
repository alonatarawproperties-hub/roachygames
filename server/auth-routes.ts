import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { db } from "./db";
import { users, registerUserSchema, loginUserSchema, walletLinkHistory } from "../shared/schema";
import { eq, and, desc, gt } from "drizzle-orm";

const router = Router();

const JWT_SECRET = process.env.SESSION_SECRET;
if (!JWT_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required for authentication");
}
const JWT_EXPIRES_IN = "7d";
const GOOGLE_TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo";

interface JWTPayload {
  userId: string;
  email?: string;
  authProvider: string;
}

function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

router.post("/register", async (req: Request, res: Response) => {
  try {
    const validation = registerUserSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: validation.error.errors 
      });
    }

    const { email, password, displayName } = validation.data;

    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [newUser] = await db.insert(users).values({
      email,
      passwordHash,
      displayName: displayName || email.split("@")[0],
      authProvider: "email",
      chyBalance: 100,
      diamondBalance: 0,
      lastLoginAt: new Date(),
    }).returning();

    const token = generateToken({
      userId: newUser.id,
      email: newUser.email || undefined,
      authProvider: "email",
    });

    return res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.displayName,
        googleId: newUser.googleId,
        authProvider: newUser.authProvider,
        chyBalance: newUser.chyBalance,
        diamondBalance: newUser.diamondBalance,
        walletAddress: newUser.walletAddress,
        avatarUrl: newUser.avatarUrl,
      },
      token,
    });
  } catch (error) {
    console.error("[Auth] Registration error:", error);
    return res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const validation = loginUserSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: validation.error.errors 
      });
    }

    const { email, password } = validation.data;

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!user.passwordHash) {
      return res.status(401).json({ 
        error: "This account uses Google sign-in. Please use Google to login." 
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    await db.update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id));

    const token = generateToken({
      userId: user.id,
      email: user.email || undefined,
      authProvider: user.authProvider,
    });

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        googleId: user.googleId,
        authProvider: user.authProvider,
        chyBalance: user.chyBalance,
        diamondBalance: user.diamondBalance,
        walletAddress: user.walletAddress,
        avatarUrl: user.avatarUrl,
      },
      token,
    });
  } catch (error) {
    console.error("[Auth] Login error:", error);
    return res.status(500).json({ error: "Login failed" });
  }
});

const ALLOWED_GOOGLE_CLIENT_IDS = [
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  process.env.GOOGLE_WEB_CLIENT_ID,
].filter(Boolean) as string[];

async function verifyGoogleToken(idToken: string): Promise<{
  sub: string;
  email: string;
  name?: string;
  picture?: string;
} | null> {
  try {
    const response = await fetch(`${GOOGLE_TOKEN_INFO_URL}?id_token=${idToken}`);
    if (!response.ok) {
      console.error("[Auth] Google token verification failed:", response.status);
      return null;
    }
    const tokenInfo = await response.json();
    
    if (!tokenInfo.sub || !tokenInfo.email) {
      console.error("[Auth] Invalid Google token - missing required fields");
      return null;
    }

    if (!tokenInfo.aud || !ALLOWED_GOOGLE_CLIENT_IDS.includes(tokenInfo.aud)) {
      console.error("[Auth] Google token audience mismatch - token not issued for this app");
      return null;
    }

    if (tokenInfo.email_verified === false || tokenInfo.email_verified === "false") {
      console.error("[Auth] Google token email not verified");
      return null;
    }
    
    return {
      sub: tokenInfo.sub,
      email: tokenInfo.email,
      name: tokenInfo.name,
      picture: tokenInfo.picture,
    };
  } catch (error) {
    console.error("[Auth] Google token verification error:", error);
    return null;
  }
}

router.post("/google", async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: "Google ID token is required" });
    }

    const tokenInfo = await verifyGoogleToken(idToken);
    if (!tokenInfo) {
      return res.status(401).json({ error: "Invalid or expired Google token" });
    }

    const verifiedGoogleId = tokenInfo.sub;
    const verifiedEmail = tokenInfo.email;
    const verifiedDisplayName = tokenInfo.name;
    const verifiedAvatarUrl = tokenInfo.picture;

    let [user] = await db.select().from(users).where(eq(users.googleId, verifiedGoogleId)).limit(1);

    if (!user) {
      const [existingEmailUser] = await db.select().from(users).where(eq(users.email, verifiedEmail)).limit(1);
      
      if (existingEmailUser) {
        [user] = await db.update(users)
          .set({ 
            googleId: verifiedGoogleId, 
            avatarUrl: verifiedAvatarUrl || existingEmailUser.avatarUrl,
            displayName: verifiedDisplayName || existingEmailUser.displayName,
            lastLoginAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingEmailUser.id))
          .returning();
      } else {
        [user] = await db.insert(users).values({
          email: verifiedEmail,
          googleId: verifiedGoogleId,
          displayName: verifiedDisplayName || verifiedEmail.split("@")[0],
          avatarUrl: verifiedAvatarUrl,
          authProvider: "google",
          chyBalance: 100,
          diamondBalance: 0,
          lastLoginAt: new Date(),
        }).returning();
      }
    } else {
      await db.update(users)
        .set({ lastLoginAt: new Date(), updatedAt: new Date() })
        .where(eq(users.id, user.id));
    }

    const token = generateToken({
      userId: user.id,
      email: user.email || undefined,
      authProvider: user.authProvider,
    });

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        googleId: user.googleId,
        authProvider: user.authProvider,
        chyBalance: user.chyBalance,
        diamondBalance: user.diamondBalance,
        walletAddress: user.walletAddress,
        avatarUrl: user.avatarUrl,
      },
      token,
    });
  } catch (error) {
    console.error("[Auth] Google auth error:", error);
    return res.status(500).json({ error: "Google authentication failed" });
  }
});

const WALLET_SWITCH_COOLDOWN_HOURS = 24;

function getWalletLoginMessage(walletAddress: string, timestamp: number): string {
  return `Sign in to Roachy Games with wallet ${walletAddress}.\n\nTimestamp: ${timestamp}\n\nThis signature proves you own this wallet.`;
}

router.post("/dev-wallet-login", async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address is required" });
    }

    let [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress)).limit(1);

    if (!user) {
      const shortAddress = walletAddress.slice(0, 4) + "..." + walletAddress.slice(-4);
      [user] = await db.insert(users).values({
        walletAddress,
        displayName: `Wallet ${shortAddress}`,
        authProvider: "wallet",
        chyBalance: 1000000,
        diamondBalance: 1000,
        lastLoginAt: new Date(),
      }).returning();
      console.log(`[Auth] DEV: New wallet user created: ${walletAddress.slice(0, 8)}... with 1M ROACHY and 1000 diamonds`);
    } else {
      await db.update(users)
        .set({ lastLoginAt: new Date(), updatedAt: new Date() })
        .where(eq(users.id, user.id));
      console.log(`[Auth] DEV: Wallet user logged in: ${walletAddress.slice(0, 8)}...`);
    }

    const token = generateToken({
      userId: user.id,
      authProvider: "wallet",
    });

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        googleId: user.googleId,
        authProvider: user.authProvider,
        chyBalance: user.chyBalance,
        diamondBalance: user.diamondBalance,
        walletAddress: user.walletAddress,
        avatarUrl: user.avatarUrl,
      },
      token,
    });
  } catch (error) {
    console.error("[Auth] Dev wallet login error:", error);
    return res.status(500).json({ error: "Dev wallet login failed" });
  }
});

router.post("/wallet-login", async (req: Request, res: Response) => {
  try {
    const { walletAddress, signature, timestamp } = req.body;

    if (!walletAddress || !signature || !timestamp) {
      return res.status(400).json({ error: "Wallet address, signature, and timestamp are required" });
    }

    const timeDiff = Date.now() - timestamp;
    if (timeDiff > 5 * 60 * 1000) {
      return res.status(400).json({ error: "Signature expired. Please try again." });
    }

    const expectedMessage = getWalletLoginMessage(walletAddress, timestamp);
    const isValid = verifySolanaSignature(expectedMessage, signature, walletAddress);
    
    if (!isValid) {
      return res.status(401).json({ error: "Invalid wallet signature" });
    }

    let [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress)).limit(1);

    if (!user) {
      const shortAddress = walletAddress.slice(0, 4) + "..." + walletAddress.slice(-4);
      [user] = await db.insert(users).values({
        walletAddress,
        displayName: `Wallet ${shortAddress}`,
        authProvider: "wallet",
        chyBalance: 1000000,
        diamondBalance: 1000,
        lastLoginAt: new Date(),
      }).returning();
      console.log(`[Auth] New wallet user created: ${walletAddress.slice(0, 8)}... with 1M ROACHY and 1000 diamonds`);
    } else {
      await db.update(users)
        .set({ lastLoginAt: new Date(), updatedAt: new Date() })
        .where(eq(users.id, user.id));
      console.log(`[Auth] Wallet user logged in: ${walletAddress.slice(0, 8)}...`);
    }

    const token = generateToken({
      userId: user.id,
      authProvider: "wallet",
    });

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        googleId: user.googleId,
        authProvider: user.authProvider,
        chyBalance: user.chyBalance,
        diamondBalance: user.diamondBalance,
        walletAddress: user.walletAddress,
        avatarUrl: user.avatarUrl,
      },
      token,
    });
  } catch (error) {
    console.error("[Auth] Wallet login error:", error);
    return res.status(500).json({ error: "Wallet authentication failed" });
  }
});

function verifySolanaSignature(message: string, signature: string, publicKey: string): boolean {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = bs58.decode(publicKey);
    
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch (error) {
    console.error("[Auth] Signature verification error:", error);
    return false;
  }
}

function getWalletLinkMessage(walletAddress: string, userId: string, timestamp: number): string {
  return `Link wallet ${walletAddress} to Roachy Games account.\n\nUser ID: ${userId}\nTimestamp: ${timestamp}\n\nThis signature proves you own this wallet.`;
}

router.post("/check-wallet-switch", async (req: Request, res: Response) => {
  try {
    const { userId, newWalletAddress } = req.body;

    if (!userId || !newWalletAddress) {
      return res.status(400).json({ error: "User ID and wallet address are required" });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const [existingWallet] = await db.select().from(users)
      .where(eq(users.walletAddress, newWalletAddress)).limit(1);
    
    if (existingWallet && existingWallet.id !== userId) {
      return res.status(409).json({ 
        error: "This wallet is already linked to another account",
        isBlocked: true,
      });
    }

    const isSwitch = !!user.walletAddress && user.walletAddress !== newWalletAddress;

    if (isSwitch) {
      const [pendingSwitch] = await db.select().from(walletLinkHistory)
        .where(and(
          eq(walletLinkHistory.userId, userId),
          eq(walletLinkHistory.status, "pending"),
          gt(walletLinkHistory.cooldownEndsAt, new Date())
        ))
        .orderBy(desc(walletLinkHistory.createdAt))
        .limit(1);

      if (pendingSwitch) {
        return res.json({
          requiresCooldown: true,
          cooldownEndsAt: pendingSwitch.cooldownEndsAt,
          pendingWallet: pendingSwitch.newWallet,
          message: "A wallet switch is already in progress",
        });
      }
    }

    const timestamp = Date.now();
    const messageToSign = getWalletLinkMessage(newWalletAddress, userId, timestamp);

    return res.json({
      isSwitch,
      currentWallet: user.walletAddress,
      newWallet: newWalletAddress,
      requiresSignature: true,
      messageToSign,
      timestamp,
      cooldownHours: isSwitch ? WALLET_SWITCH_COOLDOWN_HOURS : 0,
    });
  } catch (error) {
    console.error("[Auth] Check wallet switch error:", error);
    return res.status(500).json({ error: "Failed to check wallet switch" });
  }
});

router.post("/link-wallet", async (req: Request, res: Response) => {
  try {
    const { userId, walletAddress, signature, timestamp } = req.body;

    if (!userId || !walletAddress) {
      return res.status(400).json({ error: "User ID and wallet address are required" });
    }

    if (!signature || !timestamp) {
      return res.status(400).json({ error: "Signature verification is required to link a wallet" });
    }

    const messageToSign = getWalletLinkMessage(walletAddress, userId, timestamp);
    const isValidSignature = verifySolanaSignature(messageToSign, signature, walletAddress);

    if (!isValidSignature) {
      return res.status(401).json({ error: "Invalid signature. Please try again." });
    }

    const signatureAge = Date.now() - timestamp;
    if (signatureAge > 5 * 60 * 1000) {
      return res.status(401).json({ error: "Signature expired. Please try again." });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const [existingWallet] = await db.select().from(users)
      .where(eq(users.walletAddress, walletAddress)).limit(1);
    
    if (existingWallet && existingWallet.id !== userId) {
      return res.status(409).json({ 
        error: "This wallet is already linked to another account" 
      });
    }

    const isSwitch = !!user.walletAddress && user.walletAddress !== walletAddress;
    const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    if (isSwitch) {
      const cooldownEndsAt = new Date(Date.now() + WALLET_SWITCH_COOLDOWN_HOURS * 60 * 60 * 1000);
      
      await db.insert(walletLinkHistory).values({
        userId,
        previousWallet: user.walletAddress,
        newWallet: walletAddress,
        action: "switch",
        signatureVerified: true,
        ipAddress,
        userAgent,
        cooldownEndsAt,
        status: "pending",
      });

      console.log(`[Auth] Wallet switch initiated for user ${userId}: ${user.walletAddress?.slice(0, 8)}... -> ${walletAddress.slice(0, 8)}... (cooldown ends: ${cooldownEndsAt.toISOString()})`);

      return res.json({
        success: true,
        pendingSwitch: true,
        cooldownEndsAt,
        message: `Wallet switch will complete in ${WALLET_SWITCH_COOLDOWN_HOURS} hours`,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          googleId: user.googleId,
          authProvider: user.authProvider,
          chyBalance: user.chyBalance,
          diamondBalance: user.diamondBalance,
          walletAddress: user.walletAddress,
          avatarUrl: user.avatarUrl,
        },
      });
    }

    await db.insert(walletLinkHistory).values({
      userId,
      previousWallet: null,
      newWallet: walletAddress,
      action: "link",
      signatureVerified: true,
      ipAddress,
      userAgent,
      cooldownEndsAt: null,
      status: "completed",
    });

    const [updatedUser] = await db.update(users)
      .set({ walletAddress, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    console.log(`[Auth] Wallet linked for user ${userId}: ${walletAddress.slice(0, 8)}...`);

    return res.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        googleId: updatedUser.googleId,
        authProvider: updatedUser.authProvider,
        chyBalance: updatedUser.chyBalance,
        diamondBalance: updatedUser.diamondBalance,
        walletAddress: updatedUser.walletAddress,
        avatarUrl: updatedUser.avatarUrl,
      },
    });
  } catch (error) {
    console.error("[Auth] Link wallet error:", error);
    return res.status(500).json({ error: "Failed to link wallet" });
  }
});

router.post("/complete-wallet-switch", async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const [pendingSwitch] = await db.select().from(walletLinkHistory)
      .where(and(
        eq(walletLinkHistory.userId, userId),
        eq(walletLinkHistory.status, "pending")
      ))
      .orderBy(desc(walletLinkHistory.createdAt))
      .limit(1);

    if (!pendingSwitch) {
      return res.status(404).json({ error: "No pending wallet switch found" });
    }

    if (pendingSwitch.cooldownEndsAt && pendingSwitch.cooldownEndsAt > new Date()) {
      return res.status(400).json({ 
        error: "Cooldown period not complete",
        cooldownEndsAt: pendingSwitch.cooldownEndsAt,
      });
    }

    await db.update(walletLinkHistory)
      .set({ status: "completed" })
      .where(eq(walletLinkHistory.id, pendingSwitch.id));

    const [updatedUser] = await db.update(users)
      .set({ walletAddress: pendingSwitch.newWallet, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log(`[Auth] Wallet switch completed for user ${userId}: ${pendingSwitch.previousWallet?.slice(0, 8)}... -> ${pendingSwitch.newWallet.slice(0, 8)}...`);

    return res.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        googleId: updatedUser.googleId,
        authProvider: updatedUser.authProvider,
        chyBalance: updatedUser.chyBalance,
        diamondBalance: updatedUser.diamondBalance,
        walletAddress: updatedUser.walletAddress,
        avatarUrl: updatedUser.avatarUrl,
      },
    });
  } catch (error) {
    console.error("[Auth] Complete wallet switch error:", error);
    return res.status(500).json({ error: "Failed to complete wallet switch" });
  }
});

router.post("/cancel-wallet-switch", async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const [pendingSwitch] = await db.select().from(walletLinkHistory)
      .where(and(
        eq(walletLinkHistory.userId, userId),
        eq(walletLinkHistory.status, "pending")
      ))
      .orderBy(desc(walletLinkHistory.createdAt))
      .limit(1);

    if (!pendingSwitch) {
      return res.status(404).json({ error: "No pending wallet switch found" });
    }

    await db.update(walletLinkHistory)
      .set({ status: "cancelled" })
      .where(eq(walletLinkHistory.id, pendingSwitch.id));

    console.log(`[Auth] Wallet switch cancelled for user ${userId}`);

    return res.json({ success: true, message: "Wallet switch cancelled" });
  } catch (error) {
    console.error("[Auth] Cancel wallet switch error:", error);
    return res.status(500).json({ error: "Failed to cancel wallet switch" });
  }
});

router.get("/me", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    if (!payload) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        googleId: user.googleId,
        authProvider: user.authProvider,
        chyBalance: user.chyBalance,
        diamondBalance: user.diamondBalance,
        walletAddress: user.walletAddress,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    console.error("[Auth] Get me error:", error);
    return res.status(500).json({ error: "Failed to get user" });
  }
});

router.post("/unlink-wallet", async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.walletAddress) {
      return res.status(400).json({ error: "No wallet linked to this account" });
    }

    const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    await db.insert(walletLinkHistory).values({
      userId,
      previousWallet: user.walletAddress,
      newWallet: user.walletAddress,
      action: "unlink",
      signatureVerified: false,
      ipAddress,
      userAgent,
      cooldownEndsAt: null,
      status: "completed",
    });

    const [updatedUser] = await db.update(users)
      .set({ walletAddress: null, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    console.log(`[Auth] Wallet unlinked for user ${userId}: ${user.walletAddress.slice(0, 8)}...`);

    return res.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        googleId: updatedUser.googleId,
        authProvider: updatedUser.authProvider,
        chyBalance: updatedUser.chyBalance,
        diamondBalance: updatedUser.diamondBalance,
        walletAddress: updatedUser.walletAddress,
        avatarUrl: updatedUser.avatarUrl,
      },
    });
  } catch (error) {
    console.error("[Auth] Unlink wallet error:", error);
    return res.status(500).json({ error: "Failed to unlink wallet" });
  }
});

export default router;
