const ROACHY_SPRITE_1 = require("@/assets/flappy/roachy-sprite-1.png");
const ROACHY_SPRITE_2 = require("@/assets/flappy/roachy-sprite-2.png");
const ROACHY_SPRITE_DEAD = require("@/assets/flappy/roachy-sprite-dead.png");
const ROACHY_RAINBOW_1 = require("@/assets/flappy/roachy-rainbow-1.png");
const ROACHY_RAINBOW_2 = require("@/assets/flappy/roachy-rainbow-2.png");
const ROACHY_RAINBOW_DEAD = require("@/assets/flappy/roachy-rainbow-dead.png");
const ROACHY_KING_1 = require("@/assets/flappy/roachy-king-1.png");
const ROACHY_KING_2 = require("@/assets/flappy/roachy-king-2.png");
const ROACHY_KING_DEAD = require("@/assets/flappy/roachy-king-dead.png");
const ROACHY_QUEEN_1 = require("@/assets/flappy/roachy-queen-1.png");
const ROACHY_QUEEN_2 = require("@/assets/flappy/roachy-queen-2.png");
const ROACHY_QUEEN_DEAD = require("@/assets/flappy/roachy-queen-3.png");
const ROACHY_PRINCE_1 = require("@/assets/flappy/roachy-prince-1.png");
const ROACHY_PRINCE_2 = require("@/assets/flappy/roachy-prince-2.png");
const ROACHY_PRINCE_DEAD = require("@/assets/flappy/roachy-prince-dead.png");
const ROACHY_PRINCESS_1 = require("@/assets/flappy/roachy-princess-1.png");
const ROACHY_PRINCESS_2 = require("@/assets/flappy/roachy-princess-2.png");
const ROACHY_PRINCESS_DEAD = require("@/assets/flappy/roachy-princess-dead.png");

export type RoachySkin = "default" | "rainbow" | "king" | "queen" | "prince" | "princess";

export type SkinRarity = "common" | "rare" | "epic" | "legendary";

export const RARITY_ORDER: Record<SkinRarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
};

export interface SkinDefinition {
  id: RoachySkin;
  name: string;
  frames: any[];
  dead: any;
  isNFT: boolean;
  rarity: SkinRarity;
}

export const FLAPPY_SKINS: Record<RoachySkin, SkinDefinition> = {
  default: {
    id: "default" as const,
    name: "Classic Roachy",
    frames: [ROACHY_SPRITE_1, ROACHY_SPRITE_2],
    dead: ROACHY_SPRITE_DEAD,
    isNFT: false,
    rarity: "common" as SkinRarity,
  },
  rainbow: {
    id: "rainbow" as const,
    name: "Rainbow Wings",
    frames: [ROACHY_RAINBOW_1, ROACHY_RAINBOW_2],
    dead: ROACHY_RAINBOW_DEAD,
    isNFT: true,
    rarity: "rare" as SkinRarity,
  },
  king: {
    id: "king" as const,
    name: "King Roachy",
    frames: [ROACHY_KING_1, ROACHY_KING_2],
    dead: ROACHY_KING_DEAD,
    isNFT: true,
    rarity: "epic" as SkinRarity,
  },
  queen: {
    id: "queen" as const,
    name: "Queen Roachy",
    frames: [ROACHY_QUEEN_2, ROACHY_QUEEN_1],
    dead: ROACHY_QUEEN_DEAD,
    isNFT: true,
    rarity: "legendary" as SkinRarity,
  },
  prince: {
    id: "prince" as const,
    name: "Prince Roachy",
    frames: [ROACHY_PRINCE_1, ROACHY_PRINCE_2],
    dead: ROACHY_PRINCE_DEAD,
    isNFT: true,
    rarity: "common" as SkinRarity,
  },
  princess: {
    id: "princess" as const,
    name: "Princess Roachy",
    frames: [ROACHY_PRINCESS_1, ROACHY_PRINCESS_2],
    dead: ROACHY_PRINCESS_DEAD,
    isNFT: true,
    rarity: "common" as SkinRarity,
  },
};

export const ALL_SPRITES = [
  ROACHY_SPRITE_1, ROACHY_SPRITE_2, ROACHY_SPRITE_DEAD,
  ROACHY_RAINBOW_1, ROACHY_RAINBOW_2, ROACHY_RAINBOW_DEAD,
  ROACHY_KING_1, ROACHY_KING_2, ROACHY_KING_DEAD,
  ROACHY_QUEEN_1, ROACHY_QUEEN_2, ROACHY_QUEEN_DEAD,
  ROACHY_PRINCE_1, ROACHY_PRINCE_2, ROACHY_PRINCE_DEAD,
  ROACHY_PRINCESS_1, ROACHY_PRINCESS_2, ROACHY_PRINCESS_DEAD,
];

export const SKIN_NFT_MAPPING: Record<RoachySkin, string> = {
  default: "classic",
  rainbow: "rainbow",
  king: "golden",
  queen: "neon",
  prince: "prince",
  princess: "princess",
};
