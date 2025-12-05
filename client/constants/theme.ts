import { Platform } from "react-native";

export const GameColors = {
  primary: "#FF6B6B",
  secondary: "#4ECDC4",
  accent: "#FFD93D",
  background: "#1A1A2E",
  surface: "#16213E",
  surfaceLight: "#1E2A4A",
  textPrimary: "#FFFFFF",
  textSecondary: "#A8A8B8",
  rarity: {
    common: "#E8E8E8",
    uncommon: "#6BCF7F",
    rare: "#4A90E2",
    epic: "#9B59B6",
    legendary: "#F39C12",
  },
  types: {
    fire: "#FF6B6B",
    water: "#4ECDC4",
    grass: "#6BCF7F",
    electric: "#FFD93D",
    ice: "#87CEEB",
    shadow: "#9B59B6",
  },
};

const tintColorLight = GameColors.primary;
const tintColorDark = GameColors.primary;

export const Colors = {
  light: {
    text: GameColors.textPrimary,
    buttonText: "#FFFFFF",
    tabIconDefault: GameColors.textSecondary,
    tabIconSelected: tintColorLight,
    link: GameColors.primary,
    backgroundRoot: GameColors.background,
    backgroundDefault: GameColors.surface,
    backgroundSecondary: GameColors.surfaceLight,
    backgroundTertiary: "#2A3A5A",
  },
  dark: {
    text: GameColors.textPrimary,
    buttonText: "#FFFFFF",
    tabIconDefault: GameColors.textSecondary,
    tabIconSelected: tintColorDark,
    link: GameColors.primary,
    backgroundRoot: GameColors.background,
    backgroundDefault: GameColors.surface,
    backgroundSecondary: GameColors.surfaceLight,
    backgroundTertiary: "#2A3A5A",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 18,
  lg: 24,
  xl: 30,
  "2xl": 40,
  "3xl": 50,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 28,
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: 24,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 20,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
