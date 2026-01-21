import React, { useEffect, useState, useMemo } from "react";
import { View, StyleSheet, Modal, Dimensions, Image, Pressable } from "react-native";
import Svg, { Circle, Line, Defs, LinearGradient as SvgLinearGradient, Stop, Rect, G } from "react-native-svg";
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
  interpolate,
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ObsidianBronzeAR, Spacing, normalizeRarity, getFusionTheme, FusionRarity } from "@/constants/theme";

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
const PLATFORM_SIZE = Math.min(SCREEN_WIDTH * 0.7, 280);
const DOME_SIZE = PLATFORM_SIZE * 1.1;
const EGG_SIZE = Math.min(SCREEN_WIDTH * 0.35, 140);

interface FusionAnimationModalProps {
  visible: boolean;
  inputRarity: "common" | "rare" | "epic";
  outputRarity: "rare" | "epic" | "legendary";
  inputCount: number;
  successCount: number;
  failCount: number;
  onComplete: () => void;
}

const EGG_POSITIONS = [
  { x: -85, y: -75, delay: 0 },
  { x: 85, y: -75, delay: 50 },
  { x: -70, y: 45, delay: 100 },
  { x: 70, y: 45, delay: 150 },
  { x: 0, y: -110, delay: 200 },
];

export function FusionAnimationModal({
  visible,
  inputRarity,
  outputRarity,
  inputCount,
  successCount,
  failCount,
  onComplete,
}: FusionAnimationModalProps) {
  const [phase, setPhase] = useState<"idle" | "gather" | "merge" | "transform" | "reveal" | "done">("idle");
  
  const normalizedOutput = normalizeRarity(outputRarity);
  const fusionTheme = getFusionTheme(normalizedOutput);
  
  const eggPositions = EGG_POSITIONS.slice(0, Math.min(inputCount, 5));

  const gatherProgress = useSharedValue(0);
  const mergeFlash = useSharedValue(0);
  const shockwaveScale = useSharedValue(1);
  const shockwaveOpacity = useSharedValue(0);
  const resultScale = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const ringRotation = useSharedValue(0);
  const ringPulse = useSharedValue(1);
  const domeShimmer = useSharedValue(0);
  const platformGlow = useSharedValue(0.3);
  const floatY = useSharedValue(0);
  const rayOpacity = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      setPhase("idle");
      gatherProgress.value = 0;
      mergeFlash.value = 0;
      shockwaveScale.value = 1;
      shockwaveOpacity.value = 0;
      resultScale.value = 0;
      shakeX.value = 0;
      ringRotation.value = 0;
      ringPulse.value = 1;
      domeShimmer.value = 0;
      platformGlow.value = 0.3;
      floatY.value = 0;
      rayOpacity.value = 0;
      return;
    }

    setPhase("gather");

    ringRotation.value = withRepeat(
      withTiming(360, { duration: 10000, easing: Easing.linear }),
      -1,
      false
    );

    ringPulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: fusionTheme.pulseSpeedSec * 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: fusionTheme.pulseSpeedSec * 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    domeShimmer.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 2000 }),
        withTiming(0.1, { duration: 2000 })
      ),
      -1,
      true
    );

    gatherProgress.value = withTiming(1, { duration: 1600, easing: Easing.bezier(0.4, 0, 0.2, 1) });

    const gatherTimeout = setTimeout(() => {
      runOnJS(setPhase)("merge");
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Heavy);
      
      mergeFlash.value = withSequence(
        withTiming(1, { duration: 180 }),
        withTiming(0, { duration: 200 })
      );

      shockwaveScale.value = withTiming(1.8, { duration: 350, easing: Easing.out(Easing.cubic) });
      shockwaveOpacity.value = withSequence(
        withTiming(0.8, { duration: 100 }),
        withTiming(0, { duration: 250 })
      );

      rayOpacity.value = withSequence(
        withTiming(fusionTheme.intensity * 0.6, { duration: 150 }),
        withTiming(fusionTheme.intensity * 0.3, { duration: 400 })
      );
      
      shakeX.value = withSequence(
        withTiming(-8, { duration: 35 }),
        withTiming(8, { duration: 35 }),
        withTiming(-6, { duration: 35 }),
        withTiming(6, { duration: 35 }),
        withTiming(0, { duration: 40 })
      );

      platformGlow.value = withSequence(
        withTiming(0.8, { duration: 200 }),
        withTiming(0.5, { duration: 300 })
      );
    }, 1700);

    const transformTimeout = setTimeout(() => {
      runOnJS(setPhase)("transform");
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
      
      rayOpacity.value = withTiming(fusionTheme.intensity * 0.5, { duration: 800 });
    }, 2200);

    const revealTimeout = setTimeout(() => {
      runOnJS(setPhase)("reveal");
      runOnJS(Haptics.notificationAsync)(
        successCount > 0 
          ? Haptics.NotificationFeedbackType.Success 
          : Haptics.NotificationFeedbackType.Warning
      );

      mergeFlash.value = withSequence(
        withTiming(1, { duration: 180 }),
        withTiming(0, { duration: 300 })
      );

      shockwaveScale.value = 1;
      shockwaveScale.value = withTiming(2.2, { duration: 400, easing: Easing.out(Easing.cubic) });
      shockwaveOpacity.value = withSequence(
        withTiming(0.9, { duration: 80 }),
        withTiming(0, { duration: 320 })
      );
      
      resultScale.value = withSequence(
        withSpring(1.12, { damping: 6, stiffness: 150 }),
        withSpring(1, { damping: 10, stiffness: 100 })
      );

      floatY.value = withRepeat(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );

      rayOpacity.value = withTiming(fusionTheme.intensity * 0.25, { duration: 1000 });
      platformGlow.value = withTiming(normalizedOutput === 'legendary' ? 0.6 : normalizedOutput === 'epic' ? 0.5 : 0.4, { duration: 800 });
    }, 4000);

    const doneTimeout = setTimeout(() => {
      runOnJS(setPhase)("done");
    }, 5500);

    return () => {
      clearTimeout(gatherTimeout);
      clearTimeout(transformTimeout);
      clearTimeout(revealTimeout);
      clearTimeout(doneTimeout);
    };
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: mergeFlash.value,
  }));

  const shockwaveStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shockwaveScale.value }],
    opacity: shockwaveOpacity.value,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ringRotation.value}deg` }, { scale: ringPulse.value }],
  }));

  const domeStyle = useAnimatedStyle(() => ({
    opacity: 0.6 + domeShimmer.value,
  }));

  const platformGlowStyle = useAnimatedStyle(() => ({
    opacity: platformGlow.value,
  }));

  const resultEggStyle = useAnimatedStyle(() => {
    const translateY = interpolate(floatY.value, [0, 1], [0, -10]);
    return {
      transform: [{ scale: resultScale.value }, { translateY }],
      opacity: resultScale.value,
    };
  });

  const rayStyle = useAnimatedStyle(() => ({
    opacity: rayOpacity.value,
  }));

  const InputEgg = ({ index, startX, startY }: { index: number; startX: number; startY: number }) => {
    const eggStyle = useAnimatedStyle(() => {
      const progress = gatherProgress.value;
      const easeProgress = interpolate(progress, [0, 0.2, 0.8, 1], [0, 0.05, 0.85, 1]);
      const x = interpolate(easeProgress, [0, 1], [startX, 0]);
      const y = interpolate(easeProgress, [0, 1], [startY, 0]);
      const scale = interpolate(progress, [0, 0.5, 0.9, 1], [0.5, 0.45, 0.3, 0]);
      const rotation = interpolate(progress, [0, 1], [0, 480 + index * 40]);
      
      return {
        transform: [
          { translateX: x },
          { translateY: y },
          { scale },
          { rotate: `${rotation}deg` },
        ],
        opacity: interpolate(progress, [0.85, 1], [1, 0]),
      };
    });

    return (
      <Animated.View style={[styles.inputEgg, eggStyle]}>
        <Image source={EGG_IMAGES[inputRarity]} style={styles.smallEggImage} resizeMode="contain" />
      </Animated.View>
    );
  };

  const isSuccess = successCount > 0;
  const displayRarity = isSuccess ? normalizedOutput : normalizeRarity(inputRarity);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onComplete();
  };

  const particlePositions = useMemo(() => {
    const count = fusionTheme.particleCount;
    return Array.from({ length: count }, (_, i) => ({
      angle: (i / count) * 360 + Math.random() * 20,
      radius: 60 + Math.random() * 50,
      size: 2 + Math.random() * 2,
      speed: 4000 + Math.random() * 3000,
      delay: Math.random() * 2000,
    }));
  }, [fusionTheme.particleCount]);

  const rayCount = normalizedOutput === 'legendary' ? 8 : normalizedOutput === 'epic' ? 6 : normalizedOutput === 'rare' ? 5 : 4;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.background}>
        <LinearGradient
          colors={[ObsidianBronzeAR.obsidian, ObsidianBronzeAR.obsidianBrown, '#0A0705']}
          style={StyleSheet.absoluteFill}
          locations={[0, 0.5, 1]}
        />
        
        <LinearGradient
          colors={['rgba(11,11,13,0.8)', 'transparent', 'transparent', 'rgba(11,11,13,0.9)']}
          locations={[0, 0.2, 0.8, 1]}
          style={StyleSheet.absoluteFill}
        />

        <Animated.View style={[StyleSheet.absoluteFill, containerStyle]}>
          <Animated.View style={[styles.raysContainer, rayStyle]}>
            {Array.from({ length: rayCount }, (_, i) => {
              const angle = (i / rayCount) * 360;
              return (
                <View
                  key={i}
                  style={[
                    styles.ray,
                    {
                      transform: [{ rotate: `${angle}deg` }],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={['transparent', fusionTheme.accentGlow, 'transparent']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={styles.rayGradient}
                  />
                </View>
              );
            })}
          </Animated.View>

          <View style={styles.stageContainer}>
            <Animated.View style={[styles.platformGlow, platformGlowStyle]}>
              <LinearGradient
                colors={[fusionTheme.accentGlow, 'transparent']}
                style={styles.platformGlowGradient}
              />
            </Animated.View>

            <View style={styles.platform}>
              <LinearGradient
                colors={['#1A1512', '#0D0A08', '#050403']}
                style={styles.platformGradient}
              />
              <View style={[styles.platformRim, { borderColor: ObsidianBronzeAR.bronze }]} />
            </View>

            <Animated.View style={[styles.dome, domeStyle]}>
              <Svg width={DOME_SIZE} height={DOME_SIZE} style={styles.domeSvg}>
                <Defs>
                  <SvgLinearGradient id="domeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor={ObsidianBronzeAR.bronze} stopOpacity="0.15" />
                    <Stop offset="50%" stopColor={fusionTheme.accentMain} stopOpacity="0.08" />
                    <Stop offset="100%" stopColor={ObsidianBronzeAR.bronze} stopOpacity="0.12" />
                  </SvgLinearGradient>
                </Defs>
                <Circle
                  cx={DOME_SIZE / 2}
                  cy={DOME_SIZE / 2}
                  r={DOME_SIZE / 2 - 4}
                  fill="none"
                  stroke="url(#domeGrad)"
                  strokeWidth={1.5}
                />
                <Circle
                  cx={DOME_SIZE / 2}
                  cy={DOME_SIZE / 2}
                  r={DOME_SIZE / 2 - 20}
                  fill="none"
                  stroke={ObsidianBronzeAR.bronze}
                  strokeWidth={0.5}
                  strokeDasharray="8 16"
                  opacity={0.3}
                />
                <Circle
                  cx={DOME_SIZE / 2}
                  cy={DOME_SIZE / 2}
                  r={DOME_SIZE / 2 - 35}
                  fill="none"
                  stroke={fusionTheme.accentMain}
                  strokeWidth={1}
                  strokeDasharray="4 20"
                  opacity={0.25}
                />
              </Svg>
            </Animated.View>

            <Animated.View style={[styles.ringContainer, ringStyle]}>
              <Svg width={PLATFORM_SIZE + 40} height={PLATFORM_SIZE + 40}>
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
                  const rad = (angle * Math.PI) / 180;
                  const r = (PLATFORM_SIZE + 40) / 2 - 8;
                  const cx = (PLATFORM_SIZE + 40) / 2;
                  const cy = (PLATFORM_SIZE + 40) / 2;
                  return (
                    <Circle
                      key={angle}
                      cx={cx + Math.cos(rad) * r}
                      cy={cy + Math.sin(rad) * r}
                      r={3}
                      fill={ObsidianBronzeAR.bronze}
                      opacity={0.6}
                    />
                  );
                })}
              </Svg>
            </Animated.View>

            <View style={styles.centerArea}>
              {phase === "gather" && eggPositions.map((pos, i) => (
                <InputEgg key={i} index={i} startX={pos.x} startY={pos.y} />
              ))}

              <Animated.View style={[styles.shockwave, shockwaveStyle]}>
                <View style={[styles.shockwaveRing, { borderColor: fusionTheme.accentMain }]} />
              </Animated.View>

              <Animated.View style={[styles.flash, flashStyle]}>
                <LinearGradient
                  colors={['transparent', fusionTheme.accentGlow, 'transparent']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              </Animated.View>

              {(phase === "reveal" || phase === "done") && (
                <Animated.View style={[styles.resultEggContainer, resultEggStyle]}>
                  <Image 
                    source={isSuccess ? EGG_IMAGES[normalizedOutput] : EGG_IMAGES[inputRarity]} 
                    style={styles.heroEggImage} 
                    resizeMode="contain" 
                  />
                </Animated.View>
              )}
            </View>

            {particlePositions.map((p, i) => (
              <DustMote
                key={i}
                angle={p.angle}
                radius={p.radius}
                size={p.size}
                speed={p.speed}
                delay={p.delay}
                color={i % 3 === 0 ? fusionTheme.accentMain : ObsidianBronzeAR.amber}
              />
            ))}
          </View>

          {phase === "gather" && (
            <View style={styles.statusContainer}>
              <ThemedText style={styles.statusText}>CHANNELING</ThemedText>
              <View style={styles.statusDots}>
                <View style={[styles.statusDot, { backgroundColor: ObsidianBronzeAR.bronze }]} />
                <View style={[styles.statusDot, { backgroundColor: ObsidianBronzeAR.bronze, opacity: 0.6 }]} />
                <View style={[styles.statusDot, { backgroundColor: ObsidianBronzeAR.bronze, opacity: 0.3 }]} />
              </View>
            </View>
          )}

          {phase === "merge" && (
            <Animated.View entering={ZoomIn.duration(150)} style={styles.statusContainer}>
              <ThemedText style={[styles.statusTextLarge, { textShadowColor: fusionTheme.accentGlow }]}>
                FUSION!
              </ThemedText>
            </Animated.View>
          )}

          {phase === "transform" && (
            <View style={styles.statusContainer}>
              <ThemedText style={[styles.statusText, { color: fusionTheme.accentMain }]}>
                TRANSMUTING
              </ThemedText>
            </View>
          )}

          {(phase === "reveal" || phase === "done") && (
            <Animated.View entering={FadeInDown.springify().damping(12)} style={styles.resultContainer}>
              <ThemedText style={[
                styles.resultTitle,
                { 
                  textShadowColor: isSuccess ? fusionTheme.accentGlow : 'rgba(239, 68, 68, 0.4)',
                }
              ]}>
                {isSuccess ? "FUSION SUCCESS" : "FUSION FAILED"}
              </ThemedText>
              
              {isSuccess ? (
                <View style={[styles.rewardPill, { borderColor: fusionTheme.accentMain + '50' }]}>
                  <ThemedText style={[styles.rewardPlus, { color: fusionTheme.accentMain }]}>+</ThemedText>
                  <ThemedText style={styles.rewardCount}>{successCount}</ThemedText>
                  <ThemedText style={[styles.rewardText, { color: fusionTheme.accentMain }]}>
                    {normalizedOutput.toUpperCase()} EGG{successCount > 1 ? "S" : ""}
                  </ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.resultFailText}>Better luck next time</ThemedText>
              )}
              
              {failCount > 0 && successCount > 0 && (
                <ThemedText style={styles.failNote}>
                  ({failCount} fusion{failCount > 1 ? "s" : ""} failed)
                </ThemedText>
              )}
            </Animated.View>
          )}

          {phase === "done" && (
            <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.buttonContainer}>
              <Pressable
                onPress={handleContinue}
                style={({ pressed }) => [
                  styles.continueButton,
                  pressed && styles.continueButtonPressed,
                ]}
              >
                <LinearGradient
                  colors={[ObsidianBronzeAR.bronze, '#8A5A2A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.continueButtonGradient}
                >
                  <ThemedText style={styles.continueButtonText}>CONTINUE</ThemedText>
                  <Feather name="arrow-right" size={18} color="#fff" />
                </LinearGradient>
                <View style={[styles.buttonAccentLine, { backgroundColor: fusionTheme.accentMain }]} />
              </Pressable>
            </Animated.View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

function DustMote({ angle, radius, size, speed, delay, color }: {
  angle: number;
  radius: number;
  size: number;
  speed: number;
  delay: number;
  color: string;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(0.5, { duration: speed * 0.2 }),
        withTiming(0.4, { duration: speed * 0.6 }),
        withTiming(0, { duration: speed * 0.2 })
      ),
      -1,
      false
    ));

    translateY.value = withDelay(delay, withRepeat(
      withTiming(-40, { duration: speed, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    ));
  }, []);

  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * radius;
  const y = Math.sin(rad) * radius;

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.dustMote,
        {
          left: PLATFORM_SIZE / 2 + x - size / 2,
          top: PLATFORM_SIZE / 2 + y - size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: ObsidianBronzeAR.obsidian,
  },
  stageContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.25,
    left: (SCREEN_WIDTH - PLATFORM_SIZE) / 2,
    width: PLATFORM_SIZE,
    height: PLATFORM_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformGlow: {
    position: 'absolute',
    width: PLATFORM_SIZE * 1.4,
    height: PLATFORM_SIZE * 1.4,
    borderRadius: PLATFORM_SIZE * 0.7,
    overflow: 'hidden',
  },
  platformGlowGradient: {
    flex: 1,
    borderRadius: PLATFORM_SIZE * 0.7,
  },
  platform: {
    position: 'absolute',
    width: PLATFORM_SIZE,
    height: PLATFORM_SIZE,
    borderRadius: PLATFORM_SIZE / 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: PLATFORM_SIZE / 2,
  },
  platformRim: {
    position: 'absolute',
    width: PLATFORM_SIZE - 4,
    height: PLATFORM_SIZE - 4,
    borderRadius: (PLATFORM_SIZE - 4) / 2,
    borderWidth: 1.5,
    opacity: 0.5,
  },
  dome: {
    position: 'absolute',
    width: DOME_SIZE,
    height: DOME_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  domeSvg: {
    position: 'absolute',
  },
  ringContainer: {
    position: 'absolute',
    width: PLATFORM_SIZE + 40,
    height: PLATFORM_SIZE + 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerArea: {
    position: 'absolute',
    width: PLATFORM_SIZE,
    height: PLATFORM_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputEgg: {
    position: 'absolute',
  },
  smallEggImage: {
    width: 50,
    height: 65,
  },
  flash: {
    position: 'absolute',
    width: PLATFORM_SIZE,
    height: PLATFORM_SIZE,
    borderRadius: PLATFORM_SIZE / 2,
    overflow: 'hidden',
  },
  shockwave: {
    position: 'absolute',
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shockwaveRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
  },
  resultEggContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroEggImage: {
    width: EGG_SIZE,
    height: EGG_SIZE * 1.3,
  },
  raysContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.25 + PLATFORM_SIZE / 2,
    left: SCREEN_WIDTH / 2,
    width: 0,
    height: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ray: {
    position: 'absolute',
    width: 30,
    height: SCREEN_HEIGHT * 0.5,
    transformOrigin: 'center bottom',
  },
  rayGradient: {
    flex: 1,
  },
  dustMote: {
    position: 'absolute',
  },
  statusContainer: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.28,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 4,
    color: ObsidianBronzeAR.textMuted,
  },
  statusTextLarge: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 6,
    color: '#FFFFFF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  statusDots: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  resultContainer: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.18,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#FFFFFF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
    marginBottom: 16,
  },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: ObsidianBronzeAR.smokedGlassStrong,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    gap: 6,
  },
  rewardPlus: {
    fontSize: 22,
    fontWeight: '800',
  },
  rewardCount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  rewardText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginLeft: 4,
  },
  resultFailText: {
    fontSize: 15,
    color: ObsidianBronzeAR.textMuted,
    fontWeight: '500',
  },
  failNote: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 8,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.06,
    left: 0,
    right: 0,
    paddingHorizontal: 50,
  },
  continueButton: {
    borderRadius: 28,
    overflow: 'hidden',
    ...ObsidianBronzeAR.shadows.soft,
  },
  continueButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  continueButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 28,
    gap: 10,
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  buttonAccentLine: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
    height: 2,
    borderRadius: 1,
    opacity: 0.6,
  },
});
