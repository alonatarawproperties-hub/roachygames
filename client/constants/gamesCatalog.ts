import { ImageSourcePropType } from "react-native";

const RoachyHuntLogo = require("@/assets/roachy-hunt-logo.png");
const FlappyRoachLogo = require("@/assets/flappy-roach-logo.png");
const RoachyBattlesLogo = require("@/assets/roachy-battles-logo.png");

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
  category: "strategy" | "battle" | "arcade" | "adventure";
  playerCount: string;
  rewards: string[];
}

export const GAMES_CATALOG: GameEntry[] = [
  {
    id: "roachy-mate",
    title: "Roachy Mate",
    tagline: "Chess with Roachies!",
    description: "Play chess against AI or friends with your Roachies as chess pieces. Master strategy and outsmart your opponents!",
    iconName: "grid",
    routeName: "RoachyMateStack",
    isLocked: false,
    isComingSoon: false,
    category: "strategy",
    playerCount: "Solo & 1v1",
    rewards: ["Chess Rankings", "Strategy Badges", "Daily Challenges"],
  },
  {
    id: "roachy-hunt",
    title: "Roachy Hunt",
    tagline: "Catch, Train, Battle!",
    description: "Hunt wild Roachies in your real-world location using GPS. Catch creatures with timing-based mechanics, hatch eggs by walking, and battle in raids!",
    coverImage: RoachyHuntLogo,
    iconName: "target",
    routeName: "RoachyHuntStack",
    isLocked: true,
    isComingSoon: true,
    category: "adventure",
    playerCount: "Solo & Multiplayer",
    rewards: ["Roachy NFTs", "XP", "Eggs", "Rare Drops"],
  },
  {
    id: "flappy-roach",
    title: "Flappy Roachy",
    tagline: "Tap to Survive!",
    description: "Guide your Roachy through endless obstacles in this addictive tap-to-fly game. Collect coins, grab power-ups, and beat your high score!",
    coverImage: FlappyRoachLogo,
    iconName: "wind",
    routeName: "FlappyRoachStack",
    isLocked: true,
    isComingSoon: true,
    category: "arcade",
    playerCount: "Solo",
    rewards: ["Coins", "High Scores", "Power-ups"],
  },
  {
    id: "roachy-battles",
    title: "Roachy Battles",
    tagline: "PvP Arena Combat",
    description: "Battle your Roachies against other players in real-time PvP combat. Climb the leaderboards and earn exclusive rewards!",
    coverImage: RoachyBattlesLogo,
    iconName: "zap",
    routeName: "RoachyBattlesStack",
    isLocked: true,
    isComingSoon: true,
    category: "battle",
    playerCount: "1v1 & Teams",
    rewards: ["Battle Tokens", "Rare Skins", "Leaderboard Prizes"],
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
