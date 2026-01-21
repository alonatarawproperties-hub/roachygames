import React, { useEffect, useState, useMemo } from "react";
import { View, StyleSheet, Modal, Dimensions, Image, Platform, Pressable } from "react-native";
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
  interpolateColor,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
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
const EGG_SIZE = Math.min(SCREEN_WIDTH * 0.42, 180);

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
  gradient: [string, string, string];
  sparkle: string;
  bgGradient: [string, string, string, string];
}> = {
  common: {
    primary: "#C9CED6",
    secondary: "#9CA3AF",
    glow: "rgba(201, 206, 214, 0.5)",
    accent: "#E6E8EC",
    gradient: ["#D1D5DB", "#9CA3AF", "#6B7280"],
    sparkle: "#E5E7EB",
    bgGradient: ["#0A0A12", "#141420", "#1A1A28", "#0A0A12"],
  },
  rare: {
    primary: "#4DA3FF",
    secondary: "#2563EB",
    glow: "rgba(77, 163, 255, 0.6)",
    accent: "#3B82F6",
    gradient: ["#93C5FD", "#60A5FA", "#3B82F6"],
    sparkle: "#BFDBFE",
    bgGradient: ["#050510", "#0A1628", "#0F1E38", "#050510"],
  },
  epic: {
    primary: "#B56CFF",
    secondary: "#9333EA",
    glow: "rgba(181, 108, 255, 0.6)",
    accent: "#8B5CF6",
    gradient: ["#E879F9", "#C084FC", "#A855F7"],
    sparkle: "#E9D5FF",
    bgGradient: ["#0A0510", "#1A0A28", "#280F38", "#0A0510"],
  },
  legendary: {
    primary: "#FFCC4D",
    secondary: "#F59E0B",
    glow: "rgba(255, 204, 77, 0.7)",
    accent: "#FCD34D",
    gradient: ["#FDE68A", "#FBBF24", "#F59E0B"],
    sparkle: "#FEF3C7",
    bgGradient: ["#0A0A05", "#1A1508", "#28200A", "#0A0A05"],
  },
};

const EGG_POSITIONS = [
  { x: -100, y: -90, delay: 0 },
  { x: 100, y: -90, delay: 50 },
  { x: -80, y: 50, delay: 100 },
  { x: 80, y: 50, delay: 150 },
  { x: 0, y: -130, delay: 200 },
];

const AuraRing = ({ 
  size, 
  color, 
  type,
  progress,
}: { 
  size: number;
  color: string;
  type: "outer" | "mid" | "inner";
  progress: Animated.SharedValue<number>;
}) => {
  const ringStyle = useAnimatedStyle(() => {
    if (type === "outer") {
      const rotation = progress.value * 360;
      return {
        transform: [{ rotate: `${rotation}deg` }],
        opacity: 0.4,
      };
    } else if (type === "mid") {
      const shimmer = interpolate(progress.value, [0, 0.5, 1], [0.25, 0.5, 0.25]);
      return {
        opacity: shimmer,
        transform: [{ rotate: `${-progress.value * 180}deg` }],
      };
    } else {
      const scale = interpolate(progress.value, [0, 0.5, 1], [0.98, 1.05, 0.98]);
      return {
        transform: [{ scale }],
        opacity: 0.6,
      };
    }
  });

  return (
    <Animated.View style={[
      styles.auraRing,
      { width: size, height: size, borderRadius: size / 2, borderColor: color },
      type === "outer" && styles.auraRingOuter,
      type === "mid" && styles.auraRingMid,
      type === "inner" && styles.auraRingInner,
      ringStyle,
    ]} />
  );
};

const SparkParticle = ({
  angle,
  progress,
  color,
  delay,
}: {
  angle: number;
  progress: Animated.SharedValue<number>;
  color: string;
  delay: number;
}) => {
  const particleStyle = useAnimatedStyle(() => {
    const radians = (angle * Math.PI) / 180;
    const baseDistance = 80;
    const dist = interpolate(progress.value, [0, 1], [20, baseDistance + Math.random() * 40]);
    const x = Math.cos(radians) * dist;
    const y = Math.sin(radians) * dist;
    const opacity = interpolate(progress.value, [0, 0.2, 0.8, 1], [0, 1, 0.6, 0]);
    const scale = interpolate(progress.value, [0, 0.3, 1], [0.5, 1, 0.3]);

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
    <Animated.View style={[styles.sparkParticle, particleStyle]}>
      <View style={[styles.sparkParticleCore, { backgroundColor: color, shadowColor: color }]} />
    </Animated.View>
  );
};

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

const FloatingEgg = ({
  imageSource,
  floatProgress,
  glowColor,
}: {
  imageSource: any;
  floatProgress: Animated.SharedValue<number>;
  glowColor: string;
}) => {
  const floatStyle = useAnimatedStyle(() => {
    const translateY = interpolate(floatProgress.value, [0, 0.5, 1], [0, -8, 0]);
    return {
      transform: [{ translateY }],
    };
  });

  return (
    <Animated.View style={[styles.floatingEggContainer, floatStyle]}>
      <View style={[styles.eggSpotlight, { backgroundColor: glowColor }]} />
      <Image 
        source={imageSource} 
        style={styles.heroEggImage} 
        resizeMode="contain" 
      />
    </Animated.View>
  );
};

const GlassPillBadge = ({
  count,
  rarity,
  theme,
}: {
  count: number;
  rarity: string;
  theme: typeof RARITY_THEME["rare"];
}) => {
  return (
    <View style={styles.glassPillContainer}>
      <LinearGradient
        colors={["rgba(255,255,255,0.15)", "rgba(255,255,255,0.05)"]}
        style={styles.glassPillGradient}
      >
        <View style={styles.glassPillContent}>
          <ThemedText style={[styles.glassPillPlus, { color: theme.primary }]}>+</ThemedText>
          <ThemedText style={styles.glassPillCount}>{count}</ThemedText>
          <ThemedText style={[styles.glassPillRarity, { color: theme.accent }]}>
            {rarity.toUpperCase()} EGG{count > 1 ? "S" : ""}
          </ThemedText>
        </View>
      </LinearGradient>
      <View style={[styles.glassPillBorder, { borderColor: theme.primary + "40" }]} />
    </View>
  );
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
  const auraProgress = useSharedValue(0);
  const floatProgress = useSharedValue(0);
  const sparkProgress = useSharedValue(0);

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

  const sparkParticles = useMemo(() => {
    return Array.from({ length: 16 }).map((_, i) => ({
      angle: (i * 360) / 16 + Math.random() * 15,
      delay: i * 50,
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
      auraProgress.value = 0;
      floatProgress.value = 0;
      sparkProgress.value = 0;
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

      auraProgress.value = withRepeat(
        withTiming(1, { duration: 12000, easing: Easing.linear }),
        -1,
        false
      );

      floatProgress.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );

      sparkProgress.value = withRepeat(
        withTiming(1, { duration: 3000, easing: Easing.linear }),
        -1,
        false
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
  const revealRarity = isSuccess ? outputRarity : inputRarity;

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onComplete();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Animated.View style={[styles.container, containerStyle]}>
        <LinearGradient
          colors={revealConfig.bgGradient}
          locations={[0, 0.35, 0.65, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.noiseOverlay} />

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
              <AuraRing size={EGG_SIZE * 1.8} color={revealConfig.primary} type="outer" progress={auraProgress} />
              <AuraRing size={EGG_SIZE * 1.5} color={revealConfig.accent} type="mid" progress={auraProgress} />
              <AuraRing size={EGG_SIZE * 1.25} color={revealConfig.sparkle} type="inner" progress={auraProgress} />

              {sparkParticles.map((spark, i) => (
                <SparkParticle
                  key={i}
                  angle={spark.angle}
                  delay={spark.delay}
                  color={i % 2 === 0 ? revealConfig.sparkle : revealConfig.primary}
                  progress={sparkProgress}
                />
              ))}

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
                <FloatingEgg
                  imageSource={isSuccess ? EGG_IMAGES[outputRarity] : EGG_IMAGES[inputRarity]}
                  floatProgress={floatProgress}
                  glowColor={revealConfig.glow}
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
            <View style={styles.resultTitleContainer}>
              <ThemedText style={[
                styles.resultTitle,
                { 
                  color: isSuccess ? revealConfig.primary : "#EF4444",
                  textShadowColor: isSuccess ? revealConfig.glow : "rgba(239, 68, 68, 0.5)",
                }
              ]}>
                {isSuccess ? "FUSION SUCCESS" : "FUSION FAILED"}
              </ThemedText>
            </View>
            
            {isSuccess ? (
              <GlassPillBadge 
                count={successCount} 
                rarity={outputRarity} 
                theme={outputConfig} 
              />
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
                end={{ x: 1, y: 1 }}
                style={styles.continueButtonGradient}
              >
                <ThemedText style={styles.continueButtonText}>CONTINUE</ThemedText>
                <Feather name="arrow-right" size={18} color="#fff" />
              </LinearGradient>
            </Pressable>
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
  noiseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.01)",
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
  auraRing: {
    position: "absolute",
    borderWidth: 2,
  },
  auraRingOuter: {
    borderStyle: "dashed",
  },
  auraRingMid: {
    borderWidth: 1.5,
  },
  auraRingInner: {
    borderWidth: 1,
  },
  sparkParticle: {
    position: "absolute",
  },
  sparkParticleCore: {
    width: 4,
    height: 4,
    borderRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
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
  floatingEggContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  eggSpotlight: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.3,
  },
  heroEggImage: {
    width: EGG_SIZE,
    height: EGG_SIZE * 1.27,
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
    bottom: SCREEN_HEIGHT * 0.18,
    alignItems: "center",
  },
  resultTitleContainer: {
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 4,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  glassPillContainer: {
    position: "relative",
    borderRadius: 30,
    overflow: "hidden",
  },
  glassPillGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
  },
  glassPillContent: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  glassPillPlus: {
    fontSize: 24,
    fontWeight: "800",
  },
  glassPillCount: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  glassPillRarity: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 2,
    marginLeft: 4,
  },
  glassPillBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 30,
    borderWidth: 1,
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
    paddingHorizontal: 40,
  },
  continueButton: {
    borderRadius: 16,
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
