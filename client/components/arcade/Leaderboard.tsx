import React, { useState } from "react";
import { View, StyleSheet, Pressable, FlatList } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";

type LeaderboardCategory = "catches" | "earnings" | "streaks";

interface LeaderboardEntry {
  id: string;
  rank: number;
  username: string;
  value: number;
  isCurrentUser?: boolean;
}

interface LeaderboardProps {
  catches?: LeaderboardEntry[];
  earnings?: LeaderboardEntry[];
  streaks?: LeaderboardEntry[];
  currentUserRank?: { catches?: number; earnings?: number; streaks?: number };
}

const PLACEHOLDER_CATCHES: LeaderboardEntry[] = [
  { id: "1", rank: 1, username: "RoachHunter", value: 1247 },
  { id: "2", rank: 2, username: "RoachKing", value: 1089 },
  { id: "3", rank: 3, username: "ProGamer", value: 956 },
  { id: "4", rank: 4, username: "BugMaster", value: 842 },
  { id: "5", rank: 5, username: "TopPlayer", value: 756 },
  { id: "6", rank: 42, username: "You", value: 45, isCurrentUser: true },
];

const PLACEHOLDER_EARNINGS: LeaderboardEntry[] = [
  { id: "1", rank: 1, username: "RoachBoss", value: 125000 },
  { id: "2", rank: 2, username: "ChyMaster", value: 98500 },
  { id: "3", rank: 3, username: "TopEarner", value: 76200 },
  { id: "4", rank: 4, username: "CoinCollector", value: 54800 },
  { id: "5", rank: 5, username: "ArcadeKing", value: 43200 },
  { id: "6", rank: 156, username: "You", value: 2450, isCurrentUser: true },
];

const PLACEHOLDER_STREAKS: LeaderboardEntry[] = [
  { id: "1", rank: 1, username: "DailyGrinder", value: 365 },
  { id: "2", rank: 2, username: "Consistent", value: 298 },
  { id: "3", rank: 3, username: "NeverMiss", value: 245 },
  { id: "4", rank: 4, username: "StreakMaster", value: 189 },
  { id: "5", rank: 5, username: "Dedicated", value: 156 },
  { id: "6", rank: 89, username: "You", value: 7, isCurrentUser: true },
];

const CATEGORIES: { key: LeaderboardCategory; label: string; icon: keyof typeof Feather.glyphMap; unit: string }[] = [
  { key: "catches", label: "Catches", icon: "target", unit: "" },
  { key: "earnings", label: "Earnings", icon: "dollar-sign", unit: "CHY" },
  { key: "streaks", label: "Streaks", icon: "zap", unit: "days" },
];

const formatValue = (value: number, category: LeaderboardCategory): string => {
  if (category === "earnings") {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + "M";
    if (value >= 1000) return (value / 1000).toFixed(1) + "K";
  }
  return value.toLocaleString();
};

const getRankStyle = (rank: number) => {
  if (rank === 1) return { bg: "#FFD700", text: "#000" };
  if (rank === 2) return { bg: "#C0C0C0", text: "#000" };
  if (rank === 3) return { bg: "#CD7F32", text: "#000" };
  return { bg: GameColors.surfaceGlow, text: GameColors.textSecondary };
};

export function Leaderboard({
  catches = PLACEHOLDER_CATCHES,
  earnings = PLACEHOLDER_EARNINGS,
  streaks = PLACEHOLDER_STREAKS,
}: LeaderboardProps) {
  const [activeCategory, setActiveCategory] = useState<LeaderboardCategory>("catches");

  const getData = () => {
    switch (activeCategory) {
      case "catches": return catches;
      case "earnings": return earnings;
      case "streaks": return streaks;
    }
  };

  const getUnit = () => {
    return CATEGORIES.find(c => c.key === activeCategory)?.unit || "";
  };

  const renderItem = ({ item }: { item: LeaderboardEntry }) => {
    const rankStyle = getRankStyle(item.rank);
    const isTopThree = item.rank <= 3;

    return (
      <View style={[
        styles.entryRow,
        item.isCurrentUser && styles.currentUserRow
      ]}>
        <View style={[
          styles.rankBadge,
          { backgroundColor: rankStyle.bg }
        ]}>
          {isTopThree ? (
            <Feather name="award" size={12} color={rankStyle.text} />
          ) : (
            <ThemedText style={[styles.rankText, { color: rankStyle.text }]}>
              {item.rank}
            </ThemedText>
          )}
        </View>
        <View style={styles.userInfo}>
          <ThemedText style={[
            styles.username,
            item.isCurrentUser && styles.currentUsername
          ]}>
            {item.username}
          </ThemedText>
        </View>
        <View style={styles.valueContainer}>
          <ThemedText style={[
            styles.valueText,
            item.isCurrentUser && styles.currentValueText
          ]}>
            {formatValue(item.value, activeCategory)}
          </ThemedText>
          {getUnit() ? (
            <ThemedText style={styles.unitText}>{getUnit()}</ThemedText>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="bar-chart-2" size={18} color={GameColors.gold} />
          <ThemedText style={styles.headerTitle}>Leaderboard</ThemedText>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <ThemedText style={styles.liveText}>Live</ThemedText>
        </View>
      </View>

      <View style={styles.categoryTabs}>
        {CATEGORIES.map((category) => (
          <Pressable
            key={category.key}
            style={[
              styles.categoryTab,
              activeCategory === category.key && styles.categoryTabActive
            ]}
            onPress={() => setActiveCategory(category.key)}
          >
            <Feather 
              name={category.icon} 
              size={14} 
              color={activeCategory === category.key ? GameColors.gold : GameColors.textTertiary} 
            />
            <ThemedText style={[
              styles.categoryLabel,
              activeCategory === category.key && styles.categoryLabelActive
            ]}>
              {category.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={getData()}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
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
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: GameColors.success + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GameColors.success,
  },
  liveText: {
    fontSize: 10,
    fontWeight: "700",
    color: GameColors.success,
    textTransform: "uppercase",
  },
  categoryTabs: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  categoryTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: Spacing.sm,
    backgroundColor: GameColors.surfaceElevated,
    borderRadius: BorderRadius.sm,
  },
  categoryTabActive: {
    backgroundColor: GameColors.gold + "20",
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: GameColors.textTertiary,
  },
  categoryLabelActive: {
    color: GameColors.gold,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  currentUserRow: {
    backgroundColor: GameColors.gold + "10",
    marginHorizontal: -Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  rankText: {
    fontSize: 12,
    fontWeight: "700",
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  currentUsername: {
    color: GameColors.gold,
  },
  playerSubtext: {
    fontSize: 11,
    color: GameColors.textTertiary,
    marginTop: 1,
  },
  valueContainer: {
    alignItems: "flex-end",
  },
  valueText: {
    fontSize: 14,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  currentValueText: {
    color: GameColors.gold,
  },
  unitText: {
    fontSize: 10,
    color: GameColors.textTertiary,
  },
  separator: {
    height: 1,
    backgroundColor: GameColors.surfaceGlow,
  },
});
