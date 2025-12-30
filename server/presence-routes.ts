import type { Express, Request, Response } from "express";

interface PresenceEntry {
  sessionId: string;
  userId: string | null;
  lastHeartbeat: number;
  currentGame: string | null;
}

const PRESENCE_TIMEOUT_MS = 60000;
const presenceStore = new Map<string, PresenceEntry>();

function cleanupStalePresence() {
  const now = Date.now();
  for (const [sessionId, entry] of presenceStore.entries()) {
    if (now - entry.lastHeartbeat > PRESENCE_TIMEOUT_MS) {
      presenceStore.delete(sessionId);
    }
  }
}

setInterval(cleanupStalePresence, 30000);

function getPresenceStats() {
  cleanupStalePresence();
  
  let onlineCount = 0;
  const playingByGame: Record<string, number> = {};
  
  for (const entry of presenceStore.values()) {
    onlineCount++;
    if (entry.currentGame) {
      playingByGame[entry.currentGame] = (playingByGame[entry.currentGame] || 0) + 1;
    }
  }
  
  return { onlineCount, playingByGame };
}

export function registerPresenceRoutes(app: Express) {
  app.post("/api/presence/heartbeat", (req: Request, res: Response) => {
    const { sessionId, userId, currentGame } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId required" });
    }
    
    presenceStore.set(sessionId, {
      sessionId,
      userId: userId || null,
      lastHeartbeat: Date.now(),
      currentGame: currentGame || null,
    });
    
    const stats = getPresenceStats();
    return res.json({ success: true, ...stats });
  });
  
  app.post("/api/presence/leave", (req: Request, res: Response) => {
    const { sessionId } = req.body;
    
    if (sessionId) {
      presenceStore.delete(sessionId);
    }
    
    return res.json({ success: true });
  });
  
  app.get("/api/presence/stats", (_req: Request, res: Response) => {
    const stats = getPresenceStats();
    return res.json(stats);
  });
}
