import React, { useState, useCallback, useEffect } from "react";
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
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { ThemedText } from "@/components/ThemedText";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";

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
  onPlayRanked: (period: 'daily' | 'weekly') => void;
  onPlayFree: () => void;
  onEquipPowerUp: (type: "shield" | "double" | "magnet") => void;
  equippedPowerUps: { shield: boolean; double: boolean; magnet: boolean };
}

const COLLAPSED_HEIGHT = SCREEN_HEIGHT * 0.5;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.85;
const SNAP_THRESHOLD = 50;

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

  const { data: leaderboardData, isLoading: leaderboardLoading } = useQuery<{ success: boolean; leaderboard: LeaderboardEntry[] }>({
    queryKey: ["/api/flappy/leaderboard"],
    enabled: visible && activeTab === "leaderboards",
  });

  const { data: inventoryData, isLoading: inventoryLoading } = useQuery<{ success: boolean; inventory: PowerUpInventory }>({
    queryKey: ["/api/flappy/inventory", userId],
    enabled: visible && activeTab === "loadout" && !!userId,
  });

  const { data: rankedStatus } = useQuery<RankedStatusResponse>({
    queryKey: [`/api/flappy/ranked/status?userId=${userId || ''}`],
    enabled: visible && activeTab === "leaderboards",
  });


  const { data: diamondData } = useQuery<{ success: boolean; diamondBalance: number }>({
    queryKey: ["/api/user", userId, "diamonds"],
    enabled: visible && !!userId,
  });

  const enterRankedMutation = useMutation({
    mutationFn: async (period: 'daily' | 'weekly') => {
      return apiRequest("POST", "/api/flappy/ranked/enter", { userId, period });
    },
    onSuccess: (data: any, period: 'daily' | 'weekly') => {
      queryClient.invalidateQueries({ queryKey: ["/api/flappy/ranked/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user", userId, "diamonds"] });
      onPlayRanked(period);
      onClose();
    },
    onError: (error: any) => {
      console.log("Ranked entry failed:", error.message || "Not enough Chy Coins");
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
              <LeaderboardsTab
                leaderboard={leaderboardData?.leaderboard || []}
                isLoading={leaderboardLoading}
                rankedStatus={rankedStatus}
                userId={userId}
                diamondBalance={diamondData?.diamondBalance ?? 0}
                onPlayFree={() => {
                  onPlayFree();
                  onClose();
                }}
                onPlayRanked={(period: 'daily' | 'weekly') => enterRankedMutation.mutate(period)}
                isEntering={enterRankedMutation.isPending}
                entryError={enterRankedMutation.error?.message}
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
      />
      <ThemedText
        style={[styles.tabLabel, active && styles.tabLabelActive]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Ended";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m`;
}

function CompetitionCard({
  title,
  icon,
  entryFee,
  participants,
  prizePool,
  endsIn,
  hasJoined,
  canEnter,
  diamondBalance,
  userId,
  isEntering,
  isSelected,
  onEnter,
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
  diamondBalance: number;
  userId: string | null;
  isEntering: boolean;
  isSelected: boolean;
  onEnter: () => void;
  onSelect: () => void;
}) {
  const hasEnoughDiamonds = diamondBalance >= entryFee;
  
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
            <Feather name={icon} size={18} color={isSelected ? GameColors.gold : (hasJoined ? GameColors.gold : GameColors.diamond)} />
          </View>
          <ThemedText style={styles.competitionTitle}>{title}</ThemedText>
          {isSelected ? (
            <Feather name="chevron-down" size={16} color={GameColors.gold} style={{ marginLeft: 4 }} />
          ) : null}
        </View>
        <View style={styles.countdownBadge}>
          <Feather name="clock" size={12} color={GameColors.textSecondary} />
          <ThemedText style={styles.countdownText}>{formatCountdown(endsIn)}</ThemedText>
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
        <Pressable 
          style={styles.playNowButton} 
          onPress={(e) => { e.stopPropagation(); onEnter(); }}
        >
          <Feather name="play" size={16} color="#000" />
          <ThemedText style={styles.playNowButtonText}>Play Now</ThemedText>
        </Pressable>
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
          ) : !hasEnoughDiamonds ? (
            <ThemedText style={[styles.enterButtonText, { color: GameColors.textSecondary }]}>
              Need {entryFee - diamondBalance} more
            </ThemedText>
          ) : (
            <ThemedText style={styles.enterButtonText}>Enter Competition</ThemedText>
          )}
        </Pressable>
      )}
    </Pressable>
  );
}

function LeaderboardsTab({
  leaderboard,
  isLoading,
  rankedStatus,
  userId,
  diamondBalance,
  onPlayFree,
  onPlayRanked,
  isEntering,
  entryError,
}: {
  leaderboard: any[];
  isLoading: boolean;
  rankedStatus: RankedStatusResponse | undefined;
  userId: string | null;
  diamondBalance: number;
  onPlayFree: () => void;
  onPlayRanked: (period: 'daily' | 'weekly') => void;
  isEntering: boolean;
  entryError?: string;
}) {
  const [selectedCompetition, setSelectedCompetition] = useState<'daily' | 'weekly' | null>(null);
  
  const daily = rankedStatus?.daily;
  const weekly = rankedStatus?.weekly;
  
  const canEnterDaily = userId && diamondBalance >= (daily?.entryFee || 1) && !isEntering && !daily?.hasJoined;
  const canEnterWeekly = userId && diamondBalance >= (weekly?.entryFee || 3) && !isEntering && !weekly?.hasJoined;

  const selectedInfo = selectedCompetition === 'daily' ? daily : selectedCompetition === 'weekly' ? weekly : null;
  
  const calculatePrize = (rank: number, prizePool: number, participants: number): number => {
    if (rank === 0 || participants === 0) return 0;
    if (rank === 1) return Math.floor(prizePool * 0.5);
    if (rank === 2) return Math.floor(prizePool * 0.3);
    if (rank === 3) return Math.floor(prizePool * 0.15);
    return 0;
  };

  return (
    <ScrollView 
      style={styles.tabContent} 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {userId ? (
        <View style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <Image source={ChyCoinIcon} style={styles.coinSymbolImage} contentFit="contain" />
            <ThemedText style={styles.balanceValue}>{diamondBalance}</ThemedText>
            <ThemedText style={styles.balanceLabel}>Chy Coins</ThemedText>
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
        
        <CompetitionCard
          title="Daily Challenge"
          icon="sun"
          entryFee={daily?.entryFee || 1}
          participants={daily?.participants || 0}
          prizePool={daily?.prizePool || 0}
          endsIn={daily?.endsIn || 0}
          hasJoined={daily?.hasJoined || false}
          canEnter={!!canEnterDaily}
          diamondBalance={diamondBalance}
          userId={userId}
          isEntering={isEntering}
          isSelected={selectedCompetition === 'daily'}
          onEnter={() => onPlayRanked('daily')}
          onSelect={() => setSelectedCompetition(selectedCompetition === 'daily' ? null : 'daily')}
        />
        
        <CompetitionCard
          title="Weekly Championship"
          icon="calendar"
          entryFee={weekly?.entryFee || 3}
          participants={weekly?.participants || 0}
          prizePool={weekly?.prizePool || 0}
          endsIn={weekly?.endsIn || 0}
          hasJoined={weekly?.hasJoined || false}
          canEnter={!!canEnterWeekly}
          diamondBalance={diamondBalance}
          userId={userId}
          isEntering={isEntering}
          isSelected={selectedCompetition === 'weekly'}
          onEnter={() => onPlayRanked('weekly')}
          onSelect={() => setSelectedCompetition(selectedCompetition === 'weekly' ? null : 'weekly')}
        />
        
        {entryError ? (
          <ThemedText style={styles.errorText}>{entryError}</ThemedText>
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
              highlight={selectedInfo.userRank > 0 && selectedInfo.userRank <= 3}
            />
          </View>
          <View style={styles.prizeBreakdown}>
            <ThemedText style={styles.prizeBreakdownTitle}>Prize Distribution</ThemedText>
            <View style={styles.prizeRow}>
              <ThemedText style={styles.prizeRankText}>1st Place</ThemedText>
              <View style={styles.prizeValueRow}>
                <Image source={ChyCoinIcon} style={styles.coinIconSmallImage} contentFit="contain" />
                <ThemedText style={styles.prizeValueText}>{Math.floor((selectedInfo.prizePool || 0) * 0.5)}</ThemedText>
              </View>
            </View>
            <View style={styles.prizeRow}>
              <ThemedText style={styles.prizeRankText}>2nd Place</ThemedText>
              <View style={styles.prizeValueRow}>
                <Image source={ChyCoinIcon} style={styles.coinIconSmallImage} contentFit="contain" />
                <ThemedText style={styles.prizeValueText}>{Math.floor((selectedInfo.prizePool || 0) * 0.3)}</ThemedText>
              </View>
            </View>
            <View style={styles.prizeRow}>
              <ThemedText style={styles.prizeRankText}>3rd Place</ThemedText>
              <View style={styles.prizeValueRow}>
                <Image source={ChyCoinIcon} style={styles.coinIconSmallImage} contentFit="contain" />
                <ThemedText style={styles.prizeValueText}>{Math.floor((selectedInfo.prizePool || 0) * 0.15)}</ThemedText>
              </View>
            </View>
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
    <ScrollView 
      style={styles.tabContent} 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <ThemedText style={styles.sectionTitle}>Equip for Next Game</ThemedText>

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
  joinedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  joinedText: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.gold,
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
});
