import React, { useEffect, useState } from "react";
import { View, StyleSheet, Pressable, Modal, Dimensions, Image, ScrollView } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  withDelay,
  runOnJS,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";

const EggCommon = require("@/assets/hunt/egg-common.png");
const EggRare = require("@/assets/hunt/egg-rare.png");
const EggEpic = require("@/assets/hunt/egg-epic.png");
const EggLegendary = require("@/assets/hunt/egg-legendary.png");

const EGG_IMAGES: Record<string, any> = {
  common: EggCommon,
  rare: EggRare,
  epic: EggEpic,
  legendary: EggLegendary,
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface EggCollectedModalProps {
  visible: boolean;
  eggRarity: "common" | "rare" | "epic" | "legendary";
  xpAwarded: number;
  pointsAwarded: number;
  quality: "perfect" | "great" | "good";
  pity: { rareIn: number; epicIn: number; legendaryIn: number };
  onContinue: () => void;
  onGoToEggs: () => void;
}

const RARITY_CONFIG: Record<string, { 
  primary: string; 
  secondary: string;
  glow: string;
  gradient: [string, string, string];
  label: string;
  particles: number;
}> = {
  common: { 
    primary: "#9CA3AF", 
    secondary: "#6B7280",
    glow: "rgba(156, 163, 175, 0.4)",
    gradient: ["#D1D5DB", "#9CA3AF", "#6B7280"],
    label: "COMMON",
    particles: 6,
  },
  rare: { 
    primary: "#60A5FA", 
    secondary: "#3B82F6",
    glow: "rgba(59, 130, 246, 0.5)",
    gradient: ["#93C5FD", "#60A5FA", "#3B82F6"],
    label: "RARE",
    particles: 10,
  },
  epic: { 
    primary: "#C084FC", 
    secondary: "#A855F7",
    glow: "rgba(168, 85, 247, 0.6)",
    gradient: ["#E9D5FF", "#C084FC", "#A855F7"],
    label: "EPIC",
    particles: 16,
  },
  legendary: { 
    primary: "#FCD34D", 
    secondary: "#F59E0B",
    glow: "rgba(245, 158, 11, 0.7)",
    gradient: ["#FEF3C7", "#FCD34D", "#F59E0B"],
    label: "LEGENDARY",
    particles: 24,
  },
};

export function EggCollectedModal({
  visible,
  eggRarity,
  xpAwarded,
  pointsAwarded,
  quality,
  pity,
  onContinue,
  onGoToEggs,
}: EggCollectedModalProps) {
  const insets = useSafeAreaInsets();
  const config = RARITY_CONFIG[eggRarity] || RARITY_CONFIG.common;
  
  const [phase, setPhase] = useState<"reveal" | "complete">("reveal");
  const [showContent, setShowContent] = useState(false);
  
  const eggScale = useSharedValue(0);
  const eggRotation = useSharedValue(0);
  const eggFloat = useSharedValue(0);
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const burstScale = useSharedValue(0);
  const burstOpacity = useSharedValue(0);
  const shimmerPosition = useSharedValue(-1);

  useEffect(() => {
    if (visible) {
      setPhase("reveal");
      setShowContent(false);
      eggScale.value = 0;
      eggRotation.value = 0;
      eggFloat.value = 0;
      glowScale.value = 1;
      glowOpacity.value = 0;
      burstScale.value = 0;
      burstOpacity.value = 0;
      shimmerPosition.value = -1;

      eggScale.value = withSpring(1, { damping: 12, stiffness: 100 });
      glowOpacity.value = withTiming(0.6, { duration: 500 });

      setTimeout(() => {
        eggRotation.value = withRepeat(
          withSequence(
            withTiming(-10, { duration: 80, easing: Easing.inOut(Easing.ease) }),
            withTiming(10, { duration: 80, easing: Easing.inOut(Easing.ease) }),
            withTiming(-8, { duration: 70, easing: Easing.inOut(Easing.ease) }),
            withTiming(8, { duration: 70, easing: Easing.inOut(Easing.ease) }),
            withTiming(-5, { duration: 60, easing: Easing.inOut(Easing.ease) }),
            withTiming(5, { duration: 60, easing: Easing.inOut(Easing.ease) }),
            withTiming(0, { duration: 50 })
          ),
          2,
          false
        );
      }, 300);

      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        burstOpacity.value = withTiming(1, { duration: 150 });
        burstScale.value = withSequence(
          withSpring(1.8, { damping: 5, stiffness: 150 }),
          withTiming(2.5, { duration: 400 })
        );
        burstOpacity.value = withDelay(250, withTiming(0, { duration: 250 }));

        eggScale.value = withSequence(
          withSpring(1.3, { damping: 6, stiffness: 200 }),
          withSpring(1, { damping: 10, stiffness: 100 })
        );

        glowScale.value = withRepeat(
          withSequence(
            withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
          ),
          -1
        );

        shimmerPosition.value = withRepeat(
          withTiming(1, { duration: 2000, easing: Easing.linear }),
          -1
        );

        eggFloat.value = withRepeat(
          withSequence(
            withTiming(-8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
            withTiming(8, { duration: 1500, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        );
      }, 1000);

      setTimeout(() => {
        setShowContent(true);
        setPhase("complete");
      }, 1600);

    } else {
      eggScale.value = 0;
      glowOpacity.value = 0;
      setShowContent(false);
      setPhase("reveal");
    }
  }, [visible]);

  const eggStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: eggScale.value },
      { rotate: `${eggRotation.value}deg` },
      { translateY: eggFloat.value },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const burstStyle = useAnimatedStyle(() => ({
    transform: [{ scale: burstScale.value }],
    opacity: burstOpacity.value,
  }));

  const handleContinue = () => {
    if (phase === "complete") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onContinue();
    }
  };

  const handleGoToEggs = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onGoToEggs();
  };

  const isSmallScreen = SCREEN_HEIGHT < 700;
  const eggSize = isSmallScreen ? { width: 140, height: 170 } : { width: 180, height: 220 };

  return (
    <Modal visible={visible} transparent={false} animationType="fade">
      <View style={styles.container}>
        <LinearGradient
          colors={["#0a0a0f", "#111118", "#0a0a0f"]}
          style={StyleSheet.absoluteFill}
        />

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent, 
            { paddingTop: insets.top + Spacing.xl, paddingBottom: Math.max(insets.bottom, 34) + Spacing["2xl"] }
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.eggSection}>
            <Animated.View style={[styles.burstContainer, burstStyle]}>
              <View style={[styles.burst, { backgroundColor: config.glow }]} />
            </Animated.View>

            <Animated.View style={[styles.glowContainer, glowStyle]}>
              <View style={[styles.glowOuter, { backgroundColor: config.glow }]} />
              <View style={[styles.glowInner, { backgroundColor: config.primary + "40" }]} />
            </Animated.View>

            <View style={styles.particleContainer}>
              {Array.from({ length: config.particles }).map((_, i) => {
                const angle = (360 / config.particles) * i;
                const distance = isSmallScreen ? 80 : 100;
                return (
                  <Animated.View
                    key={i}
                    entering={FadeIn.delay(1200 + i * 50).duration(500)}
                    style={[
                      styles.particle,
                      {
                        backgroundColor: config.primary,
                        transform: [
                          { rotate: `${angle}deg` },
                          { translateY: -distance },
                        ],
                      },
                    ]}
                  />
                );
              })}
            </View>

            <Animated.View style={[styles.eggWrapper, eggStyle]}>
              <Image 
                source={EGG_IMAGES[eggRarity] || EGG_IMAGES.common}
                style={[styles.eggImage, eggSize]}
                resizeMode="contain"
              />
            </Animated.View>
          </View>

          {showContent && (
            <Animated.View 
              entering={FadeInUp.duration(400).springify()}
              style={styles.contentContainer}
            >
              <ThemedText style={styles.caughtText}>You caught a</ThemedText>
              
              <View style={[styles.rarityBadge, { 
                backgroundColor: config.primary + "20",
                borderColor: config.primary,
                shadowColor: config.primary,
              }]}>
                <ThemedText style={[styles.rarityText, { color: config.primary }]}>
                  {config.label} EGG
                </ThemedText>
              </View>

              {quality === "perfect" && (
                <Animated.View 
                  entering={FadeIn.delay(200).duration(300)}
                  style={styles.perfectBanner}
                >
                  <Feather name="star" size={14} color="#FFD700" />
                  <ThemedText style={styles.perfectText}>PERFECT CATCH!</ThemedText>
                  <Feather name="star" size={14} color="#FFD700" />
                </Animated.View>
              )}

              <Animated.View 
                entering={FadeInUp.delay(300).duration(400)}
                style={styles.rewardsCard}
              >
                <BlurView intensity={20} tint="dark" style={styles.rewardsBlur}>
                  <View style={styles.rewardsRow}>
                    <View style={styles.rewardItem}>
                      <View style={[styles.rewardIcon, { backgroundColor: "#F59E0B20" }]}>
                        <Feather name="zap" size={20} color="#F59E0B" />
                      </View>
                      <ThemedText style={styles.rewardValue}>+{xpAwarded}</ThemedText>
                      <ThemedText style={styles.rewardLabel}>XP</ThemedText>
                    </View>
                    
                    <View style={styles.rewardDivider} />
                    
                    <View style={styles.rewardItem}>
                      <View style={[styles.rewardIcon, { backgroundColor: "#3B82F620" }]}>
                        <Feather name="award" size={20} color="#3B82F6" />
                      </View>
                      <ThemedText style={styles.rewardValue}>+{pointsAwarded}</ThemedText>
                      <ThemedText style={styles.rewardLabel}>Points</ThemedText>
                    </View>
                  </View>
                </BlurView>
              </Animated.View>

              <Animated.View 
                entering={FadeInUp.delay(500).duration(400)}
                style={styles.pityCard}
              >
                <ThemedText style={styles.pityTitle}>Next Guaranteed Drop</ThemedText>
                <View style={styles.pityRow}>
                  <View style={styles.pityItem}>
                    <ThemedText style={[styles.pityCount, { color: "#60A5FA" }]}>
                      {pity.rareIn}
                    </ThemedText>
                    <ThemedText style={[styles.pityLabel, { color: "#60A5FA" }]}>Rare</ThemedText>
                  </View>
                  <View style={[styles.pityDot, { backgroundColor: "#374151" }]} />
                  <View style={styles.pityItem}>
                    <ThemedText style={[styles.pityCount, { color: "#C084FC" }]}>
                      {pity.epicIn}
                    </ThemedText>
                    <ThemedText style={[styles.pityLabel, { color: "#C084FC" }]}>Epic</ThemedText>
                  </View>
                  <View style={[styles.pityDot, { backgroundColor: "#374151" }]} />
                  <View style={styles.pityItem}>
                    <ThemedText style={[styles.pityCount, { color: "#FCD34D" }]}>
                      {pity.legendaryIn}
                    </ThemedText>
                    <ThemedText style={[styles.pityLabel, { color: "#FCD34D" }]}>Legendary</ThemedText>
                  </View>
                </View>
              </Animated.View>
            </Animated.View>
          )}

          {showContent && (
            <Animated.View 
              entering={FadeInUp.delay(700).duration(400)}
              style={styles.buttonContainer}
            >
            <Pressable 
              style={styles.primaryButton}
              onPress={handleContinue}
            >
              <LinearGradient
                colors={[config.primary, config.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButtonGradient}
              >
                <Feather name="map" size={20} color="#000" />
                <ThemedText style={styles.primaryButtonText}>Hunt More</ThemedText>
              </LinearGradient>
            </Pressable>

            <Pressable 
              style={[styles.secondaryButton, { borderColor: config.primary + "60" }]}
              onPress={handleGoToEggs}
            >
              <Feather name="package" size={18} color={config.primary} />
              <ThemedText style={[styles.secondaryButtonText, { color: config.primary }]}>
                View Eggs
              </ThemedText>
            </Pressable>
            </Animated.View>
          )}
        </ScrollView>

        <Pressable 
          style={[styles.closeButton, { top: insets.top + Spacing.sm }]}
          onPress={handleContinue}
        >
          <BlurView intensity={30} tint="dark" style={styles.closeButtonBlur}>
            <Feather name="x" size={20} color="#fff" />
          </BlurView>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
  },
  eggSection: {
    height: SCREEN_HEIGHT * 0.38,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  burstContainer: {
    position: "absolute",
    alignSelf: "center",
  },
  burst: {
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  glowContainer: {
    position: "absolute",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  glowOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    position: "absolute",
  },
  glowInner: {
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  particleContainer: {
    position: "absolute",
    alignSelf: "center",
    width: 10,
    height: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  particle: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  eggWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  eggImage: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.6,
    shadowRadius: 25,
  },
  contentContainer: {
    alignItems: "center",
    width: "100%",
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  caughtText: {
    fontSize: 18,
    color: "#9CA3AF",
    marginBottom: Spacing.sm,
    letterSpacing: 1,
  },
  rarityBadge: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    marginBottom: Spacing.md,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 8,
  },
  rarityText: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 3,
  },
  perfectBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  perfectText: {
    color: "#FFD700",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 2,
  },
  rewardsCard: {
    width: "100%",
    maxWidth: 280,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  rewardsBlur: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  rewardsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  rewardItem: {
    alignItems: "center",
    flex: 1,
  },
  rewardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  rewardValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },
  rewardLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  rewardDivider: {
    width: 1,
    height: 60,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginHorizontal: Spacing.lg,
  },
  pityCard: {
    backgroundColor: "rgba(30, 30, 40, 0.8)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    width: "100%",
    maxWidth: 300,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  pityTitle: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: Spacing.sm,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  pityRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  pityItem: {
    alignItems: "center",
    paddingHorizontal: Spacing.md,
  },
  pityCount: {
    fontSize: 20,
    fontWeight: "700",
  },
  pityLabel: {
    fontSize: 10,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  pityDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  buttonContainer: {
    width: "100%",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
    marginTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  primaryButton: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md + 4,
    gap: Spacing.sm,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    letterSpacing: 1,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    gap: Spacing.sm,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  closeButton: {
    position: "absolute",
    left: Spacing.lg,
    zIndex: 100,
  },
  closeButtonBlur: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
});
