import React, { useEffect, useState, useMemo } from "react";
import { View, StyleSheet, Modal, Dimensions, Image, Platform } from "react-native";
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
  interpolateColor,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
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
  secondary: string;
  glow: string;
  gradient: [string, string, string];
  sparkle: string;
}> = {
  common: {
    primary: "#9CA3AF",
    secondary: "#6B7280",
    glow: "rgba(156, 163, 175, 0.6)",
    gradient: ["#D1D5DB", "#9CA3AF", "#6B7280"],
    sparkle: "#E5E7EB",
  },
  rare: {
    primary: "#60A5FA",
    secondary: "#2563EB",
    glow: "rgba(59, 130, 246, 0.7)",
    gradient: ["#93C5FD", "#60A5FA", "#3B82F6"],
    sparkle: "#BFDBFE",
  },
  epic: {
    primary: "#C084FC",
    secondary: "#9333EA",
    glow: "rgba(168, 85, 247, 0.7)",
    gradient: ["#E879F9", "#C084FC", "#A855F7"],
    sparkle: "#E9D5FF",
  },
  legendary: {
    primary: "#FBBF24",
    secondary: "#D97706",
    glow: "rgba(251, 191, 36, 0.8)",
    gradient: ["#FDE68A", "#FBBF24", "#F59E0B"],
    sparkle: "#FEF3C7",
  },
};

const EGG_POSITIONS = [
  { x: -100, y: -90, delay: 0 },
  { x: 100, y: -90, delay: 50 },
  { x: -80, y: 50, delay: 100 },
  { x: 80, y: 50, delay: 150 },
  { x: 0, y: -130, delay: 200 },
];

const EnergyRing = ({ 
  delay, 
  duration, 
  color, 
  progress,
  maxScale = 3,
}: { 
  delay: number; 
  duration: number; 
  color: string;
  progress: Animated.SharedValue<number>;
  maxScale?: number;
}) => {
  const ringStyle = useAnimatedStyle(() => {
    const scale = interpolate(progress.value, [0, 1], [0.3, maxScale]);
    const opacity = interpolate(progress.value, [0, 0.3, 0.7, 1], [0, 0.8, 0.4, 0]);
    return {
      transform: [{ scale }],
      opacity,
      borderColor: color,
    };
  });

  return (
    <Animated.View style={[styles.energyRing, ringStyle]} />
  );
};

const Sparkle = ({ 
  angle, 
  distance, 
  size, 
  delay,
  color,
  progress,
}: { 
  angle: number; 
  distance: number; 
  size: number;
  delay: number;
  color: string;
  progress: Animated.SharedValue<number>;
}) => {
  const sparkleStyle = useAnimatedStyle(() => {
    const radians = (angle * Math.PI) / 180;
    const dist = interpolate(progress.value, [0, 0.5, 1], [0, distance * 0.8, distance]);
    const x = Math.cos(radians) * dist;
    const y = Math.sin(radians) * dist;
    const scale = interpolate(progress.value, [0, 0.3, 0.7, 1], [0, 1.2, 1, 0]);
    const opacity = interpolate(progress.value, [0, 0.2, 0.8, 1], [0, 1, 0.8, 0]);
    const rotation = interpolate(progress.value, [0, 1], [0, 180]);

    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { scale },
        { rotate: `${rotation}deg` },
      ],
      opacity,
    };
  });

  return (
    <Animated.View style={[styles.sparkle, sparkleStyle]}>
      <View style={[styles.sparkleCore, { backgroundColor: color, width: size, height: size }]}>
        <View style={[styles.sparkleGlow, { backgroundColor: color, shadowColor: color }]} />
      </View>
      <View style={[styles.sparkleArm, styles.sparkleArmHorizontal, { backgroundColor: color }]} />
      <View style={[styles.sparkleArm, styles.sparkleArmVertical, { backgroundColor: color }]} />
    </Animated.View>
  );
};

const OrbitalParticle = ({
  radius,
  startAngle,
  speed,
  size,
  color,
  progress,
}: {
  radius: number;
  startAngle: number;
  speed: number;
  size: number;
  color: string;
  progress: Animated.SharedValue<number>;
}) => {
  const particleStyle = useAnimatedStyle(() => {
    const angle = startAngle + progress.value * 360 * speed;
    const radians = (angle * Math.PI) / 180;
    const x = Math.cos(radians) * radius;
    const y = Math.sin(radians) * radius;
    const scale = interpolate(progress.value, [0, 0.1, 0.9, 1], [0, 1, 1, 0]);
    
    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { scale },
      ],
      opacity: scale,
    };
  });

  return (
    <Animated.View style={[styles.orbitalParticle, particleStyle]}>
      <View style={[styles.orbitalCore, { 
        width: size, 
        height: size, 
        backgroundColor: color,
        shadowColor: color,
      }]} />
    </Animated.View>
  );
};

const FloatingMote = ({
  startX,
  startY,
  color,
  size,
  progress,
}: {
  startX: number;
  startY: number;
  color: string;
  size: number;
  progress: Animated.SharedValue<number>;
}) => {
  const moteStyle = useAnimatedStyle(() => {
    const y = startY + interpolate(progress.value, [0, 1], [0, -80]);
    const x = startX + Math.sin(progress.value * Math.PI * 4) * 15;
    const scale = interpolate(progress.value, [0, 0.2, 0.8, 1], [0, 1, 0.8, 0]);
    const opacity = interpolate(progress.value, [0, 0.1, 0.9, 1], [0, 0.9, 0.6, 0]);
    
    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { scale },
      ],
      opacity,
    };
  });

  return (
    <Animated.View style={[styles.floatingMote, moteStyle]}>
      <View style={[styles.moteCore, { 
        width: size, 
        height: size, 
        backgroundColor: color,
        shadowColor: color,
      }]} />
    </Animated.View>
  );
};

const PulseRing = ({
  progress,
  color,
  delay = 0,
}: {
  progress: Animated.SharedValue<number>;
  color: string;
  delay?: number;
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
  const particleProgress = useSharedValue(0);
  const orbitalProgress = useSharedValue(0);
  const ringPulse1 = useSharedValue(0);
  const ringPulse2 = useSharedValue(0);
  const ringPulse3 = useSharedValue(0);
  const energyBurst = useSharedValue(0);
  const moteProgress = useSharedValue(0);
  const glowPulse = useSharedValue(0);
  const innerGlow = useSharedValue(0);

  const sparkles = useMemo(() => {
    return Array.from({ length: 24 }).map((_, i) => ({
      angle: i * 15 + Math.random() * 10,
      distance: 100 + Math.random() * 60,
      size: 4 + Math.random() * 6,
      delay: i * 20,
    }));
  }, []);

  const orbitals = useMemo(() => {
    return Array.from({ length: 16 }).map((_, i) => ({
      radius: 60 + (i % 3) * 25,
      startAngle: (i * 360) / 16,
      speed: 1 + (i % 3) * 0.3,
      size: 3 + Math.random() * 4,
    }));
  }, []);

  const motes = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => ({
      startX: (Math.random() - 0.5) * 200,
      startY: 50 + Math.random() * 100,
      size: 2 + Math.random() * 4,
    }));
  }, []);

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
      particleProgress.value = 0;
      orbitalProgress.value = 0;
      ringPulse1.value = 0;
      ringPulse2.value = 0;
      ringPulse3.value = 0;
      energyBurst.value = 0;
      moteProgress.value = 0;
      glowPulse.value = 0;
      innerGlow.value = 0;
      return;
    }

    gatherProgress.value = withTiming(1, { duration: 1600, easing: Easing.bezier(0.4, 0, 0.2, 1) });
    orbitalProgress.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );

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
      
      moteProgress.value = withRepeat(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        -1,
        false
      );
    }, 2200);

    const revealTimeout = setTimeout(() => {
      runOnJS(setPhase)("reveal");
      runOnJS(Haptics.notificationAsync)(
        successCount > 0 
          ? Haptics.NotificationFeedbackType.Success 
          : Haptics.NotificationFeedbackType.Warning
      );
      
      vortexScale.value = withTiming(0, { duration: 250 });
      
      energyBurst.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
      
      resultScale.value = withSequence(
        withSpring(1.15, { damping: 6, stiffness: 150 }),
        withSpring(1, { damping: 10, stiffness: 100 })
      );
      
      resultGlow.value = withSequence(
        withTiming(2, { duration: 300 }),
        withTiming(1, { duration: 500 })
      );
      
      particleProgress.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) });
      
      glowPulse.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 800 }),
          withTiming(0.9, { duration: 800 })
        ),
        -1,
        true
      );
    }, 4000);

    const doneTimeout = setTimeout(() => {
      runOnJS(setPhase)("done");
    }, 5500);

    const completeTimeout = setTimeout(() => {
      onComplete();
    }, 6200);

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

  const innerGlowStyle = useAnimatedStyle(() => ({
    opacity: innerGlow.value * 0.8,
    transform: [{ scale: 1 + innerGlow.value * 0.2 }],
  }));

  const resultEggStyle = useAnimatedStyle(() => ({
    transform: [{ scale: resultScale.value }],
    opacity: resultScale.value,
  }));

  const resultGlowStyle = useAnimatedStyle(() => {
    const scale = resultGlow.value * glowPulse.value;
    return {
      transform: [{ scale: scale || 1 }],
      opacity: interpolate(resultGlow.value, [0, 1, 2], [0, 0.9, 1]),
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

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Animated.View style={[styles.container, containerStyle]}>
        <LinearGradient
          colors={["#050508", "#0a0a12", "#080810", "#050508"]}
          locations={[0, 0.3, 0.7, 1]}
          style={StyleSheet.absoluteFill}
        />

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

          {phase === "transform" && orbitals.map((orbital, i) => (
            <OrbitalParticle
              key={i}
              {...orbital}
              color={i % 2 === 0 ? inputConfig.sparkle : outputConfig.sparkle}
              progress={orbitalProgress}
            />
          ))}

          {phase === "transform" && motes.slice(0, 10).map((mote, i) => (
            <FloatingMote
              key={i}
              {...mote}
              color={outputConfig.sparkle}
              progress={moteProgress}
            />
          ))}

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
            <>
              <EnergyRing 
                delay={0} 
                duration={800} 
                color={revealConfig.primary} 
                progress={energyBurst}
                maxScale={2.5}
              />
              <EnergyRing 
                delay={100} 
                duration={800} 
                color={revealConfig.secondary} 
                progress={energyBurst}
                maxScale={3}
              />
              <EnergyRing 
                delay={200} 
                duration={800} 
                color={revealConfig.sparkle} 
                progress={energyBurst}
                maxScale={3.5}
              />

              {sparkles.map((sparkle, i) => (
                <Sparkle
                  key={i}
                  {...sparkle}
                  color={i % 3 === 0 ? revealConfig.primary : i % 3 === 1 ? revealConfig.sparkle : "#FFFFFF"}
                  progress={particleProgress}
                />
              ))}

              <Animated.View style={[styles.resultGlow, resultGlowStyle]}>
                <LinearGradient
                  colors={[
                    revealConfig.glow,
                    revealConfig.primary + "40",
                    "transparent",
                  ]}
                  style={styles.glowGradient}
                  start={{ x: 0.5, y: 0.5 }}
                  end={{ x: 1, y: 1 }}
                />
              </Animated.View>

              <Animated.View style={[styles.resultEggContainer, resultEggStyle]}>
                <View style={[styles.eggGlowRing, { 
                  shadowColor: revealConfig.primary,
                  borderColor: revealConfig.primary + "40",
                }]} />
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
          <Animated.View entering={FadeIn.duration(600)} style={styles.statusContainer}>
            <View style={styles.statusGlow}>
              <ThemedText style={[styles.statusText, { color: inputConfig.sparkle }]}>
                CHANNELING ENERGY
              </ThemedText>
              <View style={styles.statusDots}>
                <Animated.View style={[styles.statusDot, { backgroundColor: inputConfig.primary }]} />
                <Animated.View style={[styles.statusDot, { backgroundColor: inputConfig.primary, opacity: 0.7 }]} />
                <Animated.View style={[styles.statusDot, { backgroundColor: inputConfig.primary, opacity: 0.4 }]} />
              </View>
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
            <LinearGradient
              colors={isSuccess ? [outputConfig.primary, outputConfig.secondary] : ["#EF4444", "#B91C1C"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.resultLabelGradient}
            >
              <ThemedText style={styles.resultLabel}>
                {isSuccess ? "FUSION SUCCESS" : "FUSION FAILED"}
              </ThemedText>
            </LinearGradient>
            
            {isSuccess ? (
              <View style={styles.resultDetailsContainer}>
                <ThemedText style={[styles.resultPlus, { color: outputConfig.primary }]}>+</ThemedText>
                <ThemedText style={styles.resultCount}>{successCount}</ThemedText>
                <ThemedText style={[styles.resultRarity, { color: outputConfig.sparkle }]}>
                  {outputRarity.toUpperCase()} EGG{successCount > 1 ? "S" : ""}
                </ThemedText>
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
    width: 320,
    height: 320,
    justifyContent: "center",
    alignItems: "center",
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
  resultGlow: {
    position: "absolute",
    width: 280,
    height: 280,
    justifyContent: "center",
    alignItems: "center",
  },
  glowGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 140,
  },
  resultEggContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  eggGlowRing: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  },
  largeEggImage: {
    width: 130,
    height: 165,
  },
  energyRing: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
  },
  pulseRing: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    opacity: 0.5,
  },
  sparkle: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  sparkleCore: {
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sparkleGlow: {
    position: "absolute",
    width: "200%",
    height: "200%",
    borderRadius: 20,
    opacity: 0.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  },
  sparkleArm: {
    position: "absolute",
    opacity: 0.8,
  },
  sparkleArmHorizontal: {
    width: 16,
    height: 2,
    borderRadius: 1,
  },
  sparkleArmVertical: {
    width: 2,
    height: 16,
    borderRadius: 1,
  },
  orbitalParticle: {
    position: "absolute",
  },
  orbitalCore: {
    borderRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  floatingMote: {
    position: "absolute",
  },
  moteCore: {
    borderRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 2,
  },
  statusContainer: {
    position: "absolute",
    bottom: SCREEN_HEIGHT * 0.22,
    alignItems: "center",
  },
  statusGlow: {
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
    bottom: SCREEN_HEIGHT * 0.15,
    alignItems: "center",
  },
  resultLabelGradient: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 25,
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 3,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  resultDetailsContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  resultPlus: {
    fontSize: 28,
    fontWeight: "800",
  },
  resultCount: {
    fontSize: 36,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  resultRarity: {
    fontSize: 20,
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
});
