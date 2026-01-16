export const ACTIVE_SCENARIO = "S1_BALANCED";

export const BASE_CONFIG = {
  GRID: {
    REGION_SIZE_KM: 5,
    CELL_SIZE_KM: 0.5,
  },

  MOVEMENT: {
    MOVING_SPEED_MPS: 1.5,
    TELEPORT_THRESHOLD_METERS: 500,
    TELEPORT_THRESHOLD_SECONDS: 15,
  },

  CATCH: {
    ARRIVAL_DISTANCE_M: 50,
    START_DISTANCE_M: 100,
    GRACE_ON_EXPIRE_MS: 60000,
  },

  RESERVATION: {
    DURATION_MS: 8 * 60 * 1000,
    MAX_ACTIVE: 1,
  },

  PERSONAL: {
    ACTIVE_AT_ONCE: 5,
    SPAWN_RADIUS_M: 800,
    EXPIRE_MS: 30 * 60 * 1000,
    RESHUFFLE_COOLDOWN_MS: 5 * 60 * 1000,
    DISTANCE_BUCKETS: [
      { minM: 50, maxM: 150, weight: 0.3 },
      { minM: 150, maxM: 300, weight: 0.4 },
      { minM: 300, maxM: 600, weight: 0.3 },
    ],
  },

  HOTSPOT: {
    HOTSPOTS_PER_CELL: 2,
    NODES_PER_HOTSPOT: 4,
    CLUSTER_RADIUS_M: 100,
    EXPIRE_MS: 60 * 60 * 1000,
    ROTATION_INTERVAL_MS: 15 * 60 * 1000,
  },

  ROUTE_RUNNER: {
    ENABLED: true,
    HEADING_CONE_DEGREES: 45,
    SPAWN_AHEAD_MIN_M: 80,
    SPAWN_AHEAD_MAX_M: 200,
    MIN_SAMPLES: 3,
  },

  EVENTS: {
    WINDOWS: [
      {
        key: "NIGHT_HUNT",
        localTz: "Asia/Manila",
        startHour: 20,
        endHour: 23,
        dropsPer: 3,
        minM: 100,
        maxM: 400,
        expireMs: 3 * 60 * 60 * 1000,
        qualityBoost: "EXCELLENT",
      },
      {
        key: "LUNCH_RUSH",
        localTz: "Asia/Manila",
        startHour: 11,
        endHour: 13,
        dropsPer: 2,
        minM: 50,
        maxM: 300,
        expireMs: 2 * 60 * 60 * 1000,
        qualityBoost: "GREAT",
      },
    ],
  },

  QUALITY: {
    WEIGHTS_PERSONAL: { POOR: 0.25, GOOD: 0.45, GREAT: 0.25, EXCELLENT: 0.05 },
    WEIGHTS_HOTSPOT: { POOR: 0, GOOD: 0.30, GREAT: 0.50, EXCELLENT: 0.20 },
    WEIGHTS_EVENT: { POOR: 0, GOOD: 0, GREAT: 0.30, EXCELLENT: 0.70 },
  },

  RARITY: {
    POOR: { common: 0.95, rare: 0.04, epic: 0.009, legendary: 0.001 },
    GOOD: { common: 0.85, rare: 0.12, epic: 0.028, legendary: 0.002 },
    GREAT: { common: 0.75, rare: 0.18, epic: 0.06, legendary: 0.01 },
    EXCELLENT: { common: 0.60, rare: 0.25, epic: 0.12, legendary: 0.03 },
  },

  FUSION: {
    ENABLED: true,
  },

  WARMTH: {
    ENABLED: true,
  },
};

export const SCENARIOS: Record<string, Partial<typeof BASE_CONFIG>> = {
  S1_BALANCED: {},

  S2_CASUAL: {
    PERSONAL: {
      ...BASE_CONFIG.PERSONAL,
      ACTIVE_AT_ONCE: 7,
      EXPIRE_MS: 45 * 60 * 1000,
    },
    CATCH: {
      ...BASE_CONFIG.CATCH,
      ARRIVAL_DISTANCE_M: 75,
      START_DISTANCE_M: 150,
    },
  },

  S3_COMPETITIVE: {
    PERSONAL: {
      ...BASE_CONFIG.PERSONAL,
      ACTIVE_AT_ONCE: 4,
      EXPIRE_MS: 20 * 60 * 1000,
    },
    RESERVATION: {
      ...BASE_CONFIG.RESERVATION,
      DURATION_MS: 5 * 60 * 1000,
    },
  },

  S4_DENSE_URBAN: {
    PERSONAL: {
      ...BASE_CONFIG.PERSONAL,
      SPAWN_RADIUS_M: 400,
      DISTANCE_BUCKETS: [
        { minM: 30, maxM: 100, weight: 0.5 },
        { minM: 100, maxM: 200, weight: 0.35 },
        { minM: 200, maxM: 400, weight: 0.15 },
      ],
    },
    HOTSPOT: {
      ...BASE_CONFIG.HOTSPOT,
      HOTSPOTS_PER_CELL: 4,
      NODES_PER_HOTSPOT: 5,
    },
  },

  S5_RURAL: {
    PERSONAL: {
      ...BASE_CONFIG.PERSONAL,
      SPAWN_RADIUS_M: 1500,
      DISTANCE_BUCKETS: [
        { minM: 100, maxM: 300, weight: 0.2 },
        { minM: 300, maxM: 700, weight: 0.4 },
        { minM: 700, maxM: 1500, weight: 0.4 },
      ],
    },
    HOTSPOT: {
      ...BASE_CONFIG.HOTSPOT,
      EXPIRE_MS: 2 * 60 * 60 * 1000,
    },
  },
};

function deepMerge<T extends Record<string, any>>(base: T, override: Partial<T>): T {
  const result = { ...base };
  for (const key of Object.keys(override) as (keyof T)[]) {
    const overrideValue = override[key];
    if (
      overrideValue &&
      typeof overrideValue === "object" &&
      !Array.isArray(overrideValue) &&
      typeof base[key] === "object"
    ) {
      result[key] = deepMerge(base[key], overrideValue as any);
    } else if (overrideValue !== undefined) {
      result[key] = overrideValue as T[keyof T];
    }
  }
  return result;
}

export const resolvedConfig = deepMerge(BASE_CONFIG, SCENARIOS[ACTIVE_SCENARIO] || {});

export type NodeType = "PERSONAL" | "HOTSPOT" | "EVENT";
export type NodeQuality = "POOR" | "GOOD" | "GREAT" | "EXCELLENT";
export type NodePlayerStatus = "AVAILABLE" | "RESERVED" | "ARRIVED" | "COLLECTED" | "EXPIRED";

export function selectQuality(weights: Record<string, number>): NodeQuality {
  const roll = Math.random();
  let cumulative = 0;
  for (const [quality, weight] of Object.entries(weights)) {
    cumulative += weight;
    if (roll <= cumulative) {
      return quality as NodeQuality;
    }
  }
  return "GOOD";
}

export function selectRarityByQuality(quality: NodeQuality): "common" | "rare" | "epic" | "legendary" {
  const rates = resolvedConfig.RARITY[quality];
  const roll = Math.random();
  let cumulative = 0;
  for (const [rarity, rate] of Object.entries(rates)) {
    cumulative += rate;
    if (roll <= cumulative) {
      return rarity as "common" | "rare" | "epic" | "legendary";
    }
  }
  return "common";
}
