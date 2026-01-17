import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Text,
  Dimensions,
  Platform,
} from "react-native";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  Easing,
  interpolate,
  Extrapolate,
  useAnimatedReaction,
} from "react-native-reanimated";
import { GameColors, Spacing, BorderRadius, GlowStyles } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { lockPortrait } from "@/utils/orientation";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type BattlesStackParamList = {
  BattleResult: {
    matchId: string;
    result: "win" | "lose";
    rankDelta: number;
    xpGained: number;
    warmthGained?: number;
    dailyBonusProgress?: { current: number; max: number };
  };
};

type BattleResultNavigationProp = NativeStackNavigationProp<
  BattlesStackParamList,
  "BattleResult"
>;

const springConfig = {
  damping: 7,
  mass: 1,
  overshootClamping: false,
};

export function BattleResultScreen() {
  const navigation = useNavigation<BattleResultNavigationProp>();
  const route = useRoute<RouteProp<BattlesStackParamList, "BattleResult">>();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      lockPortrait();
    }, [])
  );

  const {
    result,
    rankDelta,
    xpGained,
    warmthGained = 0,
    dailyBonusProgress,
  } = route.params;

  const isVictory = result === "win";
  const [showDetails, setShowDetails] = useState(false);

  // Animation values
  const bannerScale = useSharedValue(0.5);
  const bannerOpacity = useSharedValue(0);
  const statsOpacity = useSharedValue(0);
  const buttonsOpacity = useSharedValue(0);
  const rankDeltaScale = useSharedValue(0);
  const xpScale = useSharedValue(0);
  const warmthScale = useSharedValue(0);

  useEffect(() => {
    // Banner entrance animation
    bannerOpacity.value = withTiming(1, { duration: 300 });
    bannerScale.value = withSpring(1, springConfig);

    // Staggered stats animation
    setTimeout(() => {
      rankDeltaScale.value = withSpring(1, springConfig);
    }, 300);

    setTimeout(() => {
      xpScale.value = withSpring(1, springConfig);
    }, 500);

    if (isVictory) {
      setTimeout(() => {
        warmthScale.value = withSpring(1, springConfig);
      }, 700);
    }

    setTimeout(() => {
      statsOpacity.value = withTiming(1, { duration: 300 });
    }, 300);

    // Buttons entrance
    setTimeout(() => {
      buttonsOpacity.value = withTiming(1, { duration: 400 });
    }, 1200);

    setShowDetails(true);
  }, []);

  const bannerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: bannerOpacity.value,
    transform: [{ scale: bannerScale.value }],
  }));

  const statsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: statsOpacity.value,
  }));

  const rankDeltaAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rankDeltaScale.value }],
  }));

  const xpAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: xpScale.value }],
  }));

  const warmthAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: warmthScale.value }],
  }));

  const buttonsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
  }));

  const handlePlayAgain = () => {
    navigation.replace("BattlesHome" as any);
  };

  const handleViewMatch = () => {
    // Placeholder for replay feature
    Platform.OS !== "web" &&
      alert("Match replay feature coming soon!");
  };

  return (
    <ThemedView
      style={[
        styles.container,
        {
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.lg,
          backgroundColor: isVictory
            ? GameColors.background
            : GameColors.background,
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Victory/Defeat Banner */}
        <Animated.View style={[styles.bannerContainer, bannerAnimatedStyle]}>
          <View
            style={[
              styles.banner,
              {
                borderColor: isVictory ? GameColors.gold : GameColors.error,
                backgroundColor: isVictory
                  ? "rgba(255, 215, 0, 0.1)"
                  : "rgba(255, 51, 102, 0.1)",
              },
            ]}
          >
            <Feather
              name={isVictory ? "award" : "x-circle"}
              size={80}
              color={isVictory ? GameColors.gold : GameColors.error}
              style={styles.bannerIcon}
            />
            <Text
              style={[
                styles.bannerTitle,
                {
                  color: isVictory ? GameColors.gold : GameColors.error,
                },
              ]}
            >
              {isVictory ? "VICTORY!" : "DEFEAT"}
            </Text>
            <Text
              style={[
                styles.bannerSubtitle,
                {
                  color: isVictory ? GameColors.success : GameColors.warning,
                },
              ]}
            >
              {isVictory ? "Well fought!" : "Better luck next time!"}
            </Text>
          </View>
        </Animated.View>

        {/* Stats Section */}
        <Animated.View
          style={[styles.statsSection, statsAnimatedStyle]}
        >
          {/* Rank Delta Card */}
          <Animated.View style={[rankDeltaAnimatedStyle]}>
            <View
              style={[
                styles.statCard,
                {
                  borderColor:
                    rankDelta > 0 ? GameColors.success : GameColors.error,
                  backgroundColor:
                    rankDelta > 0
                      ? "rgba(0, 255, 136, 0.08)"
                      : "rgba(255, 51, 102, 0.08)",
                },
              ]}
            >
              <View
                style={[
                  styles.statIconContainer,
                  {
                    backgroundColor:
                      rankDelta > 0 ? GameColors.success : GameColors.error,
                  },
                ]}
              >
                <Feather
                  name={rankDelta > 0 ? "trending-up" : "trending-down"}
                  size={24}
                  color={GameColors.background}
                />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Rank Change</Text>
                <View style={styles.statValueRow}>
                  <Text
                    style={[
                      styles.statValue,
                      {
                        color:
                          rankDelta > 0
                            ? GameColors.success
                            : GameColors.error,
                      },
                    ]}
                  >
                    {rankDelta > 0 ? "+" : ""}{rankDelta} MMR
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* XP Gained Card */}
          <Animated.View style={[xpAnimatedStyle]}>
            <View
              style={[
                styles.statCard,
                {
                  borderColor: GameColors.gold,
                  backgroundColor: "rgba(255, 215, 0, 0.08)",
                },
              ]}
            >
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: GameColors.gold },
                ]}
              >
                <Feather
                  name="zap"
                  size={24}
                  color={GameColors.background}
                />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>XP Gained</Text>
                <View style={styles.statValueRow}>
                  <Text style={[styles.statValue, { color: GameColors.gold }]}>
                    +{xpGained}
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Warmth Gained Card (Victory Only) */}
          {isVictory && warmthGained > 0 && (
            <Animated.View style={[warmthAnimatedStyle]}>
              <View
                style={[
                  styles.statCard,
                  {
                    borderColor: GameColors.info,
                    backgroundColor: "rgba(0, 217, 255, 0.08)",
                  },
                ]}
              >
                <View
                  style={[
                    styles.statIconContainer,
                    { backgroundColor: GameColors.info },
                  ]}
                >
                  <Feather
                    name="heart"
                    size={24}
                    color={GameColors.background}
                  />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>Warmth Gained</Text>
                  <View style={styles.statValueRow}>
                    <Text
                      style={[styles.statValue, { color: GameColors.info }]}
                    >
                      +{warmthGained}
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Daily Bonus Progress */}
          {dailyBonusProgress && (
            <View
              style={[
                styles.statCard,
                {
                  borderColor: GameColors.warning,
                  backgroundColor: "rgba(255, 204, 0, 0.08)",
                },
              ]}
            >
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: GameColors.warning },
                ]}
              >
                <Feather
                  name="gift"
                  size={24}
                  color={GameColors.background}
                />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Daily Bonus</Text>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${
                            (dailyBonusProgress.current /
                              dailyBonusProgress.max) *
                            100
                          }%`,
                          backgroundColor: GameColors.warning,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {dailyBonusProgress.current}/{dailyBonusProgress.max}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View style={[styles.buttonsContainer, buttonsAnimatedStyle]}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: isVictory
                  ? GameColors.primary
                  : GameColors.error,
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.95 : 1 }],
              },
            ]}
            onPress={handlePlayAgain}
          >
            <Feather
              name="play"
              size={20}
              color={GameColors.background}
              style={styles.buttonIcon}
            />
            <Text style={styles.primaryButtonText}>Play Again</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              {
                borderColor: GameColors.gold,
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.95 : 1 }],
              },
            ]}
            onPress={handleViewMatch}
          >
            <Feather
              name="eye"
              size={20}
              color={GameColors.gold}
              style={styles.buttonIcon}
            />
            <Text style={styles.secondaryButtonText}>View Match</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    justifyContent: "center",
  },
  bannerContainer: {
    marginBottom: Spacing["3xl"],
    alignItems: "center",
  },
  banner: {
    width: "100%",
    borderRadius: BorderRadius.lg,
    borderWidth: 3,
    paddingVertical: Spacing["2xl"],
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
    gap: Spacing.md,
    ...GlowStyles.intense,
  },
  bannerIcon: {
    marginBottom: Spacing.sm,
  },
  bannerTitle: {
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: 3,
  },
  bannerSubtitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: Spacing.sm,
  },
  statsSection: {
    gap: Spacing.lg,
    marginBottom: Spacing["3xl"],
  },
  statCard: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    padding: Spacing.lg,
    alignItems: "center",
    gap: Spacing.lg,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: GameColors.textSecondary,
    marginBottom: Spacing.xs,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.sm,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 1,
  },
  progressContainer: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: GameColors.surfaceElevated,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
    color: GameColors.textSecondary,
    textAlign: "right",
  },
  buttonsContainer: {
    gap: Spacing.lg,
    marginTop: Spacing["2xl"],
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing["2xl"],
    gap: Spacing.md,
    ...GlowStyles.standard,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: GameColors.background,
    letterSpacing: 1,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing["2xl"],
    borderWidth: 2,
    gap: Spacing.md,
    backgroundColor: "transparent",
    borderColor: GameColors.gold,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: GameColors.gold,
    letterSpacing: 1,
  },
  buttonIcon: {
    marginRight: Spacing.xs,
  },
});
