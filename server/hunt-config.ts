export const HUNT_CONFIG = {
  PHASE1_EGGS_ONLY: true,
  
  DAILY_HUNT_CAP: 25,
  RADIUS_METERS: 600,
  NODE_COUNT: 12,
  DISTANCE_MAX_METERS: 100,
  COOLDOWN_SECONDS: 30,
  TIMEZONE: 'Asia/Manila',
  
  PITY_RARE: 20,
  PITY_EPIC: 60,
  PITY_LEGENDARY: 500,
  
  // ===== DRIP + EXPLORE SYSTEM (Option B) =====
  HOME_RADIUS_M: 500,              // Home zone radius
  DRIP_INTERVAL_SEC: 240,          // 4 minutes between drip spawns
  MAX_ACTIVE_HOME_SPAWNS: 6,       // Hard cap on active home spawns
  DRIP_SPAWN_RADIUS_M: 100,        // Spawn within 100m for drip
  
  EXPLORE_DISTANCE_M: 200,         // Must move 200m to trigger explore bonus
  EXPLORE_COOLDOWN_SEC: 600,       // 10 minute cooldown between explore bonuses
  BONUS_SPAWNS_ON_EXPLORE: 2,      // Grant 2 spawns on explore
  EXPLORE_SPAWN_RADIUS_M: 200,     // Spawn within 200m for explore
  
  HOME_TTL_MIN: 20,                // Spawn TTL in minutes
  
  // ===== HOTSPOT QUEST SYSTEM (Phase I) =====
  // MICRO HOTSPOT (quick walk)
  MICRO_MIN_DIST_M: 150,
  MICRO_MAX_DIST_M: 450,
  MICRO_TTL_MIN: 12,
  MICRO_COOLDOWN_MIN: 10,
  MICRO_CLUSTER_COUNT: 2,
  MICRO_RATES: { rare: 0.75, epic: 0.25 } as Record<string, number>,
  
  // HOT DROP (main excitement)
  HOTDROP_MIN_DIST_M: 450,
  HOTDROP_MAX_DIST_M: 1200,
  HOTDROP_TTL_MIN: 12,
  HOTDROP_TTL_MAX: 22,
  HOTDROP_COOLDOWN_MIN: 25,
  HOTDROP_CLUSTER_COUNT_MIN: 3,
  HOTDROP_CLUSTER_COUNT_MAX: 5,
  HOTDROP_DYNAMIC_TTL: true,
  HOTDROP_RATES: { rare: 0.65, epic: 0.34, legendary: 0.01 } as Record<string, number>,
  
  // LEGENDARY BEACON (daily quest)
  BEACON_MIN_DIST_M: 1200,
  BEACON_MAX_DIST_M: 2000,
  BEACON_CLUSTER_COUNT: 5,
  BEACON_DAILY_LIMIT: 1,
  BEACON_RATES: { rare: 0.60, epic: 0.40 } as Record<string, number>,
  BEACON_CLAIM_TABLE: { legendary: 0.30, epic: 0.45, rare: 0.25 } as Record<string, number>,
  
  BASE_RATES: {
    common: 0.85,
    rare: 0.12,
    epic: 0.028,
    legendary: 0.002,
  } as Record<string, number>,
  
  FUSE_RATIO: 5,
  RECYCLE_COMMON_TO_WARMTH: 1,
  
  XP_REWARDS: {
    perfect: 150,
    great: 75,
    good: 30,
  } as Record<string, number>,
  
  POINTS_REWARDS: {
    perfect: 150,
    great: 75,
    good: 30,
  } as Record<string, number>,
  
  FIRST_CATCH_BONUS_XP: 100,
  
  LEVEL_XP_THRESHOLDS: [0, 500, 1200, 2200, 3600, 5400, 7600, 10200, 13200, 16600],
  LEVEL_AFTER_10_INCREMENT: 4500,
  
  LEVEL_XP: [0, 500, 700, 1000, 1400, 1800, 2200, 2600, 3000, 3400],
  
  LEVEL_DAILY_CAPS: {
    1: 25, 2: 25, 3: 30, 4: 30, 5: 35, 6: 35, 7: 40, 8: 40, 9: 40, 10: 50
  } as Record<number, number>,
  
  LEVEL_WARMTH_CAPS: {
    1: 10, 2: 10, 3: 10, 4: 15, 5: 15, 6: 20, 7: 20, 8: 20, 9: 30, 10: 30
  } as Record<number, number>,
  
  LEVEL_UNLOCKS: {
    trackerPing: 3,
    secondAttempt: 4,
    heatMode: 5,
  } as Record<string, number>,
  
  STREAK: {
    CAP_BONUS: [
      { minDay: 2, maxDay: 3, bonus: 2 },
      { minDay: 4, maxDay: 6, bonus: 4 },
      { minDay: 7, maxDay: 13, bonus: 6 },
      { minDay: 14, maxDay: 9999, bonus: 8 },
    ],
    XP_MULT: [
      { minDay: 1, maxDay: 2, mult: 1.0 },
      { minDay: 3, maxDay: 6, mult: 1.10 },
      { minDay: 7, maxDay: 13, mult: 1.20 },
      { minDay: 14, maxDay: 9999, mult: 1.30 },
    ],
    CHEST_EVERY_N_DAYS: 3,
    CHEST_REWARD: { warmth: 3, xp: 250 },
  },
  
  WARMTH: {
    RECYCLE_COMMON_TO_WARMTH: 1,
    PERFECT_CATCH_BONUS_WARMTH: 1,
    SPEND: {
      TRACKER_PING: 2,
      SECOND_ATTEMPT: 1,
      HEAT_MODE: 10,
    },
    HEAT_MODE_MINUTES: 20,
  },
  
  FUSION: {
    COMMON_TO_RARE: { cost: 5, chance: 1.0 },
    RARE_TO_EPIC: { cost: 20, chance: 0.15 },
    EPIC_TO_LEGENDARY: { cost: 30, chance: 0.05 },
  },
  
  BOOST_HUNTS_THRESHOLD: 10,
};

export function getManilaDate(): string {
  const now = new Date();
  const manilaOffset = 8 * 60;
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const manilaTime = new Date(utcTime + (manilaOffset * 60000));
  return manilaTime.toISOString().split('T')[0];
}

export function getManilaYesterday(): string {
  const now = new Date();
  const manilaOffset = 8 * 60;
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const manilaTime = new Date(utcTime + (manilaOffset * 60000) - 86400000);
  return manilaTime.toISOString().split('T')[0];
}

export function getUtcDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function getUtcYesterday(): string {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() - 1);
  return now.toISOString().split('T')[0];
}

export function getManilaWeekKey(): string {
  const now = new Date();
  const manilaOffset = 8 * 60;
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const manilaTime = new Date(utcTime + (manilaOffset * 60000));
  
  const year = manilaTime.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((manilaTime.getTime() - startOfYear.getTime()) / 86400000);
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function generateDeterministicNodes(
  centerLat: number,
  centerLon: number,
  dayKey: string,
  serverSecret: string = process.env.MOBILE_API_SECRET || 'hunt-secret'
): Array<{ nodeId: string; lat: number; lon: number }> {
  const seed = hashString(`${dayKey}-${serverSecret}`);
  const nodes: Array<{ nodeId: string; lat: number; lon: number }> = [];
  
  const radiusKm = HUNT_CONFIG.RADIUS_METERS / 1000;
  const latDelta = radiusKm / 111.32;
  const lonDelta = radiusKm / (111.32 * Math.cos(centerLat * Math.PI / 180));
  
  const gridSize = Math.ceil(Math.sqrt(HUNT_CONFIG.NODE_COUNT));
  const cellLatSize = (latDelta * 2) / gridSize;
  const cellLonSize = (lonDelta * 2) / gridSize;
  
  let nodeIndex = 0;
  for (let i = 0; i < gridSize && nodeIndex < HUNT_CONFIG.NODE_COUNT; i++) {
    for (let j = 0; j < gridSize && nodeIndex < HUNT_CONFIG.NODE_COUNT; j++) {
      const cellSeed = hashString(`${seed}-${i}-${j}`);
      
      const offsetLat = (cellSeed % 1000) / 1000 * cellLatSize;
      const offsetLon = ((cellSeed >> 10) % 1000) / 1000 * cellLonSize;
      
      const nodeLat = centerLat - latDelta + (i * cellLatSize) + offsetLat;
      const nodeLon = centerLon - lonDelta + (j * cellLonSize) + offsetLon;
      
      const nodeId = `node-${dayKey}-${hashString(`${cellSeed}-${nodeLat.toFixed(5)}-${nodeLon.toFixed(5)}`)}`;
      
      nodes.push({
        nodeId,
        lat: parseFloat(nodeLat.toFixed(6)),
        lon: parseFloat(nodeLon.toFixed(6)),
      });
      
      nodeIndex++;
    }
  }
  
  return nodes;
}

export function selectEggRarity(pityCounters: {
  sinceRare: number;
  sinceEpic: number;
  sinceLegendary: number;
}, heatModeActive: boolean = false): 'common' | 'rare' | 'epic' | 'legendary' {
  if (pityCounters.sinceLegendary >= HUNT_CONFIG.PITY_LEGENDARY) {
    return 'legendary';
  }
  if (pityCounters.sinceEpic >= HUNT_CONFIG.PITY_EPIC) {
    return 'epic';
  }
  if (pityCounters.sinceRare >= HUNT_CONFIG.PITY_RARE) {
    return 'rare';
  }
  
  let rates = { ...HUNT_CONFIG.BASE_RATES };
  if (heatModeActive) {
    rates = {
      common: 0.78,
      rare: 0.17,
      epic: 0.048,
      legendary: 0.002,
    };
  }
  
  const roll = Math.random();
  let cumulative = 0;
  for (const [rarity, rate] of Object.entries(rates)) {
    cumulative += rate;
    if (roll <= cumulative) {
      return rarity as 'common' | 'rare' | 'epic' | 'legendary';
    }
  }
  return 'common';
}

export function getStreakCapBonus(streak: number): number {
  for (const tier of HUNT_CONFIG.STREAK.CAP_BONUS) {
    if (streak >= tier.minDay && streak <= tier.maxDay) {
      return tier.bonus;
    }
  }
  return 0;
}

export function getStreakXpMult(streak: number): number {
  for (const tier of HUNT_CONFIG.STREAK.XP_MULT) {
    if (streak >= tier.minDay && streak <= tier.maxDay) {
      return tier.mult;
    }
  }
  return 1.0;
}

export function computeDailyCap(streak: number, level: number = 1): number {
  const levelBaseCap = getDailyCapForLevel(level);
  const streakBonus = getStreakCapBonus(streak);
  return levelBaseCap + streakBonus;
}

export function computeDailyCapLegacy(streak: number): number {
  return HUNT_CONFIG.DAILY_HUNT_CAP + getStreakCapBonus(streak);
}

export function computeLevelFromXp(totalXp: number): { 
  level: number; 
  xpIntoLevel: number; 
  xpForNext: number;
  currentLevelStartXp: number;
  nextLevelTotalXp: number;
} {
  const thresholds = HUNT_CONFIG.LEVEL_XP_THRESHOLDS;
  
  for (let i = 0; i < thresholds.length; i++) {
    const currentThreshold = thresholds[i];
    const nextThreshold = i < thresholds.length - 1 
      ? thresholds[i + 1] 
      : thresholds[thresholds.length - 1] + HUNT_CONFIG.LEVEL_AFTER_10_INCREMENT;
    
    if (totalXp < nextThreshold) {
      return {
        level: i + 1,
        xpIntoLevel: totalXp - currentThreshold,
        xpForNext: nextThreshold - currentThreshold,
        currentLevelStartXp: currentThreshold,
        nextLevelTotalXp: nextThreshold,
      };
    }
  }
  
  const level10Xp = thresholds[thresholds.length - 1];
  let level = thresholds.length;
  let currentLevelStart = level10Xp;
  
  while (totalXp >= currentLevelStart + HUNT_CONFIG.LEVEL_AFTER_10_INCREMENT) {
    currentLevelStart += HUNT_CONFIG.LEVEL_AFTER_10_INCREMENT;
    level++;
  }
  
  return {
    level,
    xpIntoLevel: totalXp - currentLevelStart,
    xpForNext: HUNT_CONFIG.LEVEL_AFTER_10_INCREMENT,
    currentLevelStartXp: currentLevelStart,
    nextLevelTotalXp: currentLevelStart + HUNT_CONFIG.LEVEL_AFTER_10_INCREMENT,
  };
}

export function getDailyCapForLevel(level: number): number {
  const caps = HUNT_CONFIG.LEVEL_DAILY_CAPS;
  for (let l = level; l >= 1; l--) {
    if (caps[l] !== undefined) {
      return caps[l];
    }
  }
  return 25;
}

export function getWarmthCapForLevel(level: number): number {
  const caps = HUNT_CONFIG.LEVEL_WARMTH_CAPS;
  for (let l = level; l >= 1; l--) {
    if (caps[l] !== undefined) {
      return caps[l];
    }
  }
  return 10;
}

export function getUnlockedFeatures(level: number): {
  trackerPing: boolean;
  secondAttempt: boolean;
  heatMode: boolean;
} {
  return {
    trackerPing: level >= HUNT_CONFIG.LEVEL_UNLOCKS.trackerPing,
    secondAttempt: level >= HUNT_CONFIG.LEVEL_UNLOCKS.secondAttempt,
    heatMode: level >= HUNT_CONFIG.LEVEL_UNLOCKS.heatMode,
  };
}

export function getNextUnlock(level: number): string | null {
  const unlocks = HUNT_CONFIG.LEVEL_UNLOCKS;
  if (level < unlocks.trackerPing) return `Lv${unlocks.trackerPing}: Tracker Ping`;
  if (level < unlocks.secondAttempt) return `Lv${unlocks.secondAttempt}: Second Attempt`;
  if (level < unlocks.heatMode) return `Lv${unlocks.heatMode}: Heat Mode`;
  return null;
}

export function isHeatModeActive(heatModeUntil: Date | null): boolean {
  if (!heatModeUntil) return false;
  return new Date() < new Date(heatModeUntil);
}

export function shouldAwardStreakChest(streak: number): boolean {
  return streak > 0 && streak % HUNT_CONFIG.STREAK.CHEST_EVERY_N_DAYS === 0;
}
