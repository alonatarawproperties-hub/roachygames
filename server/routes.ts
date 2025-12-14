import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { registerHuntRoutes } from "./hunt-routes";
import { registerChessRoutes } from "./chess-routes";
import { registerTournamentRoutes } from "./tournament-routes";
import { registerEconomyRoutes } from "./economy-routes";
import { registerFlappyRoutes } from "./flappy-routes";
import { registerWebappRoutes } from "./webapp-routes";
import authRoutes from "./auth-routes";

export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api/auth", authRoutes);
  registerHuntRoutes(app);
  registerChessRoutes(app);
  registerTournamentRoutes(app);
  registerEconomyRoutes(app);
  registerFlappyRoutes(app);
  registerWebappRoutes(app);

  const httpServer = createServer(app);

  return httpServer;
}
