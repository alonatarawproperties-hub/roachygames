import React, { useEffect } from "react";
import { View, StyleSheet, Pressable, Modal } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";

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
  
  const eggScale = useSharedValue(0);
  const eggRotate = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const glowPulse = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      eggScale.value = withSpring(1, { damping: 8, stiffness: 100 });
      eggRotate.value = withSequence(
        withTiming(-10, { duration: 100 }),
        withTiming(10, { duration: 100 }),
        withTiming(-5, { duration: 80 }),
        withTiming(5, { duration: 80 }),
        withTiming(0, { duration: 60 })
      );
      
      glowPulse.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1
      );
      
      setTimeout(() => {
        contentOpacity.value = withTiming(1, { duration: 300 });
      }, 400);
    } else {
      eggScale.value = 0;
      contentOpacity.value = 0;
    }
  }, [visible]);

  const eggAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: eggScale.value },
      { rotate: `${eggRotate.value}deg` },
    ],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowPulse.value }],
  }));

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Animated.View style={[styles.glowContainer, glowAnimatedStyle]}>
            <View style={[styles.glow, { backgroundColor: colors.glow }]} />
          </Animated.View>

          <Animated.View style={[styles.eggContainer, eggAnimatedStyle]}>
            <View style={[styles.egg, { backgroundColor: colors.primary }]}>
              <View style={styles.eggHighlight} />
            </View>
          </Animated.View>

          <Animated.View style={[styles.content, contentAnimatedStyle]}>
            <ThemedText style={styles.title}>Egg Collected!</ThemedText>
            
            <View style={[styles.rarityBadge, { backgroundColor: colors.primary + "30", borderColor: colors.primary }]}>
              <ThemedText style={[styles.rarityText, { color: colors.primary }]}>
                {eggRarity.toUpperCase()} EGG
              </ThemedText>
            </View>

            {quality === "perfect" && (
              <View style={styles.perfectBanner}>
                <Feather name="star" size={14} color="#FFD700" />
                <ThemedText style={styles.perfectText}>PERFECT!</ThemedText>
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

            <View style={styles.buttonRow}>
              <Pressable style={styles.secondaryButton} onPress={onGoToEggs}>
                <Feather name="package" size={18} color={GameColors.textPrimary} />
                <ThemedText style={styles.secondaryButtonText}>View Eggs</ThemedText>
              </Pressable>
              <Pressable style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={onContinue}>
                <Feather name="map" size={18} color="#000" />
                <ThemedText style={styles.primaryButtonText}>Continue</ThemedText>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    alignItems: "center",
    padding: Spacing.xl,
  },
  glowContainer: {
    position: "absolute",
    top: 20,
  },
  glow: {
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  eggContainer: {
    marginBottom: Spacing.xl,
  },
  egg: {
    width: 100,
    height: 130,
    borderRadius: 50,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  eggHighlight: {
    position: "absolute",
    top: 15,
    left: 20,
    width: 30,
    height: 20,
    borderRadius: 15,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  content: {
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: GameColors.textPrimary,
    marginBottom: Spacing.md,
  },
  rarityBadge: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    marginBottom: Spacing.md,
  },
  rarityText: {
    fontSize: 16,
    fontWeight: "bold",
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
    marginBottom: Spacing.lg,
    width: 280,
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
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: GameColors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  secondaryButtonText: {
    color: GameColors.textPrimary,
    fontWeight: "600",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  primaryButtonText: {
    color: "#000",
    fontWeight: "bold",
  },
});
