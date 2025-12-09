import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";

interface EarningsData {
  today: number;
  week: number;
  allTime: number;
  todayChange?: number;
  weekChange?: number;
}

interface EarningsTrackerProps {
  earnings?: EarningsData;
  isConnected?: boolean;
}

const PLACEHOLDER_EARNINGS: EarningsData = {
  today: 45,
  week: 320,
  allTime: 2450,
  todayChange: 12,
  weekChange: 8,
};

export function EarningsTracker({ earnings = PLACEHOLDER_EARNINGS, isConnected = false }: EarningsTrackerProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  if (!isConnected) {
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
            <ThemedText style={styles.statValue}>{formatNumber(earnings.today)}</ThemedText>
            <ThemedText style={styles.statUnit}>RCH</ThemedText>
          </View>
          {earnings.todayChange !== undefined && earnings.todayChange > 0 ? (
            <View style={styles.changeRow}>
              <Feather name="arrow-up" size={10} color={GameColors.success} />
              <ThemedText style={styles.changeText}>+{earnings.todayChange}%</ThemedText>
            </View>
          ) : null}
        </View>

        <View style={styles.divider} />

        <View style={styles.statItem}>
          <ThemedText style={styles.statLabel}>This Week</ThemedText>
          <View style={styles.statValueRow}>
            <ThemedText style={styles.statValue}>{formatNumber(earnings.week)}</ThemedText>
            <ThemedText style={styles.statUnit}>RCH</ThemedText>
          </View>
          {earnings.weekChange !== undefined && earnings.weekChange > 0 ? (
            <View style={styles.changeRow}>
              <Feather name="arrow-up" size={10} color={GameColors.success} />
              <ThemedText style={styles.changeText}>+{earnings.weekChange}%</ThemedText>
            </View>
          ) : null}
        </View>

        <View style={styles.divider} />

        <View style={styles.statItem}>
          <ThemedText style={styles.statLabel}>All Time</ThemedText>
          <View style={styles.statValueRow}>
            <ThemedText style={[styles.statValue, styles.allTimeValue]}>{formatNumber(earnings.allTime)}</ThemedText>
            <ThemedText style={styles.statUnit}>RCH</ThemedText>
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
    alignItems: "baseline",
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  allTimeValue: {
    color: GameColors.gold,
  },
  statUnit: {
    fontSize: 11,
    fontWeight: "600",
    color: GameColors.textTertiary,
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
});
