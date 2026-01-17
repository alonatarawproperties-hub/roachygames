import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={GameColors.primary} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={GameColors.primary}
          />
        }
      >
        <ThemedText type="h4" style={styles.sectionTitle}>
          Weekly Leaderboard
        </ThemedText>
        <Card style={styles.emptyCard}>
          <Feather name="alert-circle" size={48} color={GameColors.textSecondary} />
          <ThemedText style={styles.emptyText}>{error || "No data"}</ThemedText>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={GameColors.primary}
        />
      }
    >
      <ThemedText type="h4" style={styles.sectionTitle}>
        Weekly Leaderboard
      </ThemedText>

      {data.leaderboard.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Feather name="award" size={48} color={GameColors.gold} />
          <ThemedText style={[styles.emptyText, { color: GameColors.gold }]}>
            No Hunters Yet!
          </ThemedText>
          <ThemedText style={styles.emptySubtext}>
            Collect eggs now. Weekly rankings reset every Sunday at midnight (GMT+8).
          </ThemedText>
        </Card>
      ) : (
        <Card style={styles.leaderboardCard}>
          <View style={styles.weekHeader}>
            <Feather name="calendar" size={14} color={GameColors.gold} />
            <ThemedText style={styles.weekLabel}>{data.weekKey}</ThemedText>
          </View>
          <ThemedText style={styles.weekSubtext}>
            Resets every Sunday at midnight (GMT+8)
          </ThemedText>

          <View style={styles.divider} />

          {data.leaderboard.map((item, index) => {
            const rankStyle = getRankStyle(item.rank);
            const isTopThree = item.rank <= 3;
            const displayName = item.displayName || item.walletAddress.slice(0, 8) + "...";

            return (
              <View
                key={`rank-${item.rank}`}
                style={[
                  styles.entryRow,
                  index < data.leaderboard.length - 1 && styles.entryRowBorder,
                ]}
              >
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
                  <ThemedText style={styles.username} numberOfLines={1}>
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
          })}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: GameColors.textPrimary,
    marginBottom: Spacing.md,
  },
  leaderboardCard: {
    padding: Spacing.md,
  },
  weekHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  weekLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.gold,
  },
  weekSubtext: {
    fontSize: 11,
    color: GameColors.textTertiary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: GameColors.surfaceGlow,
    marginVertical: Spacing.md,
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
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: GameColors.textTertiary,
    textAlign: "center",
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  entryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: GameColors.surfaceGlow + "40",
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
    fontSize: 11,
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
  perfectsText: {
    fontSize: 11,
    color: GameColors.textTertiary,
    marginTop: 1,
  },
  valueContainer: {
    alignItems: "flex-end",
  },
  valueText: {
    fontSize: 15,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  unitText: {
    fontSize: 10,
    color: GameColors.textTertiary,
  },
});
