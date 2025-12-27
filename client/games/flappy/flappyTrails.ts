export type RoachyTrail = "none" | "breeze";

export interface TrailDefinition {
  id: RoachyTrail;
  name: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  asset: any;
  isNFT: boolean;
}

export const FLAPPY_TRAILS: Record<RoachyTrail, TrailDefinition> = {
  none: {
    id: "none",
    name: "No Trail",
    rarity: "common",
    asset: null,
    isNFT: false,
  },
  breeze: {
    id: "breeze",
    name: "Breeze",
    rarity: "common",
    asset: null,
    isNFT: false,
  },
};

export const ALL_TRAIL_ASSETS: any[] = [];

export const TRAIL_NFT_MAPPING: Record<RoachyTrail, string> = {
  none: "",
  breeze: "",
};
