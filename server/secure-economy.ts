import { db } from "./db";
import { 
  chyTransactions, 
  rateLimitTracking, 
  gameSessionTokens, 
  securityAuditLog,
  users,
  type ChyTxType 
} from "../shared/schema";
import { eq, sql, and, gte, lt } from "drizzle-orm";
import crypto from "crypto";
import type { Request } from "express";

const RATE_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  "flappy/enter": { maxRequests: 5, windowMs: 60000 },
  "flappy/score": { maxRequests: 30, windowMs: 60000 },
  "economy/bonus": { maxRequests: 3, windowMs: 60000 },
  "default": { maxRequests: 60, windowMs: 60000 },
};

const GAME_SESSION_EXPIRY_MS = 10 * 60 * 1000;
const MAX_FLAPPY_SCORE_PER_SECOND = 5;

export interface SecurityContext {
  userId: string;
  webappUserId?: string;
  clientIp: string;
  userAgent: string;
  deviceFingerprint?: string;
}

export function extractSecurityContext(req: Request, userId: string): SecurityContext {
  const forwarded = req.headers["x-forwarded-for"];
  const clientIp = typeof forwarded === "string" 
    ? forwarded.split(",")[0].trim() 
    : req.socket.remoteAddress || "unknown";
  
  return {
    userId,
    clientIp,
    userAgent: req.headers["user-agent"] || "unknown",
    deviceFingerprint: req.body?.deviceFingerprint,
  };
}

export async function checkRateLimit(
  userId: string, 
  endpoint: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const limits = RATE_LIMITS[endpoint] || RATE_LIMITS["default"];
  const windowStart = new Date(Date.now() - limits.windowMs);
  
  try {
    const existing = await db.query.rateLimitTracking.findFirst({
      where: and(
        eq(rateLimitTracking.userId, userId),
        eq(rateLimitTracking.endpoint, endpoint)
      ),
    });
    
    if (!existing) {
      await db.insert(rateLimitTracking).values({
        userId,
        endpoint,
        requestCount: 1,
        windowStart: new Date(),
        lastRequest: new Date(),
      }).onConflictDoUpdate({
        target: [rateLimitTracking.userId, rateLimitTracking.endpoint],
        set: {
          requestCount: 1,
          windowStart: new Date(),
          lastRequest: new Date(),
        },
      });
      return { allowed: true };
    }
    
    if (existing.windowStart < windowStart) {
      await db.update(rateLimitTracking)
        .set({
          requestCount: 1,
          windowStart: new Date(),
          lastRequest: new Date(),
        })
        .where(eq(rateLimitTracking.id, existing.id));
      return { allowed: true };
    }
    
    if (existing.requestCount >= limits.maxRequests) {
      const retryAfter = Math.ceil(
        (existing.windowStart.getTime() + limits.windowMs - Date.now()) / 1000
      );
      return { allowed: false, retryAfter: Math.max(1, retryAfter) };
    }
    
    await db.update(rateLimitTracking)
      .set({
        requestCount: existing.requestCount + 1,
        lastRequest: new Date(),
      })
      .where(eq(rateLimitTracking.id, existing.id));
    
    return { allowed: true };
  } catch (error) {
    console.error("[SecureEconomy] Rate limit check error:", error);
    return { allowed: true };
  }
}

export async function logSecurityEvent(
  eventType: string,
  severity: "info" | "warning" | "critical",
  details: string,
  ctx?: SecurityContext
): Promise<void> {
  try {
    await db.insert(securityAuditLog).values({
      userId: ctx?.userId,
      eventType,
      severity,
      details,
      clientIp: ctx?.clientIp,
      userAgent: ctx?.userAgent,
    });
  } catch (error) {
    console.error("[SecureEconomy] Failed to log security event:", error);
  }
}

export function generateIdempotencyKey(
  userId: string,
  txType: ChyTxType,
  referenceId: string,
  amount: number
): string {
  const data = `${userId}:${txType}:${referenceId}:${amount}:${new Date().toISOString().split('T')[0]}`;
  return crypto.createHash("sha256").update(data).digest("hex").slice(0, 32);
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export interface ChyTransactionResult {
  success: boolean;
  error?: string;
  transactionId?: string;
  newBalance?: number;
  isDuplicate?: boolean;
}

export async function executeChyTransaction(
  txType: ChyTxType,
  amount: number,
  referenceId: string,
  referenceType: string,
  ctx: SecurityContext,
  idempotencyKey?: string
): Promise<ChyTransactionResult> {
  const effectiveIdempotencyKey = idempotencyKey || 
    generateIdempotencyKey(ctx.userId, txType, referenceId, amount);
  
  try {
    const existingTx = await db.query.chyTransactions.findFirst({
      where: eq(chyTransactions.idempotencyKey, effectiveIdempotencyKey),
    });
    
    if (existingTx) {
      console.log(`[SecureEconomy] Duplicate transaction detected: ${effectiveIdempotencyKey}`);
      await logSecurityEvent(
        "duplicate_transaction",
        "warning",
        `Duplicate idempotency key: ${effectiveIdempotencyKey}, txType: ${txType}`,
        ctx
      );
      return {
        success: true,
        transactionId: existingTx.id,
        newBalance: existingTx.balanceAfter,
        isDuplicate: true,
      };
    }
    
    const result = await db.transaction(async (tx) => {
      const userResult = await tx.execute(sql`
        SELECT id, chy_balance 
        FROM users 
        WHERE id = ${ctx.userId} 
        FOR UPDATE
      `);
      
      if (!userResult.rows || userResult.rows.length === 0) {
        throw new Error("User not found");
      }
      
      const user = userResult.rows[0] as { id: string; chy_balance: number };
      const currentBalance = user.chy_balance ?? 0;
      const newBalance = currentBalance + amount;
      
      if (newBalance < 0) {
        throw new Error(`Insufficient balance: have ${currentBalance}, need ${Math.abs(amount)}`);
      }
      
      await tx.execute(sql`
        UPDATE users 
        SET chy_balance = ${newBalance}, updated_at = now()
        WHERE id = ${ctx.userId}
      `);
      
      const [txRecord] = await tx.insert(chyTransactions).values({
        userId: ctx.userId,
        webappUserId: ctx.webappUserId,
        txType,
        amount,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        referenceId,
        referenceType,
        idempotencyKey: effectiveIdempotencyKey,
        clientIp: ctx.clientIp,
        userAgent: ctx.userAgent,
        deviceFingerprint: ctx.deviceFingerprint,
      }).returning();
      
      return { transactionId: txRecord.id, newBalance };
    });
    
    console.log(`[SecureEconomy] Transaction complete: ${txType}, amount: ${amount}, user: ${ctx.userId}`);
    
    return {
      success: true,
      transactionId: result.transactionId,
      newBalance: result.newBalance,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[SecureEconomy] Transaction failed:`, error);
    
    await logSecurityEvent(
      "transaction_failed",
      "warning",
      `${txType} failed: ${errorMessage}, amount: ${amount}`,
      ctx
    );
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function createGameSession(
  userId: string,
  gameType: string,
  competitionId?: string,
  period?: string,
  periodDate?: string
): Promise<{ sessionToken: string; expiresAt: Date }> {
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + GAME_SESSION_EXPIRY_MS);
  
  await db.insert(gameSessionTokens).values({
    userId,
    sessionToken,
    gameType,
    competitionId,
    period,
    periodDate,
    expiresAt,
  });
  
  return { sessionToken, expiresAt };
}

export async function validateAndConsumeGameSession(
  sessionToken: string,
  userId: string,
  score: number
): Promise<{ valid: boolean; error?: string; session?: typeof gameSessionTokens.$inferSelect }> {
  try {
    const session = await db.query.gameSessionTokens.findFirst({
      where: and(
        eq(gameSessionTokens.sessionToken, sessionToken),
        eq(gameSessionTokens.userId, userId)
      ),
    });
    
    if (!session) {
      return { valid: false, error: "Invalid session token" };
    }
    
    if (session.usedAt) {
      console.log(`[SecureEconomy] Session already used: ${sessionToken}`);
      return { valid: false, error: "Session already used (replay attempt)" };
    }
    
    if (new Date() > session.expiresAt) {
      return { valid: false, error: "Session expired" };
    }
    
    const sessionDurationMs = Date.now() - session.startedAt.getTime();
    const sessionDurationSeconds = sessionDurationMs / 1000;
    const maxPossibleScore = Math.ceil(sessionDurationSeconds * MAX_FLAPPY_SCORE_PER_SECOND);
    
    if (score > maxPossibleScore && session.gameType === "flappy") {
      await logSecurityEvent(
        "suspicious_score",
        "critical",
        `Score ${score} exceeds max possible ${maxPossibleScore} for ${sessionDurationSeconds}s session`,
        { userId, clientIp: "unknown", userAgent: "unknown" }
      );
      return { valid: false, error: "Score validation failed" };
    }
    
    await db.update(gameSessionTokens)
      .set({
        usedAt: new Date(),
        score,
        isValid: true,
      })
      .where(eq(gameSessionTokens.id, session.id));
    
    return { valid: true, session };
  } catch (error) {
    console.error("[SecureEconomy] Session validation error:", error);
    return { valid: false, error: "Validation error" };
  }
}

export const PRIZE_DISTRIBUTION = {
  1: 0.25,
  2: 0.15,
  3: 0.10,
  4: 0.07,
  5: 0.06,
  6: 0.05,
  7: 0.04,
  8: 0.04,
  9: 0.03,
  10: 0.03,
  11: 0.018,
  12: 0.018,
  13: 0.018,
  14: 0.018,
  15: 0.018,
  16: 0.018,
  17: 0.018,
  18: 0.018,
  19: 0.018,
  20: 0.018,
} as const;

export function calculatePrizeForRank(rank: number, prizePool: number): number {
  if (rank < 1 || rank > 20) return 0;
  const percentage = PRIZE_DISTRIBUTION[rank as keyof typeof PRIZE_DISTRIBUTION] || 0;
  return Math.floor(prizePool * percentage);
}

export function calculateTotalPrizeDistribution(prizePool: number, participantCount: number): Map<number, number> {
  const prizes = new Map<number, number>();
  const maxWinners = Math.min(20, participantCount);
  
  for (let rank = 1; rank <= maxWinners; rank++) {
    const prize = calculatePrizeForRank(rank, prizePool);
    if (prize > 0) {
      prizes.set(rank, prize);
    }
  }
  
  return prizes;
}

export async function getUserBalance(userId: string): Promise<number> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    return user?.chyBalance ?? 0;
  } catch (error) {
    console.error("[SecureEconomy] Error fetching balance:", error);
    return 0;
  }
}

export async function getTransactionHistory(
  userId: string,
  limit: number = 50
): Promise<typeof chyTransactions.$inferSelect[]> {
  try {
    const transactions = await db.query.chyTransactions.findMany({
      where: eq(chyTransactions.userId, userId),
      orderBy: (tx, { desc }) => [desc(tx.createdAt)],
      limit,
    });
    return transactions;
  } catch (error) {
    console.error("[SecureEconomy] Error fetching transaction history:", error);
    return [];
  }
}

export async function reconcileBalance(userId: string): Promise<{
  storedBalance: number;
  calculatedBalance: number;
  isConsistent: boolean;
}> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    const storedBalance = user?.chyBalance ?? 0;
    
    const transactions = await db.query.chyTransactions.findMany({
      where: eq(chyTransactions.userId, userId),
    });
    
    const calculatedBalance = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    
    const isConsistent = storedBalance === calculatedBalance;
    
    if (!isConsistent) {
      await logSecurityEvent(
        "balance_inconsistency",
        "critical",
        `User ${userId}: stored=${storedBalance}, calculated=${calculatedBalance}`,
        { userId, clientIp: "system", userAgent: "reconciliation" }
      );
    }
    
    return { storedBalance, calculatedBalance, isConsistent };
  } catch (error) {
    console.error("[SecureEconomy] Reconciliation error:", error);
    return { storedBalance: 0, calculatedBalance: 0, isConsistent: false };
  }
}
