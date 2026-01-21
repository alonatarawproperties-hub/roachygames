import React, { useEffect } from "react";
import { View, StyleSheet, Pressable, Dimensions, Platform } from "react-native";
import Svg, { Circle, G, Line, Defs, LinearGradient, Stop } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  interpolate,
  useAnimatedProps,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ObsidianBronzeAR, Spacing } from "@/constants/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

interface CatchingHUDOverlayProps {
  title?: string;
  distanceText?: string;
  statusText?: string;
  onClose: () => void;
  visible?: boolean;
  isCatching?: boolean;
}

const RETICLE_CENTER_X = SCREEN_WIDTH / 2;
const RETICLE_CENTER_Y = SCREEN_HEIGHT / 2.2;
const RING_RADII = [65, 90, 115, 140];

export function CatchingHUDOverlay({
  title = "Mystery Egg",
  distanceText = "Near",
  statusText = "CATCHING...",
  onClose,
  visible = true,
  isCatching = false,
}: CatchingHUDOverlayProps) {
  const insets = useSafeAreaInsets();

  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);
  const orbitRotation = useSharedValue(0);
  const lockArcOpacity = useSharedValue(0.3);
  const spinnerRotation = useSharedValue(0);
  const dustOpacity1 = useSharedValue(0.4);
  const dustOpacity2 = useSharedValue(0.2);
  const dustY1 = useSharedValue(0);
  const dustY2 = useSharedValue(0);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1200 }),
        withTiming(0.5, { duration: 1200 })
      ),
      -1,
      true
    );

    orbitRotation.value = withRepeat(
      withTiming(360, { duration: 10000, easing: Easing.linear }),
      -1,
      false
    );

    lockArcOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 2000 }),
        withTiming(0.3, { duration: 2000 })
      ),
      -1,
      true
    );

    spinnerRotation.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );

    dustOpacity1.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 3000 }),
        withTiming(0.2, { duration: 3000 })
      ),
      -1,
      true
    );

    dustOpacity2.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 4000 }),
        withTiming(0.1, { duration: 4000 })
      ),
      -1,
      true
    );

    dustY1.value = withRepeat(
      withTiming(-30, { duration: 6000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    dustY2.value = withRepeat(
      withTiming(-25, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbitRotation.value}deg` }],
  }));

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinnerRotation.value}deg` }],
  }));

  const dustStyle1 = useAnimatedStyle(() => ({
    opacity: dustOpacity1.value,
    transform: [{ translateY: dustY1.value }],
  }));

  const dustStyle2 = useAnimatedStyle(() => ({
    opacity: dustOpacity2.value,
    transform: [{ translateY: dustY2.value }],
  }));

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* TOP HUD ROW */}
      <View style={[styles.topHud, { paddingTop: insets.top + Spacing.sm }]} pointerEvents="box-none">
        {/* Close Button */}
        <Pressable style={styles.closeButton} onPress={onClose}>
          <View style={styles.smokedGlassPill}>
            <Feather name="x" size={18} color={ObsidianBronzeAR.textPrimary} />
          </View>
        </Pressable>

        {/* Title Bar */}
        <View style={styles.titleBar}>
          <View style={styles.bronzeIconContainer}>
            <Feather name="target" size={14} color={ObsidianBronzeAR.bronze} />
          </View>
          <ThemedText style={styles.titleText} numberOfLines={1}>
            {title}
          </ThemedText>
        </View>

        {/* Distance Pill */}
        <View style={styles.distancePill}>
          <Feather name="navigation" size={12} color={ObsidianBronzeAR.amber} />
          <ThemedText style={styles.distanceText}>{distanceText}</ThemedText>
          <View style={styles.microIcon}>
            <Feather name="compass" size={8} color={ObsidianBronzeAR.textMuted} />
          </View>
        </View>
      </View>


      {/* BOTTOM HUD */}
      {isCatching && (
        <View style={[styles.bottomHud, { paddingBottom: insets.bottom + Spacing.lg }]} pointerEvents="none">
          <View style={styles.bottomPanel}>
            {/* Progress spinner */}
            <Animated.View style={[styles.spinnerContainer, spinnerStyle]}>
              <Svg width={50} height={50}>
                <Circle
                  cx={25}
                  cy={25}
                  r={20}
                  stroke={ObsidianBronzeAR.smokedGlass}
                  strokeWidth={3}
                  fill="none"
                />
                <Circle
                  cx={25}
                  cy={25}
                  r={20}
                  stroke={ObsidianBronzeAR.bronze}
                  strokeWidth={3}
                  strokeDasharray="30 100"
                  fill="none"
                  strokeLinecap="round"
                />
              </Svg>
            </Animated.View>
            <ThemedText style={styles.statusText}>{statusText}</ThemedText>
            <View style={styles.microTicks}>
              {[...Array(5)].map((_, i) => (
                <View key={i} style={styles.microTick} />
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topHud: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    zIndex: 10,
  },
  closeButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  smokedGlassPill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ObsidianBronzeAR.smokedGlassStrong,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(176,122,58,0.25)",
  },
  titleBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ObsidianBronzeAR.smokedGlass,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: ObsidianBronzeAR.radii.md,
    marginHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(176,122,58,0.2)",
    gap: Spacing.xs,
  },
  bronzeIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(176,122,58,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  titleText: {
    fontSize: 15,
    fontWeight: "600",
    color: ObsidianBronzeAR.textPrimary,
    letterSpacing: 0.5,
  },
  distancePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ObsidianBronzeAR.smokedGlassStrong,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: ObsidianBronzeAR.radii.sm,
    borderWidth: 1,
    borderColor: "rgba(176,122,58,0.25)",
    gap: 4,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: "600",
    color: ObsidianBronzeAR.amber,
  },
  microIcon: {
    marginLeft: 2,
  },
  centerHud: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  cornerBracket: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: ObsidianBronzeAR.bronze,
    opacity: 0.5,
  },
  cornerTopLeft: {
    top: "25%",
    left: "10%",
    borderLeftWidth: 2,
    borderTopWidth: 2,
  },
  cornerTopRight: {
    top: "25%",
    right: "10%",
    borderRightWidth: 2,
    borderTopWidth: 2,
  },
  cornerBottomLeft: {
    bottom: "35%",
    left: "10%",
    borderLeftWidth: 2,
    borderBottomWidth: 2,
  },
  cornerBottomRight: {
    bottom: "35%",
    right: "10%",
    borderRightWidth: 2,
    borderBottomWidth: 2,
  },
  reticleContainer: {
    position: "absolute",
    top: "20%",
  },
  svgOverlay: {
    position: "absolute",
  },
  orbitContainer: {
    position: "absolute",
    top: RETICLE_CENTER_Y - 10,
    left: RETICLE_CENTER_X,
    width: 0,
    height: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  orbitDot: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: ObsidianBronzeAR.bronze,
    opacity: 0.7,
  },
  dustMote: {
    position: "absolute",
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: ObsidianBronzeAR.amber,
  },
  dust1: {
    top: "32%",
    left: "25%",
  },
  dust2: {
    top: "38%",
    right: "20%",
  },
  dust3: {
    top: "28%",
    right: "30%",
  },
  bottomHud: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  bottomPanel: {
    backgroundColor: ObsidianBronzeAR.smokedGlassStrong,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: ObsidianBronzeAR.radii.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(176,122,58,0.3)",
    ...ObsidianBronzeAR.shadows.glow,
  },
  spinnerContainer: {
    marginBottom: Spacing.xs,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "700",
    color: ObsidianBronzeAR.textPrimary,
    letterSpacing: 3,
  },
  microTicks: {
    flexDirection: "row",
    marginTop: Spacing.xs,
    gap: 6,
  },
  microTick: {
    width: 8,
    height: 2,
    backgroundColor: ObsidianBronzeAR.bronze,
    opacity: 0.5,
    borderRadius: 1,
  },
});
