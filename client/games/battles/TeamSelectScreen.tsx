import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import { useAuth } from "@/context/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type RoachyClass = "TANK" | "ASSASSIN" | "MAGE" | "SUPPORT";
type RoachyRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

interface RoachyStats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
}

interface Roachy {
  id: string;
  name: string;
  class: RoachyClass;
  rarity: RoachyRarity;
  stats: RoachyStats;
  level: number;
  imageUrl?: string;
}

interface RosterResponse {
  success: boolean;
  roachies: Roachy[];
  message?: string;
}

const CLASS_COLORS: Record<RoachyClass, string> = {
  TANK: "#22C55E",
  ASSASSIN: "#EF4444",
  MAGE: "#A855F7",
  SUPPORT: "#06B6D4",
};

const RARITY_COLORS: Record<RoachyRarity, string> = {
  COMMON: "#9CA3AF",
  RARE: "#3B82F6",
  EPIC: "#A855F7",
  LEGENDARY: "#F59E0B",
};

const CLASS_ICONS: Record<RoachyClass, string> = {
  TANK: "shield",
  ASSASSIN: "zap",
  MAGE: "star",
  SUPPORT: "heart",
};

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

function calculatePowerScore(roachies: Roachy[]): number {
  return roachies.reduce((total, roachy) => {
    const baseScore = (roachy.stats.hp + roachy.stats.atk + roachy.stats.def + roachy.stats.spd) / 4;
    const rarityMultiplier: Record<RoachyRarity, number> = {
      COMMON: 1,
      RARE: 1.2,
      EPIC: 1.5,
      LEGENDARY: 2,
    };
    return total + baseScore * rarityMultiplier[roachy.rarity] * (roachy.level / 10);
  }, 0);
}

function getClassLabel(classType: RoachyClass): string {
  return classType.charAt(0) + classType.slice(1).toLowerCase();
}

function getRarityLabel(rarity: RoachyRarity): string {
  return rarity.charAt(0) + rarity.slice(1).toLowerCase();
}

function RoachyCard({
  roachy,
  isSelected,
  onPress,
}: {
  roachy: Roachy;
  isSelected: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const classColor = CLASS_COLORS[roachy.class];
  const rarityColor = RARITY_COLORS[roachy.rarity];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  const totalStats = roachy.stats.hp + roachy.stats.atk + roachy.stats.def + roachy.stats.spd;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.roachyCard,
          isSelected && [
            styles.roachyCardSelected,
            { borderColor: GameColors.gold, shadowColor: GameColors.gold },
          ],
          { borderColor: rarityColor, shadowColor: rarityColor },
        ]}
      >
        {/* Selection Indicator */}
        {isSelected && (
          <View style={[styles.selectedBadge, { backgroundColor: GameColors.primary }]}>
            <Feather name="check" size={16} color={GameColors.background} />
          </View>
        )}

        {/* Class Icon and Name */}
        <View style={styles.cardHeader}>
          <View style={[styles.classIconBg, { backgroundColor: classColor }]}>
            <Feather name={CLASS_ICONS[roachy.class] as any} size={20} color="#FFFFFF" />
          </View>
          <View style={styles.nameSection}>
            <ThemedText type="h4" style={styles.roachyName}>
              {roachy.name}
            </ThemedText>
            <View style={styles.classRarityRow}>
              <View style={[styles.badge, { backgroundColor: classColor + "20" }]}>
                <ThemedText type="small" style={{ color: classColor }}>
                  {getClassLabel(roachy.class)}
                </ThemedText>
              </View>
              <View style={[styles.badge, { backgroundColor: rarityColor + "20" }]}>
                <ThemedText type="small" style={{ color: rarityColor }}>
                  {getRarityLabel(roachy.rarity)}
                </ThemedText>
              </View>
              <View style={styles.levelBadge}>
                <ThemedText type="small" style={styles.levelText}>
                  Lv.{roachy.level}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <ThemedText type="small" style={styles.statLabel}>
              HP
            </ThemedText>
            <ThemedText type="h4" style={styles.statValue}>
              {roachy.stats.hp}
            </ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText type="small" style={styles.statLabel}>
              ATK
            </ThemedText>
            <ThemedText type="h4" style={styles.statValue}>
              {roachy.stats.atk}
            </ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText type="small" style={styles.statLabel}>
              DEF
            </ThemedText>
            <ThemedText type="h4" style={styles.statValue}>
              {roachy.stats.def}
            </ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText type="small" style={styles.statLabel}>
              SPD
            </ThemedText>
            <ThemedText type="h4" style={styles.statValue}>
              {roachy.stats.spd}
            </ThemedText>
          </View>
        </View>

        {/* Total Stats Bar */}
        <View style={styles.totalStatsBar}>
          <ThemedText type="small" style={styles.totalStatsLabel}>
            Total Stats
          </ThemedText>
          <ThemedText type="body" style={[styles.totalStatsValue, { color: classColor }]}>
            {totalStats}
          </ThemedText>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function TeamSelectScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const walletAddress = user?.walletAddress || user?.id || `guest_${Date.now()}`;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Fetch roster
  const {
    data: rosterResponse,
    isLoading: rosterLoading,
    error: rosterError,
  } = useQuery<RosterResponse>({
    queryKey: ["/api/battles/roster", walletAddress],
    queryFn: () =>
      fetch(new URL(`/api/battles/roster/${walletAddress}`, getApiUrl()).toString()).then((r) => {
        if (!r.ok) throw new Error("Failed to fetch roster");
        return r.json();
      }),
    retry: 2,
  });

  const roachies = rosterResponse?.roachies || [];
  const selectedRoachies = useMemo(
    () => roachies.filter((r) => selectedIds.includes(r.id)),
    [roachies, selectedIds]
  );
  const powerScore = useMemo(() => calculatePowerScore(selectedRoachies), [selectedRoachies]);

  const confirmTeamMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/battles/team/confirm", {
        walletAddress,
        roachyIds: selectedIds,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        navigation.navigate("BattleMatchmaking", {
          teamId: data.teamId,
          selectedRoachyIds: selectedIds,
        });
      } else {
        const msg = data.message || "Failed to confirm team";
        if (Platform.OS === "web") {
          alert(msg);
        } else {
          Alert.alert("Error", msg);
        }
      }
    },
    onError: (error: any) => {
      const msg = error?.message || "Failed to confirm team";
      if (Platform.OS === "web") {
        alert(msg);
      } else {
        Alert.alert("Error", msg);
      }
    },
  });

  const handleSelectRoachy = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((pid) => pid !== id);
      } else if (prev.length < 3) {
        return [...prev, id];
      }
      return prev;
    });
  };

  const handleConfirmTeam = () => {
    if (selectedIds.length !== 3) {
      const msg = "Please select exactly 3 roachies for your team";
      if (Platform.OS === "web") {
        alert(msg);
      } else {
        Alert.alert("Team Incomplete", msg);
      }
      return;
    }
    confirmTeamMutation.mutate();
  };

  const canConfirm = selectedIds.length === 3 && !confirmTeamMutation.isPending;

  // Error state
  if (rosterError) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.navigate("BattlesHome")} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={GameColors.textPrimary} />
          </Pressable>
          <ThemedText type="h3" style={styles.headerTitle}>
            Select Team
          </ThemedText>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={GameColors.error} />
          <ThemedText type="h4" style={styles.errorTitle}>
            Failed to Load Roster
          </ThemedText>
          <ThemedText type="body" style={styles.errorMessage}>
            Unable to fetch your roachies. Please try again.
          </ThemedText>
          <Pressable
            style={[styles.button, styles.buttonPrimary]}
            onPress={() => {
              // Trigger refetch
              window.location.reload?.();
            }}
          >
            <ThemedText type="body" style={styles.buttonText}>
              Try Again
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  // Loading state
  if (rosterLoading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.navigate("BattlesHome")} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={GameColors.textPrimary} />
          </Pressable>
          <ThemedText type="h3" style={styles.headerTitle}>
            Select Team
          </ThemedText>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GameColors.primary} />
          <ThemedText type="body" style={styles.loadingText}>
            Loading your roster...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.navigate("BattlesHome")} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={GameColors.textPrimary} />
        </Pressable>
        <ThemedText type="h3" style={styles.headerTitle}>
          Select Team
        </ThemedText>
        <View style={styles.headerRight}>
          <View style={styles.selectionCounter}>
            <ThemedText type="small" style={styles.counterText}>
              {selectedIds.length}/3
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Power Score Card */}
      {selectedRoachies.length > 0 && (
        <View style={styles.powerScoreContainer}>
          <View style={styles.powerScoreCard}>
            <View style={styles.powerScoreLeft}>
              <Feather name="zap" size={24} color={GameColors.gold} />
              <ThemedText type="body" style={styles.powerScoreLabel}>
                Team Power Score
              </ThemedText>
            </View>
            <ThemedText type="h3" style={styles.powerScoreValue}>
              {Math.round(powerScore)}
            </ThemedText>
          </View>
        </View>
      )}

      {/* Roachies List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {roachies.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="inbox" size={48} color={GameColors.textSecondary} />
            <ThemedText type="h4" style={styles.emptyTitle}>
              No Roachies Available
            </ThemedText>
            <ThemedText type="body" style={styles.emptyMessage}>
              You need to catch or acquire roachies before forming a battle team.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.roachiesGrid}>
            {roachies.map((roachy) => (
              <RoachyCard
                key={roachy.id}
                roachy={roachy}
                isSelected={selectedIds.includes(roachy.id)}
                onPress={() => handleSelectRoachy(roachy.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Selection Info */}
      {roachies.length > 0 && selectedRoachies.length > 0 && (
        <View style={styles.selectedInfoContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectedInfoContent}
          >
            {selectedRoachies.map((roachy) => (
              <View key={roachy.id} style={styles.selectedRoachyBadge}>
                <ThemedText type="small" style={styles.selectedRoachyName}>
                  {roachy.name}
                </ThemedText>
                <Pressable
                  onPress={() => handleSelectRoachy(roachy.id)}
                  style={styles.removeBadge}
                >
                  <Feather name="x" size={14} color={GameColors.error} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Action Buttons */}
      <View style={[styles.actionContainer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        {selectedIds.length === 3 && (
          <ThemedText type="small" style={styles.successText}>
            <Feather name="check-circle" size={14} color={GameColors.success} /> Team ready!
            Select "Confirm Team" to find an opponent.
          </ThemedText>
        )}
        <Pressable
          style={[
            styles.button,
            styles.buttonPrimary,
            !canConfirm && styles.buttonDisabled,
          ]}
          onPress={handleConfirmTeam}
          disabled={!canConfirm}
        >
          {confirmTeamMutation.isPending ? (
            <>
              <ActivityIndicator size="small" color={GameColors.background} />
              <ThemedText type="body" style={styles.buttonText}>
                Confirming...
              </ThemedText>
            </>
          ) : (
            <>
              <Feather name="check" size={20} color={GameColors.background} />
              <ThemedText type="body" style={styles.buttonText}>
                Confirm Team ({selectedIds.length}/3)
              </ThemedText>
            </>
          )}
        </Pressable>
      </View>
    </ThemedView>
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
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: GameColors.surfaceGlow,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: GameColors.textPrimary,
    marginHorizontal: Spacing.lg,
  },
  headerRight: {
    width: 44,
    alignItems: "flex-end",
  },
  selectionCounter: {
    backgroundColor: GameColors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  counterText: {
    color: GameColors.background,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  powerScoreContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  powerScoreCard: {
    backgroundColor: GameColors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: GameColors.gold,
    shadowColor: GameColors.gold,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  powerScoreLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  powerScoreLabel: {
    color: GameColors.textSecondary,
  },
  powerScoreValue: {
    color: GameColors.gold,
    fontWeight: "700",
  },
  roachiesGrid: {
    gap: Spacing.lg,
  },
  roachyCard: {
    backgroundColor: GameColors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: GameColors.surfaceGlow,
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  roachyCardSelected: {
    borderWidth: 3,
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  selectedBadge: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    shadowColor: GameColors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  classIconBg: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  nameSection: {
    flex: 1,
  },
  roachyName: {
    color: GameColors.textPrimary,
    marginBottom: Spacing.sm,
    fontWeight: "600",
  },
  classRarityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  levelBadge: {
    backgroundColor: GameColors.primary + "30",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  levelText: {
    color: GameColors.primary,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    backgroundColor: GameColors.background,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  statLabel: {
    color: GameColors.textTertiary,
    marginBottom: Spacing.xs,
    fontWeight: "600",
  },
  statValue: {
    color: GameColors.textPrimary,
    fontWeight: "700",
  },
  totalStatsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: GameColors.surfaceGlow,
  },
  totalStatsLabel: {
    color: GameColors.textSecondary,
    fontWeight: "600",
  },
  totalStatsValue: {
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
  },
  loadingText: {
    color: GameColors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  errorTitle: {
    color: GameColors.error,
    textAlign: "center",
  },
  errorMessage: {
    color: GameColors.textSecondary,
    textAlign: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["4xl"],
    gap: Spacing.lg,
  },
  emptyTitle: {
    color: GameColors.textPrimary,
    textAlign: "center",
  },
  emptyMessage: {
    color: GameColors.textSecondary,
    textAlign: "center",
    maxWidth: 280,
  },
  selectedInfoContainer: {
    borderTopWidth: 1,
    borderTopColor: GameColors.surfaceGlow,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: GameColors.surfaceElevated + "40",
  },
  selectedInfoContent: {
    gap: Spacing.sm,
  },
  selectedRoachyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.primary + "20",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: GameColors.primary,
  },
  selectedRoachyName: {
    color: GameColors.primary,
    fontWeight: "600",
  },
  removeBadge: {
    padding: Spacing.xs,
  },
  actionContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: GameColors.surfaceGlow,
  },
  successText: {
    color: GameColors.success,
    textAlign: "center",
    fontWeight: "600",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
    minHeight: 48,
  },
  buttonPrimary: {
    backgroundColor: GameColors.primary,
    shadowColor: GameColors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  buttonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  buttonText: {
    color: GameColors.background,
    fontWeight: "600",
  },
});
