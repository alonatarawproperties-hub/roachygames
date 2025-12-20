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
  walletAddress?: string | null;
  walletLinked?: boolean;
}

interface SpendChyResult {
  success: boolean;
  spent?: number;
  reason?: string;
  newBalance?: number;
  error?: string;
  walletNotLinked?: boolean;
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
): Promise<{ success: boolean; balances?: WebappBalances; error?: string; walletNotLinked?: boolean }> {
  try {
    // Use the new wallet-balance endpoint for accurate CHY balance
    const response = await webappRequest(
      "GET",
      `/api/web/users/${userId}/wallet-balance`
    );
    
    if (!response.ok) {
      const text = await response.text();
      // Check for wallet not linked error
      if (text.includes("No linked wallet")) {
        return { success: false, error: text, walletNotLinked: true };
      }
      return { success: false, error: `HTTP ${response.status}: ${text}` };
    }
    
    const result = await response.json();
    const balances: WebappBalances = { 
      diamonds: 0, // Diamonds not used anymore, CHY is single currency
      chy: result.chyBalance ?? 0,
      walletAddress: result.walletAddress ?? null,
      walletLinked: result.walletLinked ?? false,
    };
    
    return { success: true, balances };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get balances",
    };
  }
}

// Spend CHY through the webapp API - never deduct locally
export async function spendChy(
  userId: string,
  amount: number,
  reason: string
): Promise<SpendChyResult> {
  try {
    const response = await webappRequest(
      "POST",
      `/api/web/users/${userId}/spend-chy`,
      { amount, reason }
    );
    
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      const errorText = result.error || `HTTP ${response.status}`;
      // Check for wallet not linked error
      if (errorText.includes("No linked wallet")) {
        return { success: false, error: errorText, walletNotLinked: true };
      }
      return { success: false, error: errorText };
    }
    
    const result = await response.json();
    return {
      success: result.success ?? true,
      spent: result.spent,
      reason: result.reason,
      newBalance: result.newBalance,
    };
  } catch (error) {
    console.error("[WebappAPI] Spend CHY failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to spend CHY",
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

// Refund CHY through the webapp API - for tournament withdrawals before start
export async function refundChy(
  userId: string,
  amount: number,
  reason: string
): Promise<SpendChyResult> {
  try {
    const response = await webappRequest(
      "POST",
      `/api/web/users/${userId}/refund-chy`,
      { amount, reason }
    );
    
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      const errorText = result.error || `HTTP ${response.status}`;
      return { success: false, error: errorText };
    }
    
    const result = await response.json();
    return {
      success: result.success ?? true,
      spent: result.refunded,
      reason: result.reason,
      newBalance: result.newBalance,
    };
  } catch (error) {
    console.error("[WebappAPI] Refund CHY failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to refund CHY",
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
