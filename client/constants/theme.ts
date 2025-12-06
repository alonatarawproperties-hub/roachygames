import { Platform } from "react-native";

export const GameColors = {
  primary: "#FF9500",
  primaryBright: "#FFB340",
  gold: "#FFD700",
  goldGlow: "rgba(255, 165, 0, 0.6)",
  secondary: "#00FF88",
  accent: "#FFD700",
  background: "#0A0604",
  surface: "#1A0F08",
  surfaceElevated: "#2D1810",
  surfaceGlow: "#3D2418",
  surfaceLight: "#3D2418",
  textPrimary: "#FFFFFF",
  textGold: "#FFD700",
  textSecondary: "#D4A574",
  textTertiary: "#8B7355",
  success: "#00FF88",
  warning: "#FFCC00",
  error: "#FF3366",
  info: "#00D9FF",
  rarity: {
    common: "#A0A0A0",
    uncommon: "#00FF88",
    rare: "#3A86FF",
    epic: "#9D4EDD",
    legendary: "#FFD700",
  },
  classes: {
    tank: "#00FF88",
    assassin: "#FF3366",
    mage: "#9D4EDD",
    support: "#00D9FF",
  },
  categories: {
    action: "#FF3366",
    adventure: "#9D4EDD",
    strategy: "#3A86FF",
    casual: "#00FF88",
    premium: "#FFD700",
    hunt: "#00FF88",
    battle: "#FF3366",
    puzzle: "#9D4EDD",
    fantasy: "#00D9FF",
  },
};

const tintColorLight = GameColors.gold;
const tintColorDark = GameColors.gold;

export const Colors = {
  light: {
    text: GameColors.textPrimary,
    buttonText: "#0A0604",
    tabIconDefault: GameColors.textSecondary,
    tabIconSelected: tintColorLight,
    link: GameColors.primary,
    backgroundRoot: GameColors.background,
    backgroundDefault: GameColors.surface,
    backgroundSecondary: GameColors.surfaceElevated,
    backgroundTertiary: GameColors.surfaceGlow,
  },
  dark: {
    text: GameColors.textPrimary,
    buttonText: "#0A0604",
    tabIconDefault: GameColors.textSecondary,
    tabIconSelected: tintColorDark,
    link: GameColors.primary,
    backgroundRoot: GameColors.background,
    backgroundDefault: GameColors.surface,
    backgroundSecondary: GameColors.surfaceElevated,
    backgroundTertiary: GameColors.surfaceGlow,
  },
};

export const GlowStyles = {
  standard: {
    shadowColor: "#FFA500",
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  intense: {
    shadowColor: "#FFD700",
    shadowOpacity: 0.8,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  subtle: {
    shadowColor: "#FFA500",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  floating: {
    shadowColor: "#000000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
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
