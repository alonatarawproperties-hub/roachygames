import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Animated, {
  SlideInDown,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";

interface LeaderboardEntry {
  id: string;
  userId: string;
  displayName: string | null;
  bestScore: number;
  bestRankedScore: number;
  totalGamesPlayed: number;
  totalRankedGames: number;
}

interface PowerUpInventory {
  shieldCount: number;
  doubleCount: number;
  magnetCount: number;
}

interface RankedStatus {
  entryFee: number;
  participants: number;
  topScore: number;
  endsIn: number;
}

interface UserStats {
  bestScore: number;
  bestRankedScore: number;
  totalGamesPlayed: number;
  totalRankedGames: number;
  rank: number | null;
}

const GameColors = {
  background: "#0a0a0a",
  surface: "#1a1a2e",
  surfaceLight: "#252542",
  gold: "#FFD700",
  goldDark: "#B8860B",
  diamond: "#00D4FF",
  diamondDark: "#0099CC",
  shield: "#3B82F6",
  double: "#F59E0B",
  magnet: "#EF4444",
  text: "#fff",
  textSecondary: "#aaa",
};

type TabType = "leaderboards" | "loadout";

interface FlappyMenuSheetProps {
  visible: boolean;
  onClose: () => void;
  userId: string | null;
  onPlayRanked: () => void;
  onPlayFree: () => void;
  onEquipPowerUp: (type: "shield" | "double" | "magnet") => void;
  equippedPowerUps: { shield: boolean; double: boolean; magnet: boolean };
}

export function FlappyMenuSheet({
  visible,
  onClose,
  userId,
  onPlayRanked,
  onPlayFree,
  onEquipPowerUp,
  equippedPowerUps,
}: FlappyMenuSheetProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>("leaderboards");
  const queryClient = useQueryClient();

  const { data: leaderboardData, isLoading: leaderboardLoading } = useQuery<{ success: boolean; leaderboard: LeaderboardEntry[] }>({
    queryKey: ["/api/flappy/leaderboard"],
    enabled: visible && activeTab === "leaderboards",
  });

  const { data: inventoryData, isLoading: inventoryLoading } = useQuery<{ success: boolean; inventory: PowerUpInventory }>({
    queryKey: ["/api/flappy/inventory", userId],
    enabled: visible && activeTab === "loadout" && !!userId,
  });

  const { data: rankedStatus } = useQuery<{ success: boolean } & RankedStatus>({
    queryKey: ["/api/flappy/ranked/status"],
    enabled: visible && activeTab === "leaderboards",
  });

  const { data: userStats } = useQuery<{ success: boolean; stats: UserStats }>({
    queryKey: ["/api/flappy/leaderboard", userId],
    enabled: visible && !!userId,
  });

  const enterRankedMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/flappy/ranked/enter", { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flappy/ranked/status"] });
      onPlayRanked();
      onClose();
    },
  });

  const handleEquipToggle = useCallback((powerUpType: "shield" | "double" | "magnet") => {
    onEquipPowerUp(powerUpType);
  }, [onEquipPowerUp]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          entering={SlideInDown.springify().damping(15)}
          style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.lg }]}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <View style={styles.handle} />
              <Pressable style={styles.closeButton} onPress={onClose}>
                <Feather name="x" size={24} color={GameColors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.tabs}>
              <TabButton
                label="Leaderboards"
                icon="award"
                active={activeTab === "leaderboards"}
                onPress={() => setActiveTab("leaderboards")}
              />
              <TabButton
                label="Loadout"
                icon="briefcase"
                active={activeTab === "loadout"}
                onPress={() => setActiveTab("loadout")}
              />
            </View>

            <View style={styles.content}>
              {activeTab === "leaderboards" ? (
                <LeaderboardsTab
                  leaderboard={leaderboardData?.leaderboard || []}
                  isLoading={leaderboardLoading}
                  rankedStatus={rankedStatus}
                  userStats={userStats?.stats}
                  userId={userId}
                  onPlayFree={() => {
                    onPlayFree();
                    onClose();
                  }}
                  onPlayRanked={() => enterRankedMutation.mutate()}
                  isEntering={enterRankedMutation.isPending}
                />
              ) : (
                <LoadoutTab
                  inventory={inventoryData?.inventory}
                  isLoading={inventoryLoading}
                  equippedPowerUps={equippedPowerUps}
                  onEquip={handleEquipToggle}
                  isEquipping={false}
                />
              )}
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function TabButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.tabButton, active && styles.tabButtonActive]}
      onPress={onPress}
    >
      <Feather
        name={icon}
        size={18}
        color={active ? GameColors.gold : GameColors.textSecondary}
      />
      <ThemedText
        style={[styles.tabLabel, active && styles.tabLabelActive]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

function LeaderboardsTab({
  leaderboard,
  isLoading,
  rankedStatus,
  userStats,
  userId,
  onPlayFree,
  onPlayRanked,
  isEntering,
}: {
  leaderboard: any[];
  isLoading: boolean;
  rankedStatus: any;
  userStats: any;
  userId: string | null;
  onPlayFree: () => void;
  onPlayRanked: () => void;
  isEntering: boolean;
}) {
  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.playModeSection}>
        <ThemedText style={styles.sectionTitle}>Play Mode</ThemedText>
        
        <Pressable style={styles.playModeCard} onPress={onPlayFree}>
          <View style={styles.playModeIcon}>
            <Feather name="play" size={24} color={GameColors.gold} />
          </View>
          <View style={styles.playModeInfo}>
            <ThemedText style={styles.playModeTitle}>Free Play</ThemedText>
            <ThemedText style={styles.playModeDesc}>
              Practice mode - scores not recorded
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={GameColors.textSecondary} />
        </Pressable>

        <Pressable
          style={[styles.playModeCard, styles.rankedCard]}
          onPress={onPlayRanked}
          disabled={isEntering || !userId}
        >
          <View style={[styles.playModeIcon, styles.rankedIcon]}>
            <Feather name="zap" size={24} color={GameColors.diamond} />
          </View>
          <View style={styles.playModeInfo}>
            <ThemedText style={styles.playModeTitle}>Ranked Competition</ThemedText>
            <View style={styles.entryFeeRow}>
              <Feather name="hexagon" size={14} color={GameColors.diamond} />
              <ThemedText style={styles.entryFeeText}>
                {rankedStatus?.entryFee || 1} Diamond Entry
              </ThemedText>
            </View>
            <ThemedText style={styles.playModeDesc}>
              {rankedStatus?.participants || 0} players today
            </ThemedText>
          </View>
          {isEntering ? (
            <ActivityIndicator color={GameColors.diamond} />
          ) : (
            <Feather name="chevron-right" size={20} color={GameColors.textSecondary} />
          )}
        </Pressable>
      </View>

      {userStats && (
        <View style={styles.statsSection}>
          <ThemedText style={styles.sectionTitle}>Your Stats</ThemedText>
          <View style={styles.statsGrid}>
            <StatBox label="Best Score" value={userStats.bestScore || 0} />
            <StatBox label="Ranked Best" value={userStats.bestRankedScore || 0} />
            <StatBox label="Games Played" value={userStats.totalGamesPlayed || 0} />
            <StatBox label="Global Rank" value={userStats.rank ? `#${userStats.rank}` : "-"} />
          </View>
        </View>
      )}

      <View style={styles.leaderboardSection}>
        <ThemedText style={styles.sectionTitle}>Top Players</ThemedText>
        {isLoading ? (
          <ActivityIndicator color={GameColors.gold} style={{ marginTop: 20 }} />
        ) : leaderboard.length === 0 ? (
          <ThemedText style={styles.emptyText}>No scores yet - be the first!</ThemedText>
        ) : (
          leaderboard.slice(0, 10).map((entry, index) => (
            <LeaderboardEntry
              key={entry.id || index}
              rank={index + 1}
              name={entry.displayName || "Anonymous"}
              score={entry.bestScore}
              isCurrentUser={entry.userId === userId}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statBox}>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
    </View>
  );
}

function LeaderboardEntry({
  rank,
  name,
  score,
  isCurrentUser,
}: {
  rank: number;
  name: string;
  score: number;
  isCurrentUser: boolean;
}) {
  const getRankColor = () => {
    if (rank === 1) return "#FFD700";
    if (rank === 2) return "#C0C0C0";
    if (rank === 3) return "#CD7F32";
    return GameColors.textSecondary;
  };

  return (
    <View style={[styles.leaderboardEntry, isCurrentUser && styles.currentUserEntry]}>
      <View style={[styles.rankBadge, { backgroundColor: getRankColor() }]}>
        <ThemedText style={styles.rankText}>{rank}</ThemedText>
      </View>
      <ThemedText style={styles.entryName} numberOfLines={1}>
        {name}
      </ThemedText>
      <ThemedText style={styles.entryScore}>{score}</ThemedText>
    </View>
  );
}

function LoadoutTab({
  inventory,
  isLoading,
  equippedPowerUps,
  onEquip,
  isEquipping,
}: {
  inventory: any;
  isLoading: boolean;
  equippedPowerUps: { shield: boolean; double: boolean; magnet: boolean };
  onEquip: (type: "shield" | "double" | "magnet") => void;
  isEquipping: boolean;
}) {
  const powerUps = [
    {
      type: "shield" as const,
      name: "Shield",
      icon: "shield",
      color: GameColors.shield,
      count: inventory?.shieldCount || 0,
      description: "Survive one collision",
    },
    {
      type: "double" as const,
      name: "2x Points",
      icon: null,
      color: GameColors.double,
      count: inventory?.doubleCount || 0,
      description: "Double points for 10 seconds",
    },
    {
      type: "magnet" as const,
      name: "Magnet",
      icon: null,
      color: GameColors.magnet,
      count: inventory?.magnetCount || 0,
      description: "Attract nearby coins",
    },
  ];

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <ThemedText style={styles.sectionTitle}>Power-Ups</ThemedText>
      <ThemedText style={styles.loadoutDesc}>
        Equip power-ups before playing to start with an advantage!
      </ThemedText>

      {isLoading ? (
        <ActivityIndicator color={GameColors.gold} style={{ marginTop: 20 }} />
      ) : (
        <View style={styles.powerUpGrid}>
          {powerUps.map((powerUp) => (
            <PowerUpCard
              key={powerUp.type}
              {...powerUp}
              equipped={equippedPowerUps[powerUp.type]}
              onEquip={() => onEquip(powerUp.type)}
              isEquipping={isEquipping}
            />
          ))}
        </View>
      )}

      <View style={styles.tipSection}>
        <Feather name="info" size={16} color={GameColors.textSecondary} />
        <ThemedText style={styles.tipText}>
          Collect power-ups during gameplay or get more at the Marketplace
        </ThemedText>
      </View>

      <Pressable
        style={styles.marketplaceButton}
        onPress={() => WebBrowser.openBrowserAsync("https://roachy.games/marketplace")}
      >
        <Feather name="shopping-bag" size={18} color={GameColors.gold} />
        <ThemedText style={styles.marketplaceButtonText}>Visit Marketplace</ThemedText>
        <Feather name="external-link" size={14} color={GameColors.textSecondary} />
      </Pressable>
    </ScrollView>
  );
}

function PowerUpCard({
  type,
  name,
  icon,
  color,
  count,
  description,
  equipped,
  onEquip,
  isEquipping,
}: {
  type: "shield" | "double" | "magnet";
  name: string;
  icon: string | null;
  color: string;
  count: number;
  description: string;
  equipped: boolean;
  onEquip: () => void;
  isEquipping: boolean;
}) {
  const getStatus = () => {
    if (equipped) return { label: "Equipped", color: GameColors.gold, icon: "check-circle" as const };
    if (count > 0) return { label: "Available", color: "#4ade80", icon: "circle" as const };
    return { label: "Get More", color: GameColors.textSecondary, icon: "shopping-bag" as const };
  };
  
  const status = getStatus();
  
  return (
    <View style={[styles.powerUpCard, { borderColor: equipped ? GameColors.gold : color }]}>
      <View style={styles.statusBadge}>
        <Feather name={status.icon} size={12} color={status.color} />
        <ThemedText style={[styles.statusText, { color: status.color }]}>{status.label}</ThemedText>
      </View>
      
      <View style={[styles.powerUpIconContainer, { backgroundColor: color }]}>
        {icon ? (
          <Feather name={icon as any} size={24} color="#fff" />
        ) : type === "double" ? (
          <ThemedText style={styles.powerUpDoubleText}>2x</ThemedText>
        ) : (
          <View style={styles.magnetIconSmall}>
            <View style={styles.magnetArcSmall} />
          </View>
        )}
      </View>
      
      <ThemedText style={styles.powerUpName}>{name}</ThemedText>
      <ThemedText style={styles.powerUpDesc}>{description}</ThemedText>
      
      <View style={styles.powerUpCountRow}>
        <ThemedText style={styles.powerUpCount}>Owned: {count}</ThemedText>
      </View>

      <Pressable
        style={[
          styles.equipButton,
          equipped && styles.equippedButton,
          count === 0 && styles.disabledButton,
        ]}
        onPress={onEquip}
        disabled={count === 0 || equipped || isEquipping}
      >
        {isEquipping ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <ThemedText style={[styles.equipButtonText, equipped && { color: GameColors.gold }]}>
            {equipped ? "Equipped" : count === 0 ? "Get More" : "Equip"}
          </ThemedText>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: GameColors.background,
    borderTopLeftRadius: BorderRadius["2xl"],
    borderTopRightRadius: BorderRadius["2xl"],
    maxHeight: "85%",
    minHeight: 400,
  },
  header: {
    alignItems: "center",
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: GameColors.surfaceLight,
    borderRadius: 2,
  },
  closeButton: {
    position: "absolute",
    right: Spacing.lg,
    top: Spacing.sm,
    padding: Spacing.xs,
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
    borderRadius: BorderRadius.lg,
    backgroundColor: GameColors.surface,
    marginHorizontal: Spacing.xs,
  },
  tabButtonActive: {
    backgroundColor: GameColors.surfaceLight,
    borderWidth: 1,
    borderColor: GameColors.gold,
  },
  tabLabel: {
    fontSize: 14,
    color: GameColors.textSecondary,
  },
  tabLabelActive: {
    color: GameColors.gold,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  tabContent: {
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: GameColors.text,
    marginBottom: Spacing.md,
  },
  playModeSection: {
    marginBottom: Spacing.xl,
  },
  playModeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  rankedCard: {
    borderWidth: 1,
    borderColor: GameColors.diamond,
  },
  playModeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: GameColors.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  rankedIcon: {
    backgroundColor: "rgba(0, 212, 255, 0.15)",
  },
  playModeInfo: {
    flex: 1,
  },
  playModeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.text,
    marginBottom: 2,
  },
  playModeDesc: {
    fontSize: 12,
    color: GameColors.textSecondary,
  },
  entryFeeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginVertical: 2,
  },
  entryFeeText: {
    fontSize: 13,
    color: GameColors.diamond,
    fontWeight: "500",
  },
  statsSection: {
    marginBottom: Spacing.xl,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  statBox: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: GameColors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: GameColors.gold,
  },
  statLabel: {
    fontSize: 12,
    color: GameColors.textSecondary,
    marginTop: 4,
  },
  leaderboardSection: {
    marginBottom: Spacing.xl,
  },
  leaderboardEntry: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.surface,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  currentUserEntry: {
    borderWidth: 1,
    borderColor: GameColors.gold,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  rankText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#000",
  },
  entryName: {
    flex: 1,
    fontSize: 14,
    color: GameColors.text,
  },
  entryScore: {
    fontSize: 16,
    fontWeight: "700",
    color: GameColors.gold,
  },
  emptyText: {
    fontSize: 14,
    color: GameColors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.lg,
  },
  loadoutDesc: {
    fontSize: 14,
    color: GameColors.textSecondary,
    marginBottom: Spacing.lg,
  },
  powerUpGrid: {
    gap: Spacing.md,
  },
  powerUpCard: {
    backgroundColor: GameColors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    alignItems: "center",
    position: "relative",
  },
  statusBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
  },
  powerUpIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  powerUpDoubleText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#fff",
  },
  magnetIconSmall: {
    width: 24,
    height: 24,
    alignItems: "center",
  },
  magnetArcSmall: {
    width: 20,
    height: 10,
    backgroundColor: "#fff",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  powerUpName: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.text,
    marginBottom: 4,
  },
  powerUpDesc: {
    fontSize: 12,
    color: GameColors.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  powerUpCountRow: {
    marginBottom: Spacing.sm,
  },
  powerUpCount: {
    fontSize: 14,
    color: GameColors.textSecondary,
  },
  equipButton: {
    backgroundColor: GameColors.gold,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    minWidth: 100,
    alignItems: "center",
  },
  equippedButton: {
    backgroundColor: GameColors.surfaceLight,
    borderWidth: 1,
    borderColor: GameColors.gold,
  },
  disabledButton: {
    backgroundColor: GameColors.surfaceLight,
    opacity: 0.5,
  },
  equipButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  tipSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: GameColors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: GameColors.textSecondary,
  },
  marketplaceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: GameColors.surface,
    borderWidth: 1,
    borderColor: GameColors.gold,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  marketplaceButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: GameColors.gold,
  },
});
