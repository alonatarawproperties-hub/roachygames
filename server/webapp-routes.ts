import { Router, Request, Response, Express } from "express";

const WEBAPP_URL = process.env.WEBAPP_URL || "https://roachy.games";
const MOBILE_APP_SECRET = process.env.MOBILE_APP_SECRET;

export async function webappRequest(
  method: string,
  endpoint: string,
  data?: unknown
): Promise<{ status: number; data: any }> {
  if (!MOBILE_APP_SECRET) {
    return { status: 500, data: { error: "Webapp integration not configured" } };
  }

  const url = `${WEBAPP_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-API-Secret": MOBILE_APP_SECRET,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    
    const contentType = response.headers.get("content-type") || "";
    
    if (!contentType.includes("application/json")) {
      console.error(`[WebappProxy] Non-JSON response from ${endpoint}: ${contentType}`);
      return { status: 502, data: { error: "Invalid response from webapp" } };
    }
    
    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      console.error(`[WebappProxy] JSON parse error from ${endpoint}:`, parseError);
      return { status: 502, data: { error: "Invalid JSON response from webapp" } };
    }
    
    // For non-OK responses, always sanitize to prevent leaking internal details
    if (!response.ok) {
      const errorMessage = typeof result?.error === "string" 
        ? result.error 
        : typeof result?.message === "string"
          ? result.message
          : "Request failed";
      return { 
        status: response.status, 
        data: { success: false, error: errorMessage } 
      };
    }
    
    return { status: response.status, data: result };
  } catch (error) {
    console.error(`[WebappProxy] Error calling ${endpoint}:`, error);
    return { status: 500, data: { error: "Failed to connect to webapp" } };
  }
}

export function registerWebappRoutes(app: Express) {
  const router = Router();

  router.post("/oauth/exchange", async (req: Request, res: Response) => {
    const { googleId, email, displayName } = req.body;
    if (!googleId || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const result = await webappRequest("POST", "/api/web/oauth/exchange", { googleId, email, displayName });
    res.status(result.status).json(result.data);
  });

  router.get("/users/:userId/balances", async (req: Request, res: Response) => {
    const { userId } = req.params;
    const result = await webappRequest("GET", `/api/web/users/${userId}/balances`);
    res.status(result.status).json(result.data);
  });

  router.get("/users/:userId/diamonds", async (req: Request, res: Response) => {
    const { userId } = req.params;
    const result = await webappRequest("GET", `/api/web/users/${userId}/diamonds`);
    res.status(result.status).json(result.data);
  });

  router.post("/powerups/purchase", async (req: Request, res: Response) => {
    const { userId, powerupType, diamondCost, quantity } = req.body;
    if (!userId || !powerupType || diamondCost === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const result = await webappRequest("POST", "/api/web/powerups/purchase", { userId, powerupType, diamondCost, quantity });
    res.status(result.status).json(result.data);
  });

  router.post("/users/:userId/link-wallet", async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { walletAddress, signature, message } = req.body;
    const result = await webappRequest("POST", `/api/web/users/${userId}/link-wallet`, { walletAddress, signature, message });
    res.status(result.status).json(result.data);
  });

  router.get("/users/:userId/nfts", async (req: Request, res: Response) => {
    const { userId } = req.params;
    const result = await webappRequest("GET", `/api/web/users/${userId}/nfts`);
    res.status(result.status).json(result.data);
  });

  router.get("/nfts", async (req: Request, res: Response) => {
    const result = await webappRequest("GET", "/api/web/nfts");
    res.status(result.status).json(result.data);
  });

  app.use("/api/webapp", router);
  
  app.get("/api/mobile/config", async (req: Request, res: Response) => {
    try {
      const result = await webappRequest("GET", "/api/mobile/config");
      if (result.status === 200 && result.data) {
        return res.status(200).json(result.data);
      }
      return res.status(200).json({
        iosLocked: false,
        androidLocked: false,
        iosStoreUrl: "https://testflight.apple.com/join/YOUR_CODE",
        androidStoreUrl: "https://play.google.com/store/apps/details?id=com.cryptocreatures.app",
        message: "A new update is available. Please update to continue using Roachy Games."
      });
    } catch (error) {
      console.error("[MobileConfig] Error fetching config:", error);
      return res.status(200).json({
        iosLocked: false,
        androidLocked: false,
        iosStoreUrl: "https://testflight.apple.com/join/YOUR_CODE",
        androidStoreUrl: "https://play.google.com/store/apps/details?id=com.cryptocreatures.app",
        message: "A new update is available. Please update to continue using Roachy Games."
      });
    }
  });
}
