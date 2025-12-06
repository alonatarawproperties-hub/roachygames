import { ImageSourcePropType } from "react-native";

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
    iconName: "target",
    routeName: "RoachyHuntStack",
    isLocked: false,
    isComingSoon: false,
    category: "hunt",
    playerCount: "Solo & Multiplayer",
    rewards: ["Roachy NFTs", "XP", "Eggs", "Rare Drops"],
  },
  {
    id: "roachy-battle",
    title: "Roachy Battle",
    tagline: "PvP Arena Combat",
    description: "Battle your Roachies against other players in real-time PvP combat. Climb the leaderboards and earn exclusive rewards!",
    iconName: "zap",
    routeName: "RoachyBattleStack",
    isLocked: true,
    isComingSoon: true,
    category: "battle",
    playerCount: "1v1 & Teams",
    rewards: ["Battle Tokens", "Rare Skins", "Leaderboard Prizes"],
  },
  {
    id: "roachy-puzzle",
    title: "Roachy Match",
    tagline: "Match-3 Madness",
    description: "A casual match-3 puzzle game featuring your favorite Roachies. Complete levels to earn resources and unlock special items!",
    iconName: "grid",
    routeName: "RoachyPuzzleStack",
    isLocked: true,
    isComingSoon: true,
    category: "puzzle",
    playerCount: "Solo",
    rewards: ["Coins", "Power-ups", "Daily Bonuses"],
  },
  {
    id: "roachy-adventure",
    title: "Roachy Quest",
    tagline: "Epic Story Mode",
    description: "Embark on an epic adventure through the Roachy universe. Complete quests, defeat bosses, and uncover the secrets of the Cosmic King!",
    iconName: "map",
    routeName: "RoachyQuestStack",
    isLocked: true,
    isComingSoon: true,
    category: "adventure",
    playerCount: "Solo",
    rewards: ["Story Rewards", "Legendary Items", "Exclusive Roachies"],
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
