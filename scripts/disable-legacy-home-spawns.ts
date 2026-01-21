/**
 * One-time script to disable legacy public HOME spawns that have sourceKey=NULL.
 * 
 * These old spawns were created before the owner-based system was implemented.
 * They are visible to all players (public) and need to be disabled so each
 * player only sees their own HOME eggs.
 * 
 * RUN ONCE with: npx tsx scripts/disable-legacy-home-spawns.ts
 * 
 * This script is idempotent - safe to run multiple times.
 */

import { db } from "../server/db";
import { wildCreatureSpawns } from "../shared/schema";
import { eq, isNull, and } from "drizzle-orm";

async function disableLegacyHomeSpawns() {
  console.log("[LegacyCleanup] Starting disable of legacy public HOME spawns...");
  
  const result = await db
    .update(wildCreatureSpawns)
    .set({ isActive: false })
    .where(and(
      eq(wildCreatureSpawns.sourceType, "HOME"),
      isNull(wildCreatureSpawns.sourceKey),
      eq(wildCreatureSpawns.isActive, true),
      isNull(wildCreatureSpawns.caughtByWallet),
    ))
    .returning({ id: wildCreatureSpawns.id });
  
  console.log(`[LegacyCleanup] Disabled ${result.length} legacy public HOME spawns`);
  
  if (result.length > 0) {
    console.log("[LegacyCleanup] Sample IDs:", result.slice(0, 5).map(r => r.id).join(", "));
  }
  
  console.log("[LegacyCleanup] Done.");
  process.exit(0);
}

disableLegacyHomeSpawns().catch((err) => {
  console.error("[LegacyCleanup] Error:", err);
  process.exit(1);
});
