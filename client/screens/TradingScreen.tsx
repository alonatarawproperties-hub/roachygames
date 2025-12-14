import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Image } from "expo-image";

import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius, GlowStyles } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useWebappBalances } from "@/hooks/useWebappBalances";

const ChyCoinIcon = require("@/assets/chy-coin-icon.png");
const DiamondIcon = require("@/assets/diamond-icon.png");

const WEBAPP_TRADING_URL = "https://roachy.games/trade";

export default function TradingScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { isGuest } = useAuth();
  const { diamonds, chy, isLoading: isLoadingBalances } = useWebappBalances();

  const handleOpenTrading = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await WebBrowser.openBrowserAsync(WEBAPP_TRADING_URL);
  };

  if (isGuest) {
    return (
      <View style={[styles.container, { paddingTop: headerHeight + Spacing.xl }]}>
        <LinearGradient
          colors={[GameColors.background, GameColors.surface]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.guestContainer}>
          <View style={styles.guestIconContainer}>
            <Feather name="lock" size={48} color={GameColors.textSecondary} />
          </View>
          <ThemedText style={styles.guestTitle}>Sign In Required</ThemedText>
          <ThemedText style={styles.guestSubtitle}>
            Sign in to access token trading on roachy.games.
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        {
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing["3xl"],
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[GameColors.background, GameColors.surface]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View entering={FadeInDown.springify()} style={styles.headerSection}>
        <ThemedText style={styles.title}>Token Exchange</ThemedText>
        <ThemedText style={styles.subtitle}>
          Trade your tokens for Diamonds on roachy.games
        </ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.balanceCard}>
        <ThemedText style={styles.balanceTitle}>Your Current Balances</ThemedText>
        {isLoadingBalances ? (
          <View style={styles.loadingBalances}>
            <ThemedText style={styles.loadingText}>Loading...</ThemedText>
          </View>
        ) : (
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Image source={ChyCoinIcon} style={styles.balanceIcon} contentFit="contain" />
              <ThemedText style={styles.balanceValue}>
                {chy.toLocaleString()}
              </ThemedText>
              <ThemedText style={styles.balanceLabel}>CHY</ThemedText>
            </View>
            <View style={styles.balanceItem}>
              <Image source={DiamondIcon} style={styles.balanceIcon} contentFit="contain" />
              <ThemedText style={styles.balanceValue}>
                {diamonds.toLocaleString()}
              </ThemedText>
              <ThemedText style={styles.balanceLabel}>Diamonds</ThemedText>
            </View>
          </View>
        )}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Feather name="globe" size={24} color={GameColors.gold} />
          <ThemedText style={styles.infoTitle}>Trade on roachy.games</ThemedText>
        </View>
        <ThemedText style={styles.infoDescription}>
          Token trading and conversions are handled securely on our website. You can:
        </ThemedText>
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Feather name="check-circle" size={18} color={GameColors.success} />
            <ThemedText style={styles.featureText}>Swap CHY tokens for Diamonds</ThemedText>
          </View>
          <View style={styles.featureItem}>
            <Feather name="check-circle" size={18} color={GameColors.success} />
            <ThemedText style={styles.featureText}>Trade ROACHY tokens for Diamonds</ThemedText>
          </View>
          <View style={styles.featureItem}>
            <Feather name="check-circle" size={18} color={GameColors.success} />
            <ThemedText style={styles.featureText}>View transaction history</ThemedText>
          </View>
          <View style={styles.featureItem}>
            <Feather name="check-circle" size={18} color={GameColors.success} />
            <ThemedText style={styles.featureText}>Access advanced trading features</ThemedText>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <Pressable style={styles.tradeButton} onPress={handleOpenTrading}>
          <LinearGradient
            colors={[GameColors.primary, GameColors.gold]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.tradeButtonGradient}
          >
            <Feather name="external-link" size={20} color={GameColors.background} />
            <ThemedText style={styles.tradeButtonText}>Open Trading Portal</ThemedText>
          </LinearGradient>
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.syncCard}>
        <Feather name="refresh-cw" size={18} color={GameColors.info} />
        <ThemedText style={styles.syncText}>
          Balances sync automatically. Any trades you make on the website will be reflected here within a minute.
        </ThemedText>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
  },
  guestContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  guestIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: GameColors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  guestTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: GameColors.textPrimary,
    marginBottom: Spacing.sm,
  },
  guestSubtitle: {
    fontSize: 16,
    color: GameColors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  headerSection: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: GameColors.gold,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: GameColors.textSecondary,
  },
  balanceCard: {
    backgroundColor: GameColors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    ...GlowStyles.subtle,
  },
  balanceTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.textSecondary,
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  loadingBalances: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
  },
  loadingText: {
    color: GameColors.textSecondary,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  balanceItem: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  balanceIcon: {
    width: 40,
    height: 40,
  },
  balanceValue: {
    fontSize: 26,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  balanceLabel: {
    fontSize: 14,
    color: GameColors.textSecondary,
  },
  infoCard: {
    backgroundColor: GameColors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  infoDescription: {
    fontSize: 15,
    color: GameColors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  featureList: {
    gap: Spacing.md,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  featureText: {
    fontSize: 15,
    color: GameColors.textPrimary,
  },
  tradeButton: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.lg,
    ...GlowStyles.standard,
  },
  tradeButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    minHeight: 56,
  },
  tradeButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: GameColors.background,
  },
  syncCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    backgroundColor: GameColors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: GameColors.info,
  },
  syncText: {
    flex: 1,
    fontSize: 14,
    color: GameColors.textSecondary,
    lineHeight: 20,
  },
});
