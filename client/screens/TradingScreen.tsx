import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Image } from "expo-image";

import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius, GlowStyles } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useWebappBalances } from "@/hooks/useWebappBalances";
import {
  getExchangeRates,
  tradeChyToDiamonds,
  tradeRoachyToDiamonds,
} from "@/lib/webapp-api";

const ChyCoinIcon = require("@/assets/chy-coin-icon.png");
const DiamondIcon = require("@/assets/diamond-icon.png");

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type TradeType = "chy" | "roachy";

interface ExchangeRates {
  chyToDiamond: number;
  roachyToDiamond: number;
}

export default function TradingScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { user, isGuest, updateBalances } = useAuth();
  const { diamonds, chy, isLoading: isLoadingBalances, invalidateBalances } = useWebappBalances();

  const [selectedTrade, setSelectedTrade] = useState<TradeType>("chy");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [isLoadingRates, setIsLoadingRates] = useState(true);

  useEffect(() => {
    loadRates();
  }, []);

  const loadRates = async () => {
    setIsLoadingRates(true);
    try {
      const ratesResult = await getExchangeRates();
      setRates(ratesResult);
    } catch (error) {
      console.error("Failed to load exchange rates:", error);
    } finally {
      setIsLoadingRates(false);
    }
  };

  const getDiamondsReceived = (): number => {
    if (!rates || !amount) return 0;
    const numAmount = parseFloat(amount) || 0;
    if (selectedTrade === "chy") {
      return Math.floor(numAmount / rates.chyToDiamond);
    }
    return Math.floor(numAmount / rates.roachyToDiamond);
  };

  const handleTrade = async () => {
    if (isGuest) {
      Alert.alert("Sign In Required", "Please sign in to trade tokens for diamonds.");
      return;
    }

    if (!user?.id) {
      Alert.alert("Error", "User not found. Please sign in again.");
      return;
    }

    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount to trade.");
      return;
    }

    const diamondsToReceive = getDiamondsReceived();
    if (diamondsToReceive <= 0) {
      Alert.alert(
        "Amount Too Small",
        selectedTrade === "chy"
          ? `You need at least ${rates?.chyToDiamond || 1} CHY to receive 1 Diamond.`
          : `You need at least ${rates?.roachyToDiamond || 5000} ROACHY to receive 1 Diamond.`
      );
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsLoading(true);
    try {
      let result;
      if (selectedTrade === "chy") {
        result = await tradeChyToDiamonds(user.id, numAmount);
      } else {
        result = await tradeRoachyToDiamonds(user.id, numAmount);
      }

      if (result.success) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        const received = result.trade?.diamondsReceived || diamondsToReceive;
        Alert.alert(
          "Trade Successful!",
          `You received ${received} Diamond${received !== 1 ? "s" : ""}!`
        );
        
        setAmount("");
        
        // Update balances from response if available, otherwise invalidate to refetch
        if (result.newBalances) {
          updateBalances(result.newBalances.chy, result.newBalances.diamonds);
        } else if (typeof result.newDiamondBalance === "number") {
          // Partial update - only diamonds changed, keep CHY estimate
          const estimatedChy = selectedTrade === "chy" ? chy - numAmount : chy;
          updateBalances(estimatedChy, result.newDiamondBalance);
        }
        
        // Always invalidate to ensure fresh data on next render
        invalidateBalances();
      } else {
        Alert.alert("Trade Failed", result.error || "Please try again.");
      }
    } catch (error) {
      console.error("Trade error:", error);
      Alert.alert("Error", "Failed to complete trade. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetMax = () => {
    if (selectedTrade === "chy" && chy > 0) {
      setAmount(chy.toString());
    }
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
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
            Sign in to trade your tokens for diamonds and access premium features.
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
          Trade your tokens for Diamonds to use in the marketplace
        </ThemedText>
      </Animated.View>

      {isLoadingRates ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GameColors.gold} />
          <ThemedText style={styles.loadingText}>Loading exchange rates...</ThemedText>
        </View>
      ) : (
        <>
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.ratesCard}>
            <View style={styles.ratesHeader}>
              <Feather name="trending-up" size={20} color={GameColors.gold} />
              <ThemedText style={styles.ratesTitle}>Exchange Rates</ThemedText>
            </View>
            <View style={styles.ratesRow}>
              <View style={styles.rateItem}>
                <Image source={ChyCoinIcon} style={styles.rateIcon} contentFit="contain" />
                <ThemedText style={styles.rateValue}>
                  {rates?.chyToDiamond || 1} CHY = 1
                </ThemedText>
                <Image source={DiamondIcon} style={styles.rateIconSmall} contentFit="contain" />
              </View>
              <View style={styles.rateDivider} />
              <View style={styles.rateItem}>
                <ThemedText style={styles.rateTokenName}>ROACHY</ThemedText>
                <ThemedText style={styles.rateValue}>
                  {rates?.roachyToDiamond?.toLocaleString() || "5,000"} = 1
                </ThemedText>
                <Image source={DiamondIcon} style={styles.rateIconSmall} contentFit="contain" />
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.balanceCard}>
            <ThemedText style={styles.balanceTitle}>Your Balances</ThemedText>
            {isLoadingBalances ? (
              <ActivityIndicator size="small" color={GameColors.gold} style={{ marginVertical: Spacing.lg }} />
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

          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.tradeSection}>
            <ThemedText style={styles.sectionTitle}>Select Token to Trade</ThemedText>
            
            <View style={styles.tokenSelector}>
              <TradeTypeButton
                label="CHY"
                icon={ChyCoinIcon}
                isSelected={selectedTrade === "chy"}
                onPress={() => {
                  setSelectedTrade("chy");
                  setAmount("");
                }}
              />
              <TradeTypeButton
                label="ROACHY"
                isSelected={selectedTrade === "roachy"}
                onPress={() => {
                  setSelectedTrade("roachy");
                  setAmount("");
                }}
              />
            </View>

            <View style={styles.inputSection}>
              <ThemedText style={styles.inputLabel}>Amount to Trade</ThemedText>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  placeholderTextColor={GameColors.textTertiary}
                  keyboardType="numeric"
                />
                {selectedTrade === "chy" && chy > 0 && (
                  <Pressable style={styles.maxButton} onPress={handleSetMax}>
                    <ThemedText style={styles.maxButtonText}>MAX</ThemedText>
                  </Pressable>
                )}
              </View>
            </View>

            <View style={styles.receiveSection}>
              <Feather name="arrow-down" size={24} color={GameColors.gold} />
              <ThemedText style={styles.receiveLabel}>You will receive</ThemedText>
              <View style={styles.receiveAmount}>
                <Image source={DiamondIcon} style={styles.receiveIcon} contentFit="contain" />
                <ThemedText style={styles.receiveValue}>
                  {getDiamondsReceived().toLocaleString()}
                </ThemedText>
                <ThemedText style={styles.receiveToken}>Diamonds</ThemedText>
              </View>
            </View>

            <Pressable
              style={[styles.tradeButton, isLoading && styles.tradeButtonDisabled]}
              onPress={handleTrade}
              disabled={isLoading}
            >
              <LinearGradient
                colors={isLoading ? [GameColors.surfaceElevated, GameColors.surface] : [GameColors.primary, GameColors.gold]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.tradeButtonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color={GameColors.textPrimary} />
                ) : (
                  <>
                    <Feather name="refresh-cw" size={20} color={GameColors.background} />
                    <ThemedText style={styles.tradeButtonText}>Trade Now</ThemedText>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.infoCard}>
            <Feather name="info" size={18} color={GameColors.info} />
            <ThemedText style={styles.infoText}>
              Trades are processed instantly. Diamonds can be used to purchase powerups, skins, and other items in the marketplace.
            </ThemedText>
          </Animated.View>
        </>
      )}
    </ScrollView>
  );
}

function TradeTypeButton({
  label,
  icon,
  isSelected,
  onPress,
}: {
  label: string;
  icon?: any;
  isSelected: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12 });
  };

  return (
    <AnimatedPressable
      style={[
        styles.tradeTypeButton,
        isSelected && styles.tradeTypeButtonSelected,
        animatedStyle,
      ]}
      onPress={() => {
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress();
      }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      {icon ? (
        <Image source={icon} style={styles.tradeTypeIcon} contentFit="contain" />
      ) : (
        <View style={styles.tradeTypeIconPlaceholder}>
          <ThemedText style={styles.tradeTypeIconText}>R</ThemedText>
        </View>
      )}
      <ThemedText
        style={[
          styles.tradeTypeLabel,
          isSelected && styles.tradeTypeLabelSelected,
        ]}
      >
        {label}
      </ThemedText>
    </AnimatedPressable>
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
  loadingContainer: {
    paddingVertical: Spacing["4xl"],
    alignItems: "center",
  },
  loadingText: {
    marginTop: Spacing.md,
    color: GameColors.textSecondary,
  },
  ratesCard: {
    backgroundColor: GameColors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...GlowStyles.subtle,
  },
  ratesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  ratesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  ratesRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  rateItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  rateIcon: {
    width: 24,
    height: 24,
  },
  rateIconSmall: {
    width: 20,
    height: 20,
  },
  rateTokenName: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.primary,
  },
  rateValue: {
    fontSize: 14,
    color: GameColors.textSecondary,
  },
  rateDivider: {
    width: 1,
    height: 30,
    backgroundColor: GameColors.surfaceGlow,
  },
  balanceCard: {
    backgroundColor: GameColors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  balanceTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.textSecondary,
    marginBottom: Spacing.md,
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
    width: 32,
    height: 32,
  },
  balanceValue: {
    fontSize: 22,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  balanceLabel: {
    fontSize: 14,
    color: GameColors.textSecondary,
  },
  tradeSection: {
    backgroundColor: GameColors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    ...GlowStyles.standard,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.textPrimary,
    marginBottom: Spacing.lg,
  },
  tokenSelector: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  tradeTypeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: GameColors.surfaceGlow,
  },
  tradeTypeButtonSelected: {
    borderColor: GameColors.gold,
    backgroundColor: GameColors.surfaceGlow,
  },
  tradeTypeIcon: {
    width: 28,
    height: 28,
  },
  tradeTypeIconPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: GameColors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  tradeTypeIconText: {
    fontSize: 16,
    fontWeight: "700",
    color: GameColors.background,
  },
  tradeTypeLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.textSecondary,
  },
  tradeTypeLabelSelected: {
    color: GameColors.gold,
  },
  inputSection: {
    marginBottom: Spacing.xl,
  },
  inputLabel: {
    fontSize: 14,
    color: GameColors.textSecondary,
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: GameColors.surfaceGlow,
    overflow: "hidden",
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: "600",
    color: GameColors.textPrimary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 56,
  },
  maxButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: GameColors.surfaceGlow,
    marginRight: Spacing.sm,
    borderRadius: BorderRadius.xs,
  },
  maxButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.gold,
  },
  receiveSection: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: GameColors.surfaceGlow,
    marginBottom: Spacing.xl,
  },
  receiveLabel: {
    fontSize: 14,
    color: GameColors.textSecondary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  receiveAmount: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  receiveIcon: {
    width: 36,
    height: 36,
  },
  receiveValue: {
    fontSize: 36,
    fontWeight: "700",
    color: GameColors.gold,
  },
  receiveToken: {
    fontSize: 18,
    color: GameColors.textSecondary,
  },
  tradeButton: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    ...GlowStyles.standard,
  },
  tradeButtonDisabled: {
    opacity: 0.6,
  },
  tradeButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    minHeight: 56,
  },
  tradeButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: GameColors.background,
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
