import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "./db";
import { users, registerUserSchema, loginUserSchema } from "../shared/schema";
import { eq } from "drizzle-orm";

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

router.post("/link-wallet", async (req: Request, res: Response) => {
  try {
    const { userId, walletAddress } = req.body;

    if (!userId || !walletAddress) {
      return res.status(400).json({ error: "User ID and wallet address are required" });
    }

    const [existingWallet] = await db.select().from(users)
      .where(eq(users.walletAddress, walletAddress)).limit(1);
    
    if (existingWallet && existingWallet.id !== userId) {
      return res.status(409).json({ 
        error: "This wallet is already linked to another account" 
      });
    }

    const [updatedUser] = await db.update(users)
      .set({ walletAddress, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

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

    const [updatedUser] = await db.update(users)
      .set({ walletAddress: null, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

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
