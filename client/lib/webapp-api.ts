import { getApiUrl, apiRequest } from "./query-client";

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
    const response = await apiRequest(
      "GET",
      `/api/webapp/users/${userId}/nfts`
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
