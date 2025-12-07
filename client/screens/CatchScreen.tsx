import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Image,
  Pressable,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
  FadeIn,
  FadeOut,
  ZoomIn,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { useGame } from "@/context/GameContext";
import { getCreatureDefinition, getRarityColor, getClassColor, CREATURE_IMAGES } from "@/constants/creatures";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "Catch">;

type CatchState = "idle" | "throwing" | "catching" | "success" | "escaped";

export default function CatchScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { state, catchCreature, useEgg } = useGame();
  
  const [catchState, setCatchState] = useState<CatchState>("idle");
  
  const creature = route.params.creature;
  const definition = getCreatureDefinition(creature.id);

  const eggY = useSharedValue(0);
  const eggX = useSharedValue(0);
  const eggScale = useSharedValue(1);
  const eggOpacity = useSharedValue(1);
  const creatureShake = useSharedValue(0);
  const creatureOpacity = useSharedValue(1);
  const successScale = useSharedValue(0);

  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, []);

  const triggerSuccessHaptic = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const triggerFailHaptic = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, []);

  const performCatch = useCallback(async () => {
    const result = await catchCreature(creature);
    
    if (result.success) {
      setCatchState("success");
      runOnJS(triggerSuccessHaptic)();
      creatureOpacity.value = withTiming(0, { duration: 300 });
      successScale.value = withSpring(1, { damping: 10 });
    } else {
      setCatchState("escaped");
      runOnJS(triggerFailHaptic)();
      creatureShake.value = withSequence(
        withTiming(-20, { duration: 50 }),
        withTiming(20, { duration: 50 }),
        withTiming(-20, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
      
      setTimeout(() => {
        setCatchState("idle");
        eggY.value = 0;
        eggScale.value = 1;
        eggOpacity.value = 1;
      }, 1000);
    }
  }, [creature, catchCreature]);

  const handleThrow = useCallback(() => {
    if (catchState !== "idle" || state.eggCount <= 0) return;
    
    if (!useEgg()) return;
    
    setCatchState("throwing");
    triggerHaptic();
    
    eggY.value = withTiming(-SCREEN_HEIGHT * 0.4, { duration: 400 });
    eggScale.value = withSequence(
      withTiming(1.2, { duration: 200 }),
      withTiming(0.5, { duration: 200 })
    );
    
    setTimeout(() => {
      setCatchState("catching");
      eggOpacity.value = withTiming(0, { duration: 200 });
      
      setTimeout(() => {
        performCatch();
      }, 500);
    }, 400);
  }, [catchState, state.eggCount, useEgg, performCatch]);

  const throwGesture = Gesture.Pan()
    .onEnd((event) => {
      if (event.velocityY < -500) {
        runOnJS(handleThrow)();
      }
    });

  const eggAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: eggY.value },
      { translateX: eggX.value },
      { scale: eggScale.value },
    ],
    opacity: eggOpacity.value,
  }));

  const creatureAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: creatureShake.value }],
    opacity: creatureOpacity.value,
  }));

  const successAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
  }));

  if (!definition) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ThemedText>Creature not found</ThemedText>
      </View>
    );
  }

  const rarityColor = getRarityColor(definition.rarity);
  const classColor = getClassColor(definition.roachyClass);

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.background}>
        <View style={[styles.backgroundGlow, { backgroundColor: rarityColor }]} />
      </View>

      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable style={styles.closeButton} onPress={handleClose}>
          <Feather name="x" size={24} color="#fff" />
        </Pressable>
        
        <View style={styles.creatureInfo}>
          <ThemedText type="h4" style={styles.creatureName}>
            {definition.name}
          </ThemedText>
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: classColor }]}>
              <ThemedText style={styles.badgeText}>{definition.roachyClass}</ThemedText>
            </View>
            <View style={[styles.badge, { backgroundColor: rarityColor }]}>
              <ThemedText style={styles.badgeText}>{definition.rarity}</ThemedText>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.creatureArea}>
        {catchState === "success" ? (
          <Animated.View
            entering={ZoomIn.springify()}
            style={[styles.successContainer, successAnimatedStyle]}
          >
            <View style={styles.successIcon}>
              <Feather name="check" size={48} color="#fff" />
            </View>
            <ThemedText type="h3" style={styles.successText}>
              Caught!
            </ThemedText>
            <ThemedText style={styles.successSubtext}>
              {definition.name} has been added to your collection
            </ThemedText>
          </Animated.View>
        ) : (
          <Animated.View style={[styles.creatureContainer, creatureAnimatedStyle]}>
            <View style={[styles.creatureGlow, { backgroundColor: rarityColor }]} />
            <Image
              source={CREATURE_IMAGES[creature.id]}
              style={styles.creatureImage}
            />
            {catchState === "catching" ? (
              <Animated.View
                entering={FadeIn}
                style={styles.catchingOverlay}
              >
                <View style={styles.sparkle} />
                <View style={[styles.sparkle, styles.sparkle2]} />
                <View style={[styles.sparkle, styles.sparkle3]} />
              </Animated.View>
            ) : null}
          </Animated.View>
        )}

        {catchState === "escaped" ? (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.escapedBanner}>
            <ThemedText style={styles.escapedText}>It escaped! Try again</ThemedText>
          </Animated.View>
        ) : null}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xl }]}>
        {catchState === "success" ? (
          <Button onPress={handleClose} style={styles.doneButton}>
            Done
          </Button>
        ) : (
          <>
            <View style={styles.eggCounter}>
              <Feather name="disc" size={18} color={GameColors.primary} />
              <ThemedText style={styles.eggCountText}>
                {state.eggCount} Eggs
              </ThemedText>
            </View>

            <GestureDetector gesture={throwGesture}>
              <Animated.View style={[styles.throwArea, eggAnimatedStyle]}>
                <View style={styles.catchEgg}>
                  <View style={styles.eggTop} />
                  <View style={styles.eggLine} />
                  <View style={styles.eggCenter}>
                    <View style={styles.eggButton} />
                  </View>
                  <View style={styles.eggBottom} />
                </View>
              </Animated.View>
            </GestureDetector>

            <ThemedText style={styles.swipeHint}>
              Swipe up to throw
            </ThemedText>
          </>
        )}
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <ThemedText style={styles.statLabel}>Catch Rate</ThemedText>
          <View style={styles.statBar}>
            <View 
              style={[
                styles.statBarFill, 
                { 
                  width: `${definition.catchRate * 100}%`,
                  backgroundColor: definition.catchRate > 0.5 ? "#4ECDC4" : definition.catchRate > 0.25 ? "#FFD93D" : "#FF6B6B"
                }
              ]} 
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  backgroundGlow: {
    width: SCREEN_WIDTH * 1.5,
    height: SCREEN_WIDTH * 1.5,
    borderRadius: SCREEN_WIDTH * 0.75,
    opacity: 0.15,
    position: "absolute",
    top: "20%",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  creatureInfo: {
    alignItems: "flex-end",
  },
  creatureName: {
    color: "#fff",
    marginBottom: Spacing.xs,
  },
  badges: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
    textTransform: "capitalize",
  },
  creatureArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  creatureContainer: {
    alignItems: "center",
  },
  creatureGlow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.4,
  },
  creatureImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  catchingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  sparkle: {
    position: "absolute",
    width: 20,
    height: 20,
    backgroundColor: "#FFD93D",
    borderRadius: 10,
    opacity: 0.8,
  },
  sparkle2: {
    top: 30,
    left: 30,
    width: 15,
    height: 15,
  },
  sparkle3: {
    bottom: 40,
    right: 20,
    width: 12,
    height: 12,
  },
  escapedBanner: {
    position: "absolute",
    bottom: 50,
    backgroundColor: "rgba(255, 107, 107, 0.9)",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  escapedText: {
    color: "#fff",
    fontWeight: "600",
  },
  successContainer: {
    alignItems: "center",
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#4ECDC4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  successText: {
    color: "#fff",
    marginBottom: Spacing.sm,
  },
  successSubtext: {
    color: GameColors.textSecondary,
    textAlign: "center",
  },
  footer: {
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  eggCounter: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  eggCountText: {
    color: GameColors.textSecondary,
  },
  throwArea: {
    marginBottom: Spacing.lg,
  },
  catchEgg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
    borderWidth: 4,
    borderColor: "#333",
  },
  eggTop: {
    flex: 1,
    backgroundColor: GameColors.primary,
  },
  eggLine: {
    height: 6,
    backgroundColor: "#333",
  },
  eggCenter: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -15,
    marginLeft: -15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  eggButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#fff",
  },
  eggBottom: {
    flex: 1,
    backgroundColor: "#F5E6D3",
  },
  swipeHint: {
    color: GameColors.textSecondary,
    fontSize: 14,
  },
  doneButton: {
    width: "100%",
    backgroundColor: "#4ECDC4",
  },
  statsCard: {
    position: "absolute",
    bottom: 200,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: GameColors.surface + "CC",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  statItem: {
    gap: Spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: GameColors.textSecondary,
  },
  statBar: {
    height: 6,
    backgroundColor: GameColors.surfaceLight,
    borderRadius: 3,
    overflow: "hidden",
  },
  statBarFill: {
    height: "100%",
    borderRadius: 3,
  },
});
