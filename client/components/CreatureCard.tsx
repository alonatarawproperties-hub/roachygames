import React from "react";
import { View, StyleSheet, Image, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { CreatureDefinition, getRarityColor, getTypeColor, CREATURE_IMAGES } from "@/constants/creatures";

interface CreatureCardProps {
  creature: CreatureDefinition;
  distance?: number;
  level?: number;
  onPress?: () => void;
  compact?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function CreatureCard({
  creature,
  distance,
  level,
  onPress,
  compact = false,
}: CreatureCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const rarityColor = getRarityColor(creature.rarity);
  const typeColor = getTypeColor(creature.type);

  if (compact) {
    return (
      <AnimatedPressable
        style={[styles.compactCard, animatedStyle]}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.98);
        }}
        onPressOut={() => {
          scale.value = withSpring(1);
        }}
      >
        <View style={[styles.compactGlow, { backgroundColor: rarityColor }]} />
        <Image source={CREATURE_IMAGES[creature.id]} style={styles.compactImage} />
        <View style={styles.compactInfo}>
          <ThemedText style={styles.compactName}>{creature.name}</ThemedText>
          <View style={styles.compactBadges}>
            <View style={[styles.compactBadge, { backgroundColor: typeColor }]}>
              <ThemedText style={styles.compactBadgeText}>
                {creature.type}
              </ThemedText>
            </View>
            <View style={[styles.compactBadge, { backgroundColor: rarityColor }]}>
              <ThemedText style={styles.compactBadgeText}>
                {creature.rarity}
              </ThemedText>
            </View>
          </View>
        </View>
        {distance !== undefined ? (
          <View style={styles.distanceBadge}>
            <ThemedText style={styles.distanceText}>{distance}m</ThemedText>
          </View>
        ) : null}
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      style={[styles.card, animatedStyle]}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.98);
      }}
      onPressOut={() => {
        scale.value = withSpring(1);
      }}
    >
      <View style={[styles.cardGlow, { backgroundColor: rarityColor }]} />
      <View style={styles.cardContent}>
        <Image source={CREATURE_IMAGES[creature.id]} style={styles.cardImage} />
        <View style={styles.cardInfo}>
          <ThemedText style={styles.cardName}>{creature.name}</ThemedText>
          {level !== undefined ? (
            <ThemedText style={styles.levelText}>Level {level}</ThemedText>
          ) : null}
          <View style={styles.cardBadges}>
            <View style={[styles.badge, { backgroundColor: typeColor }]}>
              <ThemedText style={styles.badgeText}>{creature.type}</ThemedText>
            </View>
            <View style={[styles.badge, { backgroundColor: rarityColor }]}>
              <ThemedText style={styles.badgeText}>{creature.rarity}</ThemedText>
            </View>
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  cardGlow: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardContent: {
    flexDirection: "row",
    padding: Spacing.md,
    alignItems: "center",
  },
  cardImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: Spacing.md,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 18,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  levelText: {
    fontSize: 14,
    color: GameColors.textSecondary,
    marginTop: 2,
  },
  cardBadges: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
    textTransform: "capitalize",
  },
  compactCard: {
    backgroundColor: GameColors.surfaceLight,
    borderRadius: BorderRadius.md,
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    overflow: "hidden",
  },
  compactGlow: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  compactImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Spacing.sm,
  },
  compactInfo: {
    flex: 1,
  },
  compactName: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  compactBadges: {
    flexDirection: "row",
    gap: 4,
    marginTop: 2,
  },
  compactBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  compactBadgeText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#fff",
    textTransform: "capitalize",
  },
  distanceBadge: {
    backgroundColor: GameColors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  distanceText: {
    fontSize: 12,
    color: GameColors.textSecondary,
    fontWeight: "600",
  },
});
