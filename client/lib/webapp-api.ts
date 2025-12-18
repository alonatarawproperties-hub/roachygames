import { WEBAPP_API_URL } from "./query-client";

// Helper to make authenticated requests to the webapp (roachy.games)
async function webappRequest(
  method: string,
  route: string,
  data?: unknown
): Promise<Response> {
  const url = new URL(route, WEBAPP_API_URL);
  
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add API secret for authenticated webapp endpoints
  if (process.env.EXPO_PUBLIC_MOBILE_APP_SECRET) {
    headers["x-api-secret"] = process.env.EXPO_PUBLIC_MOBILE_APP_SECRET;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  return res;
}

interface WebappBalances {
  diamonds: number;
  chy: number;
}

interface PowerupPurchaseResult {
  success: boolean;
  purchase?: {
    powerupType: string;
    quantity: number;
    diamondCost: number;
  };
  newDiamondBalance?: number;
  error?: string;
}

interface OAuthExchangeResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    displayName: string;
    walletAddress: string | null;
    diamondBalance: number;
    chyBalance: number;
  };
  error?: string;
}

export async function exchangeOAuthUser(
  googleId: string,
  email: string,
  displayName: string
): Promise<OAuthExchangeResult> {
  try {
    const response = await webappRequest("POST", "/api/web/oauth/exchange", {
      googleId,
      email,
      displayName,
    });
    return await response.json();
  } catch (error) {
    console.error("[WebappAPI] OAuth exchange failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "OAuth exchange failed",
    };
  }
}

export async function getUserBalances(
  userId: string
): Promise<{ success: boolean; balances?: WebappBalances; error?: string }> {
  try {
    const apiUrl = `${WEBAPP_API_URL}/api/web/users/${userId}/balances`;
    const secret = process.env.EXPO_PUBLIC_MOBILE_APP_SECRET;
    console.log("[WebappAPI] === BALANCE FETCH START ===");
    console.log("[WebappAPI] URL:", apiUrl);
    console.log("[WebappAPI] Has secret:", !!secret, "length:", secret?.length);
    
    const response = await webappRequest(
      "GET",
      `/api/web/users/${userId}/balances`
    );
    
    console.log("[WebappAPI] Response status:", response.status);
    
    if (!response.ok) {
      const text = await response.text();
      console.error("[WebappAPI] Balance fetch failed:", response.status, text);
      return { success: false, error: `HTTP ${response.status}: ${text}` };
    }
    
    const rawText = await response.clone().text();
    console.log("[WebappAPI] Raw response text:", rawText);
    
    const result = await response.json();
    console.log("[WebappAPI] Parsed JSON:", JSON.stringify(result));
    console.log("[WebappAPI] result.chyBalance:", result.chyBalance, "type:", typeof result.chyBalance);
    console.log("[WebappAPI] result.diamondBalance:", result.diamondBalance, "type:", typeof result.diamondBalance);
    
    const balances = { 
      diamonds: result.diamondBalance ?? 0, 
      chy: result.chyBalance ?? 0 
    };
    console.log("[WebappAPI] Final balances object:", JSON.stringify(balances));
    console.log("[WebappAPI] === BALANCE FETCH END ===");
    
    return { success: true, balances };
  } catch (error) {
    console.error("[WebappAPI] Get balances EXCEPTION:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get balances",
    };
  }
}

export async function getUserDiamonds(
  userId: string
): Promise<{ success: boolean; diamonds?: number; error?: string }> {
  try {
    const response = await webappRequest(
      "GET",
      `/api/web/users/${userId}/diamonds`
    );
    const result = await response.json();
    return { success: true, diamonds: result.diamonds };
  } catch (error) {
    console.error("[WebappAPI] Get diamonds failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get diamonds",
    };
  }
}

export async function purchasePowerup(
  userId: string,
  powerupType: string,
  diamondCost: number,
  quantity: number = 1
): Promise<PowerupPurchaseResult> {
  try {
    const response = await webappRequest("POST", "/api/web/powerups/purchase", {
      userId,
      powerupType,
      diamondCost,
      quantity,
    });
    return await response.json();
  } catch (error) {
    console.error("[WebappAPI] Powerup purchase failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Purchase failed",
    };
  }
}

export async function linkWallet(
  userId: string,
  walletAddress: string,
  signature?: string,
  message?: string
): Promise<{ success: boolean; walletAddress?: string; error?: string }> {
  try {
    const response = await webappRequest(
      "POST",
      `/api/web/users/${userId}/link-wallet`,
      { walletAddress, signature, message }
    );
    return await response.json();
  } catch (error) {
    console.error("[WebappAPI] Link wallet failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to link wallet",
    };
  }
}

export interface OwnedNft {
  id: number;
  nftId: number;
  name: string;
  type: string;
  rarity: string;
  game: string;
  imageUrl: string | null;
  acquiredAt: string;
  mintAddress: string | null;
}

export async function getUserNfts(
  userId: string
): Promise<{ success: boolean; nfts?: OwnedNft[]; error?: string }> {
  try {
    const response = await webappRequest(
      "GET",
      `/api/web/users/${userId}/nfts`
    );
    const result = await response.json();
    return { success: true, nfts: result.nfts || [] };
  } catch (error) {
    console.error("[WebappAPI] Get NFTs failed:", error);
    return {
      success: false,
      nfts: [],
      error: error instanceof Error ? error.message : "Failed to get NFTs",
    };
  }
}
