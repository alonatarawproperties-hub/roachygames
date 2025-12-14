import { Dimensions, PixelRatio, useWindowDimensions } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl";

export const BREAKPOINTS = {
  xs: 0,
  sm: 360,
  md: 414,
  lg: 768,
  xl: 1024,
} as const;

export function getBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS.xl) return "xl";
  if (width >= BREAKPOINTS.lg) return "lg";
  if (width >= BREAKPOINTS.md) return "md";
  if (width >= BREAKPOINTS.sm) return "sm";
  return "xs";
}

export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  return getBreakpoint(width);
}

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const breakpoint = getBreakpoint(width);

  const isPhone = width < BREAKPOINTS.lg;
  const isTablet = width >= BREAKPOINTS.lg && width < BREAKPOINTS.xl;
  const isDesktop = width >= BREAKPOINTS.xl;
  const isLandscape = width > height;

  return {
    width,
    height,
    breakpoint,
    isPhone,
    isTablet,
    isDesktop,
    isLandscape,
  };
}

export function scaleWidth(size: number): number {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

export function scaleHeight(size: number): number {
  const scale = SCREEN_HEIGHT / BASE_HEIGHT;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

export function scaleFont(size: number, factor: number = 0.5): number {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size + (scale - 1) * size * factor;
  const clampedSize = Math.max(size * 0.8, Math.min(newSize, size * 1.3));
  return Math.round(PixelRatio.roundToNearestPixel(clampedSize));
}

export function moderateScale(size: number, factor: number = 0.5): number {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  return Math.round(size + (scale - 1) * size * factor);
}

export function getResponsiveValue<T>(
  values: Partial<Record<Breakpoint, T>> & { default: T },
  breakpoint: Breakpoint
): T {
  const order: Breakpoint[] = ["xs", "sm", "md", "lg", "xl"];
  const currentIndex = order.indexOf(breakpoint);

  for (let i = currentIndex; i >= 0; i--) {
    const bp = order[i];
    if (values[bp] !== undefined) {
      return values[bp] as T;
    }
  }

  return values.default;
}

export function useResponsiveValue<T>(
  values: Partial<Record<Breakpoint, T>> & { default: T }
): T {
  const breakpoint = useBreakpoint();
  return getResponsiveValue(values, breakpoint);
}

export function getGridColumns(width: number, minItemWidth: number = 150, maxColumns: number = 4): number {
  const columns = Math.floor(width / minItemWidth);
  return Math.max(1, Math.min(columns, maxColumns));
}

export function useGridColumns(minItemWidth: number = 150, maxColumns: number = 4): number {
  const { width } = useWindowDimensions();
  return getGridColumns(width, minItemWidth, maxColumns);
}

export function getItemWidth(
  containerWidth: number,
  columns: number,
  gap: number,
  padding: number = 0
): number {
  const availableWidth = containerWidth - padding * 2 - gap * (columns - 1);
  return Math.floor(availableWidth / columns);
}

export const MIN_TOUCH_TARGET = 44;

export function ensureMinTouchTarget(size: number): number {
  return Math.max(size, MIN_TOUCH_TARGET);
}

export const responsive = {
  wp: (percentage: number): number => {
    return Math.round((SCREEN_WIDTH * percentage) / 100);
  },
  hp: (percentage: number): number => {
    return Math.round((SCREEN_HEIGHT * percentage) / 100);
  },
  isSmallDevice: SCREEN_WIDTH < 360,
  isLargeDevice: SCREEN_WIDTH >= 768,
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
};
