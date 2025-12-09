import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { WalletSelectModal } from "@/components/WalletSelectModal";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { useGame } from "@/context/GameContext";
import { useWallet } from "../context/WalletContext";
import { getCreatureDefinition, getRarityColor, CREATURE_IMAGES } from "@/constants/creatures";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  color?: string;
  index: number;
}

function StatCard({ icon, label, value, color = GameColors.primary, index }: StatCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify()}
      style={[styles.statCard, animatedStyle]}
    >
      <View style={[styles.statIconContainer, { backgroundColor: color + "20" }]}>
        <Feather name={icon as any} size={24} color={color} />
      </View>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
    </Animated.View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { state, addEggs } = useGame();
  const { wallet, disconnectWallet } = useWallet();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const rarestCreature = state.playerStats.rarestCatch
    ? getCreatureDefinition(state.playerStats.rarestCatch)
    : null;

  const handleConnectWallet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowWalletModal(true);
  };

  const handleDisconnectWallet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    disconnectWallet();
  };

  const handleCopyAddress = async () => {
    if (wallet.address) {
      await Clipboard.setStringAsync(wallet.address);
      setCopied(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddEggs = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addEggs(5);
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const getProviderName = () => {
    if (!wallet.provider) return '';
    return 'WalletConnect';
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.springify()} style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Feather name="user" size={40} color={GameColors.textPrimary} />
          </View>
          <View style={[styles.levelBadge, { backgroundColor: GameColors.primary }]}>
            <ThemedText style={styles.levelText}>
              {Math.floor(state.playerStats.totalCaught / 3) + 1}
            </ThemedText>
          </View>
        </View>
        <ThemedText type="h3" style={styles.username}>
          Trainer
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Crypto Creature Hunter
        </ThemedText>
      </Animated.View>

      <View style={styles.statsGrid}>
        <StatCard
          icon="target"
          label="Caught"
          value={state.playerStats.totalCaught}
          color={GameColors.primary}
          index={0}
        />
        <StatCard
          icon="hexagon"
          label="NFTs"
          value={state.wallet.nftBalance}
          color={GameColors.secondary}
          index={1}
        />
        <StatCard
          icon="disc"
          label="Eggs"
          value={state.eggCount}
          color="#FFD93D"
          index={2}
        />
      </View>

      {rarestCreature ? (
        <Animated.View
          entering={FadeInDown.delay(300).springify()}
          style={styles.section}
        >
          <ThemedText type="h4" style={styles.sectionTitle}>
            Rarest Catch
          </ThemedText>
          <Pressable style={styles.rarestCard}>
            <View
              style={[
                styles.rarestGlow,
                { backgroundColor: getRarityColor(rarestCreature.rarity) },
              ]}
            />
            <Image
              source={CREATURE_IMAGES[rarestCreature.id]}
              style={styles.rarestImage}
            />
            <View style={styles.rarestInfo}>
              <ThemedText style={styles.rarestName}>
                {rarestCreature.name}
              </ThemedText>
              <View
                style={[
                  styles.rarestRarity,
                  { backgroundColor: getRarityColor(rarestCreature.rarity) },
                ]}
              >
                <ThemedText style={styles.rarestRarityText}>
                  {rarestCreature.rarity.toUpperCase()}
                </ThemedText>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      ) : null}

      <Animated.View
        entering={FadeInDown.delay(400).springify()}
        style={styles.section}
      >
        <ThemedText type="h4" style={styles.sectionTitle}>
          Wallet
        </ThemedText>
        <View style={styles.walletCard}>
          {wallet.connected && wallet.address ? (
            <>
              <View style={styles.walletConnected}>
                <View style={styles.walletStatus}>
                  <View style={styles.walletDot} />
                  <ThemedText style={styles.walletStatusText}>
                    {getProviderName()} Connected
                  </ThemedText>
                </View>
                <Pressable onPress={handleDisconnectWallet}>
                  <Feather
                    name="log-out"
                    size={20}
                    color={GameColors.textSecondary}
                  />
                </Pressable>
              </View>
              <Pressable
                style={styles.addressContainer}
                onPress={handleCopyAddress}
              >
                <ThemedText style={styles.addressLabel}>Solana Address</ThemedText>
                <View style={styles.addressRow}>
                  <ThemedText style={styles.address}>
                    {truncateAddress(wallet.address)}
                  </ThemedText>
                  <Feather
                    name={copied ? "check" : "copy"}
                    size={16}
                    color={copied ? "#4ECDC4" : GameColors.textSecondary}
                  />
                </View>
              </Pressable>
            </>
          ) : (
            <View style={styles.walletNotConnected}>
              <View style={styles.walletIcon}>
                <Feather name="credit-card" size={32} color={GameColors.textSecondary} />
              </View>
              <ThemedText style={styles.walletTitle}>
                Connect Your Wallet
              </ThemedText>
              <ThemedText style={styles.walletDescription}>
                Connect a Solana wallet to mint your creatures as NFTs and prove ownership.
              </ThemedText>
              <Button
                onPress={handleConnectWallet}
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

        <WalletSelectModal 
          visible={showWalletModal}
          onClose={() => setShowWalletModal(false)}
        />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(500).springify()}
        style={styles.section}
      >
        <ThemedText type="h4" style={styles.sectionTitle}>
          Resources
        </ThemedText>
        <Pressable style={styles.resourceCard} onPress={handleAddEggs}>
          <View style={styles.resourceRow}>
            <View style={styles.resourceIcon}>
              <Feather name="plus-circle" size={24} color="#FFD93D" />
            </View>
            <View style={styles.resourceInfo}>
              <ThemedText style={styles.resourceTitle}>
                Get Eggs
              </ThemedText>
              <ThemedText style={styles.resourceDescription}>
                Tap to receive 5 free eggs
              </ThemedText>
            </View>
            <Feather
              name="chevron-right"
              size={24}
              color={GameColors.textSecondary}
            />
          </View>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: GameColors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: GameColors.primary,
  },
  levelBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: GameColors.background,
  },
  levelText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  username: {
    color: GameColors.textPrimary,
  },
  subtitle: {
    color: GameColors.textSecondary,
    marginTop: Spacing.xs,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: "center",
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: GameColors.textSecondary,
    marginTop: 2,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    color: GameColors.textPrimary,
    marginBottom: Spacing.md,
  },
  rarestCard: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  rarestGlow: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  rarestImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: Spacing.md,
  },
  rarestInfo: {
    flex: 1,
  },
  rarestName: {
    fontSize: 18,
    fontWeight: "600",
    color: GameColors.textPrimary,
    marginBottom: Spacing.xs,
  },
  rarestRarity: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    alignSelf: "flex-start",
  },
  rarestRarityText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
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
    backgroundColor: "#4ECDC4",
  },
  walletStatusText: {
    color: "#4ECDC4",
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
    width: 72,
    height: 72,
    borderRadius: 36,
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
  resourceCard: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  resourceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  resourceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 217, 61, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  resourceDescription: {
    fontSize: 14,
    color: GameColors.textSecondary,
    marginTop: 2,
  },
});
