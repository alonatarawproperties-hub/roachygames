import React, { useEffect, useState } from "react";
import { View, StyleSheet, Modal, Dimensions, Image } from "react-native";
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
  ZoomIn,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
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
const CENTER_X = SCREEN_WIDTH / 2;
const CENTER_Y = SCREEN_HEIGHT * 0.4;

interface FusionAnimationModalProps {
  visible: boolean;
  inputRarity: "common" | "rare" | "epic";
  outputRarity: "rare" | "epic" | "legendary";
  inputCount: number;
  successCount: number;
  failCount: number;
  onComplete: () => void;
}

const RARITY_CONFIG: Record<string, {
  primary: string;
  glow: string;
  gradient: [string, string, string];
}> = {
  common: {
    primary: "#9CA3AF",
    glow: "rgba(156, 163, 175, 0.5)",
    gradient: ["#D1D5DB", "#9CA3AF", "#6B7280"],
  },
  rare: {
    primary: "#60A5FA",
    glow: "rgba(59, 130, 246, 0.6)",
    gradient: ["#93C5FD", "#60A5FA", "#3B82F6"],
  },
  epic: {
    primary: "#C084FC",
    glow: "rgba(168, 85, 247, 0.6)",
    gradient: ["#E879F9", "#C084FC", "#A855F7"],
  },
  legendary: {
    primary: "#FBBF24",
    glow: "rgba(251, 191, 36, 0.7)",
    gradient: ["#FDE68A", "#FBBF24", "#F59E0B"],
  },
};

const EGG_POSITIONS = [
  { x: -120, y: -80 },
  { x: 120, y: -80 },
  { x: -100, y: 60 },
  { x: 100, y: 60 },
  { x: 0, y: -120 },
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
  const [phase, setPhase] = useState<"gather" | "merge" | "transform" | "reveal" | "done">("gather");
  const inputConfig = RARITY_CONFIG[inputRarity];
  const outputConfig = RARITY_CONFIG[outputRarity];

  const eggPositions = EGG_POSITIONS.slice(0, Math.min(inputCount, 5));

  const gatherProgress = useSharedValue(0);
  const mergeFlash = useSharedValue(0);
  const vortexRotation = useSharedValue(0);
  const vortexScale = useSharedValue(0);
  const resultScale = useSharedValue(0);
  const resultGlow = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const particleScale = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      setPhase("gather");
      gatherProgress.value = 0;
      mergeFlash.value = 0;
      vortexRotation.value = 0;
      vortexScale.value = 0;
      resultScale.value = 0;
      resultGlow.value = 0;
      shakeX.value = 0;
      particleScale.value = 0;
      return;
    }

    gatherProgress.value = withTiming(1, { duration: 1500, easing: Easing.bezier(0.4, 0, 0.2, 1) });

    const gatherTimeout = setTimeout(() => {
      runOnJS(setPhase)("merge");
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Heavy);
      
      mergeFlash.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0.3, { duration: 300 })
      );
      
      shakeX.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(-4, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }, 1600);

    const transformTimeout = setTimeout(() => {
      runOnJS(setPhase)("transform");
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
      
      vortexScale.value = withTiming(1, { duration: 500 });
      vortexRotation.value = withRepeat(
        withTiming(360, { duration: 800, easing: Easing.linear }),
        3,
        false
      );
    }, 2100);

    const revealTimeout = setTimeout(() => {
      runOnJS(setPhase)("reveal");
      runOnJS(Haptics.notificationAsync)(
        successCount > 0 
          ? Haptics.NotificationFeedbackType.Success 
          : Haptics.NotificationFeedbackType.Warning
      );
      
      vortexScale.value = withTiming(0, { duration: 300 });
      resultScale.value = withSpring(1, { damping: 8, stiffness: 100 });
      resultGlow.value = withSequence(
        withTiming(1.5, { duration: 200 }),
        withTiming(1, { duration: 400 })
      );
      particleScale.value = withTiming(1, { duration: 600 });
    }, 3600);

    const doneTimeout = setTimeout(() => {
      runOnJS(setPhase)("done");
    }, 5000);

    const completeTimeout = setTimeout(() => {
      onComplete();
    }, 5500);

    return () => {
      clearTimeout(gatherTimeout);
      clearTimeout(transformTimeout);
      clearTimeout(revealTimeout);
      clearTimeout(doneTimeout);
      clearTimeout(completeTimeout);
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

  const resultEggStyle = useAnimatedStyle(() => ({
    transform: [{ scale: resultScale.value }],
    opacity: resultScale.value,
  }));

  const resultGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: resultGlow.value }],
    opacity: interpolate(resultGlow.value, [0, 1, 1.5], [0, 0.8, 1]),
  }));

  const InputEgg = ({ index, startX, startY }: { index: number; startX: number; startY: number }) => {
    const eggStyle = useAnimatedStyle(() => {
      const progress = gatherProgress.value;
      const x = interpolate(progress, [0, 1], [startX, 0]);
      const y = interpolate(progress, [0, 1], [startY, 0]);
      const scale = interpolate(progress, [0, 0.8, 1], [0.6, 0.5, 0]);
      const rotation = interpolate(progress, [0, 1], [0, 360 + index * 30]);
      
      return {
        transform: [
          { translateX: x },
          { translateY: y },
          { scale },
          { rotate: `${rotation}deg` },
        ],
        opacity: interpolate(progress, [0.9, 1], [1, 0]),
      };
    });

    return (
      <Animated.View style={[styles.inputEgg, eggStyle]}>
        <Image source={EGG_IMAGES[inputRarity]} style={styles.smallEggImage} resizeMode="contain" />
      </Animated.View>
    );
  };

  const Particle = ({ angle, delay }: { angle: number; delay: number }) => {
    const particleStyle = useAnimatedStyle(() => {
      const distance = interpolate(particleScale.value, [0, 1], [0, 120]);
      return {
        transform: [
          { rotate: `${angle}deg` },
          { translateY: -distance },
          { scale: particleScale.value },
        ],
        opacity: interpolate(particleScale.value, [0, 0.5, 1], [0, 1, 0.6]),
      };
    });

    return (
      <Animated.View style={[styles.particle, particleStyle]}>
        <View style={[styles.particleDot, { backgroundColor: outputConfig.primary }]} />
      </Animated.View>
    );
  };

  const isSuccess = successCount > 0;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Animated.View style={[styles.container, containerStyle]}>
        <LinearGradient
          colors={["#0a0a0f", "#111118", "#0a0a0f"]}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.centerArea}>
          {eggPositions.map((pos, i) => (
            <InputEgg key={i} index={i} startX={pos.x} startY={pos.y} />
          ))}

          <Animated.View style={[styles.flash, flashStyle]}>
            <LinearGradient
              colors={["transparent", inputConfig.glow, "transparent"]}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          <Animated.View style={[styles.vortex, vortexStyle]}>
            <LinearGradient
              colors={[inputConfig.primary + "00", inputConfig.primary, outputConfig.primary, outputConfig.primary + "00"]}
              style={styles.vortexGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          </Animated.View>

          {phase === "reveal" && (
            <>
              <Animated.View style={[styles.resultGlow, resultGlowStyle]}>
                <View style={[styles.glowCircle, { backgroundColor: outputConfig.glow }]} />
              </Animated.View>

              {Array.from({ length: 12 }).map((_, i) => (
                <Particle key={i} angle={i * 30} delay={i * 50} />
              ))}

              <Animated.View style={[styles.resultEgg, resultEggStyle]}>
                <Image 
                  source={isSuccess ? EGG_IMAGES[outputRarity] : EGG_IMAGES[inputRarity]} 
                  style={styles.largeEggImage} 
                  resizeMode="contain" 
                />
              </Animated.View>
            </>
          )}
        </View>

        {phase === "gather" && (
          <Animated.View entering={FadeIn.duration(500)} style={styles.statusContainer}>
            <ThemedText style={styles.statusText}>Gathering Energy...</ThemedText>
          </Animated.View>
        )}

        {phase === "merge" && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.statusContainer}>
            <ThemedText style={[styles.statusText, { color: inputConfig.primary }]}>Merging!</ThemedText>
          </Animated.View>
        )}

        {phase === "transform" && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.statusContainer}>
            <ThemedText style={[styles.statusText, { color: outputConfig.primary }]}>Transforming...</ThemedText>
          </Animated.View>
        )}

        {(phase === "reveal" || phase === "done") && (
          <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.resultContainer}>
            <ThemedText style={[styles.resultLabel, { color: isSuccess ? outputConfig.primary : "#EF4444" }]}>
              {isSuccess ? "FUSION SUCCESS!" : "FUSION FAILED"}
            </ThemedText>
            {isSuccess ? (
              <ThemedText style={styles.resultDetails}>
                +{successCount} {outputRarity.toUpperCase()} EGG{successCount > 1 ? "S" : ""}
              </ThemedText>
            ) : (
              <ThemedText style={styles.resultDetails}>
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
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centerArea: {
    width: 300,
    height: 300,
    justifyContent: "center",
    alignItems: "center",
  },
  inputEgg: {
    position: "absolute",
  },
  smallEggImage: {
    width: 60,
    height: 75,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  vortex: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: "hidden",
  },
  vortexGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 100,
  },
  resultGlow: {
    position: "absolute",
  },
  glowCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  resultEgg: {
    position: "absolute",
  },
  largeEggImage: {
    width: 140,
    height: 175,
  },
  particle: {
    position: "absolute",
  },
  particleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusContainer: {
    position: "absolute",
    bottom: SCREEN_HEIGHT * 0.25,
    alignItems: "center",
  },
  statusText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  resultContainer: {
    position: "absolute",
    bottom: SCREEN_HEIGHT * 0.18,
    alignItems: "center",
  },
  resultLabel: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 3,
    marginBottom: Spacing.sm,
  },
  resultDetails: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: 1,
  },
  failNote: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: Spacing.xs,
  },
});
