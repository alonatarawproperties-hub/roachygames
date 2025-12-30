import React from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Linking } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { getMarketplaceUrl } from "@/lib/query-client";

const ChyCoinIcon = require("@/assets/chy-coin-icon.png");

interface TokenBalanceCardProps {
  chyCoinsBalance: number;
  onPress?: () => void;
  isConnected: boolean;
  isLoading?: boolean;
  isGuest?: boolean;
  onSync?: () => void;
  isSyncing?: boolean;
}

export function TokenBalanceCard({
  chyCoinsBalance = 0,
  onPress,
  isConnected,
  isLoading = false,
  isGuest = false,
  onSync,
  isSyncing = false,
}: TokenBalanceCardProps) {
  const spinValue = useSharedValue(0);

  React.useEffect(() => {
    if (isSyncing) {
      spinValue.value = withRepeat(
        withTiming(1, { duration: 800, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      spinValue.value = 0;
    }
  }, [isSyncing]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinValue.value * 360}deg` }],
  }));

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    if (num < 1 && num > 0) return num.toFixed(2);
    if (num < 100) return num.toFixed(2);
    return num.toLocaleString();
  };

  const handleGetMoreChy = async () => {
    await Linking.openURL("https://roachy.games/roachyswap");
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
        {onSync && (
          <Pressable 
            style={styles.syncButton} 
            onPress={onSync}
            disabled={isSyncing}
          >
            <Animated.View style={spinStyle}>
              <Feather 
                name="refresh-cw" 
                size={16} 
                color={isSyncing ? GameColors.gold : GameColors.textSecondary} 
              />
            </Animated.View>
          </Pressable>
        )}
      </View>

      <View style={styles.balancesRow}>
        <View style={styles.balanceItem}>
          <View style={styles.coinIconContainer}>
            <Image source={ChyCoinIcon} style={styles.coinIcon} contentFit="contain" />
          </View>
          {isLoading || isSyncing ? (
            <ActivityIndicator size="small" color={GameColors.gold} />
          ) : (
            <View style={styles.balanceInfo}>
              <ThemedText style={styles.balanceValue}>{formatNumber(chyCoinsBalance)}</ThemedText>
              <ThemedText style={styles.balanceLabel}>CHY</ThemedText>
            </View>
          )}
        </View>
      </View>

      <Pressable style={styles.claimButton} onPress={handleGetMoreChy}>
        <Feather name="shopping-cart" size={16} color={GameColors.gold} />
        <ThemedText style={styles.claimButtonText}>Get More CHY</ThemedText>
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
  syncButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: GameColors.gold + "15",
    borderWidth: 1,
    borderColor: GameColors.gold + "30",
    justifyContent: "center",
    alignItems: "center",
  },
  balancesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  balanceItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  coinIconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  coinIcon: {
    width: 40,
    height: 40,
  },
  balanceInfo: {
    alignItems: "flex-start",
  },
  balanceValue: {
    fontSize: 22,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  balanceLabel: {
    fontSize: 12,
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
