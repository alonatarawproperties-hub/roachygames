import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.SESSION_SECRET;

interface JWTPayload {
  userId: string;
  email?: string;
  authProvider: string;
}

// In-memory rate limiting store (use Redis in production for scaling)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Clean up expired rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

/**
 * Rate limiting middleware factory
 */
export function rateLimit(options: {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
}) {
  const { windowMs, max, message = "Too many requests, please try again later" } = options;
  const keyGenerator = options.keyGenerator || ((req: Request) => {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.ip || "unknown";
    return ip;
  });

  return (req: Request, res: Response, next: NextFunction) => {
    const key = `ratelimit:${keyGenerator(req)}:${req.path}`;
    const now = Date.now();
    const record = rateLimitStore.get(key);

    if (!record || record.resetAt < now) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= max) {
      console.warn(`[Security] Rate limit exceeded for ${key}`);
      return res.status(429).json({ success: false, error: message });
    }

    record.count++;
    next();
  };
}

/**
 * Verify JWT token from Authorization header
 */
export function verifyToken(token: string): JWTPayload | null {
  if (!JWT_SECRET) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Authentication middleware - requires valid JWT
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  
  if (!payload) {
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }

  // Attach user info to request
  (req as any).userId = payload.userId;
  (req as any).userEmail = payload.email;
  (req as any).authProvider = payload.authProvider;
  
  next();
}

/**
 * Optional authentication - doesn't reject if no token, but adds user info if present
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (payload) {
      (req as any).userId = payload.userId;
      (req as any).userEmail = payload.email;
      (req as any).authProvider = payload.authProvider;
    }
  }
  
  next();
}

/**
 * Verify that the authenticated user matches the userId in the request
 */
export function requireSameUser(req: Request, res: Response, next: NextFunction) {
  const authUserId = (req as any).userId;
  const requestUserId = req.body.userId || req.params.userId;
  
  if (!authUserId) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }
  
  if (requestUserId && authUserId !== requestUserId) {
    console.warn(`[Security] User mismatch: auth=${authUserId}, request=${requestUserId}`);
    return res.status(403).json({ success: false, error: "Unauthorized access" });
  }
  
  next();
}

/**
 * Game session tokens for anti-cheat
 * Stores active game sessions with their parameters
 */
interface GameSession {
  userId: string;
  gameType: string;
  startedAt: number;
  maxScore: number;
  sessionId: string;
  powerUpsUsed: string[];
}

const gameSessionStore = new Map<string, GameSession>();

// Clean up expired game sessions (max 1 hour)
setInterval(() => {
  const now = Date.now();
  const maxSessionAge = 60 * 60 * 1000; // 1 hour
  for (const [key, value] of gameSessionStore.entries()) {
    if (now - value.startedAt > maxSessionAge) {
      gameSessionStore.delete(key);
    }
  }
}, 60000);

/**
 * Create a new game session for anti-cheat tracking
 */
export function createGameSession(userId: string, gameType: string): string {
  const sessionId = `${userId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  
  // Calculate max possible score based on game type and duration limits
  let maxScore = 0;
  if (gameType === "flappy") {
    // Flappy: max ~5 points per second, max game length 10 minutes
    maxScore = 5 * 60 * 10; // 3000 max theoretical score
  }
  
  gameSessionStore.set(sessionId, {
    userId,
    gameType,
    startedAt: Date.now(),
    maxScore,
    sessionId,
    powerUpsUsed: [],
  });
  
  return sessionId;
}

/**
 * Validate a score submission against game session
 */
export function validateGameScore(
  sessionId: string,
  userId: string,
  score: number,
  gameType: string
): { valid: boolean; reason?: string } {
  const session = gameSessionStore.get(sessionId);
  
  // If no session, check if score is reasonable for a stateless submission
  if (!session) {
    // Allow stateless submissions but with stricter limits
    if (gameType === "flappy" && score > 500) {
      return { valid: false, reason: "Invalid session for high score" };
    }
    return { valid: true };
  }
  
  // Verify user matches
  if (session.userId !== userId) {
    return { valid: false, reason: "Session user mismatch" };
  }
  
  // Verify game type matches
  if (session.gameType !== gameType) {
    return { valid: false, reason: "Session game type mismatch" };
  }
  
  // Check if score is physically possible
  const elapsedSeconds = (Date.now() - session.startedAt) / 1000;
  
  if (gameType === "flappy") {
    // In Flappy, you can score roughly 1-2 points per second of survival
    // With power-ups, maybe 3-4 points per second max
    const maxPossibleScore = Math.ceil(elapsedSeconds * 5);
    if (score > maxPossibleScore + 50) { // +50 buffer for edge cases
      return { valid: false, reason: `Score ${score} impossible in ${elapsedSeconds}s` };
    }
    
    // Minimum game time for non-zero scores (at least 1 second)
    if (score > 0 && elapsedSeconds < 1) {
      return { valid: false, reason: "Game too short for this score" };
    }
  }
  
  // Score passes validation
  return { valid: true };
}

/**
 * End and clean up a game session
 */
export function endGameSession(sessionId: string): void {
  gameSessionStore.delete(sessionId);
}

/**
 * Record power-up usage in a game session
 */
export function recordPowerUpUsage(sessionId: string, powerUpType: string): boolean {
  const session = gameSessionStore.get(sessionId);
  if (!session) return false;
  session.powerUpsUsed.push(powerUpType);
  return true;
}

/**
 * Input sanitization helpers
 */
export function sanitizeString(input: unknown, maxLength: number = 255): string | null {
  if (typeof input !== "string") return null;
  return input.slice(0, maxLength).replace(/[<>'"]/g, "");
}

export function sanitizeNumber(input: unknown, min: number, max: number): number | null {
  const num = Number(input);
  if (isNaN(num)) return null;
  if (num < min || num > max) return null;
  return num;
}

export function sanitizeUUID(input: unknown): string | null {
  if (typeof input !== "string") return null;
  // UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(input)) return null;
  return input;
}

/**
 * Security event log storage for admin panel
 */
interface SecurityLogEntry {
  id: string;
  timestamp: string;
  eventType: string;
  userId: string | null;
  severity: "info" | "warn" | "critical";
  details: object;
}

const securityLogStore: SecurityLogEntry[] = [];
const MAX_LOG_ENTRIES = 500; // Keep last 500 events

/**
 * Logging for security events
 */
export function logSecurityEvent(
  eventType: string,
  userId: string | null,
  details: object,
  severity: "info" | "warn" | "critical" = "info"
) {
  const timestamp = new Date().toISOString();
  const logEntry: SecurityLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp,
    eventType,
    userId,
    severity,
    details,
  };
  
  // Store in memory for admin access
  securityLogStore.unshift(logEntry); // Add to front (newest first)
  if (securityLogStore.length > MAX_LOG_ENTRIES) {
    securityLogStore.pop(); // Remove oldest
  }
  
  // Also log to console
  if (severity === "critical") {
    console.error("[SECURITY CRITICAL]", JSON.stringify(logEntry));
  } else if (severity === "warn") {
    console.warn("[SECURITY WARN]", JSON.stringify(logEntry));
  } else {
    console.log("[SECURITY]", JSON.stringify(logEntry));
  }
}

/**
 * Get security logs for admin panel
 * Filters by severity and/or event type
 */
export function getSecurityLogs(options?: {
  severity?: "info" | "warn" | "critical";
  eventType?: string;
  limit?: number;
  since?: string; // ISO timestamp
}): SecurityLogEntry[] {
  let logs = [...securityLogStore];
  
  if (options?.severity) {
    logs = logs.filter(l => l.severity === options.severity);
  }
  
  if (options?.eventType) {
    const eventTypeFilter = options.eventType;
    logs = logs.filter(l => l.eventType.includes(eventTypeFilter));
  }
  
  if (options?.since) {
    const sinceDate = new Date(options.since).getTime();
    logs = logs.filter(l => new Date(l.timestamp).getTime() >= sinceDate);
  }
  
  if (options?.limit) {
    logs = logs.slice(0, options.limit);
  }
  
  return logs;
}

/**
 * Get security log summary/statistics
 */
export function getSecurityStats(): {
  total: number;
  critical: number;
  warn: number;
  info: number;
  recentCritical: SecurityLogEntry[];
  topEventTypes: { type: string; count: number }[];
} {
  const stats = {
    total: securityLogStore.length,
    critical: 0,
    warn: 0,
    info: 0,
    recentCritical: [] as SecurityLogEntry[],
    topEventTypes: [] as { type: string; count: number }[],
  };
  
  const eventTypeCounts = new Map<string, number>();
  
  for (const log of securityLogStore) {
    if (log.severity === "critical") {
      stats.critical++;
      if (stats.recentCritical.length < 10) {
        stats.recentCritical.push(log);
      }
    } else if (log.severity === "warn") {
      stats.warn++;
    } else {
      stats.info++;
    }
    
    eventTypeCounts.set(log.eventType, (eventTypeCounts.get(log.eventType) || 0) + 1);
  }
  
  // Top 10 event types
  stats.topEventTypes = Array.from(eventTypeCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  return stats;
}
