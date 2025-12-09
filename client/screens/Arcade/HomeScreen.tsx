import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Alert, Pressable, ActivityIndicator } from "react-native";
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
  ActivityHistory,
  EarningsTracker,
  AchievementBadges,
  Leaderboard,
  OnboardingFlow,
  TransactionHistory,
  NFTGallery,
  WebCTABanner,
  EventsCalendar,
  FriendActivity,
} from "@/components/arcade";
import { GAMES_CATALOG } from "@/constants/gamesCatalog";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { useWallet, WALLET_PROVIDERS } from "@/context/WalletContext";

const ONBOARDING_KEY = "@roachy_games_onboarding_complete";

export function ArcadeHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [activeTab, setActiveTab] = useState("Home");
  const [searchQuery, setSearchQuery] = useState("");
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [showWebBanner, setShowWebBanner] = useState(true);
  const { wallet, disconnectWallet } = useWallet();

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
    const provider = WALLET_PROVIDERS.find(p => p.id === wallet.provider);
    return provider?.name || '';
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
          colors={[GameColors.background, "#1A0F08", "#2D1810", "#1A0F08", GameColors.background]}
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
        colors={[GameColors.background, "#1A0F08", "#2D1810", "#1A0F08", GameColors.background]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
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
                  rchBalance={wallet.connected ? 1250 : 0}
                  solBalance={wallet.connected ? 2.45 : 0}
                  rchUsdValue={wallet.connected ? 125.00 : 0}
                  solUsdValue={wallet.connected ? 245.00 : 0}
                  isConnected={wallet.connected}
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
                <View style={styles.sectionSpacer} />
                <EventsCalendar />
                <View style={styles.sectionSpacer} />
                <FriendActivity isConnected={wallet.connected} />
                <View style={styles.moreSection}>
                  <ThemedText style={styles.moreText}>More games coming soon</ThemedText>
                </View>
                <SolanaTrustBadge variant="minimal" />
              </>
            )}
          </>
        )}

        {activeTab === "Rewards" && (
          <View style={styles.tabContent}>
            <View style={styles.rewardsBanner}>
              <Feather name="award" size={48} color={GameColors.gold} />
              <ThemedText style={styles.rewardsTitle}>Rewards Center</ThemedText>
              <ThemedText style={styles.rewardsSubtitle}>
                Earn rewards by playing games and completing achievements
              </ThemedText>
            </View>

            <View style={styles.rewardsSection}>
              <ThemedText style={styles.sectionTitle}>Daily Rewards</ThemedText>
              <View style={styles.dailyRewardsGrid}>
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <View
                    key={day}
                    style={[
                      styles.dailyRewardCard,
                      day === 1 && styles.dailyRewardActive,
                    ]}
                  >
                    <ThemedText style={styles.dayText}>Day {day}</ThemedText>
                    <Feather
                      name={day <= 1 ? "check-circle" : "gift"}
                      size={20}
                      color={day <= 1 ? GameColors.success : GameColors.textSecondary}
                    />
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.rewardsSection}>
              <AchievementBadges />
            </View>

            <View style={styles.rewardsSection}>
              <Leaderboard />
            </View>

            <View style={styles.rewardsSection}>
              <ActivityHistory />
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

            <View style={styles.achievementsSection}>
              <AchievementBadges />
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
  dailyRewardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  dailyRewardCard: {
    width: 70,
    paddingVertical: Spacing.md,
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    gap: Spacing.xs,
  },
  dailyRewardActive: {
    borderWidth: 2,
    borderColor: GameColors.gold,
  },
  dayText: {
    fontSize: 11,
    color: GameColors.textSecondary,
    fontWeight: "600",
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
});
