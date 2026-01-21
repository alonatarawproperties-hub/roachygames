import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { registerHuntRoutes } from "./hunt-routes";
import { registerEconomyRoutes } from "./economy-routes";
import { registerWebappRoutes } from "./webapp-routes";
import { registerAdminRoutes } from "./admin-routes";
import { registerCompetitionRoutes } from "./competition-routes";
import { registerPresenceRoutes } from "./presence-routes";
import { registerNodeRoutes } from "./node-routes";
import { registerBattleRoutes } from "./battle-routes";
import authRoutes from "./auth-routes";
import { requireAuth } from "./security";

export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api/auth", authRoutes);
  
  // Secure all /api/hunt/* endpoints with JWT auth
  app.use("/api/hunt", requireAuth);
  registerHuntRoutes(app);
  registerEconomyRoutes(app);
  registerWebappRoutes(app);
  registerAdminRoutes(app);
  registerCompetitionRoutes(app);
  registerPresenceRoutes(app);
  registerNodeRoutes(app);
  registerBattleRoutes(app);

  const httpServer = createServer(app);

  return httpServer;
}
