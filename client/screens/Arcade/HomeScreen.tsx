import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Alert, Pressable, ActivityIndicator, Image, FlatList } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { WalletSelectModal } from "@/components/WalletSelectModal";
import { Button } from "@/components/Button";
import {
  ArcadeHeader,
  FeaturedGameHero,
  GameListItem,
  ArcadeTabBar,
  TokenBalanceCard,
  NetworkStatusBadge,
  SolanaTrustBadge,
  EarningsTracker,
  OnboardingFlow,
  TransactionHistory,
  NFTGallery,
  WebCTABanner,
} from "@/components/arcade";
import { GAMES_CATALOG } from "@/constants/gamesCatalog";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { useWallet } from "../../context/WalletContext";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { useArcadeInventory } from "@/context/ArcadeInventoryContext";
import type { ArcadeInventoryItem, InventoryFilter, InventoryItemType, ItemTypeMetadata } from "@/types/inventory";
import { ITEM_TYPE_REGISTRY, getItemTypeMetadata } from "@/types/inventory";

const ONBOARDING_KEY = "@roachy_games_onboarding_complete";

/**
 * Generic Inventory Item Section
 * Renders items from ANY game in a consistent, game-agnostic way
 */
interface InventoryItemSectionProps {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  items: ArcadeInventoryItem[];
  getGameInfo: (gameId: string) => { id: string; name: string; icon: string; color: string } | null;
  onItemPress: (item: ArcadeInventoryItem) => void;
  emptyMessage?: string;
  emptyHint?: string;
  onPlayPress?: () => void;
}

function InventoryItemSection({
  title,
  icon,
  items,
  getGameInfo,
  onItemPress,
  emptyMessage,
  emptyHint,
  onPlayPress,
}: InventoryItemSectionProps) {
  const groupedByGame = items.reduce((acc, item) => {
    if (!acc[item.gameId]) acc[item.gameId] = [];
    acc[item.gameId].push(item);
    return acc;
  }, {} as Record<string, ArcadeInventoryItem[]>);

  const gameIds = Object.keys(groupedByGame);

  return (
    <View style={sectionStyles.container}>
      <View style={sectionStyles.header}>
        <Feather name={icon} size={18} color={GameColors.gold} />
        <ThemedText style={sectionStyles.title}>{title}</ThemedText>
        <ThemedText style={sectionStyles.count}>({items.length})</ThemedText>
      </View>
      
      {items.length > 0 ? (
        <>
          {gameIds.map((gameId) => {
            const gameInfo = getGameInfo(gameId);
            const gameItems = groupedByGame[gameId];
            
            return (
              <View key={gameId} style={sectionStyles.gameGroup}>
                <View style={sectionStyles.gameBadge}>
                  <Feather 
                    name={gameInfo?.icon as keyof typeof Feather.glyphMap || "grid"} 
                    size={12} 
                    color={GameColors.primary} 
                  />
                  <ThemedText style={sectionStyles.gameBadgeText}>
                    {gameInfo?.name || gameId}
                  </ThemedText>
                </View>
                
                <View style={sectionStyles.itemGrid}>
                  {gameItems.map((item) => (
                    <Pressable
                      key={item.id}
                      style={sectionStyles.itemCard}
                      onPress={() => onItemPress(item)}
                    >
                      <View 
                        style={[
                          sectionStyles.itemGlow, 
                          { backgroundColor: item.media.color || GameColors.gold }
                        ]} 
                      />
                      
                      {item.media.image ? (
                        <Image 
                          source={item.media.image} 
                          style={sectionStyles.itemImage} 
                        />
                      ) : (
                        <View style={sectionStyles.itemIconContainer}>
                          <Feather 
                            name={(item.media.icon || (item.itemType === "egg" ? "package" : "hexagon")) as keyof typeof Feather.glyphMap} 
                            size={28} 
                            color={item.media.color || GameColors.gold} 
                          />
                        </View>
                      )}
                      
                      {item.blockchain.isMintable ? (
                        <View style={sectionStyles.nftBadge}>
                          <Feather name="star" size={10} color="#FFD700" />
                        </View>
                      ) : null}
                      
                      {item.status === "incubating" && item.progress ? (
                        <View style={sectionStyles.progressBadge}>
                          <Feather name="clock" size={10} color={GameColors.primary} />
                        </View>
                      ) : null}
                      
                      <View 
                        style={[
                          sectionStyles.rarityDot, 
                          { backgroundColor: item.media.color || GameColors.textSecondary }
                        ]} 
                      />
                      <ThemedText style={sectionStyles.itemName} numberOfLines={1}>
                        {item.displayName}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          })}
        </>
      ) : (
        <View style={sectionStyles.emptyState}>
          <Feather name="inbox" size={40} color={GameColors.textTertiary} />
          <ThemedText style={sectionStyles.emptyText}>{emptyMessage || "No items"}</ThemedText>
          {emptyHint ? (
            <ThemedText style={sectionStyles.emptyHint}>{emptyHint}</ThemedText>
          ) : null}
          {onPlayPress ? (
            <Button onPress={onPlayPress} style={sectionStyles.playButton}>
              Play Now
            </Button>
          ) : null}
        </View>
      )}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  count: {
    fontSize: 14,
    color: GameColors.textSecondary,
  },
  gameGroup: {
    marginBottom: Spacing.md,
  },
  gameBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: GameColors.primary + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    alignSelf: "flex-start",
    marginBottom: Spacing.sm,
  },
  gameBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: GameColors.primary,
  },
  itemGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  itemCard: {
    width: "30%",
    aspectRatio: 0.9,
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xs,
    position: "relative",
    overflow: "hidden",
  },
  itemGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: BorderRadius.md,
    borderTopRightRadius: BorderRadius.md,
  },
  itemImage: {
    width: 48,
    height: 48,
    marginBottom: Spacing.xs,
  },
  itemIconContainer: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  nftBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: GameColors.gold + "30",
    borderRadius: 10,
    padding: 3,
  },
  progressBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: GameColors.primary + "30",
    borderRadius: 10,
    padding: 3,
  },
  rarityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: Spacing.xs,
  },
  itemName: {
    fontSize: 10,
    fontWeight: "600",
    color: GameColors.textPrimary,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
  },
  emptyText: {
    fontSize: 14,
    color: GameColors.textSecondary,
    marginTop: Spacing.sm,
  },
  emptyHint: {
    fontSize: 12,
    color: GameColors.textTertiary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  playButton: {
    paddingHorizontal: Spacing.xl,
  },
});

export function ArcadeHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [activeTab, setActiveTab] = useState("Home");
  const [searchQuery, setSearchQuery] = useState("");
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [showWebBanner, setShowWebBanner] = useState(true);
  const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter>("all");
  const { wallet, disconnectWallet } = useWallet();
  const { roachy, diamonds, isLoading: balancesLoading } = useTokenBalances(
    wallet.address,
    wallet.connected
  );
  const {
    items: inventoryItems,
    isLoading: isLoadingInventory,
    getFilteredItems,
    getGameInfo,
    getCountByType,
    getMintableCount,
    getActiveItemTypes,
    getTypeMetadata,
  } = useArcadeInventory();

  // Get unique item types that exist in inventory for dynamic filters
  const activeItemTypes = getActiveItemTypes();

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
      setShowOnboarding(completed !== "true");
    } catch {
      setShowOnboarding(false);
    }
  };

  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
      setShowOnboarding(false);
    } catch {
      setShowOnboarding(false);
    }
  };

  const featuredGame = GAMES_CATALOG[0];
  const gamesList = GAMES_CATALOG;

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const getProviderName = () => {
    if (!wallet.provider) return '';
    return 'WalletConnect';
  };

  const handleCopyAddress = async () => {
    if (wallet.address) {
      await Clipboard.setStringAsync(wallet.address);
      setCopied(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnectWallet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    disconnectWallet();
  };

  const filteredGames = searchQuery
    ? gamesList.filter((game) =>
        game.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : gamesList;

  const handleGamePress = (routeName: string) => {
    navigation.navigate(routeName);
  };

  const handleWalletPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (wallet.connected) {
      Alert.alert(
        "Wallet Connected",
        `Connected to ${wallet.address?.substring(0, 6)}...${wallet.address?.substring(wallet.address.length - 4)}`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Disconnect", style: "destructive", onPress: disconnectWallet },
        ]
      );
    } else {
      setShowWalletModal(true);
    }
  };

  const handleNotificationPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Notifications", "Coming soon!");
  };

  if (showOnboarding === null) {
    return (
      <ThemedView style={styles.container}>
        <LinearGradient
          colors={[GameColors.background, "#150C06"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GameColors.gold} />
        </View>
      </ThemedView>
    );
  }

  if (showOnboarding) {
    return (
      <OnboardingFlow
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingComplete}
      />
    );
  }

  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={[GameColors.background, "#150C06"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <ArcadeHeader
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onWalletPress={handleWalletPress}
        onNotificationPress={handleNotificationPress}
        walletConnected={wallet.connected}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {(activeTab === "Home" || activeTab === "Games") && (
          <>
            {activeTab === "Home" && (
              <>
                <TokenBalanceCard
                  roachyBalance={roachy}
                  diamondsBalance={diamonds}
                  roachyUsdValue={0}
                  diamondsUsdValue={0}
                  isConnected={wallet.connected}
                  isLoading={balancesLoading}
                  onPress={() => setShowWalletModal(true)}
                />
                <View style={styles.livePlayersRow}>
                  <View style={styles.livePlayersBadge}>
                    <View style={styles.livePlayersDot} />
                    <ThemedText style={styles.livePlayersText}>247 players online</ThemedText>
                  </View>
                  <NetworkStatusBadge isConnected={true} networkName="Solana" />
                </View>
                <FeaturedGameHero
                  game={featuredGame}
                  onPress={() => handleGamePress(featuredGame.routeName)}
                  viewerCount="184 hunting"
                />
                <View style={styles.sectionSpacer} />
                <EarningsTracker isConnected={wallet.connected} />
              </>
            )}

            {activeTab === "Games" && (
              <View style={styles.sectionHeader}>
                <ThemedText style={styles.sectionTitle}>All Games</ThemedText>
                <ThemedText style={styles.sectionCount}>{filteredGames.length} games</ThemedText>
              </View>
            )}

            <View style={styles.gamesList}>
              {filteredGames.map((game, index) => (
                <GameListItem
                  key={game.id}
                  game={game}
                  onPress={() => handleGamePress(game.routeName)}
                  playTime={index === 0 ? "20:30" : index === 1 ? "00:15" : index === 2 ? "22:00" : "18:00"}
                />
              ))}
            </View>

            {filteredGames.length === 0 && (
              <View style={styles.emptyState}>
                <ThemedText style={styles.emptyText}>
                  No games found for &quot;{searchQuery}&quot;
                </ThemedText>
              </View>
            )}

            {activeTab === "Home" && (
              <>
                <View style={styles.sectionSpacer} />
                {showWebBanner ? <WebCTABanner onDismiss={() => setShowWebBanner(false)} /> : null}
                <View style={styles.moreSection}>
                  <ThemedText style={styles.moreText}>More games coming soon</ThemedText>
                </View>
                <SolanaTrustBadge variant="minimal" />
              </>
            )}
          </>
        )}

        {activeTab === "Inventory" && (
          <View style={styles.tabContent}>
            <View style={styles.inventoryBanner}>
              <Feather name="briefcase" size={48} color={GameColors.gold} />
              <ThemedText style={styles.inventoryTitle}>Your Collection</ThemedText>
              <ThemedText style={styles.inventorySubtitle}>
                All your items across all games in one place
              </ThemedText>
            </View>

            {/* Dynamic Filter Chips - based on what items exist */}
            <View style={styles.inventoryFilters}>
              <Pressable
                style={[
                  styles.filterChip,
                  inventoryFilter === "all" && styles.filterChipActive,
                ]}
                onPress={() => setInventoryFilter("all")}
              >
                <Feather
                  name="grid"
                  size={14}
                  color={inventoryFilter === "all" ? GameColors.gold : GameColors.textSecondary}
                />
                <ThemedText
                  style={[
                    styles.filterChipText,
                    inventoryFilter === "all" && styles.filterChipTextActive,
                  ]}
                >
                  All ({inventoryItems.length})
                </ThemedText>
              </Pressable>
              
              {/* Dynamically render filter chips for each item type present */}
              {activeItemTypes.map((typeMeta) => (
                <Pressable
                  key={typeMeta.type}
                  style={[
                    styles.filterChip,
                    inventoryFilter === typeMeta.type && styles.filterChipActive,
                  ]}
                  onPress={() => setInventoryFilter(typeMeta.type)}
                >
                  <Feather
                    name={typeMeta.icon as keyof typeof Feather.glyphMap}
                    size={14}
                    color={inventoryFilter === typeMeta.type ? GameColors.gold : GameColors.textSecondary}
                  />
                  <ThemedText
                    style={[
                      styles.filterChipText,
                      inventoryFilter === typeMeta.type && styles.filterChipTextActive,
                    ]}
                  >
                    {typeMeta.pluralLabel}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            {/* Dynamic Stats - shows counts for whatever types exist */}
            <View style={styles.inventoryStats}>
              <View style={styles.statBox}>
                <ThemedText style={styles.statNumber}>{inventoryItems.length}</ThemedText>
                <ThemedText style={styles.statLabel}>Total Items</ThemedText>
              </View>
              {activeItemTypes.slice(0, 2).map((typeMeta) => (
                <View key={typeMeta.type} style={styles.statBox}>
                  <ThemedText style={styles.statNumber}>{getCountByType(typeMeta.type)}</ThemedText>
                  <ThemedText style={styles.statLabel}>{typeMeta.pluralLabel}</ThemedText>
                </View>
              ))}
              {getMintableCount() > 0 ? (
                <View style={styles.statBox}>
                  <ThemedText style={styles.statNumber}>{getMintableCount()}</ThemedText>
                  <ThemedText style={styles.statLabel}>NFT-Ready</ThemedText>
                </View>
              ) : null}
            </View>

            {isLoadingInventory ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={GameColors.gold} />
                <ThemedText style={styles.loadingText}>Loading collection...</ThemedText>
              </View>
            ) : inventoryItems.length === 0 ? (
              /* Empty state when no items at all */
              <View style={styles.emptyInventory}>
                <Feather name="inbox" size={48} color={GameColors.textTertiary} />
                <ThemedText style={styles.emptyText}>No items yet</ThemedText>
                <ThemedText style={styles.emptyHint}>
                  Play games to collect creatures, eggs, badges, and more
                </ThemedText>
                <Button
                  onPress={() => handleGamePress("HuntTab")}
                  style={styles.playButton}
                >
                  Start Playing
                </Button>
              </View>
            ) : (
              /* Dynamic sections - render one for each active item type */
              <>
                {activeItemTypes
                  .filter((typeMeta) => 
                    inventoryFilter === "all" || inventoryFilter === typeMeta.type
                  )
                  .map((typeMeta) => {
                    const items = getFilteredItems(typeMeta.type);
                    if (items.length === 0 && inventoryFilter !== "all") return null;
                    
                    return (
                      <InventoryItemSection
                        key={typeMeta.type}
                        title={typeMeta.pluralLabel}
                        icon={typeMeta.icon as keyof typeof Feather.glyphMap}
                        items={items}
                        getGameInfo={getGameInfo}
                        onItemPress={(item) => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          if (item.actions?.[0]?.route) {
                            const route = item.actions[0].route;
                            const routeMap: Record<string, string> = {
                              "roachy-hunt": "HuntTab",
                              "roachy-battles": "BattlesTab",
                              "flappy-roach": "FlappyTab",
                              "roachy-mate": "MateTab",
                            };
                            navigation.navigate(routeMap[route.gameId] || route.gameId, {
                              screen: route.screen,
                              params: route.params,
                            });
                          }
                        }}
                        emptyMessage={typeMeta.emptyMessage}
                        emptyHint={typeMeta.emptyHint}
                        onPlayPress={() => handleGamePress("HuntTab")}
                      />
                    );
                  })}

                {/* NFT minting section - always show if there are mintable items */}
                {getMintableCount() > 0 && inventoryFilter === "all" ? (
                  <View style={styles.inventorySection}>
                    <View style={styles.sectionHeader}>
                      <Feather name="hexagon" size={18} color={GameColors.gold} />
                      <ThemedText style={styles.sectionTitle}>Ready to Mint</ThemedText>
                    </View>
                    <View style={styles.nftInfo}>
                      <ThemedText style={styles.nftInfoText}>
                        {getMintableCount()} items ready to mint as NFTs
                      </ThemedText>
                      <Button
                        onPress={() => wallet.connected ? Alert.alert("Coming Soon", "NFT minting coming soon!") : setShowWalletModal(true)}
                        style={styles.mintButton}
                      >
                        {wallet.connected ? "Mint NFTs" : "Connect Wallet"}
                      </Button>
                    </View>
                  </View>
                ) : null}
              </>
            )}

            <SolanaTrustBadge variant="minimal" />
          </View>
        )}

        {activeTab === "Rewards" && (
          <View style={styles.tabContent}>
            <View style={styles.rewardsBanner}>
              <Feather name="award" size={48} color={GameColors.gold} />
              <ThemedText style={styles.rewardsTitle}>Rewards Center</ThemedText>
              <ThemedText style={styles.rewardsSubtitle}>
                Earn rewards by playing games across the arcade
              </ThemedText>
            </View>

            <View style={styles.dailyBonusContainer}>
              <View style={styles.dailyBonusHeader}>
                <View style={styles.dailyBonusHeaderLeft}>
                  <Feather name="calendar" size={20} color={GameColors.gold} />
                  <ThemedText style={styles.dailyBonusTitle}>Daily Login Bonus</ThemedText>
                </View>
                <View style={styles.streakBadge}>
                  <Feather name="zap" size={14} color={GameColors.gold} />
                  <ThemedText style={styles.streakText}>1 Day Streak</ThemedText>
                </View>
              </View>
              
              <View style={styles.dailyRewardsGrid}>
                {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                  const isCompleted = day < 1;
                  const isCurrent = day === 1;
                  const isLocked = day > 1;
                  const isDay7 = day === 7;
                  
                  return (
                    <View
                      key={day}
                      style={[
                        styles.dailyRewardCard,
                        isCurrent && styles.dailyRewardCurrent,
                        isCompleted && styles.dailyRewardCompleted,
                        isLocked && styles.dailyRewardLocked,
                        isDay7 && styles.dailyRewardGrand,
                      ]}
                    >
                      <ThemedText style={[
                        styles.dayLabel,
                        isCurrent && styles.dayLabelCurrent,
                        isCompleted && styles.dayLabelCompleted,
                      ]}>
                        {isDay7 ? "Day 7" : `Day ${day}`}
                      </ThemedText>
                      
                      <View style={[
                        styles.rewardIconContainer,
                        isCurrent && styles.rewardIconCurrent,
                        isDay7 && styles.rewardIconGrand,
                      ]}>
                        {isCompleted ? (
                          <Feather name="check" size={24} color={GameColors.success} />
                        ) : isDay7 ? (
                          <Feather name="star" size={28} color={GameColors.gold} />
                        ) : (
                          <Feather 
                            name="gift" 
                            size={24} 
                            color={isCurrent ? GameColors.gold : GameColors.textSecondary} 
                          />
                        )}
                      </View>
                      
                      <ThemedText style={[
                        styles.rewardAmount,
                        isCurrent && styles.rewardAmountCurrent,
                        isDay7 && styles.rewardAmountGrand,
                      ]}>
                        {isDay7 ? "50" : `${day * 5}`}
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
              
              <View style={styles.dailyBonusFooter}>
                <Feather name="info" size={14} color={GameColors.textSecondary} />
                <ThemedText style={styles.dailyBonusHint}>
                  Login daily to claim rewards. Day 7 bonus is 10x!
                </ThemedText>
              </View>
            </View>

            <View style={styles.rewardsSection}>
              <EarningsTracker isConnected={wallet.connected} />
            </View>

            <View style={styles.rewardsSection}>
              <ThemedText style={styles.sectionTitle}>Your Games</ThemedText>
              <ThemedText style={styles.rewardsHint}>
                View leaderboards and achievements inside each game
              </ThemedText>
              <View style={styles.gameShortcuts}>
                {GAMES_CATALOG.filter(g => !g.isLocked).map((game) => (
                  <Pressable
                    key={game.id}
                    style={styles.gameShortcut}
                    onPress={() => handleGamePress(game.routeName)}
                  >
                    <View style={styles.gameShortcutIcon}>
                      <Feather name={game.iconName as any} size={24} color={GameColors.gold} />
                    </View>
                    <ThemedText style={styles.gameShortcutTitle}>{game.title}</ThemedText>
                    <Feather name="chevron-right" size={16} color={GameColors.textSecondary} />
                  </Pressable>
                ))}
              </View>
            </View>

            <SolanaTrustBadge variant="minimal" />
          </View>
        )}

        {activeTab === "Profile" && (
          <View style={styles.tabContent}>
            <View style={styles.profileHeader}>
              <View style={styles.avatar}>
                <Feather name="user" size={40} color={GameColors.textPrimary} />
              </View>
              <ThemedText style={styles.profileName}>
                {wallet.connected ? truncateAddress(wallet.address || '') : 'Guest Player'}
              </ThemedText>
              <ThemedText style={styles.profileSubtitle}>
                {wallet.connected ? getProviderName() + ' Connected' : 'Connect wallet to save progress'}
              </ThemedText>
            </View>

            <View style={styles.walletSection}>
              <ThemedText style={styles.sectionTitle}>Wallet</ThemedText>
              <View style={styles.walletCard}>
                {wallet.connected && wallet.address ? (
                  <>
                    <View style={styles.walletConnected}>
                      <View style={styles.walletStatus}>
                        <View style={styles.walletDot} />
                        <ThemedText style={styles.walletStatusText}>Connected</ThemedText>
                      </View>
                      <Pressable onPress={handleDisconnectWallet}>
                        <Feather name="log-out" size={20} color={GameColors.textSecondary} />
                      </Pressable>
                    </View>
                    <Pressable style={styles.addressContainer} onPress={handleCopyAddress}>
                      <ThemedText style={styles.addressLabel}>Solana Address</ThemedText>
                      <View style={styles.addressRow}>
                        <ThemedText style={styles.address}>{truncateAddress(wallet.address)}</ThemedText>
                        <Feather name={copied ? "check" : "copy"} size={16} color={copied ? GameColors.success : GameColors.textSecondary} />
                      </View>
                    </Pressable>
                  </>
                ) : (
                  <View style={styles.walletNotConnected}>
                    <View style={styles.walletIcon}>
                      <Feather name="credit-card" size={32} color={GameColors.textSecondary} />
                    </View>
                    <ThemedText style={styles.walletTitle}>Connect Your Wallet</ThemedText>
                    <ThemedText style={styles.walletDescription}>
                      Connect a Solana wallet to mint creatures as NFTs
                    </ThemedText>
                    <Button
                      onPress={() => setShowWalletModal(true)}
                      disabled={wallet.isConnecting}
                      style={styles.connectButton}
                    >
                      {wallet.isConnecting ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        "Connect Wallet"
                      )}
                    </Button>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.nftSection}>
              <NFTGallery
                isConnected={wallet.connected}
                onConnectWallet={() => setShowWalletModal(true)}
              />
            </View>

            <View style={styles.transactionSection}>
              <TransactionHistory />
            </View>

            <View style={styles.webLinksSection}>
              <ThemedText style={styles.sectionTitle}>Web App</ThemedText>
              <Pressable 
                style={styles.marketplaceButton}
                onPress={() => Alert.alert("Coming Soon", "Marketplace will open in browser")}
              >
                <View style={styles.marketplaceIcon}>
                  <Feather name="shopping-bag" size={24} color={GameColors.gold} />
                </View>
                <View style={styles.marketplaceInfo}>
                  <ThemedText style={styles.marketplaceTitle}>Open Marketplace</ThemedText>
                  <ThemedText style={styles.marketplaceSubtitle}>Trade Roachies and items</ThemedText>
                </View>
                <Feather name="external-link" size={20} color={GameColors.gold} />
              </Pressable>
              <View style={styles.webLinksRow}>
                <Pressable style={styles.webLinkItem}>
                  <Feather name="repeat" size={18} color={GameColors.textSecondary} />
                  <ThemedText style={styles.webLinkText}>Token Swap</ThemedText>
                </Pressable>
                <Pressable style={styles.webLinkItem}>
                  <Feather name="lock" size={18} color={GameColors.textSecondary} />
                  <ThemedText style={styles.webLinkText}>Staking</ThemedText>
                </Pressable>
              </View>
            </View>

            <View style={styles.settingsSection}>
              <ThemedText style={styles.sectionTitle}>Settings</ThemedText>
              {[
                { icon: "bell", title: "Notifications", subtitle: "Coming soon" },
                { icon: "shield", title: "Privacy", subtitle: "Coming soon" },
                { icon: "help-circle", title: "Help & Support", subtitle: "Coming soon" },
              ].map((item, index) => (
                <Pressable key={index} style={styles.settingsItem}>
                  <View style={styles.settingsIcon}>
                    <Feather name={item.icon as any} size={20} color={GameColors.textSecondary} />
                  </View>
                  <View style={styles.settingsInfo}>
                    <ThemedText style={styles.settingsTitle}>{item.title}</ThemedText>
                    <ThemedText style={styles.settingsSubtitle}>{item.subtitle}</ThemedText>
                  </View>
                  <Feather name="chevron-right" size={20} color={GameColors.textTertiary} />
                </Pressable>
              ))}
            </View>

            <SolanaTrustBadge variant="full" />
          </View>
        )}
      </ScrollView>

      <ArcadeTabBar activeTab={activeTab} onTabPress={setActiveTab} />

      <WalletSelectModal
        visible={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  gamesList: {
    marginTop: Spacing.sm,
  },
  emptyState: {
    paddingVertical: Spacing["3xl"],
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: GameColors.textSecondary,
  },
  moreSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl,
  },
  moreText: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.textTertiary,
  },
  sectionSpacer: {
    height: Spacing.lg,
  },
  achievementsSection: {
    marginBottom: Spacing.xl,
  },
  nftSection: {
    marginBottom: Spacing.xl,
  },
  transactionSection: {
    marginBottom: Spacing.xl,
  },
  livePlayersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  livePlayersBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  livePlayersDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GameColors.success,
  },
  livePlayersText: {
    fontSize: 13,
    fontWeight: "600",
    color: GameColors.success,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: GameColors.textPrimary,
    marginBottom: Spacing.md,
  },
  sectionCount: {
    fontSize: 14,
    color: GameColors.textSecondary,
  },
  tabContent: {
    paddingTop: Spacing.lg,
  },
  rewardsBanner: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    marginBottom: Spacing.xl,
  },
  rewardsTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: GameColors.gold,
    marginTop: Spacing.md,
  },
  rewardsSubtitle: {
    fontSize: 14,
    color: GameColors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  rewardsSection: {
    marginBottom: Spacing.xl,
  },
  dailyBonusContainer: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: GameColors.gold + "30",
  },
  dailyBonusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  dailyBonusHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  dailyBonusTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: GameColors.gold + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streakText: {
    fontSize: 12,
    fontWeight: "600",
    color: GameColors.gold,
  },
  dailyRewardsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.xs,
  },
  dailyRewardCard: {
    flex: 1,
    minWidth: 44,
    maxWidth: 52,
    paddingVertical: Spacing.sm,
    paddingHorizontal: 4,
    backgroundColor: GameColors.surfaceLight,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "transparent",
  },
  dailyRewardCurrent: {
    backgroundColor: GameColors.gold + "15",
    borderColor: GameColors.gold,
    borderWidth: 2,
  },
  dailyRewardCompleted: {
    backgroundColor: GameColors.success + "10",
    opacity: 0.7,
  },
  dailyRewardLocked: {
    opacity: 0.5,
  },
  dailyRewardGrand: {
    backgroundColor: GameColors.gold + "20",
    borderColor: GameColors.gold + "50",
    borderWidth: 1,
  },
  dayLabel: {
    fontSize: 10,
    color: GameColors.textSecondary,
    fontWeight: "600",
    textAlign: "center",
  },
  dayLabelCurrent: {
    color: GameColors.gold,
  },
  dayLabelCompleted: {
    color: GameColors.success,
  },
  rewardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: GameColors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  rewardIconCurrent: {
    backgroundColor: GameColors.gold + "30",
  },
  rewardIconGrand: {
    backgroundColor: GameColors.gold + "40",
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  rewardAmount: {
    fontSize: 12,
    fontWeight: "700",
    color: GameColors.textSecondary,
  },
  rewardAmountCurrent: {
    color: GameColors.gold,
  },
  rewardAmountGrand: {
    color: GameColors.gold,
    fontSize: 14,
  },
  dailyBonusFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: GameColors.surfaceLight,
  },
  dailyBonusHint: {
    fontSize: 12,
    color: GameColors.textSecondary,
    flex: 1,
  },
  achievementCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: GameColors.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  achievementComplete: {
    backgroundColor: GameColors.gold + "20",
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  achievementDesc: {
    fontSize: 12,
    color: GameColors.textSecondary,
    marginTop: 2,
  },
  progressBar: {
    height: 4,
    backgroundColor: GameColors.surfaceLight,
    borderRadius: 2,
    marginTop: Spacing.sm,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: GameColors.gold,
    borderRadius: 2,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: GameColors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: GameColors.gold,
    marginBottom: Spacing.md,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  profileSubtitle: {
    fontSize: 14,
    color: GameColors.textSecondary,
    marginTop: Spacing.xs,
  },
  walletSection: {
    marginBottom: Spacing.xl,
  },
  walletCard: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  walletConnected: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  walletStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  walletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GameColors.success,
  },
  walletStatusText: {
    color: GameColors.success,
    fontWeight: "600",
  },
  addressContainer: {
    backgroundColor: GameColors.surfaceLight,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
  },
  addressLabel: {
    fontSize: 12,
    color: GameColors.textSecondary,
    marginBottom: 4,
  },
  addressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  address: {
    fontFamily: "monospace",
    color: GameColors.textPrimary,
  },
  walletNotConnected: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  walletIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: GameColors.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  walletTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: GameColors.textPrimary,
    marginBottom: Spacing.xs,
  },
  walletDescription: {
    textAlign: "center",
    color: GameColors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  connectButton: {
    width: "100%",
  },
  settingsSection: {
    marginBottom: Spacing.xl,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GameColors.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  settingsInfo: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  settingsSubtitle: {
    fontSize: 12,
    color: GameColors.textSecondary,
    marginTop: 2,
  },
  webLinksSection: {
    marginBottom: Spacing.xl,
  },
  marketplaceButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: GameColors.gold + "40",
  },
  marketplaceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: GameColors.gold + "20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  marketplaceInfo: {
    flex: 1,
  },
  marketplaceTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: GameColors.gold,
  },
  marketplaceSubtitle: {
    fontSize: 13,
    color: GameColors.textSecondary,
    marginTop: 2,
  },
  webLinksRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  webLinkItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: GameColors.surfaceGlow,
  },
  webLinkText: {
    fontSize: 13,
    fontWeight: "600",
    color: GameColors.textSecondary,
  },
  rewardsHint: {
    fontSize: 13,
    color: GameColors.textTertiary,
    marginBottom: Spacing.md,
  },
  gameShortcuts: {
    gap: Spacing.sm,
  },
  gameShortcut: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  gameShortcutIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GameColors.gold + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  gameShortcutTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  inventoryBanner: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    marginBottom: Spacing.lg,
  },
  inventoryTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: GameColors.gold,
    marginTop: Spacing.md,
  },
  inventorySubtitle: {
    fontSize: 14,
    color: GameColors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  inventoryFilters: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: GameColors.surfaceGlow,
  },
  filterChipActive: {
    backgroundColor: GameColors.gold + "20",
    borderColor: GameColors.gold,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: GameColors.textSecondary,
  },
  filterChipTextActive: {
    color: GameColors.gold,
  },
  inventoryStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  statBox: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "700",
    color: GameColors.gold,
  },
  statLabel: {
    fontSize: 12,
    color: GameColors.textSecondary,
    marginTop: Spacing.xs,
  },
  loadingText: {
    marginTop: Spacing.md,
    color: GameColors.textSecondary,
  },
  inventorySection: {
    marginBottom: Spacing.xl,
  },
  gameBadge: {
    marginLeft: "auto",
    backgroundColor: GameColors.primary + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  gameBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: GameColors.primary,
  },
  creatureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  creatureCard: {
    width: "30%",
    aspectRatio: 0.9,
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xs,
    position: "relative",
    overflow: "hidden",
  },
  creatureGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: BorderRadius.md,
    borderTopRightRadius: BorderRadius.md,
  },
  creatureImage: {
    width: 48,
    height: 48,
    marginBottom: Spacing.xs,
  },
  nftBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: GameColors.gold + "30",
    borderRadius: 10,
    padding: 3,
  },
  rarityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: Spacing.xs,
  },
  creatureCardName: {
    fontSize: 10,
    fontWeight: "600",
    color: GameColors.textPrimary,
    textAlign: "center",
  },
  emptyInventory: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
  },
  emptyHint: {
    fontSize: 12,
    color: GameColors.textTertiary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  playButton: {
    paddingHorizontal: Spacing.xl,
  },
  eggGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  eggCard: {
    width: 80,
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    padding: Spacing.md,
  },
  eggIcon: {
    marginBottom: Spacing.xs,
  },
  eggType: {
    fontSize: 11,
    fontWeight: "600",
    color: GameColors.textPrimary,
    textTransform: "capitalize",
  },
  incubatingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: Spacing.xs,
    backgroundColor: GameColors.primary + "20",
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  incubatingText: {
    fontSize: 8,
    fontWeight: "600",
    color: GameColors.primary,
  },
  emptyInventorySmall: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.md,
  },
  emptyTextSmall: {
    fontSize: 12,
    color: GameColors.textTertiary,
  },
  nftInfo: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
  },
  nftInfoText: {
    fontSize: 14,
    color: GameColors.textSecondary,
    marginBottom: Spacing.md,
  },
  mintButton: {
    paddingHorizontal: Spacing.xl,
  },
});
