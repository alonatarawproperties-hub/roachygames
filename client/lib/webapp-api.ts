const WEBAPP_URL = process.env.EXPO_PUBLIC_WEBAPP_URL || "https://roachy.games";

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

async function webappRequest<T>(
  method: string,
  endpoint: string,
  data?: unknown,
  requiresAuth: boolean = true
): Promise<T> {
  const url = `${WEBAPP_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (requiresAuth) {
    const secret = process.env.EXPO_PUBLIC_MOBILE_APP_SECRET;
    if (!secret) {
      throw new Error("Mobile app secret not configured");
    }
    headers["X-API-Secret"] = secret;
  }
  
  const response = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });
  
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error || `Request failed: ${response.status}`);
  }
  
  return result;
}

export async function getExchangeRates(): Promise<ExchangeRates> {
  const result = await webappRequest<{ rates: ExchangeRates }>(
    "GET",
    "/api/web/exchange-rates",
    undefined,
    false
  );
  return result.rates;
}

export async function exchangeOAuthUser(
  googleId: string,
  email: string,
  displayName: string
): Promise<OAuthExchangeResult> {
  try {
    const result = await webappRequest<OAuthExchangeResult>(
      "POST",
      "/api/web/oauth/exchange",
      { googleId, email, displayName }
    );
    return result;
  } catch (error) {
    console.error("[WebappAPI] OAuth exchange failed:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "OAuth exchange failed" 
    };
  }
}

export async function getUserBalances(
  userId: string
): Promise<{ success: boolean; balances?: WebappBalances; error?: string }> {
  try {
    const result = await webappRequest<{ balances: WebappBalances }>(
      "GET",
      `/api/web/users/${userId}/balances`
    );
    return { success: true, balances: result.balances };
  } catch (error) {
    console.error("[WebappAPI] Get balances failed:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to get balances" 
    };
  }
}

export async function getUserDiamonds(
  userId: string
): Promise<{ success: boolean; diamonds?: number; error?: string }> {
  try {
    const result = await webappRequest<{ diamonds: number }>(
      "GET",
      `/api/web/users/${userId}/diamonds`
    );
    return { success: true, diamonds: result.diamonds };
  } catch (error) {
    console.error("[WebappAPI] Get diamonds failed:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to get diamonds" 
    };
  }
}

export async function tradeChyToDiamonds(
  userId: string,
  chyAmount: number
): Promise<TradeResult> {
  try {
    const result = await webappRequest<TradeResult>(
      "POST",
      "/api/web/trades/chy-to-diamonds",
      { userId, chyAmount }
    );
    return result;
  } catch (error) {
    console.error("[WebappAPI] CHY trade failed:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Trade failed" 
    };
  }
}

export async function tradeRoachyToDiamonds(
  userId: string,
  roachyAmount: number
): Promise<TradeResult> {
  try {
    const result = await webappRequest<TradeResult>(
      "POST",
      "/api/web/trades/roachy-to-diamonds",
      { userId, roachyAmount }
    );
    return result;
  } catch (error) {
    console.error("[WebappAPI] ROACHY trade failed:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Trade failed" 
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
    const result = await webappRequest<PowerupPurchaseResult>(
      "POST",
      "/api/web/powerups/purchase",
      { userId, powerupType, diamondCost, quantity }
    );
    return result;
  } catch (error) {
    console.error("[WebappAPI] Powerup purchase failed:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Purchase failed" 
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
    const result = await webappRequest<{ success: boolean; walletAddress: string }>(
      "POST",
      `/api/web/users/${userId}/link-wallet`,
      { walletAddress, signature, message }
    );
    return result;
  } catch (error) {
    console.error("[WebappAPI] Link wallet failed:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to link wallet" 
    };
  }
}
