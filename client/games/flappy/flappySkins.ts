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

export type RoachySkin = "default" | "rainbow" | "king" | "queen";

export const FLAPPY_SKINS = {
  default: {
    id: "default" as const,
    name: "Classic Roachy",
    frames: [ROACHY_SPRITE_1, ROACHY_SPRITE_2],
    dead: ROACHY_SPRITE_DEAD,
    isNFT: false,
  },
  rainbow: {
    id: "rainbow" as const,
    name: "Rainbow Wings",
    frames: [ROACHY_RAINBOW_1, ROACHY_RAINBOW_2],
    dead: ROACHY_RAINBOW_DEAD,
    isNFT: true,
  },
  king: {
    id: "king" as const,
    name: "King Roachy",
    frames: [ROACHY_KING_1, ROACHY_KING_2],
    dead: ROACHY_KING_DEAD,
    isNFT: true,
  },
  queen: {
    id: "queen" as const,
    name: "Queen Roachy",
    frames: [ROACHY_QUEEN_2, ROACHY_QUEEN_1],
    dead: ROACHY_QUEEN_DEAD,
    isNFT: true,
  },
};

export const ALL_SPRITES = [
  ROACHY_SPRITE_1, ROACHY_SPRITE_2, ROACHY_SPRITE_DEAD,
  ROACHY_RAINBOW_1, ROACHY_RAINBOW_2, ROACHY_RAINBOW_DEAD,
  ROACHY_KING_1, ROACHY_KING_2, ROACHY_KING_DEAD,
  ROACHY_QUEEN_1, ROACHY_QUEEN_2, ROACHY_QUEEN_DEAD,
];

export const SKIN_NFT_MAPPING: Record<RoachySkin, string> = {
  default: "classic",
  rainbow: "rainbow",
  king: "golden",
  queen: "neon",
};
