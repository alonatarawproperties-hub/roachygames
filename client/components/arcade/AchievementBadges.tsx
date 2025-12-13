import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
  rarity: "common" | "rare" | "epic" | "legendary";
}

interface AchievementBadgesProps {
  achievements?: Achievement[];
  onBadgePress?: (achievement: Achievement) => void;
}

const PLACEHOLDER_ACHIEVEMENTS: Achievement[] = [
  { id: "1", title: "First Catch", description: "Catch your first Roachy", icon: "target", unlocked: true, rarity: "common" },
  { id: "2", title: "Collector", description: "Collect 10 different Roachies", icon: "archive", unlocked: true, rarity: "common" },
  { id: "3", title: "Hunter Pro", description: "Catch 100 Roachies", icon: "award", unlocked: false, progress: 45, maxProgress: 100, rarity: "rare" },
  { id: "4", title: "Egg Master", description: "Hatch 50 eggs", icon: "sun", unlocked: false, progress: 12, maxProgress: 50, rarity: "rare" },
  { id: "5", title: "Coin Master", description: "Earn 10,000 Chy Coins", icon: "dollar-sign", unlocked: false, progress: 2450, maxProgress: 10000, rarity: "epic" },
  { id: "6", title: "Legend", description: "Catch a Legendary Roachy", icon: "star", unlocked: false, rarity: "legendary" },
];

const getRarityColor = (rarity: Achievement["rarity"]): string => {
  switch (rarity) {
    case "common": return GameColors.textSecondary;
    case "rare": return "#3B82F6";
    case "epic": return "#8B5CF6";
    case "legendary": return GameColors.gold;
    default: return GameColors.textSecondary;
  }
};

export function AchievementBadges({ achievements = PLACEHOLDER_ACHIEVEMENTS, onBadgePress }: AchievementBadgesProps) {
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="award" size={18} color={GameColors.gold} />
          <ThemedText style={styles.headerTitle}>Achievements</ThemedText>
        </View>
        <View style={styles.countBadge}>
          <ThemedText style={styles.countText}>{unlockedCount}/{achievements.length}</ThemedText>
        </View>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.badgesRow}
      >
        {achievements.map((achievement) => {
          const rarityColor = getRarityColor(achievement.rarity);
          const progressPercent = achievement.maxProgress 
            ? Math.round((achievement.progress || 0) / achievement.maxProgress * 100)
            : 0;

          return (
            <Pressable
              key={achievement.id}
              style={[
                styles.badgeItem,
                achievement.unlocked && styles.badgeUnlocked,
                { borderColor: achievement.unlocked ? rarityColor : GameColors.surfaceGlow }
              ]}
              onPress={() => onBadgePress?.(achievement)}
            >
              <View style={[
                styles.badgeIcon,
                { backgroundColor: achievement.unlocked ? rarityColor + "30" : GameColors.background }
              ]}>
                <Feather 
                  name={achievement.icon} 
                  size={20} 
                  color={achievement.unlocked ? rarityColor : GameColors.textTertiary} 
                />
                {!achievement.unlocked && (
                  <View style={styles.lockOverlay}>
                    <Feather name="lock" size={10} color={GameColors.textTertiary} />
                  </View>
                )}
              </View>
              <ThemedText 
                style={[
                  styles.badgeTitle,
                  !achievement.unlocked && styles.badgeTitleLocked
                ]}
                numberOfLines={1}
              >
                {achievement.title}
              </ThemedText>
              {!achievement.unlocked && achievement.maxProgress ? (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                  </View>
                  <ThemedText style={styles.progressText}>{progressPercent}%</ThemedText>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: GameColors.surfaceGlow,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  countBadge: {
    backgroundColor: GameColors.gold + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
    color: GameColors.gold,
  },
  badgesRow: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingRight: Spacing.md,
  },
  badgeItem: {
    width: 90,
    alignItems: "center",
    backgroundColor: GameColors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1,
  },
  badgeUnlocked: {
    backgroundColor: GameColors.surface,
  },
  badgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  lockOverlay: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: GameColors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: GameColors.textPrimary,
    textAlign: "center",
  },
  badgeTitleLocked: {
    color: GameColors.textTertiary,
  },
  progressContainer: {
    width: "100%",
    marginTop: Spacing.xs,
    alignItems: "center",
  },
  progressBar: {
    width: "100%",
    height: 3,
    backgroundColor: GameColors.background,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: GameColors.gold,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 9,
    fontWeight: "600",
    color: GameColors.textTertiary,
    marginTop: 2,
  },
});
