import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Animated, {
  SlideInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { ThemedText } from "@/components/ThemedText";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useWebappBalances } from "@/hooks/useWebappBalances";
import { FLAPPY_SKINS, RoachySkin, SKIN_NFT_MAPPING, RARITY_ORDER, SkinDefinition } from "./flappySkins";
import { FLAPPY_TRAILS, RoachyTrail, TRAIL_NFT_MAPPING } from "./flappyTrails";
import { useUserNfts } from "@/hooks/useUserNfts";
import { useAuth } from "@/context/AuthContext";
import { spendChy } from "@/lib/webapp-api";
import { useActiveCompetitions, Competition, filterRankedCompetitions, filterBossCompetitions, getRankedByPeriod } from "@/hooks/useCompetitions";

// God accounts have access to ALL skins without purchasing
const GOD_ACCOUNTS = [
  'zajkcomshop@gmail.com',
];

const ChyCoinIcon = require("@/assets/chy-coin-icon.png");
const PowerUpShieldIcon = require("@/assets/powerup-shield.png");
const PowerUpDoubleIcon = require("@/assets/powerup-double.png");
const PowerUpMagnetIcon = require("@/assets/powerup-magnet.png");

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

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

interface CompetitionInfo {
  entryFee: number;
  participants: number;
  prizePool: number;
  topScore: number;
  endsIn: number;
  hasJoined: boolean;
  periodDate: string;
  userScore: number;
  userRank: number;
  competitionId?: string; // Used to verify hasJoined matches current competition
}

interface RankedStatusResponse {
  success: boolean;
  daily: CompetitionInfo;
  weekly: CompetitionInfo;
}


const GameColors = {
  background: "#0a0a0a",
  surface: "#1a1a2e",
  surfaceLight: "#252542",
  gold: "#FFD700",
  goldDark: "#B8860B",
  chyCoin: "#FFD700",
  chyCoinDark: "#B8860B",
  diamond: "#FFD700",
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
  competitionId?: string | null;
  competitionName?: string | null;
  onPlayRanked: (period: 'daily' | 'weekly', competitionName?: string) => void;
  onPlayFree: () => void;
  onPlayCompetition?: () => void;
  onPlayBossChallenge?: (competition: Competition) => void;
  onEquipPowerUp: (type: "shield" | "double" | "magnet") => void;
  equippedPowerUps: { shield: boolean; double: boolean; magnet: boolean };
  selectedSkin: RoachySkin;
  onSelectSkin: (skin: RoachySkin) => void;
  selectedTrail: RoachyTrail;
  onSelectTrail: (trail: RoachyTrail) => void;
}

const COLLAPSED_HEIGHT = SCREEN_HEIGHT * 0.5;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.85;
const SNAP_THRESHOLD = 50;

export function FlappyMenuSheet({
  visible,
  onClose,
  userId,
  competitionId,
  competitionName,
  onPlayRanked,
  onPlayFree,
  onPlayCompetition,
  onPlayBossChallenge,
  onEquipPowerUp,
  equippedPowerUps,
  selectedSkin,
  onSelectSkin,
  selectedTrail,
  onSelectTrail,
}: FlappyMenuSheetProps) {
  const isCompetitionMode = !!competitionId;
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>("leaderboards");
  const queryClient = useQueryClient();
  const { getOwnedSkins, isLoading: nftsLoading } = useUserNfts();
  const { user } = useAuth();
  
  // Check if current user is a god account
  const isGodAccount = useMemo(() => {
    const email = user?.email?.toLowerCase();
    return email ? GOD_ACCOUNTS.includes(email) : false;
  }, [user?.email]);
  
  const sheetHeight = useSharedValue(COLLAPSED_HEIGHT);
  const startHeight = useSharedValue(COLLAPSED_HEIGHT);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (visible) {
      sheetHeight.value = withSpring(COLLAPSED_HEIGHT, { damping: 15 });
      setIsExpanded(false);
    }
  }, [visible]);

  const panGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .onStart(() => {
      startHeight.value = sheetHeight.value;
    })
    .onUpdate((event) => {
      const newHeight = startHeight.value - event.translationY;
      sheetHeight.value = Math.min(
        EXPANDED_HEIGHT,
        Math.max(COLLAPSED_HEIGHT * 0.8, newHeight)
      );
    })
    .onEnd((event) => {
      const velocity = event.velocityY;
      const currentHeight = sheetHeight.value;
      
      if (velocity < -500 || (currentHeight > COLLAPSED_HEIGHT + SNAP_THRESHOLD && velocity > -200)) {
        sheetHeight.value = withSpring(EXPANDED_HEIGHT, { damping: 15 });
        runOnJS(setIsExpanded)(true);
      } else if (velocity > 500 || currentHeight < COLLAPSED_HEIGHT - 20) {
        sheetHeight.value = withSpring(COLLAPSED_HEIGHT, { damping: 15 });
        runOnJS(setIsExpanded)(false);
      } else if (currentHeight > (COLLAPSED_HEIGHT + EXPANDED_HEIGHT) / 2) {
        sheetHeight.value = withSpring(EXPANDED_HEIGHT, { damping: 15 });
        runOnJS(setIsExpanded)(true);
      } else {
        sheetHeight.value = withSpring(COLLAPSED_HEIGHT, { damping: 15 });
        runOnJS(setIsExpanded)(false);
      }
    });

  const animatedSheetStyle = useAnimatedStyle(() => ({
    height: sheetHeight.value,
  }));

  const { data: inventoryData, isLoading: inventoryLoading } = useQuery<{ success: boolean; inventory: PowerUpInventory }>({
    queryKey: ["/api/flappy/inventory", userId],
    enabled: visible && activeTab === "loadout" && !!userId,
  });

  const { data: rankedStatus, refetch: refetchStatus, isLoading: rankedStatusLoading, isFetching: rankedStatusFetching } = useQuery<RankedStatusResponse>({
    queryKey: [`/api/flappy/ranked/status?userId=${userId || ''}&webappUserId=${user?.webappUserId || ''}`],
    enabled: visible && activeTab === "leaderboards" && !!userId,
    staleTime: 0,
    gcTime: 0, // Don't cache - always fetch fresh data
    refetchOnMount: 'always',
  });
  
  // Force refetch ALL competition data when menu sheet becomes visible
  // This ensures new competitions from webapp appear immediately without force-closing
  React.useEffect(() => {
    if (visible && activeTab === "leaderboards") {
      console.log('[FlappyMenu] Sheet visible - refetching all competition data');
      queryClient.invalidateQueries({ queryKey: ['/api/competitions/active'] });
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ['/api/flappy/ranked/leaderboard'] });
    }
  }, [visible, activeTab, refetchStatus, queryClient]);

  // Use webapp balances for real CHY from roachy.games
  const { chy: chyBalance, isLoading: balanceLoading, isFetching: balanceFetching, refetch: refetchBalances, invalidateBalances } = useWebappBalances();

  const enterRankedMutation = useMutation({
    mutationFn: async ({ period, entryFee, competitionId }: { period: 'daily' | 'weekly'; entryFee?: number; competitionId?: string }) => {
      // Backend handles CHY deduction via webapp API - pass webappUserId for direct balance lookup
      // Pass entryFee from webapp competition config to ensure correct deduction amount
      // CRITICAL: Pass competitionId to ensure we enter the CURRENT competition
      return apiRequest("POST", "/api/flappy/ranked/enter", { 
        userId, 
        period,
        webappUserId: user?.webappUserId,
        entryFee, // From webapp competition config
        competitionId, // From webapp competition config - ensures correct competition
      });
    },
    onSuccess: async (data: any, { period }: { period: 'daily' | 'weekly'; entryFee?: number; competitionId?: string }) => {
      // IMMEDIATELY refetch status to show "Joined" button - don't just invalidate
      // refetchStatus uses the exact query key so it works instantly
      await refetchStatus();
      // Invalidate competitions to update participants count (uses fuzzy matching)
      await queryClient.invalidateQueries({ 
        queryKey: ['/api/competitions/active'],
        refetchType: 'all', // Force refetch even if stale
      });
      // Refresh CHY balance from webapp after backend deduction
      invalidateBalances();
      // Don't start game immediately - show "Joined" status and let user choose when to play
    },
    onError: (error: any) => {
      console.log("Ranked entry failed:", error.message || "Not enough Chy Coins");
      // Refresh balance in case of any issues
      invalidateBalances();
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
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          entering={SlideInDown.springify().damping(15)}
          style={[styles.sheet, animatedSheetStyle, { paddingBottom: insets.bottom + Spacing.lg }]}
        >
          <GestureDetector gesture={panGesture}>
            <View style={styles.header}>
              <View style={styles.handle} />
              <ThemedText style={styles.expandHint}>
                {isExpanded ? "Drag down to collapse" : "Drag up to expand"}
              </ThemedText>
            </View>
          </GestureDetector>
          
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Feather name="x" size={24} color={GameColors.textSecondary} />
          </Pressable>

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
              isCompetitionMode ? (
                <WebappCompetitionTab
                  competitionId={competitionId!}
                  competitionName={competitionName || "Competition"}
                  userId={userId}
                  chyBalance={chyBalance}
                  balanceLoading={balanceLoading}
                  balanceFetching={balanceFetching}
                  onRefreshBalance={() => refetchBalances()}
                  onPlayCompetition={() => {
                    onPlayCompetition?.();
                    onClose();
                  }}
                />
              ) : (
                <LeaderboardsTab
                  rankedStatus={rankedStatus}
                  rankedStatusLoading={rankedStatusLoading || rankedStatusFetching}
                  userId={userId}
                  chyBalance={chyBalance}
                  balanceLoading={balanceLoading}
                  onRefreshBalance={() => refetchBalances()}
                  balanceFetching={balanceFetching}
                  onPlayFree={() => {
                    onPlayFree();
                    onClose();
                  }}
                  onJoinRanked={(period: 'daily' | 'weekly', entryFee?: number, competitionId?: string) => enterRankedMutation.mutate({ period, entryFee, competitionId })}
                  onStartRankedPlay={(period: 'daily' | 'weekly', competitionName?: string) => {
                    onPlayRanked(period, competitionName);
                    onClose();
                  }}
                  onPlayBossChallenge={(competition) => {
                    onPlayBossChallenge?.(competition);
                    onClose();
                  }}
                  isEntering={enterRankedMutation.isPending}
                  entryError={enterRankedMutation.error?.message}
                />
              )
            ) : (
              <LoadoutTab
                inventory={inventoryData?.inventory}
                isLoading={inventoryLoading}
                equippedPowerUps={equippedPowerUps}
                onEquip={handleEquipToggle}
                isEquipping={false}
                selectedSkin={selectedSkin}
                onSelectSkin={onSelectSkin}
                ownedSkins={getOwnedSkins("flappy_roachy")}
                nftsLoading={nftsLoading}
                selectedTrail={selectedTrail}
                onSelectTrail={onSelectTrail}
                userId={userId}
                isGodAccount={isGodAccount}
              />
            )}
          </View>
        </Animated.View>
      </View>
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
        style={{ marginRight: Spacing.xs }}
      />
      <ThemedText
        style={[styles.tabLabel, active && styles.tabLabelActive]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

function formatCountdown(ms: number, isPerpetual: boolean = false): string {
  if (ms <= 0) {
    // For perpetual competitions, show "Resets soon" instead of "Ended"
    return isPerpetual ? "Resets soon" : "Ended";
  }
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const prefix = isPerpetual ? "Resets " : "";
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${prefix}${days}d ${hours % 24}h`;
  }
  return `${prefix}${hours}h ${minutes}m`;
}

// Flappy ranked competitions are now enabled
const FLAPPY_COMPETITIONS_LOCKED = false;

function CompetitionCard({
  title,
  icon,
  entryFee,
  participants,
  prizePool,
  endsIn,
  hasJoined,
  canEnter,
  chyBalance,
  userId,
  isEntering,
  isSelected,
  isPerpetual,
  onEnter,
  onPlay,
  onSelect,
}: {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  entryFee: number;
  participants: number;
  prizePool: number;
  endsIn: number;
  hasJoined: boolean;
  canEnter: boolean;
  chyBalance: number;
  userId: string | null;
  isEntering: boolean;
  isSelected: boolean;
  isPerpetual?: boolean;
  onEnter: () => void;
  onPlay: () => void;
  onSelect: () => void;
}) {
  const hasEnoughChy = chyBalance >= entryFee;
  
  // Beta lock - show Coming Soon for all competitions
  if (FLAPPY_COMPETITIONS_LOCKED) {
    return (
      <View style={[styles.competitionCard, { opacity: 0.6 }]}>
        <View style={styles.competitionHeader}>
          <View style={styles.competitionTitleRow}>
            <View style={styles.competitionIcon}>
              <Feather name={icon} size={18} color={GameColors.textSecondary} />
            </View>
            <ThemedText style={styles.competitionTitle}>{title}</ThemedText>
            <View style={{ backgroundColor: GameColors.gold, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginLeft: 8 }}>
              <ThemedText style={{ fontSize: 10, fontWeight: 'bold', color: '#000' }}>SOON</ThemedText>
            </View>
          </View>
        </View>
        
        <View style={styles.competitionStats}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statItemValue}>-</ThemedText>
            <ThemedText style={styles.statItemLabel}>Players</ThemedText>
          </View>
          <View style={styles.statItem}>
            <View style={styles.entryFeeDisplay}>
              <Image source={ChyCoinIcon} style={styles.coinIconImage} contentFit="contain" />
              <ThemedText style={styles.statItemValue}>{entryFee}</ThemedText>
            </View>
            <ThemedText style={styles.statItemLabel}>Entry Fee</ThemedText>
          </View>
        </View>
        
        <View style={[styles.enterButton, styles.disabledButton]}>
          <ThemedText style={[styles.enterButtonText, { color: GameColors.textSecondary }]}>Coming Soon</ThemedText>
        </View>
      </View>
    );
  }
  
  return (
    <Pressable 
      onPress={onSelect}
      style={[
        styles.competitionCard, 
        hasJoined && styles.joinedCard,
        isSelected && styles.selectedCard
      ]}
    >
      <View style={styles.competitionHeader}>
        <View style={styles.competitionTitleRow}>
          <View style={[styles.competitionIcon, hasJoined && styles.joinedIcon, isSelected && styles.selectedIcon]}>
            <Feather name={icon} size={18} color={isSelected ? GameColors.gold : (hasJoined ? GameColors.gold : GameColors.gold)} />
          </View>
          <ThemedText style={styles.competitionTitle}>{title}</ThemedText>
          {isSelected ? (
            <Feather name="chevron-down" size={16} color={GameColors.gold} style={{ marginLeft: 4 }} />
          ) : null}
        </View>
        <View style={styles.countdownBadge}>
          <Feather name="clock" size={12} color={GameColors.textSecondary} />
          <ThemedText style={styles.countdownText}>{formatCountdown(endsIn, isPerpetual)}</ThemedText>
        </View>
      </View>
      
      <View style={styles.competitionStats}>
        <View style={styles.statItem}>
          <ThemedText style={styles.statItemValue}>{participants}</ThemedText>
          <ThemedText style={styles.statItemLabel}>Players</ThemedText>
        </View>
        <View style={styles.statItem}>
          <View style={styles.entryFeeDisplay}>
            <Image source={ChyCoinIcon} style={styles.coinIconImage} contentFit="contain" />
            <ThemedText style={styles.statItemValue}>{prizePool}</ThemedText>
          </View>
          <ThemedText style={styles.statItemLabel}>Prize Pool</ThemedText>
        </View>
        <View style={styles.statItem}>
          <View style={styles.entryFeeDisplay}>
            <Image source={ChyCoinIcon} style={styles.coinIconImage} contentFit="contain" />
            <ThemedText style={styles.statItemValue}>{entryFee}</ThemedText>
          </View>
          <ThemedText style={styles.statItemLabel}>Entry Fee</ThemedText>
        </View>
      </View>
      
      {hasJoined ? (
        <View style={styles.joinedButtonContainer}>
          <View style={styles.joinedBadge}>
            <Feather name="check-circle" size={14} color={GameColors.gold} />
            <ThemedText style={styles.joinedBadgeText}>Joined</ThemedText>
          </View>
          <Pressable 
            style={styles.playNowButtonWide} 
            onPress={(e) => { e.stopPropagation(); onPlay(); }}
          >
            <Feather name="play" size={16} color="#000" />
            <ThemedText style={styles.playNowButtonText}>Play</ThemedText>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={[styles.enterButton, !canEnter && styles.disabledButton]}
          onPress={(e) => { e.stopPropagation(); onEnter(); }}
          disabled={!canEnter}
        >
          {isEntering ? (
            <ActivityIndicator size="small" color="#000" />
          ) : !userId ? (
            <ThemedText style={styles.enterButtonText}>Sign in to join</ThemedText>
          ) : !hasEnoughChy ? (
            <ThemedText style={[styles.enterButtonText, { color: GameColors.textSecondary }]}>
              Need {entryFee - chyBalance} more
            </ThemedText>
          ) : (
            <ThemedText style={styles.enterButtonText}>Enter Competition</ThemedText>
          )}
        </Pressable>
      )}
    </Pressable>
  );
}

interface WebappCompetitionLeaderboardEntry {
  rank: number;
  walletAddress: string;
  displayName: string;
  score: number;
  submittedAt: string;
}

interface WebappCompetitionLeaderboardResponse {
  success: boolean;
  competitionId: string;
  leaderboard: WebappCompetitionLeaderboardEntry[];
  totalEntries: number;
}

function WebappCompetitionTab({
  competitionId,
  competitionName,
  userId,
  chyBalance,
  balanceLoading,
  balanceFetching,
  onRefreshBalance,
  onPlayCompetition,
}: {
  competitionId: string;
  competitionName: string;
  userId: string | null;
  chyBalance: number;
  balanceLoading: boolean;
  balanceFetching: boolean;
  onRefreshBalance: () => void;
  onPlayCompetition: () => void;
}) {
  const { data: leaderboardData, isLoading: leaderboardLoading } = useQuery<WebappCompetitionLeaderboardResponse>({
    queryKey: ["/api/competitions", competitionId, "leaderboard"],
    enabled: !!competitionId,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const spinValue = useSharedValue(0);
  
  React.useEffect(() => {
    if (balanceFetching) {
      spinValue.value = withRepeat(
        withTiming(1, { duration: 800, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      spinValue.value = 0;
    }
  }, [balanceFetching]);
  
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinValue.value * 360}deg` }],
  }));

  return (
    <ScrollView 
      style={styles.tabContent} 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {userId ? (
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <ThemedText style={styles.balanceCardLabel}>Your Balance</ThemedText>
            <Pressable style={styles.refreshBalanceButton} onPress={onRefreshBalance} disabled={balanceFetching}>
              <Animated.View style={spinStyle}>
                <Feather name="refresh-cw" size={16} color={GameColors.background} />
              </Animated.View>
            </Pressable>
          </View>
          <View style={styles.balanceRow}>
            <Image source={ChyCoinIcon} style={styles.chyCoinIconLarge} contentFit="contain" />
            {balanceLoading || balanceFetching ? (
              <ActivityIndicator size="small" color={GameColors.gold} />
            ) : (
              <ThemedText style={styles.balanceValue}>{chyBalance} CHY</ThemedText>
            )}
          </View>
        </View>
      ) : null}

      <View style={styles.webappCompetitionHeader}>
        <View style={styles.webappCompetitionTitleRow}>
          <Feather name="award" size={24} color={GameColors.gold} />
          <ThemedText style={styles.webappCompetitionTitleText}>{competitionName}</ThemedText>
        </View>
        <View style={styles.webappLiveIndicator}>
          <View style={styles.webappLiveDot} />
          <ThemedText style={styles.webappLiveText}>LIVE</ThemedText>
        </View>
      </View>

      <Pressable
        style={styles.playCompetitionButton}
        onPress={onPlayCompetition}
      >
        <Feather name="play" size={20} color="#000" />
        <ThemedText style={styles.playCompetitionButtonText}>Play Competition</ThemedText>
      </Pressable>

      <ThemedText style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Leaderboard</ThemedText>

      {leaderboardLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={GameColors.gold} />
        </View>
      ) : leaderboardData?.leaderboard && leaderboardData.leaderboard.length > 0 ? (
        <View style={styles.leaderboardList}>
          {leaderboardData.leaderboard.map((entry) => (
            <View key={`${entry.walletAddress}-${entry.rank}`} style={styles.webappLeaderboardRow}>
              <View style={[
                styles.rankBadge, 
                entry.rank === 1 && styles.webappRankGold,
                entry.rank === 2 && styles.webappRankSilver,
                entry.rank === 3 && styles.webappRankBronze,
              ]}>
                <ThemedText style={styles.rankText}>#{entry.rank}</ThemedText>
              </View>
              <View style={styles.webappPlayerInfo}>
                <ThemedText style={styles.webappPlayerName} numberOfLines={1}>
                  {entry.displayName || `${entry.walletAddress.slice(0, 4)}...${entry.walletAddress.slice(-4)}`}
                </ThemedText>
              </View>
              <ThemedText style={styles.webappScoreText}>{entry.score.toLocaleString()}</ThemedText>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyLeaderboard}>
          <Feather name="users" size={32} color="#666" />
          <ThemedText style={styles.emptyText}>No scores yet</ThemedText>
          <ThemedText style={styles.webappEmptySubtext}>Be the first to compete!</ThemedText>
        </View>
      )}
    </ScrollView>
  );
}

interface CompetitionLeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  score: number;
  gamesPlayed: number;
}

interface CompetitionLeaderboardResponse {
  success: boolean;
  period: string;
  periodDate: string;
  leaderboard: CompetitionLeaderboardEntry[];
  userRankInfo: CompetitionLeaderboardEntry | null;
}

function formatTimeRemaining(endsAt: string): string {
  const endDate = new Date(endsAt);
  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();
  
  if (diffMs <= 0) return "Ended";
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }
  
  return `${hours}h ${minutes}m`;
}

function BossChallengeCard({ 
  competition, 
  hasJoined,
  isEntering,
  canEnter,
  onEnter,
  onPlay 
}: { 
  competition: Competition;
  hasJoined: boolean;
  isEntering: boolean;
  canEnter: boolean;
  onEnter: () => void;
  onPlay: () => void;
}) {
  const ChyCoinIconSource = require("@/assets/chy-coin-icon.png");
  
  return (
    <View style={[styles.bossChallengeCard, hasJoined && styles.joinedCard]}>
      <View style={styles.bossChallengeHeader}>
        <View style={[styles.bossChallengeIconContainer, hasJoined && styles.joinedIcon]}>
          <Feather name="zap" size={20} color={GameColors.gold} />
        </View>
        <View style={styles.bossChallengeInfo}>
          <ThemedText style={styles.bossChallengeTitle}>{competition.name}</ThemedText>
          <View style={styles.bossChallengeBadge}>
            <View style={styles.liveDot} />
            <ThemedText style={styles.bossChallengeBadgeText}>LIVE</ThemedText>
          </View>
        </View>
        <View style={styles.bossChallengeTimer}>
          <Feather name="clock" size={12} color={GameColors.textSecondary} />
          <ThemedText style={styles.bossChallengeTimerText}>
            {formatTimeRemaining(competition.endsAt)}
          </ThemedText>
        </View>
      </View>
      
      <View style={styles.bossChallengeStats}>
        <View style={styles.bossChallengeStatItem}>
          <ThemedText style={styles.bossChallengeStatValue}>
            {competition.currentEntries || 0}
          </ThemedText>
          <ThemedText style={styles.bossChallengeStatLabel}>Players</ThemedText>
        </View>
        <View style={styles.bossChallengeStatItem}>
          <View style={styles.bossChallengeStatValueRow}>
            <Image source={ChyCoinIconSource} style={styles.coinIconTiny} contentFit="contain" />
            <ThemedText style={styles.bossChallengeStatValue}>
              {competition.prizePool}
            </ThemedText>
          </View>
          <ThemedText style={styles.bossChallengeStatLabel}>Prize Pool</ThemedText>
        </View>
        <View style={styles.bossChallengeStatItem}>
          <View style={styles.bossChallengeStatValueRow}>
            <Image source={ChyCoinIconSource} style={styles.coinIconTiny} contentFit="contain" />
            <ThemedText style={styles.bossChallengeStatValue}>
              {competition.entryFee}
            </ThemedText>
          </View>
          <ThemedText style={styles.bossChallengeStatLabel}>Entry Fee</ThemedText>
        </View>
      </View>
      
      {hasJoined ? (
        <View style={styles.bossActionRow}>
          <View style={styles.joinedBadge}>
            <Feather name="check-circle" size={14} color={GameColors.gold} />
            <ThemedText style={styles.joinedBadgeText}>Joined</ThemedText>
          </View>
          <Pressable style={styles.bossPlayButton} onPress={onPlay}>
            <Feather name="play" size={16} color={GameColors.background} />
            <ThemedText style={styles.bossChallengePlayButtonText}>Play</ThemedText>
          </Pressable>
        </View>
      ) : (
        <Pressable 
          style={[
            styles.bossChallengePlayButton, 
            !canEnter && styles.disabledButton,
            isEntering && styles.enteringButton
          ]} 
          onPress={onEnter}
          disabled={!canEnter || isEntering}
        >
          {isEntering ? (
            <ActivityIndicator size="small" color={GameColors.background} />
          ) : (
            <>
              <Feather name="log-in" size={16} color={GameColors.background} />
              <ThemedText style={styles.bossChallengePlayButtonText}>Enter Competition</ThemedText>
            </>
          )}
        </Pressable>
      )}
    </View>
  );
}

function LeaderboardsTab({
  rankedStatus,
  rankedStatusLoading,
  userId,
  chyBalance,
  balanceLoading,
  balanceFetching,
  onRefreshBalance,
  onPlayFree,
  onJoinRanked,
  onStartRankedPlay,
  onPlayBossChallenge,
  isEntering,
  entryError,
}: {
  rankedStatus: RankedStatusResponse | undefined;
  rankedStatusLoading: boolean;
  userId: string | null;
  chyBalance: number;
  balanceLoading: boolean;
  balanceFetching: boolean;
  onRefreshBalance: () => void;
  onPlayFree: () => void;
  onJoinRanked: (period: 'daily' | 'weekly', entryFee?: number, competitionId?: string) => void;
  onStartRankedPlay: (period: 'daily' | 'weekly', competitionName?: string) => void;
  onPlayBossChallenge: (competition: Competition) => void;
  isEntering: boolean;
  entryError?: string;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { invalidateBalances } = useWebappBalances();
  const { data: allCompetitions, isLoading: competitionsLoading, refetch: refetchCompetitions } = useActiveCompetitions();
  // Only set when user explicitly taps a competition - null means no leaderboard shown
  const [selectedCompetition, setSelectedCompetition] = useState<'daily' | 'weekly' | null>(null);
  
  // Track boss challenge join status locally
  const [bossJoinedMap, setBossJoinedMap] = useState<Record<string, boolean>>({});
  const [enteringBossId, setEnteringBossId] = useState<string | null>(null);
  const [bossEntryError, setBossEntryError] = useState<string | null>(null);
  
  // Boss challenge entry mutation
  const enterBossMutation = useMutation({
    mutationFn: async ({ competitionId, entryFee }: { competitionId: string; entryFee: number }) => {
      setEnteringBossId(competitionId);
      setBossEntryError(null);
      return apiRequest("POST", "/api/flappy/competition/enter", { 
        userId, 
        competitionId,
        webappUserId: user?.webappUserId,
        entryFee,
      });
    },
    onSuccess: async (data: any, { competitionId }) => {
      setEnteringBossId(null);
      setBossJoinedMap(prev => ({ ...prev, [competitionId]: true }));
      await refetchCompetitions();
      invalidateBalances();
    },
    onError: (error: any, { competitionId }) => {
      setEnteringBossId(null);
      setBossEntryError(error.message || "Failed to enter competition");
      invalidateBalances();
    },
  });
  
  // Filter competitions by type for unified webapp approach
  const bossCompetitions = useMemo(() => 
    allCompetitions ? filterBossCompetitions(allCompetitions) : [], 
    [allCompetitions]
  );
  const webappRankedCompetitions = useMemo(() => 
    allCompetitions ? filterRankedCompetitions(allCompetitions) : [], 
    [allCompetitions]
  );
  
  // Fetch boss challenge join status when competitions load
  React.useEffect(() => {
    if (!userId || bossCompetitions.length === 0) return;
    
    const fetchBossStatus = async () => {
      try {
        const competitionIds = bossCompetitions.map(c => c.id).join(',');
        const response = await fetch(
          `${getApiUrl()}/api/flappy/competition/status?userId=${userId}&competitionIds=${competitionIds}`
        );
        const data = await response.json();
        if (data.success && data.entries) {
          const joinedMap: Record<string, boolean> = {};
          for (const [id, entry] of Object.entries(data.entries)) {
            joinedMap[id] = (entry as any).hasJoined;
          }
          setBossJoinedMap(prev => ({ ...prev, ...joinedMap }));
        }
      } catch (error) {
        console.error('[FlappyMenu] Failed to fetch boss status:', error);
      }
    };
    
    fetchBossStatus();
  }, [userId, bossCompetitions.length]);
  
  // Get webapp-sourced daily/weekly if available
  const webappDaily = useMemo(() => 
    getRankedByPeriod(webappRankedCompetitions, 'daily'), 
    [webappRankedCompetitions]
  );
  const webappWeekly = useMemo(() => 
    getRankedByPeriod(webappRankedCompetitions, 'weekly'), 
    [webappRankedCompetitions]
  );
  
  // Debug: Log competition names and hasJoined status
  React.useEffect(() => {
    if (allCompetitions) {
      console.log('[FlappyMenu] All competitions from webapp:', JSON.stringify(allCompetitions.map(c => ({ id: c.id, name: c.name, type: c.type, period: c.period }))));
    }
    if (webappDaily) {
      console.log('[FlappyMenu] Daily competition name:', webappDaily.name);
    }
    if (webappWeekly) {
      console.log('[FlappyMenu] Weekly competition name:', webappWeekly.name);
    }
  }, [allCompetitions, webappDaily, webappWeekly]);
  
  // Debug: Log rankedStatus and hasJoined values
  React.useEffect(() => {
    console.log('[FlappyMenu] rankedStatus received:', JSON.stringify(rankedStatus));
    console.log('[FlappyMenu] daily.hasJoined:', rankedStatus?.daily?.hasJoined, '-> computed:', rankedStatus?.daily?.hasJoined ?? false);
    console.log('[FlappyMenu] weekly.hasJoined:', rankedStatus?.weekly?.hasJoined, '-> computed:', rankedStatus?.weekly?.hasJoined ?? false);
  }, [rankedStatus]);
  
  // Use webapp ranked data if available, otherwise fallback to mobile-only
  const useWebappRanked = webappRankedCompetitions.length > 0;
  
  const spinValue = useSharedValue(0);
  
  React.useEffect(() => {
    if (balanceFetching) {
      spinValue.value = withRepeat(
        withTiming(1, { duration: 800, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      spinValue.value = 0;
    }
  }, [balanceFetching]);
  
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinValue.value * 360}deg` }],
  }));
  
  // Webapp is the single source of truth for ALL competitions - no mobile fallback
  // Use webapp's endsAt for countdown - it knows the exact reset time
  // Returns MILLISECONDS (formatCountdown expects ms, not seconds)
  const getEndsIn = (comp: Competition | undefined) => {
    if (!comp || !comp.endsAt) return 0;
    // Use webapp's endsAt directly - it has the correct reset time configured
    const msRemaining = new Date(comp.endsAt).getTime() - Date.now();
    return Math.max(0, msRemaining); // Return milliseconds, NOT seconds
  };
  
  // Check if competition is actually closed (not just time-based for perpetual competitions)
  const isCompetitionActive = (comp: Competition | undefined) => {
    if (!comp) return false;
    // Daily/weekly are always active (perpetual)
    if (comp.period === 'daily' || comp.period === 'weekly') {
      return comp.status === 'active' || comp.status === 'scheduled';
    }
    // For one-time, check status
    return comp.status === 'active';
  };
  
  // Daily/Weekly competitions come only from webapp (type: "ranked", period: "daily"/"weekly")
  // CRITICAL: Use prizePool from rankedStatus (webapp's /status endpoint) to ensure data consistency
  // The /status endpoint returns both prizePool and participants from the same source
  // Mixing prizePool from /competitions/active with participants from /status caused doubling issues
  // hasJoined comes from rankedStatus (proxied from webapp /status endpoint)
  // CRITICAL: hasJoined must be FALSE while loading to prevent stale "Joined" state
  // Note: rankedStatusLoading prop already includes isFetching from parent component
  
  const daily = useMemo(() => {
    if (!webappDaily) return undefined;
    // CRITICAL FIX: Only trust hasJoined if competitionId matches current competition
    // This prevents stale cache showing "Joined" for a DIFFERENT competition
    const statusCompetitionId = rankedStatus?.daily?.competitionId;
    const currentCompetitionId = webappDaily.id;
    const competitionIdMatches = statusCompetitionId === currentCompetitionId;
    
    // Force hasJoined to false if:
    // 1. Still loading (prevent stale cache)
    // 2. Competition ID mismatch (stale data for old competition)
    const hasJoinedValue = rankedStatusLoading ? false : 
      (competitionIdMatches ? (rankedStatus?.daily?.hasJoined ?? false) : false);
    
    // Only use rankedStatus data if competitionId matches, otherwise use webapp defaults
    const participantsCount = competitionIdMatches 
      ? (rankedStatus?.daily?.participants ?? webappDaily.currentEntries ?? 0)
      : (webappDaily.currentEntries ?? 0);
    const prizePoolValue = competitionIdMatches 
      ? (rankedStatus?.daily?.prizePool ?? webappDaily.prizePool ?? (webappDaily.basePrizeBoost || 0))
      : (webappDaily.prizePool ?? (webappDaily.basePrizeBoost || 0));
    const topScoreValue = competitionIdMatches ? (rankedStatus?.daily?.topScore || 0) : 0;
    const userScoreValue = competitionIdMatches ? (rankedStatus?.daily?.userScore || 0) : 0;
    const userRankValue = competitionIdMatches ? (rankedStatus?.daily?.userRank || 0) : 0;
    
    if (!competitionIdMatches && statusCompetitionId) {
      console.log(`[FlappyMenu] Daily competition ID mismatch - cached: ${statusCompetitionId}, current: ${currentCompetitionId}. Ignoring stale hasJoined.`);
    }
    
    return {
      name: webappDaily.name || 'Daily Challenge',
      entryFee: webappDaily.entryFee || 0,
      participants: participantsCount,
      prizePool: prizePoolValue,
      topScore: topScoreValue,
      endsIn: getEndsIn(webappDaily),
      hasJoined: hasJoinedValue,
      periodDate: rankedStatus?.daily?.periodDate || '',
      userScore: userScoreValue,
      userRank: userRankValue,
      competitionId: webappDaily.id,
      isActive: isCompetitionActive(webappDaily),
      isPerpetual: true,
    };
  }, [webappDaily, rankedStatus, rankedStatusLoading]);
  
  const weekly = useMemo(() => {
    if (!webappWeekly) return undefined;
    // CRITICAL FIX: Only trust hasJoined if competitionId matches current competition
    // This prevents stale cache showing "Joined" for a DIFFERENT competition
    const statusCompetitionId = rankedStatus?.weekly?.competitionId;
    const currentCompetitionId = webappWeekly.id;
    const competitionIdMatches = statusCompetitionId === currentCompetitionId;
    
    // Force hasJoined to false if:
    // 1. Still loading (prevent stale cache)
    // 2. Competition ID mismatch (stale data for old competition)
    const hasJoinedValue = rankedStatusLoading ? false : 
      (competitionIdMatches ? (rankedStatus?.weekly?.hasJoined ?? false) : false);
    
    // Only use rankedStatus data if competitionId matches, otherwise use webapp defaults
    const participantsCount = competitionIdMatches 
      ? (rankedStatus?.weekly?.participants ?? webappWeekly.currentEntries ?? 0)
      : (webappWeekly.currentEntries ?? 0);
    const prizePoolValue = competitionIdMatches 
      ? (rankedStatus?.weekly?.prizePool ?? webappWeekly.prizePool ?? (webappWeekly.basePrizeBoost || 0))
      : (webappWeekly.prizePool ?? (webappWeekly.basePrizeBoost || 0));
    const topScoreValue = competitionIdMatches ? (rankedStatus?.weekly?.topScore || 0) : 0;
    const userScoreValue = competitionIdMatches ? (rankedStatus?.weekly?.userScore || 0) : 0;
    const userRankValue = competitionIdMatches ? (rankedStatus?.weekly?.userRank || 0) : 0;
    
    if (!competitionIdMatches && statusCompetitionId) {
      console.log(`[FlappyMenu] Weekly competition ID mismatch - cached: ${statusCompetitionId}, current: ${currentCompetitionId}. Ignoring stale hasJoined.`);
    }
    
    return {
      name: webappWeekly.name || 'Weekly Championship',
      entryFee: webappWeekly.entryFee || 0,
      participants: participantsCount,
      prizePool: prizePoolValue,
      topScore: topScoreValue,
      endsIn: getEndsIn(webappWeekly),
      hasJoined: hasJoinedValue,
      periodDate: rankedStatus?.weekly?.periodDate || '',
      userScore: userScoreValue,
      userRank: userRankValue,
      competitionId: webappWeekly.id,
      isActive: isCompetitionActive(webappWeekly),
      isPerpetual: true,
    };
  }, [webappWeekly, rankedStatus, rankedStatusLoading]);
  
  const canEnterDaily = userId && daily && chyBalance >= daily.entryFee && !isEntering && !daily.hasJoined;
  const canEnterWeekly = userId && weekly && chyBalance >= weekly.entryFee && !isEntering && !weekly.hasJoined;

  const selectedInfo = selectedCompetition === 'daily' ? daily : selectedCompetition === 'weekly' ? weekly : null;
  
  // Fetch competition-specific leaderboard - only when a competition is explicitly selected AND exists
  const { data: competitionLeaderboard, isLoading: leaderboardLoading, refetch: refetchLeaderboard } = useQuery<CompetitionLeaderboardResponse>({
    queryKey: [`/api/flappy/ranked/leaderboard?period=${selectedCompetition}&userId=${userId || ''}`],
    enabled: !!selectedCompetition && (selectedCompetition === 'daily' ? !!daily : !!weekly),
    staleTime: 0,
    refetchOnMount: 'always',
  });
  
  // Force refetch leaderboard when competition selection changes
  React.useEffect(() => {
    if (selectedCompetition && (selectedCompetition === 'daily' ? daily : weekly)) {
      console.log(`[FlappyMenu] Refetching leaderboard for ${selectedCompetition}`);
      refetchLeaderboard();
    }
  }, [selectedCompetition, daily, weekly, refetchLeaderboard]);
  
  // Prize distribution for top 20 (decreasing percentages)
  const PRIZE_PERCENTAGES: Record<number, number> = {
    1: 0.25,   // 25%
    2: 0.15,   // 15%
    3: 0.10,   // 10%
    4: 0.07,   // 7%
    5: 0.06,   // 6%
    6: 0.05,   // 5%
    7: 0.04,   // 4%
    8: 0.04,   // 4%
    9: 0.03,   // 3%
    10: 0.03,  // 3%
    11: 0.018, // 1.8%
    12: 0.018,
    13: 0.018,
    14: 0.018,
    15: 0.018,
    16: 0.018,
    17: 0.018,
    18: 0.018,
    19: 0.018,
    20: 0.018,
  };
  
  const calculatePrize = (rank: number, prizePool: number, participants: number): number => {
    if (rank === 0 || participants === 0 || rank > 20) return 0;
    const percentage = PRIZE_PERCENTAGES[rank] || 0;
    return Math.floor(prizePool * percentage);
  };

  return (
    <ScrollView 
      style={styles.tabContent} 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {userId ? (
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <ThemedText style={styles.balanceCardLabel}>Your Balance</ThemedText>
            <Pressable style={styles.refreshBalanceButton} onPress={onRefreshBalance} disabled={balanceFetching}>
              <Animated.View style={spinStyle}>
                <Feather name="refresh-cw" size={16} color={GameColors.background} />
              </Animated.View>
            </Pressable>
          </View>
          <View style={styles.balanceRow}>
            <Image source={ChyCoinIcon} style={styles.chyCoinIconLarge} contentFit="contain" />
            {balanceLoading || balanceFetching ? (
              <ActivityIndicator size="small" color={GameColors.gold} />
            ) : (
              <ThemedText style={styles.balanceValue}>{chyBalance} CHY</ThemedText>
            )}
          </View>
        </View>
      ) : null}

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

        <ThemedText style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Ranked Competitions</ThemedText>
        <ThemedText style={styles.competitionHint}>Tap a competition to see your stats</ThemedText>
        
        {competitionsLoading ? (
          <ActivityIndicator color={GameColors.gold} style={{ marginVertical: Spacing.lg }} />
        ) : daily || weekly ? (
          <>
            {daily ? (
              <CompetitionCard
                title={daily.name}
                icon="sun"
                entryFee={daily.entryFee}
                participants={daily.participants}
                prizePool={daily.prizePool}
                endsIn={daily.endsIn}
                hasJoined={daily.hasJoined}
                canEnter={!!canEnterDaily}
                chyBalance={chyBalance}
                userId={userId}
                isEntering={isEntering}
                isSelected={selectedCompetition === 'daily'}
                isPerpetual={daily.isPerpetual}
                onEnter={() => onJoinRanked('daily', daily.entryFee, daily.competitionId)}
                onPlay={() => onStartRankedPlay('daily', daily.name)}
                onSelect={() => setSelectedCompetition('daily')}
              />
            ) : null}
            
            {weekly ? (
              <CompetitionCard
                title={weekly.name}
                icon="calendar"
                entryFee={weekly.entryFee}
                participants={weekly.participants}
                prizePool={weekly.prizePool}
                endsIn={weekly.endsIn}
                hasJoined={weekly.hasJoined}
                canEnter={!!canEnterWeekly}
                chyBalance={chyBalance}
                userId={userId}
                isEntering={isEntering}
                isSelected={selectedCompetition === 'weekly'}
                isPerpetual={weekly.isPerpetual}
                onEnter={() => onJoinRanked('weekly', weekly.entryFee, weekly.competitionId)}
                onPlay={() => onStartRankedPlay('weekly', weekly.name)}
                onSelect={() => setSelectedCompetition('weekly')}
              />
            ) : null}
          </>
        ) : (
          <View style={styles.noBossChallenges}>
            <Feather name="award" size={24} color={GameColors.textSecondary} />
            <ThemedText style={styles.noBossChallengesText}>No ranked competitions active</ThemedText>
            <ThemedText style={styles.noBossChallengesSubtext}>Check roachy.games for upcoming events!</ThemedText>
          </View>
        )}
        
        {entryError ? (
          <ThemedText style={styles.errorText}>{entryError}</ThemedText>
        ) : null}

        <ThemedText style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>Boss Challenges</ThemedText>
        <ThemedText style={styles.competitionHint}>Limited-time special events from roachy.games</ThemedText>
        
        {competitionsLoading ? (
          <ActivityIndicator color={GameColors.gold} style={{ marginVertical: Spacing.lg }} />
        ) : bossCompetitions && bossCompetitions.length > 0 ? (
          bossCompetitions.map((comp) => {
            const hasJoined = bossJoinedMap[comp.id] ?? false;
            const canEnter = !!userId && chyBalance >= comp.entryFee && !enteringBossId && !hasJoined;
            return (
              <BossChallengeCard
                key={comp.id}
                competition={comp}
                hasJoined={hasJoined}
                isEntering={enteringBossId === comp.id}
                canEnter={canEnter}
                onEnter={() => enterBossMutation.mutate({ competitionId: comp.id, entryFee: comp.entryFee })}
                onPlay={() => onPlayBossChallenge(comp)}
              />
            );
          })
        ) : (
          <View style={styles.noBossChallenges}>
            <Feather name="zap" size={24} color={GameColors.textSecondary} />
            <ThemedText style={styles.noBossChallengesText}>No active boss challenges</ThemedText>
            <ThemedText style={styles.noBossChallengesSubtext}>Check back soon for special events!</ThemedText>
          </View>
        )}
        
        {bossEntryError ? (
          <ThemedText style={styles.errorText}>{bossEntryError}</ThemedText>
        ) : null}
      </View>

      {selectedInfo && selectedInfo.hasJoined ? (
        <View style={styles.statsSection}>
          <ThemedText style={styles.sectionTitle}>
            Your {selectedCompetition === 'daily' ? 'Daily' : 'Weekly'} Stats
          </ThemedText>
          <View style={styles.statsGrid}>
            <StatBox label="Your Score" value={selectedInfo.userScore || 0} />
            <StatBox label="Your Rank" value={selectedInfo.userRank ? `#${selectedInfo.userRank}` : "-"} />
            <StatBox label="Prize Pool" value={selectedInfo.prizePool || 0} icon="hexagon" />
            <StatBox 
              label="Your Prize" 
              value={calculatePrize(selectedInfo.userRank, selectedInfo.prizePool, selectedInfo.participants)} 
              icon="hexagon"
              highlight={selectedInfo.userRank > 0 && selectedInfo.userRank <= 20}
            />
          </View>
          <View style={styles.prizeBreakdown}>
            <ThemedText style={styles.prizeBreakdownTitle}>Prize Distribution (Top 20)</ThemedText>
            {[
              { label: "1st Place", pct: 0.25 },
              { label: "2nd Place", pct: 0.15 },
              { label: "3rd Place", pct: 0.10 },
              { label: "4th Place", pct: 0.07 },
              { label: "5th Place", pct: 0.06 },
              { label: "6th Place", pct: 0.05 },
              { label: "7th-8th", pct: 0.04 },
              { label: "9th-10th", pct: 0.03 },
              { label: "11th-20th", pct: 0.018 },
            ].map((item, idx) => (
              <View key={idx} style={styles.prizeRow}>
                <ThemedText style={styles.prizeRankText}>{item.label}</ThemedText>
                <View style={styles.prizeValueRow}>
                  <Image source={ChyCoinIcon} style={styles.coinIconSmallImage} contentFit="contain" />
                  <ThemedText style={styles.prizeValueText}>
                    {Math.floor((selectedInfo.prizePool || 0) * item.pct)}
                    {item.label.includes("-") ? " each" : ""}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : selectedInfo && !selectedInfo.hasJoined ? (
        <View style={styles.statsSection}>
          <ThemedText style={styles.sectionTitle}>
            {selectedCompetition === 'daily' ? 'Daily' : 'Weekly'} Competition
          </ThemedText>
          <ThemedText style={styles.notJoinedText}>
            Join this competition to see your stats and compete for prizes!
          </ThemedText>
        </View>
      ) : null}

      {/* Only show leaderboard when user explicitly selects a competition */}
      {selectedCompetition && (selectedCompetition === 'daily' ? daily : weekly) ? (
        <View style={styles.leaderboardSection}>
          <ThemedText style={styles.sectionTitle}>
            {selectedCompetition === 'daily' ? 'Daily' : 'Weekly'} Leaderboard
          </ThemedText>
          {leaderboardLoading ? (
            <ActivityIndicator color={GameColors.gold} style={{ marginTop: 20 }} />
          ) : !competitionLeaderboard?.leaderboard || competitionLeaderboard.leaderboard.length === 0 ? (
            <ThemedText style={styles.emptyText}>No scores yet - be the first!</ThemedText>
          ) : (
            <>
              {competitionLeaderboard.leaderboard.map((entry: CompetitionLeaderboardEntry) => (
                <LeaderboardEntry
                  key={entry.userId}
                  rank={entry.rank}
                  name={entry.displayName || "Anonymous"}
                  score={entry.score}
                  isCurrentUser={entry.userId === userId}
                />
              ))}
              {competitionLeaderboard.userRankInfo && competitionLeaderboard.userRankInfo.rank > 10 ? (
                <View style={styles.userRankBelowTop10}>
                  <ThemedText style={styles.userRankDivider}>...</ThemedText>
                  <LeaderboardEntry
                    rank={competitionLeaderboard.userRankInfo.rank}
                    name={competitionLeaderboard.userRankInfo.displayName || "You"}
                    score={competitionLeaderboard.userRankInfo.score}
                    isCurrentUser={true}
                  />
                </View>
              ) : null}
            </>
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

function StatBox({ label, value, icon, highlight }: { label: string; value: string | number; icon?: string; highlight?: boolean }) {
  return (
    <View style={[styles.statBox, highlight && styles.highlightBox]}>
      <View style={styles.statValueRow}>
        {icon ? <Feather name={icon as any} size={14} color={highlight ? GameColors.gold : GameColors.diamond} /> : null}
        <ThemedText style={[styles.statValue, highlight && styles.highlightValue]}>{value}</ThemedText>
      </View>
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
  selectedSkin,
  onSelectSkin,
  ownedSkins,
  nftsLoading,
  selectedTrail,
  onSelectTrail,
  userId,
  isGodAccount,
}: {
  inventory: any;
  isLoading: boolean;
  equippedPowerUps: { shield: boolean; double: boolean; magnet: boolean };
  onEquip: (type: "shield" | "double" | "magnet") => void;
  isEquipping: boolean;
  selectedSkin: RoachySkin;
  onSelectSkin: (skin: RoachySkin) => void;
  ownedSkins: string[];
  nftsLoading: boolean;
  selectedTrail: RoachyTrail;
  onSelectTrail: (trail: RoachyTrail) => void;
  userId: string | null;
  isGodAccount: boolean;
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

  // God accounts bypass guest restrictions
  const isGuestUser = !isGodAccount && (!userId || userId.startsWith('guest_'));

  const isSkinOwned = (skinId: RoachySkin): boolean => {
    // God accounts own all skins
    if (isGodAccount) return true;
    if (!FLAPPY_SKINS[skinId].isNFT) return true;
    const mappedName = SKIN_NFT_MAPPING[skinId];
    return ownedSkins.some(s => s.toLowerCase().includes(mappedName.toLowerCase()));
  };

  const isTrailOwned = (trailId: RoachyTrail): boolean => {
    // God accounts own all trails
    if (isGodAccount) return true;
    if (!FLAPPY_TRAILS[trailId].isNFT) return true;
    const mappedName = TRAIL_NFT_MAPPING[trailId];
    return ownedSkins.some(s => s.toLowerCase().includes(mappedName.toLowerCase()));
  };

  const allSkins = Object.values(FLAPPY_SKINS);
  const skins = allSkins
    .filter(skin => {
      // God accounts see all skins
      if (isGodAccount) return true;
      if (isGuestUser) return !skin.isNFT;
      if (!skin.isNFT) return true;
      return isSkinOwned(skin.id);
    })
    .sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]);
  
  const allTrails = Object.values(FLAPPY_TRAILS);
  const trails = allTrails.filter(trail => {
    // God accounts see all trails
    if (isGodAccount) return true;
    if (isGuestUser) return !trail.isNFT;
    if (!trail.isNFT) return true;
    return isTrailOwned(trail.id);
  });

  return (
    <ScrollView 
      style={styles.tabContent} 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <ThemedText style={styles.sectionTitle}>Skins</ThemedText>
      
      <View style={styles.skinGrid}>
        {skins.map((skin) => (
          <SkinCard
            key={skin.id}
            skin={skin}
            isSelected={selectedSkin === skin.id}
            isOwned={isSkinOwned(skin.id)}
            isLoading={skin.isNFT && nftsLoading}
            onSelect={() => onSelectSkin(skin.id)}
          />
        ))}
      </View>

      <ThemedText style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>Trails</ThemedText>
      
      <View style={styles.skinGrid}>
        {trails.map((trail) => (
          <TrailCard
            key={trail.id}
            trail={trail}
            isSelected={selectedTrail === trail.id}
            isOwned={isTrailOwned(trail.id)}
            isLoading={trail.isNFT && nftsLoading}
            onSelect={() => onSelectTrail(trail.id)}
          />
        ))}
      </View>

      <ThemedText style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>Power-ups</ThemedText>

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

      <Pressable
        style={styles.marketplaceButton}
        onPress={() => WebBrowser.openBrowserAsync(`${process.env.EXPO_PUBLIC_MARKETPLACE_URL || "https://roachy.games"}/marketplace`)}
      >
        <Feather name="shopping-bag" size={16} color={GameColors.gold} />
        <ThemedText style={styles.marketplaceButtonText}>Get more at Marketplace</ThemedText>
        <Feather name="chevron-right" size={16} color={GameColors.textSecondary} />
      </Pressable>
    </ScrollView>
  );
}

function SkinCard({
  skin,
  isSelected,
  isOwned,
  isLoading,
  onSelect,
}: {
  skin: SkinDefinition;
  isSelected: boolean;
  isOwned: boolean;
  isLoading: boolean;
  onSelect: () => void;
}) {
  const handlePress = () => {
    if (isLoading) return;
    if (isOwned) {
      onSelect();
    } else {
      WebBrowser.openBrowserAsync(`${process.env.EXPO_PUBLIC_MARKETPLACE_URL || "https://roachy.games"}/marketplace`);
    }
  };

  return (
    <Pressable
      style={[
        styles.skinCard,
        isSelected && styles.skinCardSelected,
        !isOwned && !isLoading && styles.skinCardLocked,
      ]}
      onPress={handlePress}
      disabled={isLoading}
    >
      <View style={styles.skinPreview}>
        <Image
          source={skin.frames[0]}
          style={styles.skinImage}
          contentFit="contain"
        />
        {!isOwned && !isLoading ? (
          <View style={styles.lockedOverlay}>
            <Feather name="lock" size={20} color={GameColors.gold} />
          </View>
        ) : null}
        {isLoading ? (
          <View style={styles.lockedOverlay}>
            <ActivityIndicator size="small" color={GameColors.gold} />
          </View>
        ) : null}
        {isSelected && isOwned ? (
          <View style={styles.selectedBadge}>
            <Feather name="check" size={12} color="#000" />
          </View>
        ) : null}
      </View>
      <ThemedText style={styles.skinName} numberOfLines={1}>{skin.name}</ThemedText>
      {skin.isNFT ? (
        <View style={styles.nftBadge}>
          <ThemedText style={styles.nftBadgeText}>NFT</ThemedText>
        </View>
      ) : (
        <ThemedText style={styles.freeBadge}>Free</ThemedText>
      )}
    </Pressable>
  );
}

function TrailCard({
  trail,
  isSelected,
  isOwned,
  isLoading,
  onSelect,
}: {
  trail: typeof FLAPPY_TRAILS.none;
  isSelected: boolean;
  isOwned: boolean;
  isLoading: boolean;
  onSelect: () => void;
}) {
  const handlePress = () => {
    if (isLoading) return;
    if (isOwned) {
      onSelect();
    } else {
      WebBrowser.openBrowserAsync(`${process.env.EXPO_PUBLIC_MARKETPLACE_URL || "https://roachy.games"}/marketplace`);
    }
  };

  return (
    <Pressable
      style={[
        styles.skinCard,
        isSelected && styles.skinCardSelected,
        !isOwned && !isLoading && styles.skinCardLocked,
      ]}
      onPress={handlePress}
      disabled={isLoading}
    >
      <View style={styles.skinPreview}>
        {trail.asset ? (
          <Image
            source={trail.asset}
            style={styles.skinImage}
            contentFit="contain"
          />
        ) : (
          <View style={[styles.skinImage, styles.noTrailPlaceholder]}>
            <Feather name="slash" size={20} color={GameColors.textSecondary} />
          </View>
        )}
        {!isOwned && !isLoading ? (
          <View style={styles.lockedOverlay}>
            <Feather name="lock" size={20} color={GameColors.gold} />
          </View>
        ) : null}
        {isLoading ? (
          <View style={styles.lockedOverlay}>
            <ActivityIndicator size="small" color={GameColors.gold} />
          </View>
        ) : null}
        {isSelected && isOwned ? (
          <View style={styles.selectedBadge}>
            <Feather name="check" size={12} color="#000" />
          </View>
        ) : null}
      </View>
      <ThemedText style={styles.skinName} numberOfLines={1}>{trail.name}</ThemedText>
      {trail.isNFT ? (
        <View style={styles.nftBadge}>
          <ThemedText style={styles.nftBadgeText}>NFT</ThemedText>
        </View>
      ) : (
        <ThemedText style={styles.freeBadge}>Free</ThemedText>
      )}
    </Pressable>
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
  return (
    <View style={[styles.powerUpCard, { borderLeftColor: equipped ? GameColors.gold : color }]}>
      <View style={styles.powerUpIconContainer}>
        <Image 
          source={type === "shield" ? PowerUpShieldIcon : type === "double" ? PowerUpDoubleIcon : PowerUpMagnetIcon} 
          style={styles.powerUpIconImage} 
          contentFit="contain" 
        />
      </View>
      
      <View style={styles.powerUpInfo}>
        <View style={styles.powerUpHeader}>
          <ThemedText style={styles.powerUpName}>{name}</ThemedText>
          <ThemedText style={styles.powerUpCount}>{count}</ThemedText>
        </View>
        <ThemedText style={styles.powerUpDesc} numberOfLines={1}>{description}</ThemedText>
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
        ) : equipped ? (
          <Feather name="check" size={16} color={GameColors.gold} />
        ) : count === 0 ? (
          <Feather name="shopping-bag" size={16} color={GameColors.textSecondary} />
        ) : (
          <Feather name="plus" size={16} color="#000" />
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  expandHint: {
    fontSize: 11,
    color: GameColors.textSecondary,
    marginTop: 4,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: GameColors.surfaceLight,
    borderRadius: 2,
  },
  closeButton: {
    position: "absolute",
    right: Spacing.md,
    top: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GameColors.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  tabs: {
    flexDirection: "row",
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.lg + 48,
    marginBottom: Spacing.md,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: GameColors.surface,
    marginHorizontal: Spacing.xs,
    overflow: "hidden",
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
    overflow: "hidden",
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  scrollContent: {
    paddingBottom: Spacing["2xl"],
    flexGrow: 1,
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
  balanceCard: {
    backgroundColor: GameColors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  balanceCardLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: GameColors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  refreshBalanceButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: GameColors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  chyCoinIconLarge: {
    width: 28,
    height: 28,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: "700",
    color: GameColors.gold,
  },
  balanceLabel: {
    fontSize: 14,
    color: GameColors.textSecondary,
  },
  coinSymbol: {
    fontSize: 20,
    fontWeight: "800",
    color: GameColors.gold,
  },
  coinIcon: {
    fontSize: 14,
    fontWeight: "800",
    color: GameColors.gold,
  },
  coinIconSmall: {
    fontSize: 12,
    fontWeight: "800",
    color: GameColors.gold,
  },
  coinSymbolImage: {
    width: 24,
    height: 24,
  },
  coinIconImage: {
    width: 18,
    height: 18,
  },
  coinIconSmallImage: {
    width: 14,
    height: 14,
  },
  disabledCard: {
    opacity: 0.6,
    borderColor: GameColors.surfaceLight,
  },
  disabledText: {
    color: GameColors.textSecondary,
  },
  warningText: {
    fontSize: 12,
    color: "#ff8844",
  },
  errorText: {
    fontSize: 12,
    color: "#ff4444",
    marginTop: Spacing.xs,
  },
  competitionCard: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: GameColors.surfaceLight,
  },
  joinedCard: {
    borderColor: GameColors.gold,
    backgroundColor: "rgba(255, 215, 0, 0.05)",
  },
  selectedCard: {
    borderColor: GameColors.gold,
    borderWidth: 2,
    backgroundColor: "rgba(255, 215, 0, 0.08)",
  },
  selectedIcon: {
    backgroundColor: "rgba(255, 215, 0, 0.2)",
  },
  competitionHint: {
    fontSize: 12,
    color: GameColors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: -Spacing.xs,
  },
  notJoinedText: {
    fontSize: 14,
    color: GameColors.textSecondary,
    textAlign: "center",
    paddingVertical: Spacing.md,
  },
  prizeBreakdown: {
    marginTop: Spacing.md,
    backgroundColor: GameColors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  prizeBreakdownTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.text,
    marginBottom: Spacing.sm,
  },
  prizeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  prizeRankText: {
    fontSize: 13,
    color: GameColors.textSecondary,
  },
  prizeValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  prizeValueText: {
    fontSize: 13,
    fontWeight: "600",
    color: GameColors.diamond,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  highlightBox: {
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderWidth: 1,
    borderColor: GameColors.gold,
  },
  highlightValue: {
    color: GameColors.gold,
  },
  playNowButton: {
    backgroundColor: GameColors.gold,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  playNowButtonText: {
    color: "#000",
    fontWeight: "700",
    fontSize: 14,
  },
  competitionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  competitionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  competitionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 212, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  joinedIcon: {
    backgroundColor: "rgba(255, 215, 0, 0.15)",
  },
  competitionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.text,
  },
  countdownBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: GameColors.surfaceLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  countdownText: {
    fontSize: 12,
    color: GameColors.textSecondary,
  },
  competitionStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: Spacing.md,
  },
  statItem: {
    alignItems: "center",
  },
  statItemValue: {
    fontSize: 18,
    fontWeight: "700",
    color: GameColors.text,
  },
  statItemLabel: {
    fontSize: 11,
    color: GameColors.textSecondary,
    marginTop: 2,
  },
  entryFeeDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  enterButton: {
    backgroundColor: GameColors.diamond,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    backgroundColor: GameColors.surfaceLight,
  },
  enterButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
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
  userRankBelowTop10: {
    marginTop: Spacing.sm,
  },
  userRankDivider: {
    textAlign: "center",
    color: GameColors.textSecondary,
    fontSize: 14,
    marginVertical: Spacing.xs,
  },
  powerUpGrid: {
    gap: Spacing.sm,
  },
  powerUpCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.surface,
    padding: Spacing.sm,
    paddingLeft: Spacing.md,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    gap: Spacing.sm,
  },
  powerUpIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  powerUpIconImage: {
    width: 36,
    height: 36,
  },
  powerUpDoubleText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#fff",
  },
  powerUpInfo: {
    flex: 1,
  },
  powerUpHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  powerUpName: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.text,
  },
  powerUpCount: {
    fontSize: 12,
    color: GameColors.textSecondary,
    backgroundColor: GameColors.surfaceLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  powerUpDesc: {
    fontSize: 11,
    color: GameColors.textSecondary,
  },
  equipButton: {
    backgroundColor: GameColors.gold,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  equippedButton: {
    backgroundColor: GameColors.surfaceLight,
    borderWidth: 1,
    borderColor: GameColors.gold,
  },
  marketplaceButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: GameColors.surface,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  marketplaceButtonText: {
    flex: 1,
    fontSize: 13,
    color: GameColors.gold,
  },
  skinGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  skinCard: {
    flexBasis: "48%",
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    alignItems: "center",
  },
  skinCardSelected: {
    borderWidth: 2,
    borderColor: GameColors.gold,
  },
  skinCardLocked: {
    opacity: 0.7,
  },
  skinPreview: {
    width: 64,
    height: 64,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xs,
    position: "relative",
  },
  skinImage: {
    width: 56,
    height: 56,
  },
  noTrailPlaceholder: {
    backgroundColor: GameColors.surface,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  lockedOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: GameColors.gold,
    justifyContent: "center",
    alignItems: "center",
  },
  skinName: {
    fontSize: 12,
    fontWeight: "600",
    color: GameColors.text,
    textAlign: "center",
    marginBottom: 4,
  },
  nftBadge: {
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GameColors.gold,
  },
  nftBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: GameColors.gold,
  },
  freeBadge: {
    fontSize: 10,
    color: GameColors.textSecondary,
  },
  joinedButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  joinedBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: GameColors.gold,
  },
  playNowButtonWide: {
    flex: 2,
    backgroundColor: GameColors.gold,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  joinedBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: GameColors.gold,
  },
  userRankRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: GameColors.gold,
    borderStyle: "dashed",
  },
  userRankLabel: {
    fontSize: 13,
    color: GameColors.gold,
    fontWeight: "600",
  },
  competitionLeaderboardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  webappCompetitionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: GameColors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  webappCompetitionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  webappCompetitionTitleText: {
    fontSize: 18,
    fontWeight: "700",
    color: GameColors.gold,
    flex: 1,
  },
  webappLiveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 200, 83, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  webappLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00C853",
  },
  webappLiveText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#00C853",
  },
  playCompetitionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: GameColors.gold,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  playCompetitionButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  leaderboardList: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  webappLeaderboardRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: GameColors.surfaceLight,
  },
  webappRankGold: {
    backgroundColor: "rgba(255, 215, 0, 0.3)",
  },
  webappRankSilver: {
    backgroundColor: "rgba(192, 192, 192, 0.3)",
  },
  webappRankBronze: {
    backgroundColor: "rgba(205, 127, 50, 0.3)",
  },
  webappPlayerInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  webappPlayerName: {
    fontSize: 14,
    fontWeight: "500",
    color: GameColors.text,
  },
  webappScoreText: {
    fontSize: 14,
    fontWeight: "700",
    color: GameColors.gold,
  },
  webappEmptySubtext: {
    fontSize: 12,
    color: "#666",
  },
  emptyLeaderboard: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
  },
  noBossChallenges: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.xs,
  },
  noBossChallengesText: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.textSecondary,
    marginTop: Spacing.sm,
  },
  noBossChallengesSubtext: {
    fontSize: 12,
    color: "#666",
  },
  bossChallengeCard: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  bossChallengeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  bossChallengeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  bossChallengeInfo: {
    flex: 1,
    gap: 2,
  },
  bossChallengeTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.text,
  },
  bossChallengeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
  },
  bossChallengeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#22c55e",
  },
  bossChallengeTimer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: GameColors.surfaceLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  bossChallengeTimerText: {
    fontSize: 11,
    fontWeight: "600",
    color: GameColors.textSecondary,
  },
  bossChallengeStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: GameColors.surfaceLight,
  },
  bossChallengeStatItem: {
    alignItems: "center",
    gap: 2,
  },
  bossChallengeStatValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bossChallengeStatValue: {
    fontSize: 16,
    fontWeight: "700",
    color: GameColors.gold,
  },
  bossChallengeStatLabel: {
    fontSize: 11,
    color: GameColors.textSecondary,
  },
  coinIconTiny: {
    width: 14,
    height: 14,
  },
  bossChallengePlayButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    backgroundColor: GameColors.gold,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  bossActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  bossPlayButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    backgroundColor: GameColors.gold,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  enteringButton: {
    opacity: 0.7,
  },
  bossChallengePlayButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: GameColors.background,
  },
});
