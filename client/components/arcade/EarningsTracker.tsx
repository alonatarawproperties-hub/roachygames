import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";

interface EarningsData {
  today: number;
  week: number;
  allTime: number;
  todayChange?: number;
  weekChange?: number;
}

export function EarningsTracker() {
  const { user, isAuthenticated, isGuest } = useAuth();

  const { data: earnings, isLoading } = useQuery<EarningsData>({
    queryKey: ["/api/earnings", user?.id],
    enabled: isAuthenticated && !isGuest && !!user?.id && !!user?.walletAddress,
    refetchInterval: 60000,
  });

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  if (isGuest) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Feather name="trending-up" size={18} color={GameColors.gold} />
            <ThemedText style={styles.headerTitle}>Earnings</ThemedText>
          </View>
        </View>
        <View style={styles.disconnectedContent}>
          <Feather name="user" size={24} color={GameColors.textTertiary} />
          <ThemedText style={styles.disconnectedText}>Sign in to track your earnings</ThemedText>
        </View>
      </View>
    );
  }

  if (!isAuthenticated || !user?.walletAddress) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Feather name="trending-up" size={18} color={GameColors.gold} />
            <ThemedText style={styles.headerTitle}>Earnings</ThemedText>
          </View>
        </View>
        <View style={styles.disconnectedContent}>
          <Feather name="lock" size={24} color={GameColors.textTertiary} />
          <ThemedText style={styles.disconnectedText}>Connect wallet to track earnings</ThemedText>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Feather name="trending-up" size={18} color={GameColors.gold} />
            <ThemedText style={styles.headerTitle}>Earnings</ThemedText>
          </View>
        </View>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="small" color={GameColors.gold} />
        </View>
      </View>
    );
  }

  const earningsData = earnings || { today: 0, week: 0, allTime: 0, todayChange: 0, weekChange: 0 };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="trending-up" size={18} color={GameColors.gold} />
          <ThemedText style={styles.headerTitle}>Earnings</ThemedText>
        </View>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <ThemedText style={styles.liveText}>Live</ThemedText>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <ThemedText style={styles.statLabel}>Today</ThemedText>
          <View style={styles.statValueRow}>
            <ThemedText style={styles.statValue}>{formatNumber(earningsData.today)}</ThemedText>
            <View style={styles.diamondIcon}>
              <Feather name="hexagon" size={12} color="#00D9FF" />
            </View>
          </View>
          {earningsData.todayChange !== undefined && earningsData.todayChange > 0 ? (
            <View style={styles.changeRow}>
              <Feather name="arrow-up" size={10} color={GameColors.success} />
              <ThemedText style={styles.changeText}>+{earningsData.todayChange}%</ThemedText>
            </View>
          ) : null}
        </View>

        <View style={styles.divider} />

        <View style={styles.statItem}>
          <ThemedText style={styles.statLabel}>This Week</ThemedText>
          <View style={styles.statValueRow}>
            <ThemedText style={styles.statValue}>{formatNumber(earningsData.week)}</ThemedText>
            <View style={styles.diamondIcon}>
              <Feather name="hexagon" size={12} color="#00D9FF" />
            </View>
          </View>
          {earningsData.weekChange !== undefined && earningsData.weekChange > 0 ? (
            <View style={styles.changeRow}>
              <Feather name="arrow-up" size={10} color={GameColors.success} />
              <ThemedText style={styles.changeText}>+{earningsData.weekChange}%</ThemedText>
            </View>
          ) : null}
        </View>

        <View style={styles.divider} />

        <View style={styles.statItem}>
          <ThemedText style={styles.statLabel}>All Time</ThemedText>
          <View style={styles.statValueRow}>
            <ThemedText style={[styles.statValue, styles.allTimeValue]}>{formatNumber(earningsData.allTime)}</ThemedText>
            <View style={styles.diamondIcon}>
              <Feather name="hexagon" size={12} color="#00D9FF" />
            </View>
          </View>
        </View>
      </View>
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
  liveIndicator: {
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
  statsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: GameColors.textSecondary,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  allTimeValue: {
    color: GameColors.gold,
  },
  diamondIcon: {
    marginTop: 2,
  },
  changeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 2,
  },
  changeText: {
    fontSize: 10,
    fontWeight: "600",
    color: GameColors.success,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: GameColors.surfaceGlow,
  },
  disconnectedContent: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  disconnectedText: {
    fontSize: 13,
    color: GameColors.textTertiary,
  },
  loadingContent: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
});
