import React, { useRef, useEffect } from "react";
import { View, StyleSheet, Pressable, Text, ScrollView, ActivityIndicator } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from "react-native-reanimated";
import { GameColors, Spacing } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import { useAuth } from "@/context/AuthContext";
import { lockPortrait } from "@/utils/orientation";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type RankTier = "bronze" | "silver" | "gold" | "platinum" | "diamond" | "legend";

const RANK_TIERS: Record<RankTier, { label: string; icon: string; color: string; minMMR: number }> = {
  bronze: { label: "Bronze", icon: "award", color: "#CD7F32", minMMR: 0 },
  silver: { label: "Silver", icon: "award", color: "#C0C0C0", minMMR: 1000 },
  gold: { label: "Gold", icon: "award", color: "#FFD700", minMMR: 1500 },
  platinum: { label: "Platinum", icon: "award", color: "#E5E4E2", minMMR: 2000 },
  diamond: { label: "Diamond", icon: "award", color: "#00D9FF", minMMR: 2500 },
  legend: { label: "Legend", icon: "award", color: "#FF6B9D", minMMR: 3000 },
};

interface BattleStats {
  mmr: number;
  wins: number;
  losses: number;
  winStreak: number;
  lossStreak: number;
  dailyWins: number;
  dailyWinsMax: number;
  lastMatchAt?: string;
}

interface BattleStatsResponse {
  success: boolean;
  stats: BattleStats;
}

function getRankTier(mmr: number): RankTier {
  if (mmr >= RANK_TIERS.legend.minMMR) return "legend";
  if (mmr >= RANK_TIERS.diamond.minMMR) return "diamond";
  if (mmr >= RANK_TIERS.platinum.minMMR) return "platinum";
  if (mmr >= RANK_TIERS.gold.minMMR) return "gold";
  if (mmr >= RANK_TIERS.silver.minMMR) return "silver";
  return "bronze";
}

export function BattlesHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const guestIdRef = useRef<string | null>(null);
  if (!guestIdRef.current) {
    guestIdRef.current = "guest_" + Date.now();
  }
  // Use Google user ID (user.id) as the primary identifier for battles
  const playerId = user?.id || user?.googleId || guestIdRef.current;
  console.log("[Battles] Using playerId:", playerId, "user.id:", user?.id, "user.googleId:", user?.googleId);

  useFocusEffect(
    React.useCallback(() => {
      lockPortrait();
    }, [])
  );

  const pulseValue = useSharedValue(0);

  useEffect(() => {
    pulseValue.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.6 + pulseValue.value * 0.4,
  }));

  // Fetch battle stats
  const { data: statsResponse, isLoading: statsLoading, error: statsError } = useQuery<BattleStatsResponse>({
    queryKey: ["/api/battles/stats", playerId],
    queryFn: () =>
      fetch(new URL(`/api/battles/stats/${playerId}`, getApiUrl()).toString()).then((r) => {
        if (!r.ok) throw new Error("Failed to fetch stats");
        return r.json();
      }),
    enabled: !!playerId,
    retry: 2,
  });

  const rawStats = statsResponse?.stats;
  const stats = {
    mmr: rawStats?.mmr ?? 1000,
    wins: rawStats?.wins ?? 0,
    losses: rawStats?.losses ?? 0,
    winStreak: rawStats?.winStreak ?? 0,
    lossStreak: rawStats?.lossStreak ?? 0,
    dailyWins: rawStats?.dailyWins ?? 0,
    dailyWinsMax: rawStats?.dailyWinsMax ?? 3,
  };

  const currentRank = getRankTier(stats.mmr);
  const rankInfo = RANK_TIERS[currentRank];

  const handlePlayRanked = () => {
    // Navigate to team selection - queue join happens after team is picked
    navigation.navigate("BattleTeamSelect");
  };

  if (statsError) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.navigate("ArcadeHome")} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={GameColors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Roachy Battles</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={GameColors.error} />
          <Text style={styles.errorText}>Failed to load battle stats</Text>
          <Text style={styles.errorSubtext}>Please try again</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.navigate("ArcadeHome")} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={GameColors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Roachy Battles</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {statsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={GameColors.gold} />
            <Text style={styles.loadingText}>Loading battle stats...</Text>
          </View>
        ) : (
          <>
            {/* Rank and MMR Card */}
            <View style={styles.rankCard}>
              <View style={styles.rankHeader}>
                <View style={styles.rankBadgeContainer}>
                  <Animated.View style={pulseStyle}>
                    <View
                      style={[
                        styles.rankGlow,
                        {
                          shadowColor: rankInfo.color,
                          shadowOpacity: 0.8,
                          shadowRadius: 20,
                          shadowOffset: { width: 0, height: 0 },
                        },
                      ]}
                    >
                      <Feather name={rankInfo.icon as any} size={48} color={rankInfo.color} />
                    </View>
                  </Animated.View>
                </View>
                <View style={styles.rankInfo}>
                  <Text style={styles.rankLabel}>Current Rank</Text>
                  <Text style={styles.rankName}>{rankInfo.label}</Text>
                  <Text style={[styles.mmrValue, { color: rankInfo.color }]}>{stats.mmr} MMR</Text>
                </View>
              </View>
            </View>

            {/* Stats Row */}
            <View style={styles.statsCard}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.wins}</Text>
                  <Text style={styles.statLabel}>Wins</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.losses}</Text>
                  <Text style={styles.statLabel}>Losses</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: GameColors.success }]}>
                    {stats.wins > 0 || stats.losses > 0
                      ? ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(0)
                      : "0"}
                    %
                  </Text>
                  <Text style={styles.statLabel}>Win Rate</Text>
                </View>
              </View>
            </View>

            {/* Streak Info */}
            <View style={styles.streakContainer}>
              {stats.winStreak > 0 && (
                <View style={[styles.streakBadge, styles.winStreakBadge]}>
                  <Feather name="trending-up" size={16} color={GameColors.success} />
                  <View>
                    <Text style={styles.streakLabel}>Win Streak</Text>
                    <Text style={[styles.streakValue, { color: GameColors.success }]}>{stats.winStreak}</Text>
                  </View>
                </View>
              )}
              {stats.lossStreak > 0 && (
                <View style={[styles.streakBadge, styles.lossStreakBadge]}>
                  <Feather name="trending-down" size={16} color={GameColors.error} />
                  <View>
                    <Text style={styles.streakLabel}>Loss Streak</Text>
                    <Text style={[styles.streakValue, { color: GameColors.error }]}>{stats.lossStreak}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Daily First-3-Wins Bonus */}
            <View style={styles.dailyBonusCard}>
              <View style={styles.dailyBonusHeader}>
                <Feather name="gift" size={20} color={GameColors.gold} />
                <Text style={styles.dailyBonusTitle}>Daily First-3-Wins Bonus</Text>
              </View>
              <View style={styles.dailyProgressContainer}>
                <View style={styles.dailyProgressBar}>
                  <View
                    style={[
                      styles.dailyProgressFill,
                      {
                        width: `${(stats.dailyWins / stats.dailyWinsMax) * 100}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.dailyProgressText}>
                  {stats.dailyWins}/{stats.dailyWinsMax} wins
                </Text>
              </View>
              {stats.dailyWins >= stats.dailyWinsMax && (
                <View style={styles.bonusClaimedBadge}>
                  <Feather name="check-circle" size={14} color={GameColors.success} />
                  <Text style={styles.bonusClaimedText}>Bonus claimed today</Text>
                </View>
              )}
            </View>

            {/* Play Ranked Button */}
            <Pressable
              style={[styles.playButton, styles.playButtonPrimary]}
              onPress={handlePlayRanked}
            >
              <Feather name="zap" size={24} color={GameColors.background} />
              <Text style={styles.playButtonText}>Play Ranked</Text>
            </Pressable>

            {/* Match History Section */}
            <View style={styles.matchHistorySection}>
              <Text style={styles.matchHistoryTitle}>Recent Matches</Text>
              <View style={styles.matchHistoryPlaceholder}>
                <Feather name="calendar" size={32} color={GameColors.textSecondary} />
                <Text style={styles.placeholderText}>No recent matches</Text>
                <Text style={styles.placeholderSubtext}>Play your first ranked match to get started</Text>
              </View>
            </View>

            {/* Coming Soon Features */}
            <View style={styles.comingSoonSection}>
              <Text style={styles.comingSoonTitle}>Coming Soon</Text>
              <View style={styles.comingSoonGrid}>
                <View style={styles.comingSoonCard}>
                  <Feather name="users" size={24} color={GameColors.textSecondary} />
                  <Text style={styles.comingSoonCardText}>Tournaments</Text>
                </View>
                <View style={styles.comingSoonCard}>
                  <Feather name="trending-up" size={24} color={GameColors.textSecondary} />
                  <Text style={styles.comingSoonCardText}>Leaderboard</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: GameColors.surface,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GameColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    color: GameColors.textSecondary,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  errorText: {
    color: GameColors.error,
    fontSize: 16,
    fontWeight: "600",
  },
  errorSubtext: {
    color: GameColors.textSecondary,
    fontSize: 14,
  },
  rankCard: {
    backgroundColor: GameColors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: GameColors.gold,
  },
  rankHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  rankBadgeContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  rankGlow: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GameColors.surfaceElevated,
  },
  rankInfo: {
    flex: 1,
    gap: 4,
  },
  rankLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: GameColors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  rankName: {
    fontSize: 22,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  mmrValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  statsCard: {
    backgroundColor: GameColors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    gap: Spacing.xs,
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: GameColors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: GameColors.textSecondary,
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: GameColors.surfaceElevated,
  },
  streakContainer: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  streakBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: 12,
  },
  winStreakBadge: {
    backgroundColor: "rgba(0, 255, 136, 0.1)",
    borderWidth: 1,
    borderColor: GameColors.success,
  },
  lossStreakBadge: {
    backgroundColor: "rgba(255, 51, 102, 0.1)",
    borderWidth: 1,
    borderColor: GameColors.error,
  },
  streakLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: GameColors.textSecondary,
  },
  streakValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  dailyBonusCard: {
    backgroundColor: GameColors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: GameColors.gold,
    gap: Spacing.md,
  },
  dailyBonusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  dailyBonusTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: GameColors.gold,
  },
  dailyProgressContainer: {
    gap: Spacing.sm,
  },
  dailyProgressBar: {
    height: 8,
    backgroundColor: GameColors.surfaceElevated,
    borderRadius: 4,
    overflow: "hidden",
  },
  dailyProgressFill: {
    height: "100%",
    backgroundColor: GameColors.gold,
  },
  dailyProgressText: {
    fontSize: 12,
    color: GameColors.textSecondary,
    fontWeight: "500",
  },
  bonusClaimedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "rgba(0, 255, 136, 0.1)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  bonusClaimedText: {
    fontSize: 12,
    fontWeight: "600",
    color: GameColors.success,
  },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: 16,
    gap: Spacing.md,
  },
  playButtonPrimary: {
    backgroundColor: GameColors.primary,
    shadowColor: GameColors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  playButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: GameColors.background,
  },
  matchHistorySection: {
    gap: Spacing.md,
  },
  matchHistoryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  matchHistoryPlaceholder: {
    backgroundColor: GameColors.surface,
    borderRadius: 16,
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.md,
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  placeholderSubtext: {
    fontSize: 12,
    color: GameColors.textSecondary,
  },
  comingSoonSection: {
    gap: Spacing.md,
  },
  comingSoonTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: GameColors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  comingSoonGrid: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  comingSoonCard: {
    flex: 1,
    backgroundColor: GameColors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    alignItems: "center",
    gap: Spacing.sm,
    opacity: 0.6,
  },
  comingSoonCardText: {
    fontSize: 12,
    fontWeight: "600",
    color: GameColors.textSecondary,
  },
});

export default BattlesHomeScreen;
