import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Image } from "expo-image";

import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius, GlowStyles } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useWebappBalances } from "@/hooks/useWebappBalances";
import { purchasePowerup } from "@/lib/webapp-api";

const DiamondIcon = require("@/assets/diamond-icon.png");

interface Powerup {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  diamondCost: number;
  color: string;
}

const POWERUPS: Powerup[] = [
  {
    id: "energy_boost",
    name: "Energy Boost",
    description: "Instantly refill 10 energy points",
    icon: "zap",
    diamondCost: 5,
    color: GameColors.warning,
  },
  {
    id: "lucky_charm",
    name: "Lucky Charm",
    description: "Increase rare spawn chance for 1 hour",
    icon: "star",
    diamondCost: 10,
    color: GameColors.gold,
  },
  {
    id: "radar_boost",
    name: "Radar Boost",
    description: "Extend detection range by 50m for 30 min",
    icon: "radio",
    diamondCost: 8,
    color: GameColors.info,
  },
  {
    id: "catch_boost",
    name: "Catch Boost",
    description: "Increase catch success rate for 1 hour",
    icon: "target",
    diamondCost: 12,
    color: GameColors.success,
  },
  {
    id: "xp_multiplier",
    name: "XP Multiplier",
    description: "Double XP gains for 30 minutes",
    icon: "trending-up",
    diamondCost: 15,
    color: GameColors.primary,
  },
];

export default function PowerupShopScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { user, isGuest, updateBalances } = useAuth();
  const { diamonds: diamondBalance, chy: chyBalance, isLoading, invalidateBalances } = useWebappBalances();

  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const handlePurchase = async (powerup: Powerup) => {
    if (isGuest) {
      Alert.alert("Sign In Required", "Please sign in to purchase powerups.");
      return;
    }

    if (!user?.id) {
      Alert.alert("Error", "User not found. Please sign in again.");
      return;
    }

    if (diamondBalance < powerup.diamondCost) {
      Alert.alert(
        "Insufficient Diamonds",
        `You need ${powerup.diamondCost} diamonds but only have ${diamondBalance}.`
      );
      return;
    }

    Alert.alert(
      "Confirm Purchase",
      `Buy ${powerup.name} for ${powerup.diamondCost} diamonds?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Buy",
          onPress: async () => {
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }

            setPurchasingId(powerup.id);
            try {
              const result = await purchasePowerup(
                user.id,
                powerup.id,
                powerup.diamondCost,
                1
              );

              if (result.success) {
                if (Platform.OS !== "web") {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                
                // Update AuthContext balances for immediate UI consistency
                if (typeof result.newDiamondBalance === "number") {
                  updateBalances(chyBalance, result.newDiamondBalance);
                } else {
                  // Estimate new balance if not provided
                  const estimatedDiamonds = Math.max(0, diamondBalance - powerup.diamondCost);
                  updateBalances(chyBalance, estimatedDiamonds);
                }
                
                // Always invalidate to ensure fresh data on next render
                invalidateBalances();

                Alert.alert(
                  "Purchase Complete!",
                  `${powerup.name} has been added to your inventory.`
                );
              } else {
                Alert.alert("Purchase Failed", result.error || "Please try again.");
              }
            } catch (error) {
              console.error("Purchase error:", error);
              Alert.alert("Error", "Failed to complete purchase. Please try again.");
            } finally {
              setPurchasingId(null);
            }
          },
        },
      ]
    );
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
            Sign in to purchase powerups with your diamonds.
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
        <ThemedText style={styles.title}>Powerup Shop</ThemedText>
        <ThemedText style={styles.subtitle}>
          Boost your hunting with special powerups
        </ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.balanceCard}>
        <View style={styles.balanceRow}>
          <Image source={DiamondIcon} style={styles.balanceIcon} contentFit="contain" />
          <View style={styles.balanceInfo}>
            <ThemedText style={styles.balanceLabel}>Your Diamonds</ThemedText>
            {isLoading ? (
              <ActivityIndicator size="small" color={GameColors.info} />
            ) : (
              <ThemedText style={styles.balanceValue}>
                {diamondBalance.toLocaleString()}
              </ThemedText>
            )}
          </View>
        </View>
      </Animated.View>

      <View style={styles.powerupsList}>
        {POWERUPS.map((powerup, index) => (
          <Animated.View
            key={powerup.id}
            entering={FadeInDown.delay(150 + index * 50).springify()}
          >
            <PowerupCard
              powerup={powerup}
              canAfford={diamondBalance >= powerup.diamondCost}
              isPurchasing={purchasingId === powerup.id}
              onPurchase={() => handlePurchase(powerup)}
            />
          </Animated.View>
        ))}
      </View>

      <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.infoCard}>
        <Feather name="info" size={18} color={GameColors.info} />
        <ThemedText style={styles.infoText}>
          Powerups are applied immediately after purchase. Some powerups have duration limits.
        </ThemedText>
      </Animated.View>
    </ScrollView>
  );
}

function PowerupCard({
  powerup,
  canAfford,
  isPurchasing,
  onPurchase,
}: {
  powerup: Powerup;
  canAfford: boolean;
  isPurchasing: boolean;
  onPurchase: () => void;
}) {
  return (
    <View style={styles.powerupCard}>
      <View style={[styles.powerupIconContainer, { backgroundColor: powerup.color + "20" }]}>
        <Feather name={powerup.icon} size={24} color={powerup.color} />
      </View>
      <View style={styles.powerupInfo}>
        <ThemedText style={styles.powerupName}>{powerup.name}</ThemedText>
        <ThemedText style={styles.powerupDescription}>{powerup.description}</ThemedText>
      </View>
      <Pressable
        style={[
          styles.buyButton,
          !canAfford && styles.buyButtonDisabled,
          isPurchasing && styles.buyButtonPurchasing,
        ]}
        onPress={onPurchase}
        disabled={isPurchasing}
      >
        {isPurchasing ? (
          <ActivityIndicator size="small" color={GameColors.textPrimary} />
        ) : (
          <>
            <Image source={DiamondIcon} style={styles.buyIcon} contentFit="contain" />
            <ThemedText style={[styles.buyText, !canAfford && styles.buyTextDisabled]}>
              {powerup.diamondCost}
            </ThemedText>
          </>
        )}
      </Pressable>
    </View>
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
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    ...GlowStyles.subtle,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  balanceIcon: {
    width: 48,
    height: 48,
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 14,
    color: GameColors.textSecondary,
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: "700",
    color: GameColors.info,
  },
  powerupsList: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  powerupCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  powerupIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  powerupInfo: {
    flex: 1,
  },
  powerupName: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.textPrimary,
    marginBottom: 2,
  },
  powerupDescription: {
    fontSize: 13,
    color: GameColors.textSecondary,
    lineHeight: 18,
  },
  buyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: GameColors.info + "20",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: GameColors.info + "40",
    minWidth: 70,
    justifyContent: "center",
  },
  buyButtonDisabled: {
    backgroundColor: GameColors.surfaceGlow,
    borderColor: GameColors.textTertiary + "30",
  },
  buyButtonPurchasing: {
    opacity: 0.7,
  },
  buyIcon: {
    width: 18,
    height: 18,
  },
  buyText: {
    fontSize: 16,
    fontWeight: "700",
    color: GameColors.info,
  },
  buyTextDisabled: {
    color: GameColors.textTertiary,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    backgroundColor: GameColors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: GameColors.info,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: GameColors.textSecondary,
    lineHeight: 20,
  },
});
