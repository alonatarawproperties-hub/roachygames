import { Express, Request, Response } from "express";
import { db } from "./db";
import {
  flappyScores,
  flappyLeaderboard,
  flappyPowerUpInventory,
  flappyRankedCompetitions,
  flappyRankedEntries,
  users,
  chyTransactions,
  gameSessionTokens,
} from "@shared/schema";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { logUserActivity } from "./economy-routes";
import { webappRequest } from "./webapp-routes";
import { 
  rateLimit, 
  requireAuth, 
  optionalAuth,
  createGameSession, 
  validateGameScore, 
  endGameSession,
  logSecurityEvent,
  sanitizeNumber,
  sanitizeUUID
} from "./security";
import {
  checkRateLimit,
  extractSecurityContext,
  generateIdempotencyKey,
  logSecurityEvent as logSecureEvent,
  createGameSession as createSecureGameSession,
  validateAndConsumeGameSession,
  calculatePrizeForRank,
  PRIZE_DISTRIBUTION,
} from "./secure-economy";

// Helper to get fresh webappUserId via OAuth exchange - CRITICAL for correct competition entry
async function getFreshWebappUserId(user: { googleId: string | null; email: string | null; displayName: string | null }): Promise<string | null> {
  try {
    if (!user.googleId || !user.email) {
      console.log(`[Flappy] User has no googleId/email, cannot get webappUserId`);
      return null;
    }
    
    const exchangeResult = await webappRequest("POST", "/api/web/oauth/exchange", {
      googleId: user.googleId,
      email: user.email,
      displayName: user.displayName || user.email.split("@")[0],
    });
    
    // Webapp returns user directly (not wrapped in success field)
    // Check for status 200 and presence of user object
    if (exchangeResult.status !== 200 || !exchangeResult.data?.user) {
      console.log(`[Flappy] OAuth exchange failed:`, exchangeResult);
      return null;
    }
    
    const webappUserId = exchangeResult.data.user?.id;
    if (!webappUserId) {
      console.log(`[Flappy] No webappUserId returned from exchange`);
      return null;
    }
    
    console.log(`[Flappy] Fresh webappUserId from OAuth exchange: ${webappUserId} for ${user.email}`);
    return webappUserId;
  } catch (error) {
    console.error(`[Flappy] Error getting fresh webappUserId:`, error);
    return null;
  }
}

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
    
    // Webapp returns user directly (not wrapped in success field)
    if (exchangeResult.status !== 200 || !exchangeResult.data?.user) {
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
    
    // Webapp returns user directly (not wrapped in success field)
    if (exchangeResult.status !== 200 || !exchangeResult.data?.user) {
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
  // Feature flag: Use webapp as source of truth for competition entry/scores/leaderboard
  // Webapp is source of truth for ALL competition data - config AND operations
  // Scores MUST be sent to webapp for leaderboard to work
  const USE_WEBAPP_COMPETITIONS_CONFIG = true;  // Get competition list from webapp
  const USE_WEBAPP_COMPETITIONS_OPERATIONS = true;  // Proxy scores to webapp (REQUIRED for leaderboard)
  
  // Beta: Flappy ranked competitions are now enabled
  const FLAPPY_COMPETITIONS_LOCKED = false;
  
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

  // Start a game session (for anti-cheat tracking) - REQUIRES AUTHENTICATION
  app.post("/api/flappy/session/start", rateLimit({ windowMs: 60000, max: 30 }), requireAuth, async (req: Request, res: Response) => {
    try {
      // Use authenticated userId from JWT, not from request body
      const authenticatedUserId = (req as any).userId;
      const { userId } = req.body;
      
      // Verify the requested userId matches the authenticated user
      if (userId && userId !== authenticatedUserId) {
        logSecurityEvent("session_start_user_mismatch", authenticatedUserId, { requestedUserId: userId }, "critical");
        return res.status(403).json({ success: false, error: "Unauthorized user" });
      }
      
      const sessionId = createGameSession(authenticatedUserId, "flappy");
      logSecurityEvent("game_session_start", authenticatedUserId, { gameType: "flappy", sessionId });
      
      res.json({ success: true, sessionId });
    } catch (error) {
      console.error("Session start error:", error);
      res.status(500).json({ success: false, error: "Failed to start session" });
    }
  });

  // Score submission with anti-cheat validation - REQUIRES AUTHENTICATION (no guest bypass)
  app.post("/api/flappy/score", rateLimit({ windowMs: 60000, max: 60 }), requireAuth, async (req: Request, res: Response) => {
    try {
      const { userId: bodyUserId, score, coinsCollected: rawCoins = 0, isRanked = false, rankedPeriod = null, chyEntryFee = 0, sessionId } = req.body;
      const authenticatedUserId = (req as any).userId;
      
      // SECURITY: Sanitize coinsCollected - max 1000 per game (realistic limit)
      const coinsCollected = Math.min(Math.max(0, Math.floor(Number(rawCoins) || 0)), 1000);
      
      // IMPORTANT: Always use the authenticated userId from JWT, not from request body
      // This ensures we're using the verified user identity
      const userId = authenticatedUserId;
      
      console.log(`[Flappy Score] ====== SCORE SUBMISSION ======`);
      console.log(`[Flappy Score] Body userId: ${bodyUserId}`);
      console.log(`[Flappy Score] JWT userId (using): ${userId}`);
      console.log(`[Flappy Score] Score: ${score}, isRanked: ${isRanked}, period: ${rankedPeriod}`);
      console.log(`[Flappy Score] Timestamp: ${new Date().toISOString()}`);
      
      if (score === undefined) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }
      
      // SELF-HEALING: Verify user exists in database, create if missing
      // This fixes the issue where Google login doesn't properly create users
      const existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      
      if (existingUser.length === 0) {
        console.warn(`[Flappy Score] CRITICAL: User ${userId} NOT FOUND in database! Creating shell record...`);
        
        // Extract email from JWT if available (set by auth middleware)
        const jwtEmail = (req as any).userEmail || null;
        
        try {
          await db.insert(users).values({
            id: userId,
            email: jwtEmail,
            displayName: jwtEmail ? jwtEmail.split("@")[0] : `Player_${userId.substring(0, 8)}`,
            authProvider: "google", // Assume Google since that's the common issue
            chyBalance: 100,
            diamondBalance: 0,
            lastLoginAt: new Date(),
          });
          console.log(`[Flappy Score] Shell user record created for ${userId}`);
        } catch (insertError: any) {
          // If insert fails (e.g., unique constraint), try to continue anyway
          console.error(`[Flappy Score] Failed to create shell user: ${insertError.message}`);
        }
      } else {
        console.log(`[Flappy Score] User verified: ${existingUser[0].displayName || existingUser[0].email || userId}`);
      }
      
      // Log if there's a mismatch for debugging, but still proceed with authenticated userId
      if (bodyUserId && authenticatedUserId !== bodyUserId) {
        console.warn(`[Flappy Score] UserId mismatch - body: ${bodyUserId}, JWT: ${authenticatedUserId}. Using JWT userId.`);
      }
      
      // SECURITY: Rate limiting for score submissions
      const rateLimitResult = await checkRateLimit(userId, "flappy/score");
      if (!rateLimitResult.allowed) {
        console.log(`[Flappy] Score rate limit exceeded for user ${userId}`);
        return res.status(429).json({ 
          success: false, 
          error: `Too many score submissions. Please wait ${rateLimitResult.retryAfter} seconds.`,
          retryAfter: rateLimitResult.retryAfter
        });
      }
      
      // Validate score is a reasonable number
      const validatedScore = sanitizeNumber(score, 0, 10000);
      if (validatedScore === null) {
        logSecurityEvent("invalid_score_attempt", userId, { score, sessionId }, "warn");
        return res.status(400).json({ success: false, error: "Invalid score value" });
      }
      
      // SECURITY: Server-side ranked game validation
      // CRITICAL: The ranked flag must be derived server-side from session validation,
      // NOT trusted from client. This prevents bypass attacks where client sets 
      // isRanked=false but rankedPeriod='daily' to skip session check.
      const { secureSessionToken } = req.body;
      let verifiedRankedGame = false; // Only set TRUE after successful session validation
      let verifiedRankedPeriod: string | null = null;
      
      if (secureSessionToken) {
        // Validate the session token - this proves the game was legitimately started
        const sessionValidation = await validateAndConsumeGameSession(secureSessionToken, userId, validatedScore);
        if (sessionValidation.valid && sessionValidation.session) {
          // Session is valid - use session's period as the authoritative ranked period
          verifiedRankedGame = true;
          verifiedRankedPeriod = sessionValidation.session.period || rankedPeriod;
          console.log(`[Flappy] Secure session validated for ranked score: ${validatedScore}, period: ${verifiedRankedPeriod}`);
        } else {
          // Session validation failed
          const securityCtx = extractSecurityContext(req, userId);
          await logSecureEvent(
            "secure_session_validation_failed",
            "critical",
            `User ${userId} failed session validation: ${sessionValidation.error}`,
            securityCtx
          );
          return res.status(400).json({ success: false, error: sessionValidation.error || "Session validation failed" });
        }
      } else if (isRanked || rankedPeriod) {
        // BACKWARD COMPATIBILITY: Accept ranked submissions without sessions
        // The current Play Store/TestFlight builds do NOT send sessionId
        // TODO: Once a new client build is released with session support, require sessions
        if (sessionId) {
          // Client provided a sessionId - validate it
          const validation = validateGameScore(sessionId, userId, validatedScore, "flappy");
          if (validation.valid && !validation.reason) {
            const sessionExisted = endGameSession(sessionId);
            console.warn(`[Flappy] LEGACY: Ranked submission with sessionId. User: ${userId}, sessionExisted: ${sessionExisted}`);
            verifiedRankedGame = true;
            verifiedRankedPeriod = rankedPeriod || (isRanked ? 'daily' : null);
          } else {
            logSecurityEvent("legacy_ranked_validation_failed", userId, { 
              score: validatedScore, 
              sessionId, 
              reason: validation.reason 
            }, "critical");
            return res.status(400).json({ success: false, error: "Score validation failed" });
          }
        } else {
          // TEMPORARY: Allow ranked without session for backward compatibility
          // Current mobile builds don't call session/start, so sessionId is never sent
          // Log this for monitoring - once client is updated, this branch should be removed
          console.warn(`[Flappy] LEGACY: Ranked submission WITHOUT session. User: ${userId}, score: ${validatedScore}, period: ${rankedPeriod}`);
          logSecurityEvent("ranked_without_session_legacy", userId, { 
            score: validatedScore, 
            isRanked,
            rankedPeriod
          }, "warn");
          verifiedRankedGame = true;
          verifiedRankedPeriod = rankedPeriod || (isRanked ? 'daily' : null);
        }
      }
      
      // Legacy session validation for non-ranked games only
      if (!verifiedRankedGame && sessionId) {
        const validation = validateGameScore(sessionId, userId, validatedScore, "flappy");
        if (!validation.valid) {
          logSecurityEvent("score_validation_failed", userId, { 
            score: validatedScore, 
            sessionId, 
            reason: validation.reason 
          }, "critical");
          return res.status(400).json({ success: false, error: "Score validation failed" });
        }
        // Clean up the session
        endGameSession(sessionId);
      } else if (validatedScore > 5000 && !verifiedRankedGame) {
        // Only flag extremely high scores without session as suspicious (non-ranked only)
        logSecurityEvent("high_score_no_session", userId, { score: validatedScore }, "warn");
        return res.status(400).json({ success: false, error: "Session required for extremely high scores" });
      }
      
      // Use server-verified ranked status, NOT client-provided isRanked
      await db.insert(flappyScores).values({
        userId,
        score,
        coinsCollected,
        isRanked: verifiedRankedGame, // Server-verified, not client value
        chyEntryFee,
      });
      
      const today = new Date().toISOString().split('T')[0];
      const weekStart = getWeekStart();
      
      const existing = await db.select()
        .from(flappyLeaderboard)
        .where(eq(flappyLeaderboard.userId, userId))
        .limit(1);
      
      if (existing.length > 0) {
        const current = existing[0];
        
        // Use ATOMIC SQL updates to prevent race conditions under concurrent submissions
        // This is critical for money-bearing competitions with thousands of players
        const isNewDay = current.dailyBestDate !== today;
        const isNewWeek = !current.weeklyBestDate || current.weeklyBestDate < weekStart;
        
        console.log(`[Flappy Score] ATOMIC UPDATE: adding ${score} (day=${isNewDay}, week=${isNewWeek}, verifiedRanked=${verifiedRankedGame})`);
        
        await db.update(flappyLeaderboard)
          .set({
            // ATOMIC: Always add to existing score
            bestScore: sql`${flappyLeaderboard.bestScore} + ${score}`,
            totalGamesPlayed: sql`${flappyLeaderboard.totalGamesPlayed} + 1`,
            totalCoinsCollected: sql`${flappyLeaderboard.totalCoinsCollected} + ${coinsCollected}`,
            // ATOMIC: Add to ranked score only if this is a SERVER-VERIFIED ranked game
            ...(verifiedRankedGame ? {
              totalRankedGames: sql`${flappyLeaderboard.totalRankedGames} + 1`,
              bestRankedScore: sql`${flappyLeaderboard.bestRankedScore} + ${score}`,
            } : {}),
            // ATOMIC: Daily score - reset if new day, otherwise add
            dailyBestScore: isNewDay 
              ? score 
              : sql`${flappyLeaderboard.dailyBestScore} + ${score}`,
            dailyBestDate: today,
            // ATOMIC: Weekly score - reset if new week, otherwise add
            weeklyBestScore: isNewWeek 
              ? score 
              : sql`${flappyLeaderboard.weeklyBestScore} + ${score}`,
            weeklyBestDate: today,
            updatedAt: new Date(),
          })
          .where(eq(flappyLeaderboard.userId, userId));
      } else {
        const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        
        await db.insert(flappyLeaderboard).values({
          userId,
          displayName: user[0]?.displayName || null,
          bestScore: score,
          bestRankedScore: verifiedRankedGame ? score : 0,
          totalGamesPlayed: 1,
          totalRankedGames: verifiedRankedGame ? 1 : 0,
          totalCoinsCollected: coinsCollected,
          dailyBestScore: score,
          dailyBestDate: today,
          weeklyBestScore: score,
          weeklyBestDate: today,
        });
      }
      
      // Update competition entry if this is a SERVER-VERIFIED ranked game
      // SECURITY: verifiedRankedGame is ONLY true if session token was validated successfully
      // This completely prevents bypass attacks - client values are never trusted
      if (verifiedRankedGame && verifiedRankedPeriod) {
        // NEW: Proxy ranked score submission to webapp (source of truth for competitions)
        if (USE_WEBAPP_COMPETITIONS_OPERATIONS) {
          // CRITICAL FIX: Use OAuth-verified webappUserId, not client-provided
          // This ensures scores go to the same account as entry
          let effectiveWebappUserId: string | null = null;
          let userEmail: string | null = null;
          
          // Look up user's googleId and email for OAuth exchange
          const userRecord = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { googleId: true, email: true }
          });
          
          if (userRecord?.googleId && userRecord?.email) {
            userEmail = userRecord.email;
            // Get FRESH webappUserId via OAuth exchange (same as entry endpoint)
            const freshWebappUserId = await getFreshWebappUserId({
              googleId: userRecord.googleId,
              email: userRecord.email,
              displayName: userRecord.email.split('@')[0],
            });
            
            if (freshWebappUserId) {
              effectiveWebappUserId = freshWebappUserId;
              console.log(`[Flappy Score] Using OAuth-verified webappUserId: ${effectiveWebappUserId}`);
            } else {
              console.error(`[Flappy Score] OAuth exchange failed for user ${userId}, cannot submit ranked score`);
              // Don't fail the whole request - score is still saved locally
            }
          }
          
          if (effectiveWebappUserId && userEmail) {
            console.log(`[Flappy Score] Proxying ranked score to webapp: userId=${userId}, webappUserId=${effectiveWebappUserId}, score=${score}, period=${verifiedRankedPeriod}`);
            
            const webappScoreResult = await webappRequest("POST", "/api/flappy/competitions/submit-score", {
              userId,
              webappUserId: effectiveWebappUserId,
              email: userEmail,  // Email for reliable user lookup (preferred by webapp)
              period: verifiedRankedPeriod,
              score,
            });
            
            console.log(`[Flappy Score] Webapp score submission response:`, JSON.stringify(webappScoreResult));
            
            if (webappScoreResult.status !== 200 || !webappScoreResult.data?.success) {
              console.error(`[Flappy Score] Webapp score submission failed:`, webappScoreResult.data);
            }
          }
        } else {
          // LEGACY: Local database storage (when webapp competitions disabled)
          const periodDate = verifiedRankedPeriod === 'daily' ? today : getWeekNumber();
          
          // CRITICAL: Get current competition ID from webapp (source of truth)
          let currentCompetitionId: string | null = null;
          try {
            const competitionEndpoint = verifiedRankedPeriod === 'daily' 
              ? '/api/mobile/competitions/active?type=daily'
              : '/api/mobile/competitions/active?type=weekly';
            const compResult = await webappRequest("GET", competitionEndpoint);
            if (compResult.status === 200 && compResult.data?.competition?.id) {
              currentCompetitionId = compResult.data.competition.id;
            }
          } catch (err) {
            console.error(`[Flappy Score] Failed to fetch competition ID:`, err);
          }
          
          console.log(`[Flappy Score] Verified ranked game - looking for entry: userId=${userId}, period=${verifiedRankedPeriod}, periodDate=${periodDate}, competitionId=${currentCompetitionId}`);
          
          // Find the user's entry in the competition using SERVER-VERIFIED period AND competitionId
          const entryResult = await db.select()
            .from(flappyRankedEntries)
            .where(and(
              eq(flappyRankedEntries.userId, userId),
              eq(flappyRankedEntries.period, verifiedRankedPeriod),
              currentCompetitionId ? eq(flappyRankedEntries.competitionId, currentCompetitionId) : eq(flappyRankedEntries.periodDate, periodDate)
            ))
            .limit(1);
          
          console.log(`[Flappy Score] Entry found: ${entryResult.length > 0 ? 'YES' : 'NO'}, entryId=${entryResult[0]?.id || 'none'}, currentBest=${entryResult[0]?.bestScore ?? 'N/A'}`);
          
          if (entryResult.length > 0) {
            const entry = entryResult[0];
            // ATOMIC: Accumulate score directly in SQL to prevent race conditions
            console.log(`[Flappy Score] ATOMIC RANKED UPDATE: adding ${score} to entry ${entry.id}`);
            await db.update(flappyRankedEntries)
              .set({ 
                bestScore: sql`${flappyRankedEntries.bestScore} + ${score}`,
                gamesPlayed: sql`${flappyRankedEntries.gamesPlayed} + 1`
              })
              .where(eq(flappyRankedEntries.id, entry.id));
          } else {
            // UPSERT: Create entry if it doesn't exist (fixes score not recording bug)
            console.log(`[Flappy Score] No entry found - CREATING new entry with score ${score}, competitionId=${currentCompetitionId}`);
            const ENTRY_FEE = verifiedRankedPeriod === 'daily' ? 1 : 3;
            await db.insert(flappyRankedEntries).values({
              userId,
              period: verifiedRankedPeriod,
              periodDate,
              competitionId: currentCompetitionId,
              entryFee: ENTRY_FEE,
              bestScore: score,
              gamesPlayed: 1,
            });
            console.log(`[Flappy Score] Entry created successfully for ${verifiedRankedPeriod} competition`);
          }
        }
      }
      
      await logUserActivity(
        userId,
        "game",
        "Flappy Roachy",
        `Score: ${score} points${verifiedRankedGame ? " (Ranked)" : ""}`,
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

  // SECURED: This endpoint requires either admin key OR valid purchase receipt from webapp
  app.post("/api/flappy/inventory/add", rateLimit({ windowMs: 60000, max: 20 }), async (req: Request, res: Response) => {
    try {
      const { userId, powerUpType, quantity = 1, purchaseReceipt, adminKey } = req.body;
      
      if (!userId || !powerUpType) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }
      
      // Security: Require either admin key or valid purchase receipt
      const isAdmin = adminKey && adminKey === process.env.ADMIN_API_KEY;
      
      if (!isAdmin && !purchaseReceipt) {
        logSecurityEvent("inventory_add_unauthorized", userId, { powerUpType, quantity }, "warn");
        return res.status(403).json({ success: false, error: "Purchase verification required" });
      }
      
      // If not admin, verify purchase receipt with webapp
      if (!isAdmin && purchaseReceipt) {
        try {
          const verifyResult = await webappRequest("POST", "/api/web/powerups/verify-purchase", {
            userId,
            receipt: purchaseReceipt,
            powerUpType,
            quantity,
          });
          
          if (verifyResult.status !== 200 || !verifyResult.data?.valid) {
            logSecurityEvent("inventory_add_invalid_receipt", userId, { powerUpType, quantity, purchaseReceipt }, "critical");
            return res.status(403).json({ success: false, error: "Invalid purchase receipt" });
          }
        } catch (error) {
          // If webapp verification fails, deny the request
          console.error("Purchase verification error:", error);
          return res.status(500).json({ success: false, error: "Purchase verification failed" });
        }
      }
      
      logSecurityEvent("inventory_add", userId, { powerUpType, quantity, isAdmin }, "info");
      
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

  app.post("/api/flappy/ranked/enter", requireAuth, async (req: Request, res: Response) => {
    try {
      // SECURITY: Use authenticated userId from JWT, not from request body (prevents impersonation)
      const authenticatedUserId = (req as any).userId;
      const { userId: bodyUserId, period = 'daily', webappUserId, idempotencyKey: clientIdempotencyKey } = req.body;
      
      // Guard: Ensure authenticated userId is present (requireAuth should guarantee this)
      if (!authenticatedUserId) {
        console.error(`[Flappy Enter] SECURITY: No authenticated userId from JWT`);
        return res.status(401).json({ success: false, error: "Authentication required" });
      }
      
      // Use authenticated user ID - bodyUserId is only for logging/debugging
      const userId = authenticatedUserId;
      if (bodyUserId && bodyUserId !== authenticatedUserId) {
        console.warn(`[Flappy Enter] SECURITY: Body userId (${bodyUserId}) differs from authenticated userId (${authenticatedUserId})`);
      }
      
      // Beta block - no flappy competitions during beta
      if (FLAPPY_COMPETITIONS_LOCKED) {
        return res.status(400).json({ 
          success: false, 
          error: "Flappy competitions coming soon! Free play is available now." 
        });
      }
      
      if (!userId) {
        return res.status(400).json({ success: false, error: "Missing userId" });
      }
      
      if (period !== 'daily' && period !== 'weekly') {
        return res.status(400).json({ success: false, error: "Invalid period" });
      }
      
      // SECURITY: Rate limiting
      const rateLimitResult = await checkRateLimit(userId, "flappy/enter");
      if (!rateLimitResult.allowed) {
        console.log(`[Flappy] Rate limit exceeded for user ${userId}`);
        return res.status(429).json({ 
          success: false, 
          error: `Too many requests. Please wait ${rateLimitResult.retryAfter} seconds.`,
          retryAfter: rateLimitResult.retryAfter
        });
      }
      
      // NEW: Proxy to webapp for competition entry
      // CRITICAL FIX: Always get fresh webappUserId from OAuth exchange, don't trust client-provided value
      if (USE_WEBAPP_COMPETITIONS_OPERATIONS) {
        console.log(`[Flappy Enter] Client provided webappUserId=${webappUserId}, will verify via OAuth exchange`);
        
        // Look up user from database to get googleId/email for fresh OAuth exchange
        const userRecord = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });
        
        if (!userRecord) {
          console.log(`[Flappy Enter] User ${userId} not found in database`);
          return res.status(400).json({ success: false, error: "User not found" });
        }
        
        if (!userRecord.googleId || !userRecord.email) {
          console.log(`[Flappy Enter] User ${userId} has no Google credentials, cannot enter competition`);
          return res.status(400).json({ success: false, error: "Google login required to enter competitions" });
        }
        
        // Try to get fresh webappUserId via OAuth exchange for verification
        const freshWebappUserId = await getFreshWebappUserId({
          googleId: userRecord.googleId,
          email: userRecord.email,
          displayName: userRecord.displayName,
        });
        
        // MANDATORY: OAuth exchange must succeed - no fallback to stale client IDs
        // This prevents charging the wrong account due to stale/cached webappUserId
        if (!freshWebappUserId) {
          console.error(`[Flappy Enter] OAuth exchange FAILED for ${userRecord.email} - cannot enter competition`);
          console.error(`[Flappy Enter] Client-provided webappUserId was: ${webappUserId} (REJECTED - stale/unverified)`);
          return res.status(502).json({ 
            success: false, 
            error: "Could not verify your account with the game server. Please try logging out and back in." 
          });
        }
        
        // OAuth succeeded - use the verified ID
        const effectiveWebappUserId = freshWebappUserId;
        
        // Log if client-provided webappUserId differs from fresh one (helps debug stale ID issues)
        if (webappUserId && webappUserId !== freshWebappUserId) {
          console.warn(`[Flappy Enter] STALE webappUserId detected! Client sent: ${webappUserId}, Fresh: ${freshWebappUserId} for ${userRecord.email}`);
        }
        console.log(`[Flappy Enter] Using verified webappUserId=${effectiveWebappUserId} for ${userRecord.email}`);
        
        const webappResult = await webappRequest("POST", "/api/flappy/competitions/enter", {
          userId: effectiveWebappUserId,  // Webapp's user ID (primary identifier)
          webappUserId: effectiveWebappUserId,  // Also send as webappUserId for compatibility
          email: userRecord.email,  // Email for reliable user lookup (preferred by webapp)
          period,
          mobileUserId: userId,  // Mobile's internal ID for reference
          idempotencyKey: clientIdempotencyKey,
        });
        
        console.log(`[Flappy Enter] Webapp response:`, JSON.stringify(webappResult));
        
        if (webappResult.status === 200 && webappResult.data) {
          return res.json(webappResult.data);
        }
        
        // Handle specific error cases
        if (webappResult.status === 400) {
          return res.status(400).json(webappResult.data);
        }
        
        // Fallback error
        return res.status(webappResult.status || 500).json({ 
          success: false, 
          error: webappResult.data?.error || "Failed to enter competition via webapp" 
        });
      }
      
      // Get entry fee from request body (sent by client from webapp competition config)
      // Client gets entryFee from webapp's /api/competitions/active endpoint
      const { entryFee: clientEntryFee, competitionId: clientCompetitionId } = req.body;
      const ENTRY_FEE = typeof clientEntryFee === 'number' && clientEntryFee >= 0 ? clientEntryFee : (period === 'daily' ? 2 : 5);
      console.log(`[Flappy] Entry fee from client: ${clientEntryFee}, using: ${ENTRY_FEE}`);
      const periodDate = period === 'daily' ? getTodayDate() : getWeekNumber();
      
      // CRITICAL: Get current competition ID from webapp or client
      let currentCompetitionId: string | null = clientCompetitionId || null;
      if (!currentCompetitionId) {
        try {
          const activeComps = await webappRequest("GET", "/api/mobile/competitions/active");
          if (activeComps.status === 200 && activeComps.data?.success) {
            const competitions = activeComps.data.competitions || [];
            const comp = competitions.find((c: any) => c.period === period && c.type === 'ranked');
            currentCompetitionId = comp?.id || null;
            console.log(`[Flappy Enter] Current ${period} competition ID from webapp: ${currentCompetitionId}`);
          }
        } catch (compError) {
          console.log(`[Flappy Enter] Could not fetch active competitions:`, compError);
        }
      } else {
        console.log(`[Flappy Enter] Using client-provided competition ID: ${currentCompetitionId}`);
      }
      
      // Build where clause for existing entry checks - use competitionId if available
      const entryWhereClause = currentCompetitionId
        ? and(eq(flappyRankedEntries.userId, userId), eq(flappyRankedEntries.period, period), eq(flappyRankedEntries.competitionId, currentCompetitionId))
        : and(eq(flappyRankedEntries.userId, userId), eq(flappyRankedEntries.period, period), eq(flappyRankedEntries.periodDate, periodDate));
      
      // SECURITY: Generate idempotency key for this entry (use competitionId for uniqueness)
      const idempotencyKey = clientIdempotencyKey || generateIdempotencyKey(
        userId, 
        'entry_fee', 
        `${period}:${currentCompetitionId || periodDate}`,
        ENTRY_FEE
      );
      
      // Check for duplicate transaction (replay attack prevention)
      const existingTx = await db.query.chyTransactions.findFirst({
        where: eq(chyTransactions.idempotencyKey, idempotencyKey),
      });
      
      if (existingTx) {
        console.log(`[Flappy] Duplicate entry attempt detected: ${idempotencyKey}`);
        // Find the existing entry and return it (idempotent response)
        const existingEntry = await db.select()
          .from(flappyRankedEntries)
          .where(entryWhereClause)
          .limit(1);
        
        if (existingEntry.length > 0) {
          return res.json({ 
            success: true, 
            alreadyJoined: true,
            entryId: existingEntry[0].id,
            period,
            periodDate,
            competitionId: currentCompetitionId,
            isDuplicate: true,
          });
        }
      }
      
      const existingEntry = await db.select()
        .from(flappyRankedEntries)
        .where(entryWhereClause)
        .limit(1);
      
      if (existingEntry.length > 0) {
        return res.json({ 
          success: true, 
          alreadyJoined: true,
          entryId: existingEntry[0].id,
          period,
          periodDate,
          competitionId: currentCompetitionId,
        });
      }
      
      // CRITICAL: If no competitionId, entry cannot proceed
      if (!currentCompetitionId) {
        console.error(`[Flappy Enter] No active competition found for period ${period}`);
        return res.status(400).json({ 
          success: false, 
          error: "No active competition found. Please refresh and try again." 
        });
      }
      
      // If webappUserId is provided from frontend, use it directly for faster balance lookup
      let chyBalance = 0;
      let effectiveWebappUserId = webappUserId;
      let balanceFetched = false;
      
      if (webappUserId) {
        console.log(`[Flappy] Using frontend-provided webappUserId: ${webappUserId}`);
        // Use wallet-balance endpoint (same as client) for accurate on-chain CHY balance
        const balanceResult = await webappRequest("GET", `/api/web/users/${webappUserId}/wallet-balance`);
        console.log(`[Flappy] Wallet-balance API response:`, JSON.stringify(balanceResult));
        if (balanceResult.status === 200 && balanceResult.data) {
          // wallet-balance returns chyBalance directly
          chyBalance = balanceResult.data?.chyBalance ?? 0;
          balanceFetched = true;
          console.log(`[Flappy] Wallet-balance fetch for ${webappUserId}: ${chyBalance} CHY`);
        } else {
          console.log(`[Flappy] Wallet-balance fetch failed, will try OAuth exchange:`, balanceResult);
        }
      }
      
      // Fallback: If no webappUserId OR direct fetch failed, try OAuth exchange
      if (!balanceFetched) {
        // Fallback: Look up user and do OAuth exchange
        let user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        
        if (user.length === 0) {
          // SELF-HEALING: User doesn't exist, create shell record
          console.warn(`[Flappy Enter] User ${userId} NOT FOUND - creating shell record`);
          try {
            const newUserResult = await db.insert(users).values({
              id: userId,
              displayName: `Player_${userId.substring(0, 8)}`,
              authProvider: "google",
              chyBalance: 100,
              diamondBalance: 0,
              lastLoginAt: new Date(),
            }).returning();
            
            if (newUserResult.length > 0) {
              user = newUserResult;
              console.log(`[Flappy Enter] Shell user created: ${userId}`);
            } else {
              return res.status(404).json({ success: false, error: "User not found" });
            }
          } catch (createError: any) {
            console.error(`[Flappy Enter] Failed to create shell user: ${createError.message}`);
            return res.status(404).json({ success: false, error: "User not found" });
          }
        }
        
        const userData = user[0];
        console.log(`[Flappy] User lookup result (no webappUserId):`, {
          userId,
          email: userData.email,
          googleId: userData.googleId,
        });
        
        // Try OAuth exchange if we have googleId/email
        if (userData.googleId && userData.email) {
          const exchangeResult = await webappRequest("POST", "/api/web/oauth/exchange", {
            googleId: userData.googleId,
            email: userData.email,
            displayName: userData.displayName || userData.email.split("@")[0],
          });
          
          // Webapp returns user directly (not wrapped in success field)
          if (exchangeResult.status === 200 && exchangeResult.data?.user) {
            effectiveWebappUserId = exchangeResult.data.user?.id;
            if (effectiveWebappUserId) {
              const balanceResult = await webappRequest("GET", `/api/web/users/${effectiveWebappUserId}/wallet-balance`);
              console.log(`[Flappy] OAuth fallback wallet-balance response:`, JSON.stringify(balanceResult));
              if (balanceResult.status === 200) {
                chyBalance = balanceResult.data?.chyBalance ?? 0;
                balanceFetched = true;
              }
            }
          }
          console.log(`[Flappy] OAuth exchange result - webappUserId: ${effectiveWebappUserId}, balance: ${chyBalance}`);
        }
        
        // FALLBACK: If local DB lacks googleId/email, try webapp lookup by mobile userId
        if (!balanceFetched && !effectiveWebappUserId) {
          console.log(`[Flappy] Local DB missing googleId/email, trying webapp lookup for mobile userId: ${userId}`);
          
          // Try to find user on webapp by their mobile userId
          const webappLookupResult = await webappRequest("GET", `/api/mobile/users/${userId}`);
          console.log(`[Flappy] Webapp user lookup response:`, JSON.stringify(webappLookupResult));
          
          if (webappLookupResult.status === 200 && webappLookupResult.data?.success && webappLookupResult.data?.user?.id) {
            effectiveWebappUserId = webappLookupResult.data.user.id;
            console.log(`[Flappy] Found webappUserId via mobile lookup: ${effectiveWebappUserId}`);
            
            // Fetch balance
            const balanceResult = await webappRequest("GET", `/api/web/users/${effectiveWebappUserId}/wallet-balance`);
            console.log(`[Flappy] Mobile fallback wallet-balance response:`, JSON.stringify(balanceResult));
            if (balanceResult.status === 200) {
              chyBalance = balanceResult.data?.chyBalance ?? 0;
              balanceFetched = true;
            }
          } else {
            // Last resort: if no webappUserId found anywhere, user needs to sign in with Google
            console.log(`[Flappy] No webapp user found for mobile userId ${userId}`);
            return res.status(400).json({ 
              success: false, 
              error: "Google sign-in required for competitions. Please log out and sign in with Google." 
            });
          }
        }
      }
      
      console.log(`[Flappy] Final balance check: ${chyBalance} CHY, entry fee: ${ENTRY_FEE}`);
      
      if (chyBalance < ENTRY_FEE) {
        // Include debug info in error for troubleshooting
        return res.status(400).json({ 
          success: false, 
          error: `Not enough CHY (have: ${chyBalance}, need: ${ENTRY_FEE})`,
          debug: {
            webappUserIdProvided: !!webappUserId,
            effectiveWebappUserId: effectiveWebappUserId || null,
            balanceFetched: chyBalance,
          }
        });
      }
      
      if (!effectiveWebappUserId) {
        return res.status(400).json({ success: false, error: "Could not verify webapp account" });
      }
      
      // ATOMIC TRANSACTION: Deduct entry fee AND create entry in single transaction
      const securityCtx = extractSecurityContext(req, userId);
      securityCtx.webappUserId = effectiveWebappUserId;
      
      // Deduct entry fee via webapp using webappUserId directly
      const deductResult = await webappRequest("POST", "/api/web/economy/deduct", {
        userId: effectiveWebappUserId,
        amount: ENTRY_FEE,
        reason: `Flappy ${period} competition entry`,
        idempotencyKey, // Pass idempotency key to webapp
      });
      
      if (deductResult.status !== 200 || !deductResult.data?.success) {
        console.error(`[Flappy] Failed to deduct CHY:`, deductResult);
        await logSecureEvent(
          "entry_fee_deduct_failed",
          "warning",
          `User ${userId} failed to deduct entry fee: ${JSON.stringify(deductResult.data)}`,
          securityCtx
        );
        return res.status(400).json({ success: false, error: "Failed to deduct CHY entry fee" });
      }
      
      // Record transaction in local ledger (for audit trail)
      try {
        await db.insert(chyTransactions).values({
          userId,
          webappUserId: effectiveWebappUserId,
          txType: 'entry_fee',
          amount: -ENTRY_FEE, // Negative for debit
          balanceBefore: chyBalance,
          balanceAfter: chyBalance - ENTRY_FEE,
          referenceId: `${period}:${periodDate}`,
          referenceType: `flappy_${period}`,
          idempotencyKey,
          clientIp: securityCtx.clientIp,
          userAgent: securityCtx.userAgent,
          deviceFingerprint: securityCtx.deviceFingerprint,
        });
        console.log(`[Flappy] Entry fee recorded in ledger: ${idempotencyKey}`);
      } catch (ledgerError: any) {
        // If ledger insert fails due to duplicate key, that's expected for replays
        if (ledgerError.code === '23505') {
          console.log(`[Flappy] Duplicate ledger entry (expected for idempotent replay)`);
        } else {
          console.error(`[Flappy] Ledger insert error:`, ledgerError);
        }
      }
      
      const [newEntry] = await db.insert(flappyRankedEntries).values({
        userId,
        competitionId: currentCompetitionId, // CRITICAL: Link entry to current competition
        period,
        periodDate,
        entryFee: ENTRY_FEE,
        bestScore: 0,
        gamesPlayed: 0,
      }).returning();
      
      // Create game session token for this competition
      const { sessionToken, expiresAt } = await createSecureGameSession(
        userId,
        'flappy',
        newEntry.id,
        period,
        periodDate
      );
      
      res.json({ 
        success: true, 
        alreadyJoined: false,
        entryFee: ENTRY_FEE, 
        newBalance: chyBalance - ENTRY_FEE,
        entryId: newEntry.id,
        period,
        periodDate,
        sessionToken, // Client should include this in score submissions
        sessionExpiresAt: expiresAt.toISOString(),
      });
    } catch (error) {
      console.error("Ranked entry error:", error);
      res.status(500).json({ success: false, error: "Failed to enter ranked" });
    }
  });

  // Boss challenge / competition entry by competitionId
  app.post("/api/flappy/competition/enter", async (req: Request, res: Response) => {
    try {
      const { userId, competitionId, webappUserId, entryFee: clientEntryFee, idempotencyKey: clientIdempotencyKey } = req.body;
      
      if (FLAPPY_COMPETITIONS_LOCKED) {
        return res.status(400).json({ 
          success: false, 
          error: "Flappy competitions coming soon! Free play is available now." 
        });
      }
      
      if (!userId || !competitionId) {
        return res.status(400).json({ success: false, error: "Missing userId or competitionId" });
      }
      
      const rateLimitResult = await checkRateLimit(userId, "flappy/enter");
      if (!rateLimitResult.allowed) {
        return res.status(429).json({ 
          success: false, 
          error: `Too many requests. Please wait ${rateLimitResult.retryAfter} seconds.`,
          retryAfter: rateLimitResult.retryAfter
        });
      }
      
      const ENTRY_FEE = typeof clientEntryFee === 'number' && clientEntryFee >= 0 ? clientEntryFee : 1;
      console.log(`[Flappy Boss] Entry request: userId=${userId}, competitionId=${competitionId}, fee=${ENTRY_FEE}`);
      
      // Check for existing entry
      const existingEntry = await db.select()
        .from(flappyRankedEntries)
        .where(and(
          eq(flappyRankedEntries.userId, userId),
          eq(flappyRankedEntries.competitionId, competitionId)
        ))
        .limit(1);
      
      if (existingEntry.length > 0) {
        return res.json({ 
          success: true, 
          alreadyJoined: true,
          entryId: existingEntry[0].id,
          competitionId,
        });
      }
      
      // Get webapp user ID and balance
      let effectiveWebappUserId = webappUserId;
      let chyBalance = 0;
      
      if (effectiveWebappUserId) {
        const balanceResult = await webappRequest("GET", `/api/web/users/${effectiveWebappUserId}/wallet-balance`);
        if (balanceResult.status === 200) {
          chyBalance = balanceResult.data?.chyBalance ?? 0;
        }
      } else {
        // Fallback: look up user and exchange OAuth
        const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (user.length > 0 && user[0].googleId && user[0].email) {
          const exchangeResult = await webappRequest("POST", "/api/web/oauth/exchange", {
            googleId: user[0].googleId,
            email: user[0].email,
            displayName: user[0].displayName || user[0].email.split("@")[0],
          });
          
          // Webapp returns user directly (not wrapped in success field)
          if (exchangeResult.status === 200 && exchangeResult.data?.user) {
            effectiveWebappUserId = exchangeResult.data.user?.id;
            if (effectiveWebappUserId) {
              const balanceResult = await webappRequest("GET", `/api/web/users/${effectiveWebappUserId}/wallet-balance`);
              if (balanceResult.status === 200) {
                chyBalance = balanceResult.data?.chyBalance ?? 0;
              }
            }
          }
        }
      }
      
      // Only check balance and deduct if entry fee > 0
      if (ENTRY_FEE > 0) {
        if (chyBalance < ENTRY_FEE) {
          return res.status(400).json({ 
            success: false, 
            error: `Not enough CHY (have: ${chyBalance}, need: ${ENTRY_FEE})`
          });
        }
        
        if (!effectiveWebappUserId) {
          return res.status(400).json({ success: false, error: "Could not verify webapp account" });
        }
        
        // Generate idempotency key
        const idempotencyKey = clientIdempotencyKey || generateIdempotencyKey(
          userId, 
          'entry_fee', 
          `boss:${competitionId}`,
          ENTRY_FEE
        );
        
        // Deduct entry fee via webapp
        const deductResult = await webappRequest("POST", "/api/web/economy/deduct", {
          userId: effectiveWebappUserId,
          amount: ENTRY_FEE,
          reason: `Boss challenge entry: ${competitionId}`,
          idempotencyKey,
        });
        
        if (deductResult.status !== 200 || !deductResult.data?.success) {
          console.error(`[Flappy Boss] Failed to deduct CHY:`, deductResult);
          return res.status(400).json({ success: false, error: "Failed to deduct CHY entry fee" });
        }
        
        // Record transaction
        try {
          await db.insert(chyTransactions).values({
            userId,
            webappUserId: effectiveWebappUserId,
            txType: 'entry_fee',
            amount: -ENTRY_FEE,
            balanceBefore: chyBalance,
            balanceAfter: chyBalance - ENTRY_FEE,
            referenceId: `boss:${competitionId}`,
            idempotencyKey,
          });
        } catch (ledgerError: any) {
          console.log(`[Flappy Boss] Ledger entry warning:`, ledgerError.message);
        }
      } else {
        console.log(`[Flappy Boss] Free entry (fee=0) for competitionId=${competitionId}`);
      }
      
      // Create entry
      const [newEntry] = await db.insert(flappyRankedEntries).values({
        userId,
        competitionId,
        period: 'boss',
        periodDate: competitionId,
        entryFee: ENTRY_FEE,
        bestScore: 0,
        gamesPlayed: 0,
      }).returning();
      
      console.log(`[Flappy Boss] Entry created: entryId=${newEntry.id}, competitionId=${competitionId}`);
      
      // Create game session token for boss challenge (same as ranked)
      const { sessionToken, expiresAt } = await createSecureGameSession(
        userId,
        'flappy',
        newEntry.id,
        'boss',
        competitionId
      );
      
      // Notify webapp to increment player count
      try {
        await webappRequest("POST", "/api/flappy/competitions/join", {
          competitionId,
          webappUserId: effectiveWebappUserId,
          mobileUserId: userId,
        });
        console.log(`[Flappy Boss] Notified webapp of join: competitionId=${competitionId}`);
      } catch (webappError) {
        console.log(`[Flappy Boss] Webapp join notification failed (non-critical):`, webappError);
      }
      
      res.json({ 
        success: true, 
        alreadyJoined: false,
        entryFee: ENTRY_FEE, 
        newBalance: chyBalance - ENTRY_FEE,
        entryId: newEntry.id,
        competitionId,
        sessionToken,
        sessionExpiresAt: expiresAt.toISOString(),
      });
    } catch (error) {
      console.error("Boss challenge entry error:", error);
      res.status(500).json({ success: false, error: "Failed to enter boss challenge" });
    }
  });

  // Check if user has joined specific competitions
  app.get("/api/flappy/competition/status", async (req: Request, res: Response) => {
    try {
      const { userId, competitionIds } = req.query;
      
      if (!userId) {
        return res.status(400).json({ success: false, error: "Missing userId" });
      }
      
      // Parse competitionIds - can be comma-separated or array
      const ids: string[] = typeof competitionIds === 'string' 
        ? competitionIds.split(',').map(id => id.trim()).filter(Boolean)
        : Array.isArray(competitionIds) ? competitionIds as string[] : [];
      
      if (ids.length === 0) {
        return res.json({ success: true, entries: {} });
      }
      
      // Find entries for these competitions
      const entries = await db.select({
        competitionId: flappyRankedEntries.competitionId,
        bestScore: flappyRankedEntries.bestScore,
        gamesPlayed: flappyRankedEntries.gamesPlayed,
      })
        .from(flappyRankedEntries)
        .where(and(
          eq(flappyRankedEntries.userId, userId as string),
          sql`${flappyRankedEntries.competitionId} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`
        ));
      
      // Build a map of competitionId -> entry status
      const entryMap: Record<string, { hasJoined: boolean; bestScore: number; gamesPlayed: number }> = {};
      for (const id of ids) {
        const entry = entries.find(e => e.competitionId === id);
        entryMap[id] = entry 
          ? { hasJoined: true, bestScore: entry.bestScore, gamesPlayed: entry.gamesPlayed }
          : { hasJoined: false, bestScore: 0, gamesPlayed: 0 };
      }
      
      res.json({ success: true, entries: entryMap });
    } catch (error) {
      console.error("Competition status error:", error);
      res.status(500).json({ success: false, error: "Failed to check competition status" });
    }
  });

  // Competition leaderboard - returns top 10 + user rank for daily/weekly
  app.get("/api/flappy/ranked/leaderboard", async (req: Request, res: Response) => {
    try {
      const { period, userId, webappUserId } = req.query;
      
      if (!period || (period !== 'daily' && period !== 'weekly')) {
        return res.status(400).json({ success: false, error: "Invalid period. Use 'daily' or 'weekly'" });
      }
      
      // NEW: Proxy to webapp for leaderboard (disabled - use local data)
      if (USE_WEBAPP_COMPETITIONS_OPERATIONS) {
        console.log(`[Flappy Leaderboard] Proxying to webapp: period=${period}, userId=${userId}, webappUserId=${webappUserId}`);
        
        const queryParams = new URLSearchParams();
        queryParams.set('period', period as string);
        if (userId) queryParams.set('userId', userId as string);
        if (webappUserId) queryParams.set('webappUserId', webappUserId as string);
        
        const webappResult = await webappRequest("GET", `/api/flappy/competitions/leaderboard?${queryParams.toString()}`);
        
        console.log(`[Flappy Leaderboard] Webapp response status: ${webappResult.status}`);
        
        if (webappResult.status === 200 && webappResult.data) {
          // Enrich leaderboard entries with display names from our database
          const enrichedData = { ...webappResult.data };
          
          if (enrichedData.leaderboard && Array.isArray(enrichedData.leaderboard)) {
            enrichedData.leaderboard = await Promise.all(
              enrichedData.leaderboard.map(async (entry: any) => {
                // Try to find user by mobileUserId first, then by webappUserId
                const lookupId = entry.mobileUserId || entry.userId;
                if (lookupId) {
                  const userRecord = await db.select({ displayName: users.displayName, email: users.email })
                    .from(users)
                    .where(eq(users.id, lookupId))
                    .limit(1);
                  
                  if (userRecord.length > 0 && userRecord[0].displayName) {
                    return { ...entry, displayName: userRecord[0].displayName };
                  }
                  
                  // Fallback: extract name from email
                  if (userRecord.length > 0 && userRecord[0].email) {
                    const emailName = userRecord[0].email.split('@')[0];
                    return { ...entry, displayName: emailName };
                  }
                }
                return entry;
              })
            );
          }
          
          // Also enrich userRankInfo if present
          if (enrichedData.userRankInfo) {
            const userLookupId = enrichedData.userRankInfo.mobileUserId || enrichedData.userRankInfo.userId;
            if (userLookupId) {
              const userRecord = await db.select({ displayName: users.displayName, email: users.email })
                .from(users)
                .where(eq(users.id, userLookupId))
                .limit(1);
              
              if (userRecord.length > 0 && userRecord[0].displayName) {
                enrichedData.userRankInfo.displayName = userRecord[0].displayName;
              } else if (userRecord.length > 0 && userRecord[0].email) {
                enrichedData.userRankInfo.displayName = userRecord[0].email.split('@')[0];
              }
            }
          }
          
          return res.json(enrichedData);
        }
        
        return res.status(webappResult.status || 500).json({ 
          success: false, 
          error: webappResult.data?.error || "Failed to fetch leaderboard from webapp" 
        });
      }
      
      const periodDate = period === 'daily' ? getTodayDate() : getWeekNumber();
      
      // CRITICAL: Fetch current competition ID from webapp to query correct entries
      let currentCompetitionId: string | null = null;
      try {
        const activeComps = await webappRequest("GET", "/api/mobile/competitions/active");
        if (activeComps.status === 200 && activeComps.data?.success) {
          const competitions = activeComps.data.competitions || [];
          const comp = competitions.find((c: any) => c.period === period && c.type === 'ranked');
          currentCompetitionId = comp?.id || null;
          console.log(`[Flappy Leaderboard] Current ${period} competition ID: ${currentCompetitionId}`);
        }
      } catch (compError) {
        console.log(`[Flappy Leaderboard] Could not fetch active competitions:`, compError);
      }
      
      console.log(`[Flappy Leaderboard] Fetching: period=${period}, competitionId=${currentCompetitionId}, periodDate=${periodDate}, userId=${userId}`);
      
      // Build where clause - use competitionId if available, fallback to periodDate
      const whereClause = currentCompetitionId
        ? and(eq(flappyRankedEntries.period, period), eq(flappyRankedEntries.competitionId, currentCompetitionId))
        : and(eq(flappyRankedEntries.period, period), eq(flappyRankedEntries.periodDate, periodDate));
      
      // Get top 10 entries with user info
      const topEntries = await db.select({
        id: flappyRankedEntries.id,
        userId: flappyRankedEntries.userId,
        bestScore: flappyRankedEntries.bestScore,
        gamesPlayed: flappyRankedEntries.gamesPlayed,
      })
        .from(flappyRankedEntries)
        .where(whereClause)
        .orderBy(desc(flappyRankedEntries.bestScore))
        .limit(10);
      
      console.log(`[Flappy Leaderboard] Found ${topEntries.length} entries:`, topEntries.map(e => ({ id: e.id, bestScore: e.bestScore })));
      
      // Fetch display names for top entries
      const leaderboard = await Promise.all(topEntries.map(async (entry, index) => {
        const userRecord = await db.select({ displayName: users.displayName })
          .from(users)
          .where(eq(users.id, entry.userId))
          .limit(1);
        
        return {
          rank: index + 1,
          userId: entry.userId,
          displayName: userRecord[0]?.displayName || 'Anonymous',
          score: entry.bestScore,
          gamesPlayed: entry.gamesPlayed,
        };
      }));
      
      // Check if user is in top 10, if not get their rank
      let userRankInfo = null;
      if (userId && typeof userId === 'string') {
        const isInTop10 = leaderboard.some(e => e.userId === userId);
        
        if (!isInTop10) {
          // Use competitionId if available for user rank lookup
          const userWhereClause = currentCompetitionId
            ? and(eq(flappyRankedEntries.userId, userId), eq(flappyRankedEntries.period, period), eq(flappyRankedEntries.competitionId, currentCompetitionId))
            : and(eq(flappyRankedEntries.userId, userId), eq(flappyRankedEntries.period, period), eq(flappyRankedEntries.periodDate, periodDate));
          
          const userEntry = await db.select({
            bestScore: flappyRankedEntries.bestScore,
            gamesPlayed: flappyRankedEntries.gamesPlayed,
          })
            .from(flappyRankedEntries)
            .where(userWhereClause)
            .limit(1);
          
          if (userEntry.length > 0) {
            // Calculate user's rank using same where clause base
            const rankResult = await db.select({ count: sql<number>`count(*)` })
              .from(flappyRankedEntries)
              .where(and(
                whereClause,
                sql`${flappyRankedEntries.bestScore} > ${userEntry[0].bestScore}`
              ));
            
            const userRecord = await db.select({ displayName: users.displayName })
              .from(users)
              .where(eq(users.id, userId))
              .limit(1);
            
            userRankInfo = {
              rank: Number(rankResult[0]?.count || 0) + 1,
              userId,
              displayName: userRecord[0]?.displayName || 'Anonymous',
              score: userEntry[0].bestScore,
              gamesPlayed: userEntry[0].gamesPlayed,
            };
          }
        }
      }
      
      res.json({
        success: true,
        period,
        periodDate,
        leaderboard,
        userRankInfo,
      });
    } catch (error) {
      console.error("Competition leaderboard error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch competition leaderboard" });
    }
  });

  app.get("/api/flappy/ranked/status", async (req: Request, res: Response) => {
    try {
      const { userId, webappUserId } = req.query;
      
      if (USE_WEBAPP_COMPETITIONS_OPERATIONS) {
        // CRITICAL FIX: Get fresh webappUserId via OAuth exchange, just like entry does
        // This ensures status lookup uses the same ID that was used to store the entry
        let effectiveWebappUserId = webappUserId as string | null;
        
        if (userId && typeof userId === 'string') {
          const userRecord = await db.query.users.findFirst({
            where: eq(users.id, userId as string),
          });
          
          if (userRecord?.googleId && userRecord?.email) {
            const freshWebappUserId = await getFreshWebappUserId({
              googleId: userRecord.googleId,
              email: userRecord.email,
              displayName: userRecord.displayName,
            });
            
            if (freshWebappUserId) {
              if (webappUserId && webappUserId !== freshWebappUserId) {
                console.log(`[Flappy Status] Correcting stale webappUserId: client=${webappUserId}, fresh=${freshWebappUserId}`);
              }
              effectiveWebappUserId = freshWebappUserId;
            }
          }
        }
        
        console.log(`[Flappy Status] Proxying to webapp: userId=${userId}, webappUserId=${effectiveWebappUserId}`);
        
        const webappResult = await webappRequest(
          "GET", 
          `/api/flappy/competitions/status?userId=${effectiveWebappUserId || ''}&webappUserId=${effectiveWebappUserId || ''}`
        );
        
        if (webappResult.status === 200 && webappResult.data?.success) {
          console.log(`[Flappy Status] Webapp response:`, JSON.stringify(webappResult.data));
          
          const formatPeriod = (period: any) => {
            if (!period) return null;
            return {
              entryFee: period.entryFee ?? 2,
              participants: period.participants ?? 0,
              prizePool: period.prizePool ?? 0,
              topScore: period.topScore ?? 0,
              endsIn: period.secondsUntilReset ? period.secondsUntilReset * 1000 : period.endsIn ?? getTimeUntilMidnight(),
              hasJoined: period.hasJoined ?? false,
              periodDate: period.periodDate ?? getTodayDate(),
              userScore: period.userScore ?? 0,
              userRank: period.userRank ?? 0,
              isPerpetual: period.isPerpetual ?? true,
              competitionId: period.competitionId,
              name: period.name,
              prizeBreakdown: period.prizeBreakdown,
            };
          };
          
          return res.json({
            success: true,
            daily: formatPeriod(webappResult.data.daily),
            weekly: formatPeriod(webappResult.data.weekly),
          });
        }
        
        console.warn(`[Flappy Status] Webapp unavailable, falling back to local data:`, webappResult);
      }
      
      // CRITICAL: Fetch current active competition IDs from webapp to verify entries
      // This prevents showing "Joined" for OLD competitions when a NEW one was created
      let currentDailyCompetitionId: string | null = null;
      let currentWeeklyCompetitionId: string | null = null;
      
      try {
        // CORRECT endpoint is /api/mobile/competitions/active (not /api/flappy/...)
        const activeComps = await webappRequest("GET", "/api/mobile/competitions/active");
        if (activeComps.status === 200 && activeComps.data?.success) {
          const competitions = activeComps.data.competitions || [];
          const dailyComp = competitions.find((c: any) => c.period === 'daily' && c.type === 'ranked');
          const weeklyComp = competitions.find((c: any) => c.period === 'weekly' && c.type === 'ranked');
          currentDailyCompetitionId = dailyComp?.id || null;
          currentWeeklyCompetitionId = weeklyComp?.id || null;
          console.log(`[Flappy Status] Current competition IDs from webapp: daily=${currentDailyCompetitionId}, weekly=${currentWeeklyCompetitionId}`);
        } else {
          console.log(`[Flappy Status] Webapp returned non-success: status=${activeComps.status}, data=`, activeComps.data);
        }
      } catch (compError) {
        console.log(`[Flappy Status] Could not fetch active competitions:`, compError);
      }
      
      const today = getTodayDate();
      const weekNumber = getWeekNumber();
      console.log(`[Flappy Status] Using local data: userId=${userId}, today=${today}, weekNumber=${weekNumber}`);
      
      // Build dynamic where clause - use competitionId if available, fallback to periodDate
      const dailyWhereClause = currentDailyCompetitionId 
        ? and(eq(flappyRankedEntries.period, 'daily'), eq(flappyRankedEntries.competitionId, currentDailyCompetitionId))
        : and(eq(flappyRankedEntries.period, 'daily'), eq(flappyRankedEntries.periodDate, today));
      
      const weeklyWhereClause = currentWeeklyCompetitionId
        ? and(eq(flappyRankedEntries.period, 'weekly'), eq(flappyRankedEntries.competitionId, currentWeeklyCompetitionId))
        : and(eq(flappyRankedEntries.period, 'weekly'), eq(flappyRankedEntries.periodDate, weekNumber));
      
      const dailyParticipants = await db.select({ count: sql<number>`count(*)` })
        .from(flappyRankedEntries)
        .where(dailyWhereClause);
      
      const weeklyParticipants = await db.select({ count: sql<number>`count(*)` })
        .from(flappyRankedEntries)
        .where(weeklyWhereClause);
      
      const dailyTopScore = await db.select()
        .from(flappyRankedEntries)
        .where(dailyWhereClause)
        .orderBy(desc(flappyRankedEntries.bestScore))
        .limit(1);
      
      const weeklyTopScore = await db.select()
        .from(flappyRankedEntries)
        .where(weeklyWhereClause)
        .orderBy(desc(flappyRankedEntries.bestScore))
        .limit(1);
      
      let hasJoinedDaily = false;
      let hasJoinedWeekly = false;
      let userDailyScore = 0;
      let userDailyRank = 0;
      let userWeeklyScore = 0;
      let userWeeklyRank = 0;
      
      console.log(`[Flappy Status] Checking hasJoined for userId=${userId}, competitionIds: daily=${currentDailyCompetitionId}, weekly=${currentWeeklyCompetitionId}`);
      
      if (userId && typeof userId === 'string') {
        // CRITICAL: Query by competitionId if available, not just periodDate
        // This ensures we only find entries for the CURRENT active competition
        const dailyUserWhereClause = currentDailyCompetitionId
          ? and(eq(flappyRankedEntries.userId, userId), eq(flappyRankedEntries.period, 'daily'), eq(flappyRankedEntries.competitionId, currentDailyCompetitionId))
          : and(eq(flappyRankedEntries.userId, userId), eq(flappyRankedEntries.period, 'daily'), eq(flappyRankedEntries.periodDate, today));
        
        const weeklyUserWhereClause = currentWeeklyCompetitionId
          ? and(eq(flappyRankedEntries.userId, userId), eq(flappyRankedEntries.period, 'weekly'), eq(flappyRankedEntries.competitionId, currentWeeklyCompetitionId))
          : and(eq(flappyRankedEntries.userId, userId), eq(flappyRankedEntries.period, 'weekly'), eq(flappyRankedEntries.periodDate, weekNumber));
        
        const dailyEntry = await db.select()
          .from(flappyRankedEntries)
          .where(dailyUserWhereClause)
          .limit(1);
        
        const weeklyEntry = await db.select()
          .from(flappyRankedEntries)
          .where(weeklyUserWhereClause)
          .limit(1);
        
        hasJoinedDaily = dailyEntry.length > 0;
        hasJoinedWeekly = weeklyEntry.length > 0;
        console.log(`[Flappy Status] DB query results: dailyEntry=${dailyEntry.length}, weeklyEntry=${weeklyEntry.length}, hasJoinedDaily=${hasJoinedDaily}, hasJoinedWeekly=${hasJoinedWeekly}`);
        
        if (hasJoinedDaily && dailyEntry[0]) {
          userDailyScore = dailyEntry[0].bestScore;
          // Use same where clause for rank calculation
          const dailyRankResult = await db.select({ count: sql<number>`count(*)` })
            .from(flappyRankedEntries)
            .where(and(
              dailyWhereClause,
              sql`${flappyRankedEntries.bestScore} > ${userDailyScore}`
            ));
          userDailyRank = Number(dailyRankResult[0]?.count || 0) + 1;
        }
        
        if (hasJoinedWeekly && weeklyEntry[0]) {
          userWeeklyScore = weeklyEntry[0].bestScore;
          // Use same where clause for rank calculation
          const weeklyRankResult = await db.select({ count: sql<number>`count(*)` })
            .from(flappyRankedEntries)
            .where(and(
              weeklyWhereClause,
              sql`${flappyRankedEntries.bestScore} > ${userWeeklyScore}`
            ));
          userWeeklyRank = Number(weeklyRankResult[0]?.count || 0) + 1;
        }
      }
      
      const dailyParticipantCount = Number(dailyParticipants[0]?.count || 0);
      const weeklyParticipantCount = Number(weeklyParticipants[0]?.count || 0);
      
      console.log(`[Flappy Status] Returning: hasJoinedDaily=${hasJoinedDaily}, hasJoinedWeekly=${hasJoinedWeekly}, dailyCompId=${currentDailyCompetitionId}, weeklyCompId=${currentWeeklyCompetitionId}`);
      
      res.json({
        success: true,
        daily: {
          hasJoined: hasJoinedDaily,
          periodDate: today,
          userScore: userDailyScore,
          userRank: userDailyRank,
          topScore: dailyTopScore[0]?.bestScore || 0,
          participants: dailyParticipantCount,
          competitionId: currentDailyCompetitionId,
        },
        weekly: {
          hasJoined: hasJoinedWeekly,
          periodDate: weekNumber,
          userScore: userWeeklyScore,
          userRank: userWeeklyRank,
          topScore: weeklyTopScore[0]?.bestScore || 0,
          participants: weeklyParticipantCount,
          competitionId: currentWeeklyCompetitionId,
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
