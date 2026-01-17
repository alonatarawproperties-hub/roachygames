import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  displayName: string | null;
  points: number;
  perfects: number;
  eggsTotal: number;
}

interface LeaderboardData {
  weekKey: string;
  leaderboard: LeaderboardEntry[];
}

const getRankStyle = (rank: number) => {
  if (rank === 1) return { bg: "#FFD700", text: "#000" };
  if (rank === 2) return { bg: "#C0C0C0", text: "#000" };
  if (rank === 3) return { bg: "#CD7F32", text: "#000" };
  return { bg: GameColors.surfaceGlow, text: GameColors.textSecondary };
};

export function HuntLeaderboard() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const url = new URL("/api/hunt/weekly-leaderboard", getApiUrl());
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error("Failed to fetch leaderboard");
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError("Unable to load leaderboard");
      console.error("Leaderboard fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const renderItem = ({ item }: { item: LeaderboardEntry }) => {
    const rankStyle = getRankStyle(item.rank);
    const isTopThree = item.rank <= 3;
    const displayName = item.displayName || item.walletAddress.slice(0, 8) + "...";

    return (
      <View style={styles.entryRow}>
        <View style={[styles.rankBadge, { backgroundColor: rankStyle.bg }]}>
          {isTopThree ? (
            <Feather name="award" size={12} color={rankStyle.text} />
          ) : (
            <ThemedText style={[styles.rankText, { color: rankStyle.text }]}>
              {item.rank}
            </ThemedText>
          )}
        </View>
        <View style={styles.userInfo}>
          <ThemedText style={styles.username}>
            {displayName}
          </ThemedText>
          <ThemedText style={styles.perfectsText}>
            {item.perfects} perfects
          </ThemedText>
        </View>
        <View style={styles.valueContainer}>
          <ThemedText style={styles.valueText}>
            {item.points.toLocaleString()}
          </ThemedText>
          <ThemedText style={styles.unitText}>pts</ThemedText>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={GameColors.primary} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centerContainer}>
        <Feather name="alert-circle" size={48} color={GameColors.textSecondary} />
        <ThemedText style={styles.errorText}>{error || "No data"}</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Feather name="calendar" size={16} color={GameColors.gold} />
          <ThemedText style={styles.weekLabel}>Week: {data.weekKey}</ThemedText>
        </View>
        <ThemedText style={styles.headerSubtitle}>
          Weekly rankings reset every Sunday at midnight (GMT+8)
        </ThemedText>
      </Card>

      {data.leaderboard.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Feather name="users" size={48} color={GameColors.textSecondary} />
          <ThemedText style={styles.emptyText}>No hunters this week yet!</ThemedText>
          <ThemedText style={styles.emptySubtext}>Be the first to claim a node</ThemedText>
        </Card>
      ) : (
        <FlatList
          data={data.leaderboard}
          renderItem={renderItem}
          keyExtractor={(item) => `rank-${item.rank}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={GameColors.primary}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  headerCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  weekLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: GameColors.gold,
  },
  headerSubtitle: {
    fontSize: 12,
    color: GameColors.textSecondary,
  },
  emptyCard: {
    alignItems: "center",
    padding: Spacing.xl * 2,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.textSecondary,
  },
  emptySubtext: {
    fontSize: 14,
    color: GameColors.textTertiary,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  currentUserRow: {
    backgroundColor: GameColors.gold + "15",
    borderWidth: 1,
    borderColor: GameColors.gold + "50",
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  perfectsText: {
    fontSize: 11,
    color: GameColors.textTertiary,
    marginTop: 2,
  },
  valueContainer: {
    alignItems: "flex-end",
  },
  valueText: {
    fontSize: 16,
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
  },
  errorText: {
    fontSize: 14,
    color: GameColors.textSecondary,
  },
});
