import { getApiUrl, apiRequest } from "./query-client";

interface WebappBalances {
  diamonds: number;
  chy: number;
}

interface TradeResult {
  success: boolean;
  trade?: {
    chySpent?: number;
    roachySpent?: number;
    diamondsReceived: number;
  };
  newBalances?: WebappBalances;
  newDiamondBalance?: number;
  error?: string;
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

interface ExchangeRates {
  chyToDiamond: number;
  roachyToDiamond: number;
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

export async function getExchangeRates(): Promise<ExchangeRates> {
  try {
    const response = await apiRequest("GET", "/api/webapp/exchange-rates");
    const result = await response.json();
    return result.rates;
  } catch (error) {
    console.error("[WebappAPI] Get exchange rates failed:", error);
    throw error;
  }
}

export async function exchangeOAuthUser(
  googleId: string,
  email: string,
  displayName: string
): Promise<OAuthExchangeResult> {
  try {
    const response = await apiRequest("POST", "/api/webapp/oauth/exchange", {
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
    const response = await apiRequest(
      "GET",
      `/api/webapp/users/${userId}/balances`
    );
    const result = await response.json();
    return { success: true, balances: result.balances };
  } catch (error) {
    console.error("[WebappAPI] Get balances failed:", error);
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
    const response = await apiRequest(
      "GET",
      `/api/webapp/users/${userId}/diamonds`
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

export async function tradeChyToDiamonds(
  userId: string,
  chyAmount: number
): Promise<TradeResult> {
  try {
    const response = await apiRequest("POST", "/api/webapp/trades/chy-to-diamonds", {
      userId,
      chyAmount,
    });
    return await response.json();
  } catch (error) {
    console.error("[WebappAPI] CHY trade failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Trade failed",
    };
  }
}

export async function tradeRoachyToDiamonds(
  userId: string,
  roachyAmount: number
): Promise<TradeResult> {
  try {
    const response = await apiRequest("POST", "/api/webapp/trades/roachy-to-diamonds", {
      userId,
      roachyAmount,
    });
    return await response.json();
  } catch (error) {
    console.error("[WebappAPI] ROACHY trade failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Trade failed",
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
    const response = await apiRequest("POST", "/api/webapp/powerups/purchase", {
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
    const response = await apiRequest(
      "POST",
      `/api/webapp/users/${userId}/link-wallet`,
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
