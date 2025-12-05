import React, { useState, useEffect } from "react";
import { View, StyleSheet, Image, Pressable, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  withSpring,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { CREATURE_IMAGES, getRarityColor } from "@/constants/creatures";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface CaughtCreature {
  id: string;
  templateId: string;
  name: string;
  rarity: string;
  creatureClass: string;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
  ivHp: number;
  ivAtk: number;
  ivDef: number;
  ivSpd: number;
  isPerfect: boolean;
}

interface EggRevealProps {
  creature: CaughtCreature;
  catchQuality: "perfect" | "great" | "good";
  onComplete: () => void;
}

const RARITY_COLORS: Record<string, { primary: string; secondary: string; glow: string }> = {
  common: {
    primary: "#9CA3AF",
    secondary: "#6B7280",
    glow: "rgba(156, 163, 175, 0.5)",
  },
  uncommon: {
    primary: "#22C55E",
    secondary: "#16A34A",
    glow: "rgba(34, 197, 94, 0.6)",
  },
  rare: {
    primary: "#3B82F6",
    secondary: "#2563EB",
    glow: "rgba(59, 130, 246, 0.7)",
  },
  epic: {
    primary: "#A855F7",
    secondary: "#9333EA",
    glow: "rgba(168, 85, 247, 0.8)",
  },
  legendary: {
    primary: "#F59E0B",
    secondary: "#D97706",
    glow: "rgba(245, 158, 11, 0.9)",
  },
};

const CLASS_ICONS: Record<string, string> = {
  fire: "sun",
  water: "droplet",
  grass: "feather",
  electric: "zap",
  ice: "cloud-snow",
  shadow: "moon",
};

export function EggReveal({ creature, catchQuality, onComplete }: EggRevealProps) {
  const [phase, setPhase] = useState<"wobble" | "crack" | "hatch" | "reveal" | "stats">("wobble");

  const colors = RARITY_COLORS[creature.rarity] || RARITY_COLORS.common;

  const eggRotate = useSharedValue(0);
  const eggScale = useSharedValue(1);
  const eggY = useSharedValue(0);
  const crackOpacity = useSharedValue(0);
  const flashScale = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const creatureScale = useSharedValue(0);
  const creatureOpacity = useSharedValue(0);
  const statsY = useSharedValue(50);
  const statsOpacity = useSharedValue(0);
  const glowPulse = useSharedValue(1);

  useEffect(() => {
    const timings = {
      wobble: creature.rarity === "legendary" ? 2500 : creature.rarity === "epic" ? 2000 : 1500,
      crack: 1000,
      hatch: 800,
      reveal: 1500,
    };

    eggRotate.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 100 }),
        withTiming(8, { duration: 100 }),
        withTiming(-5, { duration: 80 }),
        withTiming(5, { duration: 80 }),
        withTiming(0, { duration: 60 })
      ),
      -1
    );
    eggY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 150 }),
        withTiming(0, { duration: 150 })
      ),
      -1
    );

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const timer1 = setTimeout(() => {
      setPhase("crack");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      crackOpacity.value = withTiming(1, { duration: 200 });
      eggScale.value = withSequence(
        withTiming(1.15, { duration: 100 }),
        withTiming(1, { duration: 100 }),
        withTiming(1.2, { duration: 100 }),
        withTiming(1, { duration: 100 })
      );
    }, timings.wobble);

    const timer2 = setTimeout(() => {
      setPhase("hatch");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      flashScale.value = withTiming(3, { duration: timings.hatch, easing: Easing.out(Easing.exp) });
      flashOpacity.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: timings.hatch - 100 })
      );
      eggScale.value = withTiming(0, { duration: 300 });
    }, timings.wobble + timings.crack);

    const timer3 = setTimeout(() => {
      setPhase("reveal");
      creatureScale.value = withSpring(1, { damping: 8, stiffness: 100 });
      creatureOpacity.value = withTiming(1, { duration: 300 });
      glowPulse.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1
      );
    }, timings.wobble + timings.crack + timings.hatch);

    const timer4 = setTimeout(() => {
      setPhase("stats");
      statsY.value = withSpring(0, { damping: 12 });
      statsOpacity.value = withTiming(1, { duration: 300 });
    }, timings.wobble + timings.crack + timings.hatch + timings.reveal);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [creature.rarity]);

  const eggAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${eggRotate.value}deg` },
      { scale: eggScale.value },
      { translateY: eggY.value },
    ],
  }));

  const flashAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flashScale.value }],
    opacity: flashOpacity.value,
  }));

  const creatureAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: creatureScale.value }],
    opacity: creatureOpacity.value,
  }));

  const statsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: statsY.value }],
    opacity: statsOpacity.value,
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowPulse.value }],
  }));

  const creatureImage = CREATURE_IMAGES[creature.templateId];
  const classIcon = CLASS_ICONS[creature.creatureClass] || "star";

  return (
    <View style={styles.container}>
      {(creature.rarity === "legendary" || creature.rarity === "epic") && (
        <View style={styles.particleContainer}>
          {[...Array(15)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.particle,
                {
                  left: `${(i * 7) % 100}%`,
                  top: `${(i * 11) % 100}%`,
                  backgroundColor: colors.primary,
                  opacity: 0.6,
                },
              ]}
            />
          ))}
        </View>
      )}

      {(phase === "wobble" || phase === "crack") && (
        <Animated.View style={[styles.eggContainer, eggAnimatedStyle]}>
          <View
            style={[
              styles.egg,
              {
                backgroundColor: colors.primary,
                shadowColor: colors.glow,
              },
            ]}
          >
            <View style={styles.eggHighlight} />
            {phase === "crack" && (
              <View style={styles.crackContainer}>
                <View style={styles.crack} />
              </View>
            )}
          </View>
          <ThemedText style={[styles.rarityLabel, { color: colors.primary }]}>
            {creature.rarity.toUpperCase()}
          </ThemedText>
        </Animated.View>
      )}

      {phase === "hatch" && (
        <Animated.View style={[styles.flash, flashAnimatedStyle]}>
          <View
            style={[
              styles.flashInner,
              { backgroundColor: colors.primary },
            ]}
          />
        </Animated.View>
      )}

      {(phase === "reveal" || phase === "stats") && (
        <View style={styles.revealContainer}>
          <Animated.View style={[styles.creatureGlow, glowAnimatedStyle]}>
            <View
              style={[
                styles.glowCircle,
                {
                  backgroundColor: colors.glow,
                  shadowColor: colors.primary,
                },
              ]}
            />
          </Animated.View>

          <Animated.View style={[styles.creatureCard, creatureAnimatedStyle]}>
            <View
              style={[
                styles.creatureImageContainer,
                { borderColor: colors.primary },
              ]}
            >
              {creatureImage ? (
                <Image source={creatureImage} style={styles.creatureImage} />
              ) : (
                <View style={[styles.creaturePlaceholder, { backgroundColor: colors.secondary }]}>
                  <Feather name={classIcon as any} size={50} color="#fff" />
                </View>
              )}
            </View>

            <ThemedText style={[styles.creatureName, { color: colors.primary }]}>
              {creature.name}
            </ThemedText>

            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: colors.primary + "30", borderColor: colors.primary }]}>
                <ThemedText style={[styles.badgeText, { color: colors.primary }]}>
                  {creature.rarity.toUpperCase()}
                </ThemedText>
              </View>
              <View style={styles.classContainer}>
                <Feather name={classIcon as any} size={16} color={GameColors.textSecondary} />
                <ThemedText style={styles.classText}>{creature.creatureClass}</ThemedText>
              </View>
            </View>

            {catchQuality === "perfect" && (
              <View style={styles.perfectBanner}>
                <Feather name="star" size={16} color="#FFD700" />
                <ThemedText style={styles.perfectText}>PERFECT CATCH BONUS!</ThemedText>
                <Feather name="star" size={16} color="#FFD700" />
              </View>
            )}

            {creature.isPerfect && (
              <View style={styles.ivBanner}>
                <ThemedText style={styles.ivText}>PERFECT IVs!</ThemedText>
              </View>
            )}
          </Animated.View>

          {phase === "stats" && (
            <Animated.View style={[styles.statsContainer, statsAnimatedStyle]}>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Feather name="heart" size={20} color="#EF4444" />
                  <ThemedText style={styles.statValue}>
                    {creature.baseHp + creature.ivHp}
                  </ThemedText>
                  <ThemedText style={styles.statLabel}>HP</ThemedText>
                </View>
                <View style={styles.statItem}>
                  <Feather name="zap" size={20} color="#F59E0B" />
                  <ThemedText style={styles.statValue}>
                    {creature.baseAtk + creature.ivAtk}
                  </ThemedText>
                  <ThemedText style={styles.statLabel}>ATK</ThemedText>
                </View>
                <View style={styles.statItem}>
                  <Feather name="shield" size={20} color="#3B82F6" />
                  <ThemedText style={styles.statValue}>
                    {creature.baseDef + creature.ivDef}
                  </ThemedText>
                  <ThemedText style={styles.statLabel}>DEF</ThemedText>
                </View>
                <View style={styles.statItem}>
                  <Feather name="wind" size={20} color="#22C55E" />
                  <ThemedText style={styles.statValue}>
                    {creature.baseSpd + creature.ivSpd}
                  </ThemedText>
                  <ThemedText style={styles.statLabel}>SPD</ThemedText>
                </View>
              </View>

              <Pressable style={styles.continueButton} onPress={onComplete}>
                <ThemedText style={styles.continueText}>Awesome!</ThemedText>
              </Pressable>
            </Animated.View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  particleContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  particle: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    opacity: 0.6,
  },
  eggContainer: {
    alignItems: "center",
  },
  egg: {
    width: 120,
    height: 150,
    borderRadius: 60,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 10,
  },
  eggHighlight: {
    position: "absolute",
    top: 20,
    left: 25,
    width: 40,
    height: 25,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  crackContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  crack: {
    width: 4,
    height: "60%",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    transform: [{ rotate: "15deg" }],
  },
  rarityLabel: {
    marginTop: Spacing.lg,
    fontSize: 18,
    fontWeight: "bold",
  },
  flash: {
    position: "absolute",
    width: 100,
    height: 100,
  },
  flashInner: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
  },
  revealContainer: {
    alignItems: "center",
  },
  creatureGlow: {
    position: "absolute",
  },
  glowCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 50,
    elevation: 20,
  },
  creatureCard: {
    alignItems: "center",
    padding: Spacing.xl,
  },
  creatureImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  creatureImage: {
    width: "100%",
    height: "100%",
  },
  creaturePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  creatureName: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: Spacing.md,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  classContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  classText: {
    fontSize: 14,
    color: GameColors.textSecondary,
    textTransform: "capitalize",
  },
  perfectBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  perfectText: {
    color: "#FFD700",
    fontWeight: "bold",
  },
  ivBanner: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    backgroundColor: "rgba(168, 85, 247, 0.3)",
    borderRadius: BorderRadius.sm,
  },
  ivText: {
    color: "#A855F7",
    fontWeight: "bold",
    fontSize: 12,
  },
  statsContainer: {
    marginTop: Spacing.xl,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: GameColors.surfaceLight,
  },
  statsGrid: {
    flexDirection: "row",
    gap: Spacing.xl,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: GameColors.primary,
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: GameColors.textSecondary,
  },
  continueButton: {
    marginTop: Spacing.xl,
    backgroundColor: GameColors.primary,
    paddingHorizontal: Spacing.xl * 2,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  continueText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "bold",
  },
});
