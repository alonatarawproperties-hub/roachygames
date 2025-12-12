import React from "react";
import { View, StyleSheet, Pressable, Platform, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";

export const TOKEN_MINTS = {
  ROACHY: "BJqV6DGuHY8U8KYpBGHVV74YMjJYHdYMPfb1g7dppump",
  DIAMONDS: "28AUaEftPy8L9bhuFusG84RYynFwjnNCVwT2jkyTz6CA",
};

interface TokenBalanceCardProps {
  roachyBalance: number;
  diamondsBalance: number;
  roachyUsdValue: number;
  diamondsUsdValue: number;
  onPress?: () => void;
  isConnected: boolean;
  isLoading?: boolean;
  isGuest?: boolean;
}

export function TokenBalanceCard({
  roachyBalance = 0,
  diamondsBalance = 0,
  roachyUsdValue = 0,
  diamondsUsdValue = 0,
  onPress,
  isConnected,
  isLoading = false,
  isGuest = false,
}: TokenBalanceCardProps) {
  const totalUsdValue = roachyUsdValue + diamondsUsdValue;

  const formatNumber = (num: number, decimals: number = 2) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(decimals);
  };

  const formatUsd = (value: number) => {
    return `$${formatNumber(value, 2)}`;
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
            <ThemedText style={styles.connectSubtitle}>Sign in to earn crypto rewards</ThemedText>
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
            <Feather name="credit-card" size={24} color={GameColors.textTertiary} />
          </View>
          <View style={styles.notConnectedText}>
            <ThemedText style={styles.connectTitle}>Connect Wallet</ThemedText>
            <ThemedText style={styles.connectSubtitle}>View your token balance</ThemedText>
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
        <ThemedText style={styles.totalValue}>{formatUsd(totalUsdValue)}</ThemedText>
      </View>

      <View style={styles.tokensRow}>
        <View style={styles.tokenItem}>
          <View style={[styles.tokenIcon, styles.roachyIcon]}>
            <ThemedText style={styles.roachySymbolText}>R</ThemedText>
          </View>
          <View style={styles.tokenInfo}>
            {isLoading ? (
              <ActivityIndicator size="small" color={GameColors.gold} />
            ) : (
              <>
                <ThemedText style={styles.tokenBalance}>{formatNumber(roachyBalance, 0)} ROACHY</ThemedText>
                <ThemedText style={styles.tokenUsd}>{formatUsd(roachyUsdValue)}</ThemedText>
              </>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.tokenItem}>
          <View style={[styles.tokenIcon, styles.diamondsIcon]}>
            <ThemedText style={styles.diamondsSymbolText}>D</ThemedText>
          </View>
          <View style={styles.tokenInfo}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#00D4FF" />
            ) : (
              <>
                <ThemedText style={styles.tokenBalance}>{formatNumber(diamondsBalance, 0)} DIAMONDS</ThemedText>
                <ThemedText style={styles.tokenUsd}>{formatUsd(diamondsUsdValue)}</ThemedText>
              </>
            )}
          </View>
        </View>
      </View>
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
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: GameColors.gold,
  },
  tokensRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  tokenItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  tokenIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  roachyIcon: {
    backgroundColor: GameColors.gold + "20",
    borderWidth: 1,
    borderColor: GameColors.gold + "40",
  },
  diamondsIcon: {
    backgroundColor: "#00D4FF20",
    borderWidth: 1,
    borderColor: "#00D4FF40",
  },
  roachySymbolText: {
    fontSize: 16,
    fontWeight: "800",
    color: GameColors.gold,
  },
  diamondsSymbolText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#00D4FF",
  },
  tokenInfo: {
    flex: 1,
  },
  tokenBalance: {
    fontSize: 14,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  tokenUsd: {
    fontSize: 12,
    color: GameColors.textSecondary,
    marginTop: 2,
  },
  divider: {
    width: 1,
    backgroundColor: GameColors.surfaceGlow,
    marginVertical: 4,
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
