import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  Linking,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { getRarityColor, getClassIcon, getClassColor } from "@/constants/creatures";
import { Spawn } from "@/context/HuntContext";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface CameraEncounterProps {
  spawn: Spawn;
  onStartCatch: (spawn: Spawn) => void;
  onCancel: () => void;
  isCollecting?: boolean;
}

export function CameraEncounter({ spawn, onStartCatch, onCancel, isCollecting = false }: CameraEncounterProps) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  const creatureX = useSharedValue(SCREEN_WIDTH / 2 - 60);
  const creatureY = useSharedValue(SCREEN_HEIGHT / 2.5);
  const creatureScale = useSharedValue(1);
  const creatureRotation = useSharedValue(0);
  const glowOpacity = useSharedValue(0.5);
  const floatOffset = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  const netScale = useSharedValue(0);
  const netOpacity = useSharedValue(0);
  const netY = useSharedValue(SCREEN_HEIGHT);

  const rarityColor = getRarityColor(spawn.rarity as any) || GameColors.primary;
  const classIcon = getClassIcon(spawn.creatureClass as any) || "target";
  const classColor = getClassColor(spawn.creatureClass as any) || GameColors.primary;
  
  // Phase I: Detect mystery eggs to hide rarity until after catching
  const isMysteryEgg = spawn.name?.toLowerCase().includes("mystery egg") || spawn.creatureClass === "egg";

  useEffect(() => {
    floatOffset.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(12, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    creatureRotation.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(4, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1000 }),
        withTiming(0.4, { duration: 1000 })
      ),
      -1,
      true
    );

    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    const randomMove = () => {
      const newX = 60 + Math.random() * (SCREEN_WIDTH - 180);
      const newY = 150 + Math.random() * (SCREEN_HEIGHT / 2.5 - 100);
      creatureX.value = withTiming(newX, { duration: 3500, easing: Easing.inOut(Easing.ease) });
      creatureY.value = withTiming(newY, { duration: 3500, easing: Easing.inOut(Easing.ease) });
    };

    const moveInterval = setInterval(randomMove, 4500);
    return () => clearInterval(moveInterval);
  }, []);

  const handleThrowNet = () => {
    console.log("[CameraEncounter] handleThrowNet called, isCollecting:", isCollecting, "isMysteryEgg:", isMysteryEgg);
    if (isCollecting) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    // Phase I mystery eggs: Skip net animation, call API immediately
    if (isMysteryEgg) {
      console.log("[CameraEncounter] Calling onStartCatch for mystery egg, passing spawn:", spawn.id);
      onStartCatch(spawn);
      return;
    }
    
    // Regular creatures: Show net throw animation
    netOpacity.value = 1;
    netScale.value = 0.3;
    netY.value = SCREEN_HEIGHT - 200;

    netY.value = withTiming(creatureY.value, { duration: 400 }, (finished) => {
      if (finished) {
        runOnJS(triggerCatch)();
      }
    });
    netScale.value = withTiming(1, { duration: 400 });
  };

  const triggerCatch = () => {
    creatureScale.value = withSequence(
      withSpring(0.8),
      withSpring(1.1),
      withSpring(0)
    );
    
    setTimeout(() => {
      onStartCatch(spawn);
    }, 600);
  };

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      runOnJS(handleThrowNet)();
    });

  const creatureAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: creatureX.value },
      { translateY: creatureY.value + floatOffset.value },
      { scale: creatureScale.value },
      { rotate: `${creatureRotation.value}deg` },
    ],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const netAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: netY.value },
      { scale: netScale.value },
    ],
    opacity: netOpacity.value,
  }));

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  if (!permission) {
    return (
      <ThemedView style={styles.permissionContainer}>
        <ThemedText>Loading camera...</ThemedText>
      </ThemedView>
    );
  }

  const handleOpenSettings = async () => {
    if (Platform.OS !== "web") {
      try {
        await Linking.openSettings();
      } catch (error) {
      }
    }
  };

  if (!permission.granted) {
    const isPermanentlyDenied = permission.status === "denied" && !permission.canAskAgain;
    
    return (
      <ThemedView style={[styles.permissionContainer, { paddingTop: insets.top }]}>
        <View style={styles.permissionContent}>
          <View style={styles.permissionIcon}>
            <Feather name="camera" size={48} color={GameColors.primary} />
          </View>
          <ThemedText type="h3" style={styles.permissionTitle}>
            Camera Access Required
          </ThemedText>
          <ThemedText style={styles.permissionText}>
            {isPermanentlyDenied
              ? "Camera permission was denied. Please enable it in your device settings to catch Roachies!"
              : "Enable camera to see Roachies in the real world and catch them!"}
          </ThemedText>
          {isPermanentlyDenied && Platform.OS !== "web" ? (
            <Pressable style={styles.permissionButton} onPress={handleOpenSettings}>
              <ThemedText style={styles.permissionButtonText}>Open Settings</ThemedText>
            </Pressable>
          ) : (
            <Pressable style={styles.permissionButton} onPress={requestPermission}>
              <ThemedText style={styles.permissionButtonText}>Enable Camera</ThemedText>
            </Pressable>
          )}
          <Pressable style={styles.cancelButton} onPress={onCancel}>
            <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <View style={styles.container}>
      {Platform.OS !== "web" ? (
        <CameraView style={styles.camera} facing="back" />
      ) : (
        <View style={[styles.camera, styles.webFallback]}>
          <View style={styles.webGrid}>
            {[...Array(20)].map((_, i) => (
              <View key={i} style={styles.webGridCell} />
            ))}
          </View>
          <ThemedText style={styles.webText}>Camera AR View</ThemedText>
          <ThemedText style={styles.webSubtext}>Run in Expo Go for real camera</ThemedText>
        </View>
      )}

      <LinearGradient
        colors={["rgba(0,0,0,0.5)", "transparent"]}
        style={[styles.topVignette, { height: insets.top + 80 }]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.6)"]}
        style={[styles.bottomVignette, { height: 180 + insets.bottom }]}
        pointerEvents="none"
      />

      <Animated.View 
        entering={FadeInDown.duration(300).springify()}
        style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}
      >
        <Pressable style={styles.closeButton} onPress={onCancel}>
          <BlurView intensity={40} tint="dark" style={styles.blurButton}>
            <Feather name="x" size={20} color="#fff" />
          </BlurView>
        </Pressable>
        
        <View style={styles.statRibbon}>
          <BlurView intensity={50} tint="dark" style={styles.ribbonBlur}>
            {/* Phase I: Hide rarity for mystery eggs - only show after catching */}
            {!isMysteryEgg && (
              <View style={[styles.rarityPill, { backgroundColor: rarityColor + "30" }]}>
                <View style={[styles.rarityDot, { backgroundColor: rarityColor }]} />
                <ThemedText style={[styles.rarityText, { color: rarityColor }]}>
                  {spawn.rarity.toUpperCase()}
                </ThemedText>
              </View>
            )}
            <ThemedText style={styles.creatureName} numberOfLines={1}>
              {isMysteryEgg ? "Mystery Egg" : spawn.name}
            </ThemedText>
            {/* Phase I: Hide class icon for mystery eggs */}
            {!isMysteryEgg && (
              <View style={[styles.classPill, { backgroundColor: classColor + "30" }]}>
                <Feather name={classIcon as any} size={12} color={classColor} />
              </View>
            )}
          </BlurView>
        </View>

        <View style={styles.distanceBadge}>
          <BlurView intensity={40} tint="dark" style={styles.distanceBlur}>
            <Feather name="navigation" size={12} color={GameColors.primary} />
            <ThemedText style={styles.distanceText}>
              {spawn.distance ? `${spawn.distance}m` : "Near"}
            </ThemedText>
          </BlurView>
        </View>
      </Animated.View>

      <GestureDetector gesture={tapGesture}>
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <View style={StyleSheet.absoluteFill}>
            <Animated.View style={[styles.creature, creatureAnimatedStyle]}>
              <Animated.View style={[styles.creatureGlow, glowAnimatedStyle, { shadowColor: GameColors.primary }]} />
              <LinearGradient
                colors={["#FFD700", "#FFA500", "#FF8C00"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.eggBody}
              >
                <View style={styles.eggShine} />
                <View style={styles.eggShineSmall} />
                <ThemedText style={styles.eggQuestion}>?</ThemedText>
                <View style={[styles.eggClassBadge, { backgroundColor: classColor }]}>
                  <Feather name={classIcon as any} size={12} color="#fff" />
                </View>
              </LinearGradient>
              <View style={styles.eggSparkles}>
                <View style={[styles.sparkle, styles.sparkle1]} />
                <View style={[styles.sparkle, styles.sparkle2]} />
                <View style={[styles.sparkle, styles.sparkle3]} />
              </View>
            </Animated.View>

            <Animated.View style={[styles.netContainer, netAnimatedStyle]}>
              <View style={styles.net}>
                <Feather name="target" size={60} color={GameColors.primary} />
              </View>
            </Animated.View>
          </View>

          <Animated.View 
            entering={FadeInUp.duration(400).springify()}
            style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}
          >
            {isCollecting ? (
              <View style={styles.actionCapsule}>
                <BlurView intensity={60} tint="dark" style={styles.capsuleBlur}>
                  <ActivityIndicator size="large" color={GameColors.primary} />
                  <ThemedText style={[styles.catchLabel, { marginTop: Spacing.sm }]}>COLLECTING...</ThemedText>
                </BlurView>
              </View>
            ) : (
              <Pressable 
                onPress={() => {
                  console.log("[CATCH BUTTON] PRESSED!");
                  handleThrowNet();
                }} 
                style={styles.actionCapsule}
              >
                <BlurView intensity={60} tint="dark" style={styles.capsuleBlur} pointerEvents="none">
                  <ThemedText style={[styles.instructionSmall, { color: "#00FF00" }]}>v11 - KEEP MODAL OPEN</ThemedText>
                  
                  <Animated.View style={pulseAnimatedStyle} pointerEvents="none">
                    <LinearGradient
                      colors={["#00FF00", "#00CC00"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.catchButton}
                    >
                      <View style={styles.catchButtonInner}>
                        <Feather name="crosshair" size={28} color="#000" />
                      </View>
                    </LinearGradient>
                  </Animated.View>
                  
                  <ThemedText style={[styles.catchLabel, { color: "#00FF00" }]}>GRAB EGG</ThemedText>
                </BlurView>
              </Pressable>
            )}
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  webFallback: {
    backgroundColor: "#1a1a2e",
    justifyContent: "center",
    alignItems: "center",
  },
  webGrid: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    flexWrap: "wrap",
    opacity: 0.3,
  },
  webGridCell: {
    width: "20%",
    height: "10%",
    borderWidth: 0.5,
    borderColor: GameColors.primary,
  },
  webText: {
    fontSize: 24,
    fontWeight: "bold",
    color: GameColors.primary,
  },
  webSubtext: {
    fontSize: 14,
    color: GameColors.textSecondary,
    marginTop: Spacing.sm,
  },
  topVignette: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  bottomVignette: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: GameColors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  permissionContent: {
    alignItems: "center",
    padding: Spacing.xl,
  },
  permissionIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: GameColors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  permissionTitle: {
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  permissionText: {
    textAlign: "center",
    color: GameColors.textSecondary,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  permissionButton: {
    backgroundColor: GameColors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  permissionButtonText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 16,
  },
  cancelButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  cancelButtonText: {
    color: GameColors.textSecondary,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    zIndex: 100,
  },
  closeButton: {
    overflow: "hidden",
    borderRadius: 20,
  },
  blurButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  statRibbon: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  ribbonBlur: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
    overflow: "hidden",
  },
  rarityPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  rarityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  creatureName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  classPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  distanceBadge: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  distanceBlur: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: 4,
    overflow: "hidden",
  },
  distanceText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  creature: {
    position: "absolute",
    width: 120,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  creatureGlow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 20,
  },
  eggBody: {
    width: 90,
    height: 110,
    borderRadius: 45,
    borderTopLeftRadius: 45,
    borderTopRightRadius: 45,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.4)",
  },
  eggShine: {
    position: "absolute",
    top: 15,
    left: 15,
    width: 25,
    height: 35,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.5)",
    transform: [{ rotate: "-20deg" }],
  },
  eggShineSmall: {
    position: "absolute",
    top: 30,
    left: 45,
    width: 10,
    height: 15,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  eggQuestion: {
    fontSize: 40,
    fontWeight: "bold",
    color: "rgba(139,69,19,0.6)",
    marginTop: 5,
  },
  eggClassBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  eggSparkles: {
    position: "absolute",
    width: 140,
    height: 140,
  },
  sparkle: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFD700",
  },
  sparkle1: {
    top: 10,
    right: 20,
  },
  sparkle2: {
    bottom: 15,
    left: 10,
  },
  sparkle3: {
    top: 50,
    left: 5,
  },
  netContainer: {
    position: "absolute",
    left: SCREEN_WIDTH / 2 - 40,
  },
  net: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: GameColors.primary,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  actionCapsule: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  capsuleBlur: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    overflow: "hidden",
  },
  instructionSmall: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  catchPressable: {
    alignItems: "center",
    justifyContent: "center",
  },
  catchButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },
  catchButtonInner: {
    width: "100%",
    height: "100%",
    borderRadius: 32,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  catchLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#fff",
    marginTop: Spacing.sm,
    letterSpacing: 2,
  },
});
