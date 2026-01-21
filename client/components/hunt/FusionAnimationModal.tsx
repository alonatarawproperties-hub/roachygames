import React, { useEffect, useState, useMemo } from "react";
import { View, StyleSheet, Modal, Dimensions, Image, Platform, Pressable, ImageBackground } from "react-native";
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
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";

const EggCommon = require("@/assets/hunt/egg-common.png");
const EggRare = require("@/assets/hunt/egg-rare.png");
const EggEpic = require("@/assets/hunt/egg-epic.png");
const EggLegendary = require("@/assets/hunt/egg-legendary.png");
const HolographicBackground = require("@/assets/fusion/holographic_portal_background.png");
const FusionBgRare = require("@/assets/fusion-bg-rare.png");

const FUSION_BACKGROUNDS: Record<string, any> = {
  rare: FusionBgRare,
  epic: HolographicBackground,
  legendary: HolographicBackground,
};

const EGG_IMAGES: Record<string, any> = {
  common: EggCommon,
  rare: EggRare,
  epic: EggEpic,
  legendary: EggLegendary,
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const EGG_SIZE = Math.min(SCREEN_WIDTH * 0.4, 170);

interface FusionAnimationModalProps {
  visible: boolean;
  inputRarity: "common" | "rare" | "epic";
  outputRarity: "rare" | "epic" | "legendary";
  inputCount: number;
  successCount: number;
  failCount: number;
  onComplete: () => void;
}

const RARITY_THEME: Record<string, {
  primary: string;
  secondary: string;
  glow: string;
  accent: string;
}> = {
  common: {
    primary: "#C9CED6",
    secondary: "#9CA3AF",
    glow: "rgba(201, 206, 214, 0.6)",
    accent: "#E6E8EC",
  },
  rare: {
    primary: "#00D4FF",
    secondary: "#0099CC",
    glow: "rgba(0, 212, 255, 0.6)",
    accent: "#66E5FF",
  },
  epic: {
    primary: "#B56CFF",
    secondary: "#9333EA",
    glow: "rgba(181, 108, 255, 0.6)",
    accent: "#D4A5FF",
  },
  legendary: {
    primary: "#FFD700",
    secondary: "#FFA500",
    glow: "rgba(255, 215, 0, 0.7)",
    accent: "#FFEC8B",
  },
};

const EGG_POSITIONS = [
  { x: -100, y: -90, delay: 0 },
  { x: 100, y: -90, delay: 50 },
  { x: -80, y: 50, delay: 100 },
  { x: 80, y: 50, delay: 150 },
  { x: 0, y: -130, delay: 200 },
];

const PulseRing = ({
  progress,
  color,
}: {
  progress: Animated.SharedValue<number>;
  color: string;
}) => {
  const ringStyle = useAnimatedStyle(() => {
    const scale = interpolate(progress.value, [0, 1], [0.8, 2.5]);
    const opacity = interpolate(progress.value, [0, 0.3, 1], [0.6, 0.3, 0]);
    
    return {
      transform: [{ scale }],
      opacity,
      borderColor: color,
    };
  });

  return <Animated.View style={[styles.pulseRing, ringStyle]} />;
};

export function FusionAnimationModal({
  visible,
  inputRarity,
  outputRarity,
  inputCount,
  successCount,
  failCount,
  onComplete,
}: FusionAnimationModalProps) {
  const [phase, setPhase] = useState<"gather" | "merge" | "transform" | "reveal" | "done">("gather");
  const inputConfig = RARITY_THEME[inputRarity];
  const outputConfig = RARITY_THEME[outputRarity];

  const eggPositions = EGG_POSITIONS.slice(0, Math.min(inputCount, 5));

  const gatherProgress = useSharedValue(0);
  const mergeFlash = useSharedValue(0);
  const vortexRotation = useSharedValue(0);
  const vortexScale = useSharedValue(0);
  const resultScale = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const ringPulse1 = useSharedValue(0);
  const ringPulse2 = useSharedValue(0);
  const ringPulse3 = useSharedValue(0);
  const innerGlow = useSharedValue(0);
  const floatProgress = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      setPhase("gather");
      gatherProgress.value = 0;
      mergeFlash.value = 0;
      vortexRotation.value = 0;
      vortexScale.value = 0;
      resultScale.value = 0;
      shakeX.value = 0;
      ringPulse1.value = 0;
      ringPulse2.value = 0;
      ringPulse3.value = 0;
      innerGlow.value = 0;
      floatProgress.value = 0;
      return;
    }

    gatherProgress.value = withTiming(1, { duration: 1600, easing: Easing.bezier(0.4, 0, 0.2, 1) });

    const gatherTimeout = setTimeout(() => {
      runOnJS(setPhase)("merge");
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Heavy);
      
      mergeFlash.value = withSequence(
        withTiming(1, { duration: 120 }),
        withTiming(0.2, { duration: 400 })
      );
      
      innerGlow.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0.5, { duration: 300 })
      );
      
      shakeX.value = withSequence(
        withTiming(-10, { duration: 40 }),
        withTiming(10, { duration: 40 }),
        withTiming(-8, { duration: 40 }),
        withTiming(8, { duration: 40 }),
        withTiming(-5, { duration: 40 }),
        withTiming(5, { duration: 40 }),
        withTiming(0, { duration: 40 })
      );

      ringPulse1.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    }, 1700);

    const transformTimeout = setTimeout(() => {
      runOnJS(setPhase)("transform");
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
      
      vortexScale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.2)) });
      vortexRotation.value = withRepeat(
        withTiming(360, { duration: 600, easing: Easing.linear }),
        4,
        false
      );
      
      ringPulse2.value = withDelay(200, withTiming(1, { duration: 800 }));
      ringPulse3.value = withDelay(400, withTiming(1, { duration: 800 }));
    }, 2200);

    const revealTimeout = setTimeout(() => {
      runOnJS(setPhase)("reveal");
      runOnJS(Haptics.notificationAsync)(
        successCount > 0 
          ? Haptics.NotificationFeedbackType.Success 
          : Haptics.NotificationFeedbackType.Warning
      );
      
      vortexScale.value = withTiming(0, { duration: 250 });
      
      resultScale.value = withSequence(
        withSpring(1.15, { damping: 6, stiffness: 150 }),
        withSpring(1, { damping: 10, stiffness: 100 })
      );

      floatProgress.value = withRepeat(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
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

  const vortexStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${vortexRotation.value}deg` },
      { scale: vortexScale.value },
    ],
    opacity: vortexScale.value,
  }));

  const innerGlowStyle = useAnimatedStyle(() => ({
    opacity: innerGlow.value * 0.8,
    transform: [{ scale: 1 + innerGlow.value * 0.2 }],
  }));

  const resultEggStyle = useAnimatedStyle(() => {
    const translateY = interpolate(floatProgress.value, [0, 1], [0, -12]);
    return {
      transform: [
        { scale: resultScale.value },
        { translateY },
      ],
      opacity: resultScale.value,
    };
  });

  const InputEgg = ({ index, startX, startY, delay }: { index: number; startX: number; startY: number; delay: number }) => {
    const eggStyle = useAnimatedStyle(() => {
      const progress = gatherProgress.value;
      const easeProgress = interpolate(progress, [0, 0.2, 0.8, 1], [0, 0.05, 0.85, 1]);
      const x = interpolate(easeProgress, [0, 1], [startX, 0]);
      const y = interpolate(easeProgress, [0, 1], [startY, 0]);
      const scale = interpolate(progress, [0, 0.5, 0.9, 1], [0.55, 0.5, 0.35, 0]);
      const rotation = interpolate(progress, [0, 1], [0, 540 + index * 45]);
      const glowIntensity = interpolate(progress, [0.7, 1], [0, 1]);
      
      return {
        transform: [
          { translateX: x },
          { translateY: y },
          { scale },
          { rotate: `${rotation}deg` },
        ],
        opacity: interpolate(progress, [0.85, 1], [1, 0]),
        shadowOpacity: glowIntensity * 0.8,
        shadowRadius: 15 + glowIntensity * 10,
      };
    });

    const trailStyle = useAnimatedStyle(() => {
      const progress = gatherProgress.value;
      const x = interpolate(progress, [0, 1], [startX, 0]);
      const y = interpolate(progress, [0, 1], [startY, 0]);
      
      return {
        transform: [
          { translateX: x * 0.85 },
          { translateY: y * 0.85 },
          { scale: interpolate(progress, [0, 0.8, 1], [0.3, 0.25, 0]) },
        ],
        opacity: interpolate(progress, [0.2, 0.9], [0.5, 0]),
      };
    });

    return (
      <>
        <Animated.View style={[styles.eggTrail, trailStyle, { backgroundColor: inputConfig.glow }]} />
        <Animated.View style={[styles.inputEgg, eggStyle, { shadowColor: inputConfig.primary }]}>
          <Image source={EGG_IMAGES[inputRarity]} style={styles.smallEggImage} resizeMode="contain" />
        </Animated.View>
      </>
    );
  };

  const isSuccess = successCount > 0;
  const revealConfig = isSuccess ? outputConfig : inputConfig;

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onComplete();
  };

  const fusionBackground = FUSION_BACKGROUNDS[outputRarity] || HolographicBackground;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <ImageBackground 
        source={fusionBackground} 
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <Animated.View style={[styles.container, containerStyle]}>
          <View style={styles.ambientGlow}>
            <Animated.View style={[styles.ambientRing, innerGlowStyle, { backgroundColor: inputConfig.glow }]} />
          </View>

          <View style={styles.centerArea}>
            {phase === "gather" && eggPositions.map((pos, i) => (
              <InputEgg key={i} index={i} startX={pos.x} startY={pos.y} delay={pos.delay} />
            ))}

            {(phase === "merge" || phase === "transform") && (
              <>
                <PulseRing progress={ringPulse1} color={inputConfig.primary} />
                <PulseRing progress={ringPulse2} color={outputConfig.primary} />
                <PulseRing progress={ringPulse3} color={outputConfig.secondary} />
              </>
            )}

            <Animated.View style={[styles.flash, flashStyle]}>
              <LinearGradient
                colors={["transparent", inputConfig.primary, outputConfig.primary, "transparent"]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            </Animated.View>

            <Animated.View style={[styles.vortex, vortexStyle]}>
              <LinearGradient
                colors={[
                  inputConfig.primary + "10",
                  inputConfig.primary + "80",
                  outputConfig.primary + "90",
                  outputConfig.secondary + "60",
                  outputConfig.primary + "10",
                ]}
                style={styles.vortexGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={[styles.vortexInner, { borderColor: outputConfig.primary }]} />
            </Animated.View>

            {(phase === "reveal" || phase === "done") && (
              <Animated.View style={[styles.resultEggContainer, resultEggStyle]}>
                <Image 
                  source={isSuccess ? EGG_IMAGES[outputRarity] : EGG_IMAGES[inputRarity]} 
                  style={styles.heroEggImage} 
                  resizeMode="contain" 
                />
              </Animated.View>
            )}
          </View>

          {phase === "gather" && (
            <Animated.View entering={FadeIn.duration(600)} style={styles.statusContainer}>
              <ThemedText style={[styles.statusText, { color: inputConfig.accent }]}>
                CHANNELING ENERGY
              </ThemedText>
              <View style={styles.statusDots}>
                <View style={[styles.statusDot, { backgroundColor: inputConfig.primary }]} />
                <View style={[styles.statusDot, { backgroundColor: inputConfig.primary, opacity: 0.7 }]} />
                <View style={[styles.statusDot, { backgroundColor: inputConfig.primary, opacity: 0.4 }]} />
              </View>
            </Animated.View>
          )}

          {phase === "merge" && (
            <Animated.View entering={ZoomIn.duration(200)} style={styles.statusContainer}>
              <ThemedText style={[styles.statusTextLarge, { color: inputConfig.primary }]}>
                FUSION!
              </ThemedText>
            </Animated.View>
          )}

          {phase === "transform" && (
            <Animated.View entering={FadeIn.duration(400)} style={styles.statusContainer}>
              <ThemedText style={[styles.statusText, { color: outputConfig.primary }]}>
                TRANSMUTING
              </ThemedText>
            </Animated.View>
          )}

          {(phase === "reveal" || phase === "done") && (
            <Animated.View entering={FadeInDown.springify().damping(12)} style={styles.resultContainer}>
              <ThemedText style={[
                styles.resultTitle,
                { 
                  color: isSuccess ? "#FFFFFF" : "#EF4444",
                  textShadowColor: isSuccess ? revealConfig.glow : "rgba(239, 68, 68, 0.5)",
                }
              ]}>
                {isSuccess ? "FUSION SUCCESS" : "FUSION FAILED"}
              </ThemedText>
              
              {isSuccess ? (
                <View style={styles.rarityBadge}>
                  <LinearGradient
                    colors={[revealConfig.primary + "30", revealConfig.primary + "10"]}
                    style={styles.rarityBadgeGradient}
                  >
                    <View style={[styles.rarityBadgeBorder, { borderColor: revealConfig.primary + "60" }]}>
                      <ThemedText style={[styles.rarityPlus, { color: revealConfig.primary }]}>+</ThemedText>
                      <ThemedText style={styles.rarityCount}>{successCount}</ThemedText>
                      <ThemedText style={[styles.rarityText, { color: revealConfig.accent }]}>
                        {outputRarity.toUpperCase()} EGG{successCount > 1 ? "S" : ""}
                      </ThemedText>
                    </View>
                  </LinearGradient>
                </View>
              ) : (
                <ThemedText style={styles.resultFailText}>
                  Better luck next time
                </ThemedText>
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
                  colors={[revealConfig.primary, revealConfig.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.continueButtonGradient}
                >
                  <ThemedText style={styles.continueButtonText}>CONTINUE</ThemedText>
                  <Feather name="arrow-right" size={18} color="#fff" />
                </LinearGradient>
              </Pressable>
            </Animated.View>
          )}
        </Animated.View>
      </ImageBackground>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  ambientGlow: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  ambientRing: {
    width: 400,
    height: 400,
    borderRadius: 200,
    opacity: 0.15,
  },
  centerArea: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.5,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -SCREEN_HEIGHT * 0.12,
  },
  inputEgg: {
    position: "absolute",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
  },
  eggTrail: {
    position: "absolute",
    width: 30,
    height: 40,
    borderRadius: 15,
    opacity: 0.4,
  },
  smallEggImage: {
    width: 55,
    height: 70,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 160,
  },
  vortex: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  vortexGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 90,
  },
  vortexInner: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    opacity: 0.6,
  },
  resultEggContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  heroEggImage: {
    width: EGG_SIZE,
    height: EGG_SIZE * 1.27,
  },
  pulseRing: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    opacity: 0.5,
  },
  statusContainer: {
    position: "absolute",
    bottom: SCREEN_HEIGHT * 0.28,
    alignItems: "center",
  },
  statusText: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 4,
    textTransform: "uppercase",
  },
  statusTextLarge: {
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: 8,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  statusDots: {
    flexDirection: "row",
    marginTop: 8,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  resultContainer: {
    position: "absolute",
    bottom: SCREEN_HEIGHT * 0.18,
    alignItems: "center",
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 3,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
    marginBottom: 16,
  },
  rarityBadge: {
    borderRadius: 30,
    overflow: "hidden",
  },
  rarityBadgeGradient: {
    borderRadius: 30,
  },
  rarityBadgeBorder: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1,
    gap: 6,
  },
  rarityPlus: {
    fontSize: 24,
    fontWeight: "800",
  },
  rarityCount: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  rarityText: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 2,
    marginLeft: 4,
  },
  resultFailText: {
    fontSize: 16,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  failNote: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 8,
  },
  buttonContainer: {
    position: "absolute",
    bottom: SCREEN_HEIGHT * 0.06,
    width: "100%",
    paddingHorizontal: 50,
  },
  continueButton: {
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  continueButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  continueButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 10,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 2,
  },
});
