import { ImageSourcePropType, Platform } from "react-native";

const RoachyMateLogo = require("@/assets/roachy-mate-logo.png");
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
  isLockedOnAndroid?: boolean;
  isBetaOnly?: boolean;
  betaTesters?: string[];
  isAdminOnly?: boolean;
  category: "strategy" | "battle" | "arcade" | "adventure";
  playerCount: string;
  rewards: string[];
}

export const ADMIN_ACCOUNTS = [
  'zajkcomshop@gmail.com',
  'engagedglobal@gmail.com',
];

export const GAMES_CATALOG: GameEntry[] = [
  {
    id: "flappy-roach",
    title: "Flappy Roachy",
    tagline: "Tap to Survive!",
    description: "Guide your Roachy through endless obstacles in this addictive tap-to-fly game. Collect coins, grab power-ups, and beat your high score!",
    coverImage: FlappyRoachLogo,
    iconName: "wind",
    routeName: "FlappyRoachStack",
    isLocked: false,
    isComingSoon: false,
    isLockedOnAndroid: false,
    category: "arcade",
    playerCount: "Solo",
    rewards: ["Coins", "High Scores", "Power-ups"],
  },
  {
    id: "roachy-mate",
    title: "Roachy Mate",
    tagline: "Chess with Roachies!",
    description: "Play chess against AI or friends with your Roachies as chess pieces. Master strategy and outsmart your opponents!",
    coverImage: RoachyMateLogo,
    iconName: "grid",
    routeName: "RoachyMateStack",
    isLocked: true,
    isComingSoon: true,
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
    isLocked: false,
    isComingSoon: false,
    isBetaOnly: true,
    betaTesters: ["zajkcomshop@gmail.com", "engagedglobal@gmail.com", "alonatarawproperties@gmail.com", "mariashienasigalat@gmail.com", "thebeacondao@gmail.com"],
    category: "adventure",
    playerCount: "Solo & Multiplayer",
    rewards: ["Roachy NFTs", "XP", "Eggs", "Rare Drops"],
  },
  {
    id: "roachy-battles",
    title: "Roachy Battles",
    tagline: "PvP Arena Combat",
    description: "Battle your Roachies against other players in real-time PvP combat. Climb the leaderboards and earn exclusive rewards!",
    coverImage: RoachyBattlesLogo,
    iconName: "zap",
    routeName: "RoachyBattlesStack",
    isLocked: false,
    isComingSoon: false,
    isAdminOnly: true,
    category: "battle",
    playerCount: "3v3",
    rewards: ["Battle Tokens", "Rank Rewards", "Warmth"],
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

export function isGameLockedForPlatform(game: GameEntry): boolean {
  if (game.isLocked) return true;
  if (game.isLockedOnAndroid && Platform.OS === "android") return true;
  return false;
}

export function isGameComingSoonForPlatform(game: GameEntry): boolean {
  if (game.isComingSoon) return true;
  if (game.isLockedOnAndroid && Platform.OS === "android") return true;
  return false;
}

export function hasGameBetaAccess(game: GameEntry, userEmail: string | null | undefined): boolean {
  if (!game.isBetaOnly) return true;
  if (!userEmail) return false;
  if (!game.betaTesters || game.betaTesters.length === 0) return false;
  return game.betaTesters.includes(userEmail.toLowerCase());
}

export function isAdminUser(userEmail: string | null | undefined): boolean {
  if (!userEmail) return false;
  return ADMIN_ACCOUNTS.includes(userEmail.toLowerCase());
}

export function hasGameAdminAccess(game: GameEntry, userEmail: string | null | undefined): boolean {
  if (!game.isAdminOnly) return true;
  return isAdminUser(userEmail);
}

export function isGameLockedForUser(game: GameEntry, userEmail: string | null | undefined): boolean {
  if (isGameLockedForPlatform(game)) return true;
  if (game.isBetaOnly && !hasGameBetaAccess(game, userEmail)) return true;
  if (game.isAdminOnly && !hasGameAdminAccess(game, userEmail)) return true;
  return false;
}

export function isGameVisibleForUser(game: GameEntry, userEmail: string | null | undefined): boolean {
  if (game.isAdminOnly && !hasGameAdminAccess(game, userEmail)) return false;
  return true;
}
