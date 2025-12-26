import { Router, Request, Response, Express } from "express";
import crypto from "crypto";
import { requireAuth } from "./security";

const WEBAPP_URL = process.env.WEBAPP_URL || "https://roachy.games";
const MOBILE_API_SECRET = process.env.MOBILE_API_SECRET;
const APP_ID = "roachy-games-mobile";

interface Competition {
  id: string;
  name: string;
  status: "scheduled" | "active" | "finalizing" | "closed";
  entryFee: number;
  prizePool: number;
  startsAt: string;
  endsAt: string;
  maxEntries?: number;
  currentEntries?: number;
}

interface SubmitScoreRequest {
  competitionId: string;
  walletAddress: string;
  displayName: string;
  score: number;
  runId: string;
  powerUpsUsed?: string[];
}

const usedRunIds = new Set<string>();

function generateHmacSignature(
  timestamp: string,
  competitionId: string,
  walletAddress: string,
  score: number
): string {
  if (!MOBILE_API_SECRET) {
    throw new Error("MOBILE_API_SECRET not configured");
  }
  const message = `${timestamp}:${competitionId}:${walletAddress}:${score}`;
  return crypto
    .createHmac("sha256", MOBILE_API_SECRET)
    .update(message)
    .digest("hex");
}

async function competitionApiRequest(
  method: string,
  endpoint: string,
  data?: unknown,
  hmacHeaders?: { timestamp: string; signature: string }
): Promise<{ status: number; data: any }> {
  if (!MOBILE_API_SECRET) {
    return { status: 500, data: { error: "Competition API not configured" } };
  }

  const url = `${WEBAPP_URL}${endpoint}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (hmacHeaders) {
    headers["X-Roachy-Timestamp"] = hmacHeaders.timestamp;
    headers["X-Roachy-Signature"] = hmacHeaders.signature;
    headers["X-Roachy-App-Id"] = APP_ID;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      console.error(`[CompetitionAPI] Non-JSON response from ${endpoint}: ${contentType}`);
      return { status: 502, data: { error: "Invalid response from competition server" } };
    }

    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      console.error(`[CompetitionAPI] JSON parse error from ${endpoint}:`, parseError);
      return { status: 502, data: { error: "Invalid JSON response" } };
    }

    if (!response.ok) {
      const errorMessage =
        typeof result?.error === "string"
          ? result.error
          : typeof result?.message === "string"
          ? result.message
          : "Request failed";
      return {
        status: response.status,
        data: { success: false, error: errorMessage },
      };
    }

    return { status: response.status, data: result };
  } catch (error) {
    console.error(`[CompetitionAPI] Error calling ${endpoint}:`, error);
    return { status: 500, data: { error: "Failed to connect to competition server" } };
  }
}

export function registerCompetitionRoutes(app: Express) {
  const router = Router();

  router.get("/active", async (_req: Request, res: Response) => {
    try {
      const result = await competitionApiRequest("GET", "/api/mobile/competitions/active");
      res.status(result.status).json(result.data);
    } catch (error) {
      console.error("[Competition] Error fetching active competitions:", error);
      res.status(500).json({ error: "Failed to fetch competitions" });
    }
  });

  router.get("/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await competitionApiRequest("GET", `/api/mobile/competitions/${id}`);
      res.status(result.status).json(result.data);
    } catch (error) {
      console.error("[Competition] Error fetching competition:", error);
      res.status(500).json({ error: "Failed to fetch competition" });
    }
  });

  router.get("/:id/leaderboard", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await competitionApiRequest("GET", `/api/mobile/competitions/${id}/leaderboard`);
      res.status(result.status).json(result.data);
    } catch (error) {
      console.error("[Competition] Error fetching leaderboard:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  router.get("/:id/winners", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await competitionApiRequest("GET", `/api/mobile/competitions/${id}/winners`);
      res.status(result.status).json(result.data);
    } catch (error) {
      console.error("[Competition] Error fetching winners:", error);
      res.status(500).json({ error: "Failed to fetch winners" });
    }
  });

  router.post("/submit-score", requireAuth, async (req: Request, res: Response) => {
    try {
      const { competitionId, walletAddress, displayName, score, runId, powerUpsUsed } =
        req.body as SubmitScoreRequest;

      if (!competitionId || !walletAddress || !displayName || score === undefined || !runId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (typeof score !== "number" || score < 0 || !Number.isInteger(score)) {
        return res.status(400).json({ error: "Invalid score" });
      }

      const runIdKey = `${competitionId}:${runId}`;
      if (usedRunIds.has(runIdKey)) {
        console.log(`[Competition] Duplicate runId rejected: ${runIdKey}`);
        return res.status(409).json({ error: "Score already submitted for this run" });
      }

      const timestamp = new Date().toISOString();
      const signature = generateHmacSignature(timestamp, competitionId, walletAddress, score);

      const result = await competitionApiRequest(
        "POST",
        "/api/mobile/competitions/submit-score",
        {
          competitionId,
          walletAddress,
          displayName,
          score,
          runId,
          powerUpsUsed: powerUpsUsed || [],
        },
        { timestamp, signature }
      );

      if (result.status === 200 || result.status === 201) {
        usedRunIds.add(runIdKey);
        
        if (usedRunIds.size > 10000) {
          const entries = Array.from(usedRunIds);
          usedRunIds.clear();
          entries.slice(-5000).forEach((id) => usedRunIds.add(id));
        }
      }

      res.status(result.status).json(result.data);
    } catch (error) {
      console.error("[Competition] Error submitting score:", error);
      res.status(500).json({ error: "Failed to submit score" });
    }
  });

  app.use("/api/competitions", router);
  
  console.log("[Competition] Competition routes registered at /api/competitions");
}
