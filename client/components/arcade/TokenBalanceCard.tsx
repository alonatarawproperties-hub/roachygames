import React from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { getMarketplaceUrl } from "@/lib/query-client";

interface TokenBalanceCardProps {
  chyCoinsBalance: number;
  onPress?: () => void;
  isConnected: boolean;
  isLoading?: boolean;
  isGuest?: boolean;
}

export function TokenBalanceCard({
  chyCoinsBalance = 0,
  onPress,
  isConnected,
  isLoading = false,
  isGuest = false,
}: TokenBalanceCardProps) {

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const handleClaimOnWeb = async () => {
    await WebBrowser.openBrowserAsync(getMarketplaceUrl() + "/rewards");
  };

  if (isGuest) {
    return (
      <Pressable style={styles.container} onPress={onPress}>
        <LinearGradient
          colors={[GameColors.surfaceElevated, GameColors.surface]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.notConnectedContent}>
          <View style={styles.iconCircle}>
            <Feather name="user" size={24} color={GameColors.textTertiary} />
          </View>
          <View style={styles.notConnectedText}>
            <ThemedText style={styles.connectTitle}>Playing as Guest</ThemedText>
            <ThemedText style={styles.connectSubtitle}>Sign in to earn Chy Coins</ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={GameColors.textTertiary} />
        </View>
      </Pressable>
    );
  }

  if (!isConnected) {
    return (
      <Pressable style={styles.container} onPress={onPress}>
        <LinearGradient
          colors={[GameColors.surfaceElevated, GameColors.surface]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.notConnectedContent}>
          <View style={styles.iconCircle}>
            <Feather name="user" size={24} color={GameColors.textTertiary} />
          </View>
          <View style={styles.notConnectedText}>
            <ThemedText style={styles.connectTitle}>Sign In</ThemedText>
            <ThemedText style={styles.connectSubtitle}>Track your Chy Coins balance</ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={GameColors.textTertiary} />
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#2D1810", "#1A0F08"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Your Balance</ThemedText>
      </View>

      <View style={styles.balanceSection}>
        <View style={styles.coinIconContainer}>
          <View style={styles.coinIcon}>
            <ThemedText style={styles.coinSymbol}>C</ThemedText>
          </View>
        </View>
        <View style={styles.balanceInfo}>
          {isLoading ? (
            <ActivityIndicator size="small" color={GameColors.gold} />
          ) : (
            <>
              <ThemedText style={styles.balanceValue}>{formatNumber(chyCoinsBalance)}</ThemedText>
              <ThemedText style={styles.balanceLabel}>Chy Coins</ThemedText>
            </>
          )}
        </View>
      </View>

      <Pressable style={styles.claimButton} onPress={handleClaimOnWeb}>
        <Feather name="external-link" size={16} color={GameColors.gold} />
        <ThemedText style={styles.claimButtonText}>Claim Rewards on Web</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: GameColors.gold + "30",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.textSecondary,
  },
  balanceSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  coinIconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  coinIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: GameColors.gold + "20",
    borderWidth: 2,
    borderColor: GameColors.gold + "40",
    justifyContent: "center",
    alignItems: "center",
  },
  coinSymbol: {
    fontSize: 24,
    fontWeight: "800",
    color: GameColors.gold,
  },
  balanceInfo: {
    flex: 1,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  balanceLabel: {
    fontSize: 14,
    color: GameColors.gold,
    marginTop: 2,
  },
  claimButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: GameColors.gold + "15",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: GameColors.gold + "30",
  },
  claimButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.gold,
  },
  notConnectedContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: GameColors.surfaceGlow,
    justifyContent: "center",
    alignItems: "center",
  },
  notConnectedText: {
    flex: 1,
  },
  connectTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  connectSubtitle: {
    fontSize: 13,
    color: GameColors.textSecondary,
    marginTop: 2,
  },
});
