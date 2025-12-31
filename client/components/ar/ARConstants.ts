import { GameColors } from "@/constants/theme";

export const RARITY_COLORS: Record<string, string> = {
  common: "#9CA3AF",
  uncommon: "#22C55E",
  rare: "#3B82F6",
  epic: "#A855F7",
  legendary: "#F59E0B",
};

export const CLASS_COLORS: Record<string, string> = {
  tank: "#22C55E",
  assassin: "#EF4444",
  mage: "#A855F7",
  support: "#06B6D4",
};

export const AR_CONFIG = {
  EGG_SPAWN_DISTANCE: -2,
  EGG_SPAWN_HEIGHT: -0.5,
  CREATURE_SPAWN_DISTANCE: -1.5,
  CREATURE_SPAWN_HEIGHT: -0.3,
  CATCH_DISTANCE: 0.5,
  PROJECTILE_SPEED: 0.1,
  WOBBLE_INTENSITY: 0.05,
  WOBBLE_SPEED: 2000,
};

export const PLACEHOLDER_MODELS = {
  egg: {
    scale: [0.15, 0.2, 0.15],
    type: "sphere",
  },
  creature: {
    scale: [0.3, 0.3, 0.3],
    type: "box",
  },
  projectile: {
    scale: [0.08, 0.08, 0.08],
    type: "sphere",
  },
};
