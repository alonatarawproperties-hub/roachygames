import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { registerHuntRoutes } from "./hunt-routes";
import { registerChessRoutes } from "./chess-routes";

export async function registerRoutes(app: Express): Promise<Server> {
  registerHuntRoutes(app);
  registerChessRoutes(app);

  const httpServer = createServer(app);

  return httpServer;
}
