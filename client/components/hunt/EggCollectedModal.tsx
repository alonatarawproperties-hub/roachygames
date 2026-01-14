import React, { useEffect, useState } from "react";
import { View, StyleSheet, Pressable, Modal, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  withDelay,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface EggCollectedModalProps {
  visible: boolean;
  eggRarity: "common" | "rare" | "epic" | "legendary";
  xpAwarded: number;
  pointsAwarded: number;
  quality: "perfect" | "great" | "good";
  pity: { rareIn: number; epicIn: number; legendaryIn: number };
  onContinue: () => void;
  onGoToEggs: () => void;
}

const RARITY_COLORS: Record<string, { primary: string; glow: string }> = {
  common: { primary: "#9CA3AF", glow: "rgba(156, 163, 175, 0.5)" },
  rare: { primary: "#3B82F6", glow: "rgba(59, 130, 246, 0.7)" },
  epic: { primary: "#A855F7", glow: "rgba(168, 85, 247, 0.8)" },
  legendary: { primary: "#F59E0B", glow: "rgba(245, 158, 11, 0.9)" },
};

const RARITY_LABELS: Record<string, string> = {
  common: "COMMON",
  rare: "RARE",
  epic: "EPIC",
  legendary: "LEGENDARY",
};

export function EggCollectedModal({
  visible,
  eggRarity,
  xpAwarded,
  pointsAwarded,
  quality,
  pity,
  onContinue,
  onGoToEggs,
}: EggCollectedModalProps) {
  const colors = RARITY_COLORS[eggRarity] || RARITY_COLORS.common;
  const rarityLabel = RARITY_LABELS[eggRarity] || "COMMON";
  
  const [phase, setPhase] = useState<"reveal" | "complete">("reveal");
  
  const mysteryEggScale = useSharedValue(0);
  const mysteryEggOpacity = useSharedValue(1);
  const revealedEggScale = useSharedValue(0);
  const revealedEggOpacity = useSharedValue(0);
  const eggShake = useSharedValue(0);
  const burstScale = useSharedValue(0);
  const burstOpacity = useSharedValue(0);
  const glowPulse = useSharedValue(1);
  const contentOpacity = useSharedValue(0);
  const tapPromptOpacity = useSharedValue(0);

  const startCompletePhase = () => {
    setPhase("complete");
  };

  useEffect(() => {
    if (visible) {
      setPhase("reveal");
      mysteryEggScale.value = 0;
      mysteryEggOpacity.value = 1;
      revealedEggScale.value = 0;
      revealedEggOpacity.value = 0;
      eggShake.value = 0;
      burstScale.value = 0;
      burstOpacity.value = 0;
      contentOpacity.value = 0;
      tapPromptOpacity.value = 0;

      mysteryEggScale.value = withSpring(1, { damping: 10, stiffness: 100 });

      setTimeout(() => {
        eggShake.value = withRepeat(
          withSequence(
            withTiming(-8, { duration: 60 }),
            withTiming(8, { duration: 60 }),
            withTiming(-6, { duration: 50 }),
            withTiming(6, { duration: 50 }),
            withTiming(-4, { duration: 40 }),
            withTiming(4, { duration: 40 }),
            withTiming(0, { duration: 30 })
          ),
          2,
          false
        );
      }, 400);

      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        burstOpacity.value = withTiming(1, { duration: 100 });
        burstScale.value = withSequence(
          withSpring(1.5, { damping: 6 }),
          withTiming(2, { duration: 300 })
        );
        burstOpacity.value = withDelay(200, withTiming(0, { duration: 200 }));

        mysteryEggOpacity.value = withTiming(0, { duration: 200 });
        mysteryEggScale.value = withTiming(0.5, { duration: 200 });

        revealedEggOpacity.value = withTiming(1, { duration: 300 });
        revealedEggScale.value = withSequence(
          withSpring(1.2, { damping: 8 }),
          withSpring(1, { damping: 12 })
        );

        glowPulse.value = withRepeat(
          withSequence(
            withTiming(1.3, { duration: 800 }),
            withTiming(1, { duration: 800 })
          ),
          -1
        );
      }, 1200);

      setTimeout(() => {
        contentOpacity.value = withTiming(1, { duration: 400 });
        tapPromptOpacity.value = withTiming(1, { duration: 400 });
        runOnJS(startCompletePhase)();
      }, 2000);

    } else {
      mysteryEggScale.value = 0;
      mysteryEggOpacity.value = 1;
      revealedEggScale.value = 0;
      revealedEggOpacity.value = 0;
      contentOpacity.value = 0;
      tapPromptOpacity.value = 0;
      setPhase("reveal");
    }
  }, [visible]);

  const mysteryEggStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: mysteryEggScale.value },
      { rotate: `${eggShake.value}deg` },
    ],
    opacity: mysteryEggOpacity.value,
  }));

  const revealedEggStyle = useAnimatedStyle(() => ({
    transform: [{ scale: revealedEggScale.value }],
    opacity: revealedEggOpacity.value,
  }));

  const burstStyle = useAnimatedStyle(() => ({
    transform: [{ scale: burstScale.value }],
    opacity: burstOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowPulse.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const tapPromptStyle = useAnimatedStyle(() => ({
    opacity: tapPromptOpacity.value,
  }));

  const handleTap = () => {
    if (phase === "complete") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onContinue();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={handleTap}>
        <View style={styles.container}>
          <Animated.View style={[styles.burstContainer, burstStyle]}>
            <View style={[styles.burst, { backgroundColor: colors.glow }]} />
          </Animated.View>

          <Animated.View style={[styles.glowContainer, glowStyle]}>
            <View style={[styles.glow, { backgroundColor: colors.glow }]} />
          </Animated.View>

          <Animated.View style={[styles.eggContainer, mysteryEggStyle]}>
            <View style={styles.mysteryEgg}>
              <View style={styles.mysteryEggHighlight} />
              <View style={styles.mysteryEggQuestion}>
                <ThemedText style={styles.questionMark}>?</ThemedText>
              </View>
            </View>
          </Animated.View>

          <Animated.View style={[styles.eggContainer, revealedEggStyle, styles.revealedEggPosition]}>
            <View style={[styles.revealedEgg, { backgroundColor: colors.primary }]}>
              <View style={styles.eggHighlight} />
            </View>
          </Animated.View>

          <Animated.View style={[styles.content, contentStyle]}>
            <ThemedText style={styles.congratsText}>
              You caught a
            </ThemedText>
            <View style={[styles.rarityBadge, { backgroundColor: colors.primary + "30", borderColor: colors.primary }]}>
              <ThemedText style={[styles.rarityText, { color: colors.primary }]}>
                {rarityLabel} EGG
              </ThemedText>
            </View>

            {quality === "perfect" && (
              <View style={styles.perfectBanner}>
                <Feather name="star" size={14} color="#FFD700" />
                <ThemedText style={styles.perfectText}>PERFECT CATCH!</ThemedText>
                <Feather name="star" size={14} color="#FFD700" />
              </View>
            )}

            <View style={styles.rewardsRow}>
              <View style={styles.rewardItem}>
                <Feather name="zap" size={20} color="#F59E0B" />
                <ThemedText style={styles.rewardValue}>+{xpAwarded}</ThemedText>
                <ThemedText style={styles.rewardLabel}>XP</ThemedText>
              </View>
              <View style={styles.rewardItem}>
                <Feather name="award" size={20} color="#3B82F6" />
                <ThemedText style={styles.rewardValue}>+{pointsAwarded}</ThemedText>
                <ThemedText style={styles.rewardLabel}>Points</ThemedText>
              </View>
            </View>

            <View style={styles.pitySection}>
              <ThemedText style={styles.pityTitle}>Next Guaranteed</ThemedText>
              <View style={styles.pityRow}>
                <View style={styles.pityItem}>
                  <ThemedText style={[styles.pityCount, { color: "#3B82F6" }]}>{pity.rareIn}</ThemedText>
                  <ThemedText style={styles.pityLabel}>Rare</ThemedText>
                </View>
                <View style={styles.pityItem}>
                  <ThemedText style={[styles.pityCount, { color: "#A855F7" }]}>{pity.epicIn}</ThemedText>
                  <ThemedText style={styles.pityLabel}>Epic</ThemedText>
                </View>
                <View style={styles.pityItem}>
                  <ThemedText style={[styles.pityCount, { color: "#F59E0B" }]}>{pity.legendaryIn}</ThemedText>
                  <ThemedText style={styles.pityLabel}>Legendary</ThemedText>
                </View>
              </View>
            </View>
          </Animated.View>

          <Animated.View style={[styles.tapPromptContainer, tapPromptStyle]}>
            <View style={styles.tapPrompt}>
              <Feather name="chevrons-up" size={24} color={GameColors.textSecondary} />
              <ThemedText style={styles.tapPromptText}>Tap to hunt more</ThemedText>
            </View>
          </Animated.View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    alignItems: "center",
    padding: Spacing.xl,
    width: "100%",
  },
  burstContainer: {
    position: "absolute",
    top: "20%",
  },
  burst: {
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  glowContainer: {
    position: "absolute",
    top: "18%",
  },
  glow: {
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  eggContainer: {
    marginBottom: Spacing.xl,
    zIndex: 10,
  },
  revealedEggPosition: {
    position: "absolute",
    top: "15%",
  },
  mysteryEgg: {
    width: 100,
    height: 130,
    borderRadius: 50,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    backgroundColor: "#4B5563",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#9CA3AF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 8,
  },
  mysteryEggHighlight: {
    position: "absolute",
    top: 15,
    left: 20,
    width: 30,
    height: 20,
    borderRadius: 15,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  mysteryEggQuestion: {
    position: "absolute",
  },
  questionMark: {
    fontSize: 48,
    fontWeight: "bold",
    color: "rgba(255, 255, 255, 0.4)",
  },
  revealedEgg: {
    width: 100,
    height: 130,
    borderRadius: 50,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 25,
    elevation: 12,
  },
  eggHighlight: {
    position: "absolute",
    top: 15,
    left: 20,
    width: 30,
    height: 20,
    borderRadius: 15,
    backgroundColor: "rgba(255, 255, 255, 0.35)",
  },
  content: {
    alignItems: "center",
    marginTop: 180,
  },
  congratsText: {
    fontSize: 20,
    color: GameColors.textSecondary,
    marginBottom: Spacing.sm,
  },
  rarityBadge: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    marginBottom: Spacing.md,
  },
  rarityText: {
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  perfectBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  perfectText: {
    color: "#FFD700",
    fontWeight: "bold",
    fontSize: 14,
  },
  rewardsRow: {
    flexDirection: "row",
    gap: Spacing.xl * 2,
    marginBottom: Spacing.lg,
  },
  rewardItem: {
    alignItems: "center",
  },
  rewardValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: GameColors.textPrimary,
    marginTop: Spacing.xs,
  },
  rewardLabel: {
    fontSize: 12,
    color: GameColors.textSecondary,
  },
  pitySection: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    width: SCREEN_WIDTH - 80,
    maxWidth: 300,
  },
  pityTitle: {
    fontSize: 12,
    color: GameColors.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  pityRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  pityItem: {
    alignItems: "center",
  },
  pityCount: {
    fontSize: 18,
    fontWeight: "bold",
  },
  pityLabel: {
    fontSize: 11,
    color: GameColors.textTertiary,
  },
  tapPromptContainer: {
    position: "absolute",
    bottom: 60,
    alignItems: "center",
  },
  tapPrompt: {
    alignItems: "center",
  },
  tapPromptText: {
    fontSize: 16,
    color: GameColors.textSecondary,
    marginTop: Spacing.xs,
  },
});
