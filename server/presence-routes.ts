import type { Express, Request, Response } from "express";

interface PresenceEntry {
  sessionId: string;
  userId: string | null;
  lastHeartbeat: number;
  currentGame: string | null;
  lat: number | null;
  lng: number | null;
  visible: boolean;
}

const PRESENCE_TIMEOUT_MS = 60000;
const NEARBY_RADIUS_KM = 100;
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

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function getNearbyPlayers(sessionId: string, lat: number, lng: number): Array<{lat: number; lng: number}> {
  cleanupStalePresence();
  const nearby: Array<{lat: number; lng: number}> = [];
  
  for (const entry of presenceStore.values()) {
    if (entry.sessionId === sessionId) continue;
    if (!entry.visible || entry.lat === null || entry.lng === null) continue;
    
    // TODO: Re-enable distance filter when player count grows
    // const dist = haversineDistance(lat, lng, entry.lat, entry.lng);
    // if (dist <= NEARBY_RADIUS_KM) {
    nearby.push({ lat: entry.lat, lng: entry.lng });
    // }
  }
  
  return nearby;
}

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
    const { sessionId, userId, currentGame, lat, lng, visible } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId required" });
    }
    
    const isVisible = visible !== false;
    
    presenceStore.set(sessionId, {
      sessionId,
      userId: userId || null,
      lastHeartbeat: Date.now(),
      currentGame: currentGame || null,
      lat: typeof lat === "number" ? lat : null,
      lng: typeof lng === "number" ? lng : null,
      visible: isVisible,
    });
    
    const stats = getPresenceStats();
    
    let nearbyPlayers: Array<{lat: number; lng: number}> = [];
    if (isVisible && typeof lat === "number" && typeof lng === "number") {
      nearbyPlayers = getNearbyPlayers(sessionId, lat, lng);
    }
    
    return res.json({ success: true, ...stats, nearbyPlayers });
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
