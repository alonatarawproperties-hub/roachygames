import React, { useEffect, useState, useMemo } from "react";
import { View, StyleSheet, Pressable, Modal, Dimensions, Image, ScrollView } from "react-native";
import Svg, { Circle, Line, Defs, LinearGradient as SvgLinearGradient, Stop, Ellipse } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  withDelay,
  Easing,
  FadeIn,
  FadeInUp,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ObsidianBronzeAR, Spacing, BorderRadius, normalizeRarity, getFusionTheme, FusionRarity } from "@/constants/theme";

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
const STAGE_SIZE = Math.min(SCREEN_WIDTH * 0.75, 280);

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
  const rarity4 = normalizeRarity(eggRarity) as FusionRarity;
  const theme = getFusionTheme(rarity4);

  const [phase, setPhase] = useState<"reveal" | "complete">("reveal");
  const [showContent, setShowContent] = useState(false);

  const eggScale = useSharedValue(0);
  const eggRotation = useSharedValue(0);
  const eggFloat = useSharedValue(0);
  const haloOpacity = useSharedValue(0);
  const ringRotation = useSharedValue(0);
  const ringPulse = useSharedValue(1);
  const shockwaveScale = useSharedValue(1);
  const shockwaveOpacity = useSharedValue(0);
  const shockwave2Scale = useSharedValue(1);
  const shockwave2Opacity = useSharedValue(0);
  const sparkBurstOpacity = useSharedValue(0);
  const arcFlickerOpacity = useSharedValue(0);
  const circuitShimmerX = useSharedValue(-100);
  const emberStreakOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setPhase("reveal");
      setShowContent(false);

      eggScale.value = 0;
      eggRotation.value = 0;
      eggFloat.value = 0;
      haloOpacity.value = 0;
      ringRotation.value = 0;
      ringPulse.value = 1;
      shockwaveScale.value = 1;
      shockwaveOpacity.value = 0;
      shockwave2Scale.value = 1;
      shockwave2Opacity.value = 0;
      sparkBurstOpacity.value = 0;
      arcFlickerOpacity.value = 0;
      circuitShimmerX.value = -100;
      emberStreakOpacity.value = 0;

      ringRotation.value = withRepeat(
        withTiming(360, { duration: 20000, easing: Easing.linear }),
        -1,
        false
      );

      const pulseSpeed = 2000;
      ringPulse.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: pulseSpeed, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: pulseSpeed, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      eggScale.value = withSpring(1, { damping: 12, stiffness: 100 });
      haloOpacity.value = withTiming(0.3, { duration: 400 });

      setTimeout(() => {
        eggRotation.value = withRepeat(
          withSequence(
            withTiming(-8, { duration: 70, easing: Easing.inOut(Easing.ease) }),
            withTiming(8, { duration: 70, easing: Easing.inOut(Easing.ease) }),
            withTiming(-6, { duration: 60, easing: Easing.inOut(Easing.ease) }),
            withTiming(6, { duration: 60, easing: Easing.inOut(Easing.ease) }),
            withTiming(0, { duration: 50 })
          ),
          2,
          false
        );
      }, 200);

      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        shockwaveScale.value = withTiming(1.8, { duration: 350, easing: Easing.out(Easing.cubic) });
        shockwaveOpacity.value = withSequence(
          withTiming(0.8, { duration: 80 }),
          withTiming(0, { duration: 270 })
        );

        if (rarity4 === 'rare' || rarity4 === 'epic' || rarity4 === 'legendary') {
          shockwave2Scale.value = withDelay(120, withTiming(2.0, { duration: 400, easing: Easing.out(Easing.cubic) }));
          shockwave2Opacity.value = withDelay(120, withSequence(
            withTiming(0.5, { duration: 60 }),
            withTiming(0, { duration: 340 })
          ));
        }

        sparkBurstOpacity.value = withSequence(
          withDelay(150, withTiming(1, { duration: 80 })),
          withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) })
        );

        if (rarity4 === 'rare') {
          arcFlickerOpacity.value = withSequence(
            withDelay(100, withTiming(0.7, { duration: 50 })),
            withTiming(0, { duration: 150 })
          );
        }

        if (rarity4 === 'epic') {
          circuitShimmerX.value = withDelay(100, withTiming(STAGE_SIZE + 100, { duration: 400, easing: Easing.out(Easing.cubic) }));
        }

        if (rarity4 === 'legendary') {
          emberStreakOpacity.value = withSequence(
            withDelay(50, withTiming(0.8, { duration: 100 })),
            withTiming(0, { duration: 200 })
          );
          haloOpacity.value = withTiming(0.6, { duration: 400 });
        } else if (rarity4 === 'epic') {
          haloOpacity.value = withRepeat(
            withSequence(
              withTiming(0.5, { duration: 1500 }),
              withTiming(0.35, { duration: 1500 })
            ),
            -1,
            true
          );
        } else {
          haloOpacity.value = withTiming(0.4, { duration: 400 });
        }

        eggScale.value = withSequence(
          withSpring(1.2, { damping: 6, stiffness: 200 }),
          withSpring(1, { damping: 10, stiffness: 100 })
        );

        eggFloat.value = withRepeat(
          withSequence(
            withTiming(-6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
            withTiming(6, { duration: 1500, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        );
      }, 800);

      setTimeout(() => {
        setShowContent(true);
        setPhase("complete");
      }, 900);
    } else {
      eggScale.value = 0;
      haloOpacity.value = 0;
      setShowContent(false);
      setPhase("reveal");
    }
  }, [visible, rarity4]);

  const eggStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: eggScale.value },
      { rotate: `${eggRotation.value}deg` },
      { translateY: eggFloat.value },
    ],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ringRotation.value}deg` }, { scale: ringPulse.value }],
  }));


  const shockwaveStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shockwaveScale.value }],
    opacity: shockwaveOpacity.value,
  }));

  const shockwave2Style = useAnimatedStyle(() => ({
    transform: [{ scale: shockwave2Scale.value }],
    opacity: shockwave2Opacity.value,
  }));

  const sparkBurstStyle = useAnimatedStyle(() => ({
    opacity: sparkBurstOpacity.value,
  }));

  const arcFlickerStyle = useAnimatedStyle(() => ({
    opacity: arcFlickerOpacity.value,
  }));

  const circuitShimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: circuitShimmerX.value }],
  }));

  const emberStreakStyle = useAnimatedStyle(() => ({
    opacity: emberStreakOpacity.value,
  }));

  const sparkPositions = useMemo(() => {
    const count = rarity4 === 'legendary' ? 10 : rarity4 === 'epic' ? 8 : rarity4 === 'rare' ? 6 : 0;
    return Array.from({ length: count }, (_, i) => ({
      angle: (i / count) * 360,
      distance: 35 + Math.random() * 25,
    }));
  }, [rarity4]);

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
  const eggSize = isSmallScreen ? { width: 120, height: 150 } : { width: 150, height: 185 };

  return (
    <Modal visible={visible} transparent={false} animationType="fade">
      <View style={styles.container}>
        <LinearGradient
          colors={[ObsidianBronzeAR.obsidian, ObsidianBronzeAR.obsidianBrown, '#0A0705']}
          style={StyleSheet.absoluteFill}
          locations={[0, 0.5, 1]}
        />

        <LinearGradient
          colors={['rgba(11,11,13,0.7)', 'transparent', 'transparent', 'rgba(11,11,13,0.8)']}
          locations={[0, 0.2, 0.8, 1]}
          style={StyleSheet.absoluteFill}
        />

        <LinearGradient
          colors={['rgba(11,11,13,0.5)', 'transparent', 'transparent', 'rgba(11,11,13,0.6)']}
          locations={[0, 0.15, 0.85, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
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
          <View style={[styles.stageContainer, { width: STAGE_SIZE, height: STAGE_SIZE }]}>
            <Animated.View style={[styles.haloContainer, haloStyle, { width: STAGE_SIZE * 1.2, height: STAGE_SIZE * 1.2 }]}>
              <LinearGradient
                colors={[theme.accentGlow, 'transparent']}
                style={styles.haloGradient}
              />
            </Animated.View>

            <View style={styles.platformEllipse}>
              <Svg width={STAGE_SIZE} height={50}>
                <Defs>
                  <SvgLinearGradient id="platformGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor={ObsidianBronzeAR.bronze} stopOpacity="0.3" />
                    <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
                  </SvgLinearGradient>
                </Defs>
                <Ellipse
                  cx={STAGE_SIZE / 2}
                  cy={25}
                  rx={STAGE_SIZE / 2 - 15}
                  ry={20}
                  fill="url(#platformGrad)"
                />
                <Ellipse
                  cx={STAGE_SIZE / 2}
                  cy={25}
                  rx={STAGE_SIZE / 2 - 15}
                  ry={20}
                  fill="none"
                  stroke={ObsidianBronzeAR.bronze}
                  strokeWidth={1.5}
                  opacity={0.5}
                />
              </Svg>
            </View>

            <Animated.View style={[styles.ringsContainer, ringStyle, { width: STAGE_SIZE, height: STAGE_SIZE }]}>
              <Svg width={STAGE_SIZE} height={STAGE_SIZE}>
                <Circle
                  cx={STAGE_SIZE / 2}
                  cy={STAGE_SIZE / 2}
                  r={STAGE_SIZE / 2 - 15}
                  fill="none"
                  stroke={ObsidianBronzeAR.bronze}
                  strokeWidth={1}
                  strokeDasharray="8 12"
                  opacity={0.35}
                />
                <Circle
                  cx={STAGE_SIZE / 2}
                  cy={STAGE_SIZE / 2}
                  r={STAGE_SIZE / 2 - 35}
                  fill="none"
                  stroke={theme.accentMain}
                  strokeWidth={0.8}
                  strokeDasharray="5 15"
                  opacity={0.3}
                />
                <Circle
                  cx={STAGE_SIZE / 2}
                  cy={STAGE_SIZE / 2}
                  r={STAGE_SIZE / 2 - 55}
                  fill="none"
                  stroke={ObsidianBronzeAR.bronze}
                  strokeWidth={0.6}
                  strokeDasharray="3 16"
                  opacity={0.25}
                />

                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
                  const rad = (angle * Math.PI) / 180;
                  const r = STAGE_SIZE / 2 - 15;
                  const cx = STAGE_SIZE / 2;
                  const cy = STAGE_SIZE / 2;
                  const x1 = cx + Math.cos(rad) * (r - 6);
                  const y1 = cy + Math.sin(rad) * (r - 6);
                  const x2 = cx + Math.cos(rad) * (r + 2);
                  const y2 = cy + Math.sin(rad) * (r + 2);
                  return (
                    <Line
                      key={angle}
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke={ObsidianBronzeAR.bronze}
                      strokeWidth={1.5}
                      opacity={0.4}
                    />
                  );
                })}
              </Svg>
            </Animated.View>

            {rarity4 === 'epic' && (
              <Animated.View style={[styles.circuitShimmer, circuitShimmerStyle]}>
                <View style={[styles.circuitLine, { backgroundColor: theme.accentMain }]} />
              </Animated.View>
            )}

            <View style={styles.centerArea}>
              <Animated.View style={[styles.shockwave, shockwaveStyle]}>
                <View style={[styles.shockwaveRing, { borderColor: ObsidianBronzeAR.bronze }]} />
              </Animated.View>

              {(rarity4 === 'rare' || rarity4 === 'epic' || rarity4 === 'legendary') && (
                <Animated.View style={[styles.shockwave2, shockwave2Style]}>
                  <View style={[styles.shockwaveRing, { borderColor: theme.accentMain }]} />
                </Animated.View>
              )}

              {rarity4 === 'rare' && (
                <Animated.View style={[styles.arcFlickerContainer, arcFlickerStyle]}>
                  {[0, 120, 240].map((angle) => (
                    <View
                      key={angle}
                      style={[
                        styles.arcFlicker,
                        {
                          transform: [{ rotate: `${angle}deg` }],
                          backgroundColor: theme.accentMain,
                        },
                      ]}
                    />
                  ))}
                </Animated.View>
              )}

              {rarity4 === 'legendary' && (
                <Animated.View style={[styles.emberStreaksContainer, emberStreakStyle]}>
                  {[0, 1, 2].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.emberStreak,
                        {
                          left: STAGE_SIZE / 2 - 35 + i * 35,
                          backgroundColor: theme.accentMain,
                        },
                      ]}
                    />
                  ))}
                </Animated.View>
              )}

              {sparkPositions.length > 0 && (
                <Animated.View style={[styles.sparkBurst, sparkBurstStyle]}>
                  {sparkPositions.map((spark, i) => {
                    const rad = (spark.angle * Math.PI) / 180;
                    const x = Math.cos(rad) * spark.distance;
                    const y = Math.sin(rad) * spark.distance;
                    const isAccent = i % 3 === 0;
                    return (
                      <View
                        key={i}
                        style={[
                          styles.spark,
                          {
                            transform: [{ translateX: x }, { translateY: y }],
                            backgroundColor: isAccent ? theme.accentMain : ObsidianBronzeAR.amber,
                          },
                        ]}
                      />
                    );
                  })}
                </Animated.View>
              )}

              <Animated.View style={[styles.eggWrapper, eggStyle]}>
                <Image
                  source={EGG_IMAGES[eggRarity] || EGG_IMAGES.common}
                  style={[styles.eggImage, eggSize]}
                  resizeMode="contain"
                />
              </Animated.View>
            </View>
          </View>

          {showContent && (
            <Animated.View
              entering={FadeInUp.duration(400).springify()}
              style={styles.contentContainer}
            >
              <ThemedText style={styles.caughtText}>You caught a</ThemedText>

              <View style={[styles.rarityBadge, { borderColor: theme.accentMain + '50' }]}>
                <ThemedText style={[styles.rarityText, { color: theme.accentMain }]}>
                  {rarity4.toUpperCase()} EGG
                </ThemedText>
              </View>

              {quality === "perfect" && (
                <Animated.View
                  entering={FadeIn.delay(200).duration(300)}
                  style={styles.perfectBanner}
                >
                  <Feather name="star" size={14} color={ObsidianBronzeAR.amber} />
                  <ThemedText style={styles.perfectText}>PERFECT CATCH!</ThemedText>
                  <Feather name="star" size={14} color={ObsidianBronzeAR.amber} />
                </Animated.View>
              )}

              <Animated.View
                entering={FadeInUp.delay(300).duration(400)}
                style={[styles.rewardsCard, { borderColor: theme.accentMain + '25' }]}
              >
                <View style={styles.rewardsRow}>
                  <View style={styles.rewardItem}>
                    <View style={[styles.rewardIcon, { backgroundColor: '#F59E0B20' }]}>
                      <Feather name="zap" size={20} color="#F59E0B" />
                    </View>
                    <ThemedText style={styles.rewardValue}>+{xpAwarded}</ThemedText>
                    <ThemedText style={styles.rewardLabel}>XP</ThemedText>
                  </View>

                  <View style={styles.rewardDivider} />

                  <View style={styles.rewardItem}>
                    <View style={[styles.rewardIcon, { backgroundColor: '#3B82F620' }]}>
                      <Feather name="award" size={20} color="#3B82F6" />
                    </View>
                    <ThemedText style={styles.rewardValue}>+{pointsAwarded}</ThemedText>
                    <ThemedText style={styles.rewardLabel}>Points</ThemedText>
                  </View>
                </View>
              </Animated.View>

              <Animated.View
                entering={FadeInUp.delay(500).duration(400)}
                style={[styles.pityCard, { borderColor: ObsidianBronzeAR.bronze + '30' }]}
              >
                <ThemedText style={styles.pityTitle}>Next Guaranteed Drop</ThemedText>
                <View style={styles.pityRow}>
                  <View style={styles.pityItem}>
                    <ThemedText style={[styles.pityCount, { color: "#8A5CFF" }]}>
                      {pity.rareIn}
                    </ThemedText>
                    <ThemedText style={[styles.pityLabel, { color: "#8A5CFF" }]}>Rare</ThemedText>
                  </View>
                  <View style={styles.pityDot} />
                  <View style={styles.pityItem}>
                    <ThemedText style={[styles.pityCount, { color: "#21D4C2" }]}>
                      {pity.epicIn}
                    </ThemedText>
                    <ThemedText style={[styles.pityLabel, { color: "#21D4C2" }]}>Epic</ThemedText>
                  </View>
                  <View style={styles.pityDot} />
                  <View style={styles.pityItem}>
                    <ThemedText style={[styles.pityCount, { color: "#F2B94B" }]}>
                      {pity.legendaryIn}
                    </ThemedText>
                    <ThemedText style={[styles.pityLabel, { color: "#F2B94B" }]}>Legendary</ThemedText>
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
                  colors={[ObsidianBronzeAR.bronze, '#8A5A2A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryButtonGradient}
                >
                  <Feather name="map" size={20} color="#FFFFFF" />
                  <ThemedText style={styles.primaryButtonText}>Hunt More</ThemedText>
                </LinearGradient>
              </Pressable>

              <Pressable
                style={[styles.secondaryButton, { borderColor: theme.accentMain + '50' }]}
                onPress={handleGoToEggs}
              >
                <Feather name="package" size={18} color={theme.accentMain} />
                <ThemedText style={[styles.secondaryButtonText, { color: theme.accentMain }]}>
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
          <View style={styles.closeButtonBg}>
            <Feather name="x" size={20} color="#fff" />
          </View>
        </Pressable>
      </View>
    </Modal>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ObsidianBronzeAR.obsidian,
  },
  scrollView: {
    flex: 1,
    zIndex: 2,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  stageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  haloContainer: {
    position: 'absolute',
    borderRadius: 1000,
    overflow: 'hidden',
  },
  haloGradient: {
    flex: 1,
    borderRadius: 1000,
  },
  platformEllipse: {
    position: 'absolute',
    bottom: 10,
  },
  ringsContainer: {
    position: 'absolute',
  },
  circuitShimmer: {
    position: 'absolute',
    width: 3,
    height: '100%',
    overflow: 'hidden',
  },
  circuitLine: {
    width: 2,
    height: '100%',
    opacity: 0.3,
  },
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  shockwave: {
    position: 'absolute',
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shockwave2: {
    position: 'absolute',
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shockwaveRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
  },
  arcFlickerContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arcFlicker: {
    position: 'absolute',
    width: 3,
    height: 18,
    borderRadius: 1.5,
    top: 25,
  },
  emberStreaksContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  emberStreak: {
    position: 'absolute',
    width: 3,
    height: 35,
    borderRadius: 1.5,
    bottom: '55%',
  },
  sparkBurst: {
    position: 'absolute',
    width: 0,
    height: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spark: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  eggWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  eggImage: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  contentContainer: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  caughtText: {
    fontSize: 16,
    color: ObsidianBronzeAR.textMuted,
    marginBottom: Spacing.sm,
    letterSpacing: 1,
  },
  rarityBadge: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: ObsidianBronzeAR.smokedGlassStrong,
    marginBottom: Spacing.md,
  },
  rarityText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
  },
  perfectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  perfectText: {
    color: ObsidianBronzeAR.amber,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 2,
  },
  rewardsCard: {
    width: '100%',
    maxWidth: 280,
    borderRadius: 16,
    backgroundColor: ObsidianBronzeAR.smokedGlassStrong,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  rewardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardItem: {
    alignItems: 'center',
    flex: 1,
  },
  rewardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  rewardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rewardLabel: {
    fontSize: 11,
    color: ObsidianBronzeAR.textMuted,
    marginTop: 2,
  },
  rewardDivider: {
    width: 1,
    height: 55,
    backgroundColor: 'rgba(176,122,58,0.2)',
    marginHorizontal: Spacing.lg,
  },
  pityCard: {
    backgroundColor: ObsidianBronzeAR.smokedGlassStrong,
    borderRadius: 14,
    padding: Spacing.md,
    width: '100%',
    maxWidth: 300,
    borderWidth: 1,
  },
  pityTitle: {
    fontSize: 10,
    color: ObsidianBronzeAR.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  pityRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pityItem: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  pityCount: {
    fontSize: 18,
    fontWeight: '700',
  },
  pityLabel: {
    fontSize: 10,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pityDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: ObsidianBronzeAR.bronze + '40',
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
    marginTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  primaryButton: {
    borderRadius: 14,
    overflow: 'hidden',
    ...ObsidianBronzeAR.shadows.soft,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md + 2,
    gap: Spacing.sm,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: ObsidianBronzeAR.smokedGlass,
    gap: Spacing.sm,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  closeButton: {
    position: 'absolute',
    left: Spacing.lg,
    zIndex: 100,
  },
  closeButtonBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: ObsidianBronzeAR.smokedGlassStrong,
    borderWidth: 1,
    borderColor: 'rgba(176,122,58,0.2)',
  },
});
