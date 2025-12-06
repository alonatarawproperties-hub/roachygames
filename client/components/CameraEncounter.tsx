import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  Linking,
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
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { getRarityColor, getClassIcon, getClassColor } from "@/constants/creatures";
import { Spawn } from "@/context/HuntContext";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface CameraEncounterProps {
  spawn: Spawn;
  onStartCatch: () => void;
  onCancel: () => void;
}

export function CameraEncounter({ spawn, onStartCatch, onCancel }: CameraEncounterProps) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [isReady, setIsReady] = useState(false);

  const creatureX = useSharedValue(SCREEN_WIDTH / 2 - 60);
  const creatureY = useSharedValue(SCREEN_HEIGHT / 3);
  const creatureScale = useSharedValue(1);
  const creatureRotation = useSharedValue(0);
  const glowOpacity = useSharedValue(0.5);
  const floatOffset = useSharedValue(0);

  const netScale = useSharedValue(0);
  const netOpacity = useSharedValue(0);
  const netY = useSharedValue(SCREEN_HEIGHT);

  const rarityColor = getRarityColor(spawn.rarity as any) || GameColors.primary;
  const classIcon = getClassIcon(spawn.creatureClass as any) || "target";
  const classColor = getClassColor(spawn.creatureClass as any) || GameColors.primary;

  useEffect(() => {
    floatOffset.value = withRepeat(
      withSequence(
        withTiming(-15, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(15, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    creatureRotation.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(5, { duration: 2000, easing: Easing.inOut(Easing.ease) })
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

    const randomMove = () => {
      const newX = 50 + Math.random() * (SCREEN_WIDTH - 170);
      const newY = 100 + Math.random() * (SCREEN_HEIGHT / 2 - 100);
      creatureX.value = withTiming(newX, { duration: 3000, easing: Easing.inOut(Easing.ease) });
      creatureY.value = withTiming(newY, { duration: 3000, easing: Easing.inOut(Easing.ease) });
    };

    const moveInterval = setInterval(randomMove, 4000);
    return () => clearInterval(moveInterval);
  }, []);

  const handleThrowNet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
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
      onStartCatch();
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

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable style={styles.closeButton} onPress={onCancel}>
          <Feather name="x" size={24} color="#fff" />
        </Pressable>
        
        <View style={styles.creatureInfo}>
          <View style={[styles.rarityBadge, { backgroundColor: rarityColor + "40" }]}>
            <ThemedText style={[styles.rarityText, { color: rarityColor }]}>
              {spawn.rarity.toUpperCase()}
            </ThemedText>
          </View>
          <ThemedText style={styles.creatureName}>{spawn.name}</ThemedText>
          <View style={[styles.classBadge, { backgroundColor: classColor + "40" }]}>
            <Feather name={classIcon as any} size={12} color={classColor} />
            <ThemedText style={[styles.classText, { color: classColor }]}>
              {spawn.creatureClass}
            </ThemedText>
          </View>
        </View>
      </View>

      <GestureDetector gesture={tapGesture}>
        <View style={StyleSheet.absoluteFill}>
          <Animated.View style={[styles.creature, creatureAnimatedStyle]}>
            <Animated.View style={[styles.creatureGlow, glowAnimatedStyle, { shadowColor: rarityColor }]} />
            <View style={[styles.creatureBody, { backgroundColor: rarityColor }]}>
              <View style={styles.creatureEyes}>
                <View style={styles.eye}>
                  <View style={styles.pupil} />
                </View>
                <View style={styles.eye}>
                  <View style={styles.pupil} />
                </View>
              </View>
              <View style={styles.creatureAntennae}>
                <View style={[styles.antenna, styles.antennaLeft]} />
                <View style={[styles.antenna, styles.antennaRight]} />
              </View>
              <View style={styles.creatureLegs}>
                <View style={styles.leg} />
                <View style={styles.leg} />
                <View style={styles.leg} />
              </View>
              <View style={[styles.classIndicator, { backgroundColor: classColor }]}>
                <Feather name={classIcon as any} size={16} color="#fff" />
              </View>
            </View>
          </Animated.View>

          <Animated.View style={[styles.netContainer, netAnimatedStyle]}>
            <View style={styles.net}>
              <Feather name="target" size={60} color={GameColors.primary} />
            </View>
          </Animated.View>
        </View>
      </GestureDetector>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <View style={styles.targetIndicator}>
          <View style={styles.targetRing}>
            <View style={styles.targetInner} />
          </View>
        </View>
        <ThemedText style={styles.instruction}>
          TAP to throw net and catch!
        </ThemedText>
        <View style={styles.distanceContainer}>
          <Feather name="map-pin" size={14} color={GameColors.textSecondary} />
          <ThemedText style={styles.distanceText}>
            {spawn.distance ? `${spawn.distance}m away` : "Nearby"}
          </ThemedText>
        </View>
      </View>
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
    paddingHorizontal: Spacing.lg,
    zIndex: 100,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  creatureInfo: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  rarityBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xs,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  creatureName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: Spacing.xs,
  },
  classBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  classText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
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
  creatureBody: {
    width: 100,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  creatureEyes: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 10,
  },
  eye: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  pupil: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#000",
  },
  creatureAntennae: {
    position: "absolute",
    top: -20,
    flexDirection: "row",
    width: 60,
    justifyContent: "space-between",
  },
  antenna: {
    width: 4,
    height: 25,
    backgroundColor: "#333",
    borderRadius: 2,
  },
  antennaLeft: {
    transform: [{ rotate: "-30deg" }],
  },
  antennaRight: {
    transform: [{ rotate: "30deg" }],
  },
  creatureLegs: {
    position: "absolute",
    bottom: -15,
    flexDirection: "row",
    gap: 15,
  },
  leg: {
    width: 6,
    height: 20,
    backgroundColor: "#333",
    borderRadius: 3,
  },
  classIndicator: {
    position: "absolute",
    bottom: -5,
    right: -5,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
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
  targetIndicator: {
    marginBottom: Spacing.md,
  },
  targetRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  targetInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: GameColors.primary,
    backgroundColor: "rgba(255,149,0,0.2)",
  },
  instruction: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
    marginBottom: Spacing.sm,
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  distanceText: {
    color: GameColors.textSecondary,
    fontSize: 12,
  },
});
