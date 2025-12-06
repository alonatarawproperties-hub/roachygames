import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  Image,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  runOnJS,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { ROACHY_IMAGES, getRarityColor } from "@/constants/creatures";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const RING_SIZE = SCREEN_WIDTH * 0.7;
const INNER_SIZE = RING_SIZE * 0.4;

interface CatchMiniGameProps {
  creature: {
    id: string;
    name: string;
    rarity: string;
    templateId?: string;
  };
  onCatch: (quality: "perfect" | "great" | "good" | "miss") => void;
  onEscape: () => void;
}

export function CatchMiniGame({ creature, onCatch, onEscape }: CatchMiniGameProps) {
  const [phase, setPhase] = useState<"ready" | "shrinking" | "caught" | "escaped">("ready");
  const [attempts, setAttempts] = useState(3);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const ringScale = useSharedValue(2);
  const ringOpacity = useSharedValue(1);
  const creatureScale = useSharedValue(1);
  const catchBallY = useSharedValue(300);
  const catchBallOpacity = useSharedValue(0);
  const flashOpacity = useSharedValue(0);

  const currentRingScale = useRef(2);
  const isAnimating = useRef(false);

  const rarityColor = getRarityColor(creature.rarity as any) || GameColors.primary;

  const startShrinking = useCallback(() => {
    if (isAnimating.current || phase !== "ready") return;
    isAnimating.current = true;
    setPhase("shrinking");

    ringScale.value = 2;
    ringOpacity.value = 1;
    
    const shrinkDuration = creature.rarity === "legendary" ? 2000 : 
                           creature.rarity === "epic" ? 1800 :
                           creature.rarity === "rare" ? 1500 : 1200;

    ringScale.value = withTiming(0.3, {
      duration: shrinkDuration,
      easing: Easing.linear,
    }, (finished) => {
      if (finished) {
        runOnJS(handleMiss)();
      }
    });

    const updateRef = () => {
      currentRingScale.current = ringScale.value;
      if (isAnimating.current) {
        requestAnimationFrame(updateRef);
      }
    };
    requestAnimationFrame(updateRef);
  }, [phase, creature.rarity]);

  const handleTap = useCallback(() => {
    if (phase === "ready") {
      startShrinking();
      return;
    }

    if (phase !== "shrinking") return;

    cancelAnimation(ringScale);
    isAnimating.current = false;

    const scale = ringScale.value;
    let quality: "perfect" | "great" | "good" | "miss";
    let xpGain: number;
    let message: string;

    if (scale >= 0.9 && scale <= 1.1) {
      quality = "perfect";
      xpGain = 150;
      message = "PERFECT!";
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (scale >= 0.7 && scale < 0.9) {
      quality = "great";
      xpGain = 75;
      message = "GREAT!";
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (scale >= 0.5 && scale < 0.7) {
      quality = "good";
      xpGain = 30;
      message = "GOOD!";
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      quality = "miss";
      xpGain = 0;
      message = "MISS!";
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    setLastResult(message);

    if (quality !== "miss") {
      setPhase("caught");
      flashOpacity.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 300 })
      );
      catchBallOpacity.value = 1;
      catchBallY.value = withTiming(0, { duration: 300 });
      
      setTimeout(() => {
        onCatch(quality);
      }, 800);
    } else {
      handleMiss();
    }
  }, [phase, startShrinking, onCatch]);

  const handleMiss = useCallback(() => {
    isAnimating.current = false;
    setLastResult("MISS!");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    
    const newAttempts = attempts - 1;
    setAttempts(newAttempts);

    if (newAttempts <= 0) {
      setPhase("escaped");
      creatureScale.value = withSequence(
        withTiming(1.2, { duration: 200 }),
        withTiming(0, { duration: 300 })
      );
      setTimeout(() => {
        onEscape();
      }, 600);
    } else {
      creatureScale.value = withSequence(
        withTiming(0.8, { duration: 100 }),
        withTiming(1, { duration: 100 })
      );
      ringScale.value = 2;
      setPhase("ready");
      setTimeout(() => {
        setLastResult(null);
      }, 1000);
    }
  }, [attempts, onEscape]);

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const creatureAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: creatureScale.value }],
  }));

  const catchBallAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: catchBallY.value }],
    opacity: catchBallOpacity.value,
  }));

  const flashAnimatedStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const creatureImage = ROACHY_IMAGES[creature.templateId || creature.id];

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.flash, flashAnimatedStyle]} pointerEvents="none" />

      <Pressable style={styles.closeButton} onPress={onEscape} accessibilityLabel="Close">
        <Feather name="x" size={28} color={GameColors.textSecondary} />
      </Pressable>

      <View style={styles.header}>
        <View style={styles.attemptContainer}>
          {[...Array(3)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.attemptDot,
                i < attempts ? styles.attemptActive : styles.attemptUsed,
              ]}
            />
          ))}
        </View>
        <ThemedText style={styles.creatureName}>{creature.name}</ThemedText>
        <View style={[styles.rarityBadge, { backgroundColor: rarityColor + "30" }]}>
          <ThemedText style={[styles.rarityText, { color: rarityColor }]}>
            {creature.rarity.toUpperCase()}
          </ThemedText>
        </View>
      </View>

      <Pressable style={styles.gameArea} onPress={handleTap}>
        <View style={styles.targetRing}>
          <View style={[styles.perfectZone, { borderColor: "#22C55E" }]} />
          <View style={[styles.greatZone, { borderColor: "#3B82F6" }]} />
          <View style={[styles.goodZone, { borderColor: "#F59E0B" }]} />
        </View>

        <Animated.View style={[styles.shrinkingRing, ringAnimatedStyle]}>
          <View style={[styles.ringInner, { borderColor: rarityColor }]} />
        </Animated.View>

        <Animated.View style={[styles.creatureContainer, creatureAnimatedStyle]}>
          {creatureImage ? (
            <Image source={creatureImage} style={styles.creatureImage} />
          ) : (
            <View style={[styles.creaturePlaceholder, { backgroundColor: rarityColor }]}>
              <Feather name="target" size={40} color="#fff" />
            </View>
          )}
        </Animated.View>

        <Animated.View style={[styles.catchBall, catchBallAnimatedStyle]}>
          <View style={styles.pokeball}>
            <View style={styles.pokeballTop} />
            <View style={styles.pokeballLine} />
            <View style={styles.pokeballCenter}>
              <View style={styles.pokeballButton} />
            </View>
            <View style={styles.pokeballBottom} />
          </View>
        </Animated.View>
      </Pressable>

      {lastResult && (
        <View style={styles.resultContainer}>
          <ThemedText
            style={[
              styles.resultText,
              lastResult === "PERFECT!" && styles.perfectText,
              lastResult === "GREAT!" && styles.greatText,
              lastResult === "GOOD!" && styles.goodText,
              lastResult === "MISS!" && styles.missText,
            ]}
          >
            {lastResult}
          </ThemedText>
        </View>
      )}

      <View style={styles.instructions}>
        <ThemedText style={styles.instructionText}>
          {phase === "ready" 
            ? "Tap to start! Time your throw when the ring is in the green zone"
            : phase === "shrinking"
            ? "TAP NOW!"
            : phase === "caught"
            ? "Gotcha!"
            : "The creature escaped!"}
        </ThemedText>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#22C55E" }]} />
          <ThemedText style={styles.legendText}>Perfect (150 XP)</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#3B82F6" }]} />
          <ThemedText style={styles.legendText}>Great (75 XP)</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#F59E0B" }]} />
          <ThemedText style={styles.legendText}>Good (30 XP)</ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#fff",
    zIndex: 100,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  closeButton: {
    position: "absolute",
    top: 60,
    right: 20,
    padding: Spacing.md,
    zIndex: 1000,
    backgroundColor: GameColors.surfaceLight,
    borderRadius: 20,
    elevation: 10,
  },
  attemptContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  attemptDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  attemptActive: {
    backgroundColor: GameColors.primary,
  },
  attemptUsed: {
    backgroundColor: GameColors.surfaceLight,
  },
  creatureName: {
    fontSize: 28,
    fontWeight: "bold",
    color: GameColors.textPrimary,
    marginBottom: Spacing.sm,
  },
  rarityBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  rarityText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  gameArea: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  targetRing: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  perfectZone: {
    position: "absolute",
    width: RING_SIZE * 1.0,
    height: RING_SIZE * 1.0,
    borderRadius: RING_SIZE * 0.5,
    borderWidth: 3,
    borderStyle: "dashed",
    opacity: 0.5,
  },
  greatZone: {
    position: "absolute",
    width: RING_SIZE * 0.8,
    height: RING_SIZE * 0.8,
    borderRadius: RING_SIZE * 0.4,
    borderWidth: 3,
    borderStyle: "dashed",
    opacity: 0.5,
  },
  goodZone: {
    position: "absolute",
    width: RING_SIZE * 0.6,
    height: RING_SIZE * 0.6,
    borderRadius: RING_SIZE * 0.3,
    borderWidth: 3,
    borderStyle: "dashed",
    opacity: 0.5,
  },
  shrinkingRing: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  ringInner: {
    width: "100%",
    height: "100%",
    borderRadius: RING_SIZE / 2,
    borderWidth: 4,
  },
  creatureContainer: {
    width: INNER_SIZE,
    height: INNER_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  creatureImage: {
    width: INNER_SIZE,
    height: INNER_SIZE,
    borderRadius: INNER_SIZE / 2,
  },
  creaturePlaceholder: {
    width: INNER_SIZE,
    height: INNER_SIZE,
    borderRadius: INNER_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  catchBall: {
    position: "absolute",
    bottom: -50,
  },
  pokeball: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#333",
  },
  pokeballTop: {
    flex: 1,
    backgroundColor: "#FF6B6B",
  },
  pokeballLine: {
    height: 4,
    backgroundColor: "#333",
  },
  pokeballCenter: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  pokeballButton: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#fff",
  },
  pokeballBottom: {
    flex: 1,
    backgroundColor: "#fff",
  },
  resultContainer: {
    position: "absolute",
    top: "40%",
    alignItems: "center",
  },
  resultText: {
    fontSize: 36,
    fontWeight: "bold",
  },
  perfectText: {
    color: "#22C55E",
  },
  greatText: {
    color: "#3B82F6",
  },
  goodText: {
    color: "#F59E0B",
  },
  missText: {
    color: "#EF4444",
  },
  instructions: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  instructionText: {
    textAlign: "center",
    color: GameColors.textSecondary,
    fontSize: 16,
  },
  legend: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginTop: Spacing.lg,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: GameColors.textSecondary,
  },
});
