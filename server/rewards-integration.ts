import crypto from "crypto";

const WEBAPP_URL = process.env.WEBAPP_URL || "https://roachy.games";
const MOBILE_APP_SECRET = process.env.MOBILE_APP_SECRET;

interface RewardDistributionRequest {
  walletAddress: string;
  amount: number;
  rewardType: "daily_bonus" | "game_reward" | "achievement" | "referral";
  metadata?: Record<string, any>;
}

interface RewardDistributionResponse {
  success: boolean;
  transactionSignature?: string;
  error?: string;
}

function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

function generateHmacSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export async function distributeReward(
  request: RewardDistributionRequest
): Promise<RewardDistributionResponse> {
  if (!MOBILE_APP_SECRET) {
    console.error("[RewardsIntegration] MOBILE_APP_SECRET not configured");
    return { success: false, error: "Integration not configured" };
  }

  try {
    const idempotencyKey = generateIdempotencyKey();
    const timestamp = new Date().toISOString();
    
    const payload = {
      walletAddress: request.walletAddress,
      amount: request.amount,
      rewardType: request.rewardType,
      metadata: request.metadata,
      source: "mobile_app",
      timestamp,
      idempotencyKey,
    };
    
    const payloadString = JSON.stringify(payload);
    const signature = generateHmacSignature(payloadString, MOBILE_APP_SECRET);
    
    console.log(`[RewardsIntegration] Requesting ${request.amount} DIAMOND to ${request.walletAddress.slice(0, 8)}... (${request.rewardType}) [key: ${idempotencyKey.slice(0, 8)}...]`);

    const response = await fetch(`${WEBAPP_URL}/api/rewards/distribute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Mobile-App-Secret": MOBILE_APP_SECRET,
        "X-Idempotency-Key": idempotencyKey,
        "X-Signature": signature,
        "X-Timestamp": timestamp,
      },
      body: payloadString,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[RewardsIntegration] Failed: ${response.status}`, errorData);
      return { 
        success: false, 
        error: errorData.error || `HTTP ${response.status}` 
      };
    }

    const data = await response.json();
    console.log(`[RewardsIntegration] Success: tx=${data.transactionSignature?.slice(0, 16)}...`);
    
    return {
      success: true,
      transactionSignature: data.transactionSignature,
    };
  } catch (error) {
    console.error("[RewardsIntegration] Network error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Network error" 
    };
  }
}

export async function distributeDailyBonus(
  walletAddress: string,
  diamonds: number,
  streakDay: number
): Promise<RewardDistributionResponse> {
  return distributeReward({
    walletAddress,
    amount: diamonds,
    rewardType: "daily_bonus",
    metadata: {
      streakDay,
      claimDate: new Date().toISOString().split("T")[0],
    },
  });
}

export async function distributeGameReward(
  walletAddress: string,
  diamonds: number,
  gameName: string,
  reason: string
): Promise<RewardDistributionResponse> {
  return distributeReward({
    walletAddress,
    amount: diamonds,
    rewardType: "game_reward",
    metadata: {
      game: gameName,
      reason,
    },
  });
}
