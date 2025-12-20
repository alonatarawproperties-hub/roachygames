import React from "react";
import { View, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { useQuery } from "@tanstack/react-query";

type ActivityType = "catch" | "reward" | "hatch" | "trade" | "bonus" | "game" | "competition";

interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  subtitle: string;
  amount?: string;
  timestamp: string;
}

interface ActivityHistoryProps {
  userId?: string | null;
  limit?: number;
  showHeader?: boolean;
}

const getActivityIcon = (type: ActivityType): keyof typeof Feather.glyphMap => {
  switch (type) {
    case "catch": return "target";
    case "reward": return "gift";
    case "hatch": return "sun";
    case "trade": return "repeat";
    case "bonus": return "star";
    case "game": return "play";
    case "competition": return "award";
    default: return "activity";
  }
};

const getActivityColor = (type: ActivityType): string => {
  switch (type) {
    case "catch": return GameColors.success;
    case "reward": return GameColors.gold;
    case "hatch": return "#8B5CF6";
    case "trade": return "#06B6D4";
    case "bonus": return "#F59E0B";
    case "game": return "#10B981";
    case "competition": return "#EF4444";
    default: return GameColors.textSecondary;
  }
};

export function ActivityHistory({ userId, limit = 5, showHeader = true }: ActivityHistoryProps) {
  const { data, isLoading } = useQuery<{ success: boolean; activities: ActivityItem[] }>({
    queryKey: [`/api/user/${userId}/activity?limit=${limit}`],
    enabled: !!userId,
  });

  const activities = data?.activities || [];

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

  if (!userId) {
    return (
      <View style={styles.container}>
        {showHeader ? (
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>Recent Activity</ThemedText>
            <Feather name="clock" size={16} color={GameColors.textSecondary} />
          </View>
        ) : null}
        <View style={styles.emptyState}>
          <Feather name="user" size={24} color={GameColors.textTertiary} />
          <ThemedText style={styles.emptyText}>Sign in to see your activity</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showHeader ? (
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>Recent Activity</ThemedText>
          <Feather name="clock" size={16} color={GameColors.textSecondary} />
        </View>
      ) : null}
      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="small" color={GameColors.gold} />
        </View>
      ) : activities.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="inbox" size={24} color={GameColors.textTertiary} />
          <ThemedText style={styles.emptyText}>No activity yet</ThemedText>
          <ThemedText style={styles.emptySubtext}>Play games and collect rewards to see activity here</ThemedText>
        </View>
      ) : (
        <FlatList
          data={activities}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
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
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  emptyText: {
    fontSize: 14,
    color: GameColors.textSecondary,
    marginTop: Spacing.sm,
  },
  emptySubtext: {
    fontSize: 12,
    color: GameColors.textTertiary,
    marginTop: 4,
    textAlign: "center",
  },
  loadingState: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
});
