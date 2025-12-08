import { ImageSourcePropType } from "react-native";

const RoachyHuntLogo = require("@/assets/roachy-hunt-logo.png");

export interface GameEntry {
  id: string;
  title: string;
  tagline: string;
  description: string;
  coverImage?: ImageSourcePropType;
  iconName: string;
  routeName: string;
  isLocked: boolean;
  isComingSoon: boolean;
  category: "hunt" | "battle" | "puzzle" | "adventure";
  playerCount: string;
  rewards: string[];
}

export const GAMES_CATALOG: GameEntry[] = [
  {
    id: "roachy-hunt",
    title: "Roachy Hunt",
    tagline: "Catch, Train, Battle!",
    description: "Hunt wild Roachies in your real-world location using GPS. Catch creatures with timing-based mechanics, hatch eggs by walking, and battle in raids!",
    coverImage: RoachyHuntLogo,
    iconName: "target",
    routeName: "RoachyHuntStack",
    isLocked: false,
    isComingSoon: false,
    category: "hunt",
    playerCount: "Solo & Multiplayer",
    rewards: ["Roachy NFTs", "XP", "Eggs", "Rare Drops"],
  },
  {
    id: "roachy-battles",
    title: "Roachy Battles",
    tagline: "PvP Arena Combat",
    description: "Battle your Roachies against other players in real-time PvP combat. Climb the leaderboards and earn exclusive rewards!",
    iconName: "zap",
    routeName: "RoachyBattlesStack",
    isLocked: true,
    isComingSoon: true,
    category: "battle",
    playerCount: "1v1 & Teams",
    rewards: ["Battle Tokens", "Rare Skins", "Leaderboard Prizes"],
  },
  {
    id: "flappy-roach",
    title: "Flappy Roach",
    tagline: "Tap to Survive!",
    description: "Guide your Roach through endless obstacles in this addictive tap-to-fly game. How far can you go?",
    iconName: "wind",
    routeName: "FlappyRoachStack",
    isLocked: true,
    isComingSoon: true,
    category: "puzzle",
    playerCount: "Solo",
    rewards: ["Coins", "High Scores", "Daily Bonuses"],
  },
  {
    id: "roachy-mate",
    title: "Roachy Mate",
    tagline: "Breed & Evolve",
    description: "Pair your Roachies together to breed unique offspring with combined traits. Discover rare genetic combinations and create the ultimate Roachy!",
    iconName: "heart",
    routeName: "RoachyMateStack",
    isLocked: true,
    isComingSoon: true,
    category: "adventure",
    playerCount: "Solo",
    rewards: ["Hybrid Roachies", "Rare Traits", "Breeding Bonuses"],
  },
];

export function getGameById(id: string): GameEntry | undefined {
  return GAMES_CATALOG.find((game) => game.id === id);
}

export function getAvailableGames(): GameEntry[] {
  return GAMES_CATALOG.filter((game) => !game.isLocked);
}

export function getComingSoonGames(): GameEntry[] {
  return GAMES_CATALOG.filter((game) => game.isComingSoon);
}
