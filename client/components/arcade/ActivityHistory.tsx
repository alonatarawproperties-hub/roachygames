import React from "react";
import { View, StyleSheet, FlatList } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";

type ActivityType = "catch" | "reward" | "hatch" | "trade" | "stake";

interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  subtitle: string;
  amount?: string;
  timestamp: string;
}

interface ActivityHistoryProps {
  activities?: ActivityItem[];
  limit?: number;
}

const PLACEHOLDER_ACTIVITIES: ActivityItem[] = [
  { id: "1", type: "catch", title: "Caught Roachy", subtitle: "Common Tank", amount: "+5 RCH", timestamp: "2m ago" },
  { id: "2", type: "reward", title: "Daily Bonus", subtitle: "Login streak: 7 days", amount: "+50 RCH", timestamp: "1h ago" },
  { id: "3", type: "hatch", title: "Egg Hatched", subtitle: "Rare Mage revealed!", amount: "+25 RCH", timestamp: "3h ago" },
  { id: "4", type: "catch", title: "Caught Roachy", subtitle: "Uncommon Assassin", amount: "+10 RCH", timestamp: "5h ago" },
  { id: "5", type: "stake", title: "Staking Reward", subtitle: "Weekly distribution", amount: "+120 RCH", timestamp: "1d ago" },
];

const getActivityIcon = (type: ActivityType): keyof typeof Feather.glyphMap => {
  switch (type) {
    case "catch": return "target";
    case "reward": return "gift";
    case "hatch": return "sun";
    case "trade": return "repeat";
    case "stake": return "lock";
    default: return "activity";
  }
};

const getActivityColor = (type: ActivityType): string => {
  switch (type) {
    case "catch": return GameColors.success;
    case "reward": return GameColors.gold;
    case "hatch": return "#8B5CF6";
    case "trade": return "#06B6D4";
    case "stake": return "#F59E0B";
    default: return GameColors.textSecondary;
  }
};

export function ActivityHistory({ activities = PLACEHOLDER_ACTIVITIES, limit = 5 }: ActivityHistoryProps) {
  const displayActivities = activities.slice(0, limit);

  const renderItem = ({ item }: { item: ActivityItem }) => {
    const iconColor = getActivityColor(item.type);
    
    return (
      <View style={styles.activityItem}>
        <View style={[styles.iconContainer, { backgroundColor: iconColor + "20" }]}>
          <Feather name={getActivityIcon(item.type)} size={18} color={iconColor} />
        </View>
        <View style={styles.activityInfo}>
          <ThemedText style={styles.activityTitle}>{item.title}</ThemedText>
          <ThemedText style={styles.activitySubtitle}>{item.subtitle}</ThemedText>
        </View>
        <View style={styles.activityRight}>
          {item.amount ? (
            <ThemedText style={styles.activityAmount}>{item.amount}</ThemedText>
          ) : null}
          <ThemedText style={styles.activityTime}>{item.timestamp}</ThemedText>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Recent Activity</ThemedText>
        <Feather name="clock" size={16} color={GameColors.textSecondary} />
      </View>
      <FlatList
        data={displayActivities}
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
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  activitySubtitle: {
    fontSize: 12,
    color: GameColors.textSecondary,
    marginTop: 2,
  },
  activityRight: {
    alignItems: "flex-end",
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: GameColors.success,
  },
  activityTime: {
    fontSize: 11,
    color: GameColors.textTertiary,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: GameColors.surfaceGlow,
  },
});
