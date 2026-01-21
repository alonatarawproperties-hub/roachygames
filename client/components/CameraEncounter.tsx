import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  Linking,
  ActivityIndicator,
  Image,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  runOnJS,
  interpolate,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { CatchingHUDOverlay } from "@/components/CatchingHUDOverlay";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { getRarityColor, getClassIcon, getClassColor } from "@/constants/creatures";
import { Spawn } from "@/context/HuntContext";
import { pushApiDebug, genDebugId } from "@/lib/api-debug";
import { apiRequest } from "@/lib/query-client";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface CameraEncounterProps {
  spawn: Spawn;
  onStartCatch: (spawn: Spawn) => void;
  onCancel: () => void;
  onMiss: (spawn: Spawn) => void;
  isCollecting?: boolean;
}

export function CameraEncounter({ spawn, onStartCatch, onCancel, onMiss, isCollecting = false }: CameraEncounterProps) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [isCatching, setIsCatching] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [showMissed, setShowMissed] = useState(false);
  const apiCalledRef = useRef(false);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const sentMissRef = useRef(new Set<string>());
  
  // A) Refs for egg bounds measurement (screen coordinates)
  const eggRef = useRef<View>(null);
  const eggRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  
  const measureEgg = () => {
    requestAnimationFrame(() => {
      eggRef.current?.measureInWindow((x, y, w, h) => {
        eggRectRef.current = { x, y, w, h };
        console.log("[EggRect]", eggRectRef.current);
      });
    });
  };

  // Reset state when spawn changes + measure egg
  useEffect(() => {
    apiCalledRef.current = false;
    setIsCatching(false);
    setShowParticles(false);
    measureEgg();
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, [spawn.id]);
  
  // E) Safety: prevent "CATCHING..." stuck - force exit after 18s
  useEffect(() => {
    if (!isCatching) return;
    const t = setTimeout(() => {
      console.log("[CameraEncounter] catch timeout 18s - force exit");
      pushApiDebug({ id: genDebugId(), ts: Date.now(), kind: "event", extra: `catch_timeout_18s spawn=${spawn.id}` });
      onCancel?.();
    }, 18000);
    return () => clearTimeout(t);
  }, [isCatching, spawn.id]);

  // Egg position and idle animations
  const creatureX = useSharedValue(SCREEN_WIDTH / 2 - 60);
  const creatureY = useSharedValue(SCREEN_HEIGHT / 2.5);
  const creatureScale = useSharedValue(1);
  const creatureRotation = useSharedValue(0);
  const creatureOpacity = useSharedValue(1);
  const glowOpacity = useSharedValue(0.5);
  const floatOffset = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  // Catching animation values
  const catchProgress = useSharedValue(0);
  const lassoX = useSharedValue(SCREEN_WIDTH + 50);
  const lassoY = useSharedValue(SCREEN_HEIGHT);
  const lassoScale = useSharedValue(0.5);
  const lassoRotation = useSharedValue(45);
  const lassoOpacity = useSharedValue(0);
  
  // Capture ring effect
  const captureRingScale = useSharedValue(0);
  const captureRingOpacity = useSharedValue(0);
  
  // Portal effect
  const portalScale = useSharedValue(0);
  const portalOpacity = useSharedValue(0);
  
  // Shockwave
  const shockwaveScale = useSharedValue(0);
  const shockwaveOpacity = useSharedValue(0);

  // Legacy net values (for non-egg creatures)
  const netScale = useSharedValue(0);
  const netOpacity = useSharedValue(0);
  const netY = useSharedValue(SCREEN_HEIGHT);

  const rarityColor = getRarityColor(spawn.rarity as any) || GameColors.primary;
  const classIcon = getClassIcon(spawn.creatureClass as any) || "target";
  const classColor = getClassColor(spawn.creatureClass as any) || GameColors.primary;
  
  const isMysteryEgg = spawn.name?.toLowerCase().includes("mystery egg") || spawn.creatureClass === "egg";

  // Idle floating animation
  useEffect(() => {
    if (isCatching) return;
    
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

    const randomMove = (fast = false) => {
      if (isCatching) return;
      // More exaggerated movement - wider range, unpredictable
      const newX = 20 + Math.random() * (SCREEN_WIDTH - 280);
      const newY = 100 + Math.random() * (SCREEN_HEIGHT / 2 - 60);
      const duration = fast ? 600 : 1200 + Math.random() * 800; // Fast initial, then variable speed
      creatureX.value = withTiming(newX, { duration, easing: Easing.inOut(Easing.ease) });
      creatureY.value = withTiming(newY, { duration, easing: Easing.inOut(Easing.ease) });
    };

    // Immediately start fast unpredictable movement
    randomMove(true);
    
    // Then continue with rapid interval movements
    const moveInterval = setInterval(() => randomMove(false), 1500 + Math.random() * 800);
    
    // Re-measure egg bounds every 200ms while it moves
    const measureInterval = setInterval(measureEgg, 200);
    
    return () => {
      clearInterval(moveInterval);
      clearInterval(measureInterval);
    };
  }, [isCatching]);

  const callApiOnce = () => {
    if (apiCalledRef.current) return;
    apiCalledRef.current = true;
    onStartCatch(spawn);
  };

  const startCatchAnimation = () => {
    // Clear previous timeouts
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    
    setIsCatching(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Stop idle animations
    floatOffset.value = withTiming(0, { duration: 100 });
    creatureRotation.value = withTiming(0, { duration: 100 });

    // PHASE 1: Energy lasso flies toward egg (0-320ms)
    lassoOpacity.value = 1;
    lassoX.value = SCREEN_WIDTH + 50;
    lassoY.value = SCREEN_HEIGHT - 100;
    lassoScale.value = 0.6;
    lassoRotation.value = 30;

    const targetX = creatureX.value + 30;
    const targetY = creatureY.value + 30;

    lassoX.value = withTiming(targetX, { duration: 320, easing: Easing.out(Easing.cubic) });
    lassoY.value = withTiming(targetY, { duration: 320, easing: Easing.out(Easing.cubic) });
    lassoScale.value = withTiming(1.1, { duration: 320 });
    lassoRotation.value = withTiming(-10, { duration: 320 });

    // PHASE 2: Capture effect (320-560ms)
    const phase2Timeout = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setShowParticles(true);
      
      creatureScale.value = withSequence(
        withSpring(0.75, { damping: 8, stiffness: 400 }),
        withSpring(1.15, { damping: 8, stiffness: 350 }),
        withSpring(0.9, { damping: 10, stiffness: 300 })
      );

      captureRingScale.value = 0.5;
      captureRingOpacity.value = 1;
      captureRingScale.value = withTiming(1.8, { duration: 300 });
      captureRingOpacity.value = withTiming(0, { duration: 300 });

      glowOpacity.value = withTiming(1, { duration: 200 });
      lassoOpacity.value = withTiming(0, { duration: 200 });

      // Call API at 55% progress
      const apiTimeout = setTimeout(callApiOnce, 100);
      timeoutsRef.current.push(apiTimeout);
    }, 320);
    timeoutsRef.current.push(phase2Timeout);

    // PHASE 3: Egg flies to portal (560-850ms)
    const phase3Timeout = setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      portalScale.value = 0;
      portalOpacity.value = 1;
      portalScale.value = withSpring(1, { damping: 12, stiffness: 200 });

      creatureY.value = withTiming(SCREEN_HEIGHT - 120, { duration: 280, easing: Easing.in(Easing.cubic) });
      creatureScale.value = withTiming(0.2, { duration: 280 });
      creatureOpacity.value = withTiming(0, { duration: 280 });

      const shockwaveTimeout = setTimeout(() => {
        shockwaveScale.value = 0;
        shockwaveOpacity.value = 0.5;
        shockwaveScale.value = withTiming(2.5, { duration: 250 });
        shockwaveOpacity.value = withTiming(0, { duration: 250 });
        
        portalScale.value = withDelay(100, withTiming(0, { duration: 150 }));
        portalOpacity.value = withDelay(100, withTiming(0, { duration: 150 }));
      }, 200);
      timeoutsRef.current.push(shockwaveTimeout);
    }, 560);
    timeoutsRef.current.push(phase3Timeout);

    // Cleanup animation state after completion (850ms total)
    const cleanupTimeout = setTimeout(() => {
      setShowParticles(false);
    }, 900);
    timeoutsRef.current.push(cleanupTimeout);
  };

  const handleThrowNet = () => {
    if (isCollecting || isCatching) return;
    
    if (isMysteryEgg) {
      startCatchAnimation();
      return;
    }
    
    // Regular creatures: Legacy net animation
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
      onStartCatch(spawn);
    }, 600);
  };

  // Hit detection constants
  const HIT_PADDING = 30; // Extra padding for easier tapping

  // C) Handle tap with coordinate-based hit detection using measured egg bounds
  const handleTapAtPosition = async (tapX: number, tapY: number) => {
    if (isCollecting || isCatching || showMissed) return;
    
    // Use measured egg rect for accurate hit detection (screen coordinates)
    const r = eggRectRef.current;
    if (!r) {
      console.log("[TapDetect] egg rect not ready, measuring...");
      measureEgg();
      return;
    }
    
    const pad = HIT_PADDING;
    const isHit =
      tapX >= r.x - pad &&
      tapX <= r.x + r.w + pad &&
      tapY >= r.y - pad &&
      tapY <= r.y + r.h + pad;
    
    console.log("[TapDetect] tap:", tapX.toFixed(0), tapY.toFixed(0), "eggRect:", JSON.stringify(r), "isHit:", isHit);
    
    if (isHit) {
      // Debug event: tap hit
      pushApiDebug({ id: genDebugId(), ts: Date.now(), kind: "event", extra: `tap_hit spawn=${spawn.id}` });
      // Successful tap on egg!
      startCatchAnimation();
    } else {
      // Debug event: tap miss
      pushApiDebug({ id: genDebugId(), ts: Date.now(), kind: "event", extra: `tap_miss spawn=${spawn.id}` });
      // Missed - tapped outside egg
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      apiCalledRef.current = false; // Reset for next encounter
      setShowMissed(true);
      
      // Prevent double-sending miss for same spawn
      if (sentMissRef.current.has(spawn.id)) {
        pushApiDebug({ id: genDebugId(), ts: Date.now(), kind: "event", extra: `miss_already_sent spawn=${spawn.id}` });
        setTimeout(() => {
          apiCalledRef.current = false;
          onCancel();
        }, 1200);
        return;
      }
      sentMissRef.current.add(spawn.id);
      
      // Direct HTTP call for miss - do NOT rely on onMiss callback
      console.log("[TapDetect] Making direct HTTP miss call for spawn:", spawn.id);
      pushApiDebug({ id: genDebugId(), ts: Date.now(), kind: "event", extra: `miss_http_start spawn=${spawn.id}` });
      try {
        const res = await apiRequest("POST", "/api/hunt/miss", { spawnId: spawn.id });
        console.log("[TapDetect] miss HTTP done, status:", res.status);
        pushApiDebug({ id: genDebugId(), ts: Date.now(), kind: "event", extra: `miss_http_done spawn=${spawn.id} status=${res.status}` });
      } catch (err) {
        console.log("[TapDetect] miss HTTP error:", err);
        pushApiDebug({ id: genDebugId(), ts: Date.now(), kind: "event", extra: `miss_http_error spawn=${spawn.id} err=${String(err)}` });
      }
      
      // Also call onMiss callback for local state update (optimistic removal)
      try {
        await onMiss(spawn);
      } catch {}
      
      setTimeout(() => {
        apiCalledRef.current = false;
        onCancel();
      }, 1200);
    }
  };

  // Wrapper to reset apiCalledRef before cancel
  const handleCancel = () => {
    apiCalledRef.current = false;
    onCancel();
  };

  const tapGesture = Gesture.Tap()
    .onEnd((event) => {
      runOnJS(handleTapAtPosition)(event.absoluteX, event.absoluteY);
    });

  const creatureAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: creatureX.value },
      { translateY: creatureY.value + floatOffset.value },
      { scale: creatureScale.value },
      { rotate: `${creatureRotation.value}deg` },
    ],
    opacity: creatureOpacity.value,
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const lassoAnimatedStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    transform: [
      { translateX: lassoX.value },
      { translateY: lassoY.value },
      { scale: lassoScale.value },
      { rotate: `${lassoRotation.value}deg` },
    ],
    opacity: lassoOpacity.value,
  }));

  const captureRingAnimatedStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: creatureX.value - 10,
    top: creatureY.value - 10,
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: '#FFD700',
    transform: [{ scale: captureRingScale.value }],
    opacity: captureRingOpacity.value,
  }));

  const portalAnimatedStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    bottom: 100,
    left: SCREEN_WIDTH / 2 - 50,
    width: 100,
    height: 100,
    borderRadius: 50,
    transform: [{ scale: portalScale.value }],
    opacity: portalOpacity.value,
  }));

  const shockwaveAnimatedStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    bottom: 100,
    left: SCREEN_WIDTH / 2 - 50,
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FFD700',
    transform: [{ scale: shockwaveScale.value }],
    opacity: shockwaveOpacity.value,
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
          <Pressable style={styles.cancelButton} onPress={handleCancel}>
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

      {/* Gamey Bronze HUD Overlay */}
      <CatchingHUDOverlay
        title={isMysteryEgg ? "Mystery Egg" : spawn.name}
        distanceText={spawn.distance ? `${spawn.distance}m` : "Near"}
        statusText={isCatching ? "CATCHING..." : "COLLECTING..."}
        onClose={handleCancel}
        visible={true}
        isCatching={isCatching || isCollecting}
      />

      <GestureDetector gesture={tapGesture}>
        <View style={StyleSheet.absoluteFill}>
          <View style={StyleSheet.absoluteFill}>
            <Animated.View style={[styles.creature, creatureAnimatedStyle]}>
              <Animated.View style={[styles.creatureGlow, glowAnimatedStyle, { shadowColor: GameColors.primary }]} />
              <View 
                ref={eggRef}
                collapsable={false}
                style={styles.eggTapArea}
                onLayout={measureEgg}
              >
                <Image
                  source={require("@/assets/hunt/mystery-egg.png")}
                  style={styles.mysteryEggImage}
                  resizeMode="contain"
                />
              </View>
            </Animated.View>

            <Animated.View style={[styles.netContainer, netAnimatedStyle]}>
              <View style={styles.net}>
                <Feather name="target" size={60} color={GameColors.primary} />
              </View>
            </Animated.View>

            {/* Energy Lasso */}
            <Animated.View style={lassoAnimatedStyle}>
              <View style={styles.lasso}>
                <LinearGradient
                  colors={["#FFD700", "#FF8C00", "#FF6B00"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.lassoInner}
                >
                  <View style={styles.lassoRing} />
                  <View style={styles.lassoGlow} />
                </LinearGradient>
              </View>
            </Animated.View>

            {/* Capture Ring */}
            <Animated.View style={captureRingAnimatedStyle} pointerEvents="none" />

            {/* Particle Burst */}
            {showParticles && (
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                {[...Array(12)].map((_, i) => {
                  const angle = (i / 12) * 360;
                  const rad = (angle * Math.PI) / 180;
                  const distance = 60 + Math.random() * 40;
                  return (
                    <Animated.View
                      key={i}
                      entering={FadeIn.duration(100)}
                      exiting={FadeOut.duration(400)}
                      style={[
                        styles.particle,
                        {
                          left: SCREEN_WIDTH / 2 - 4 + Math.cos(rad) * distance,
                          top: SCREEN_HEIGHT / 2.5 + Math.sin(rad) * distance,
                          backgroundColor: i % 3 === 0 ? '#FFD700' : i % 3 === 1 ? '#FF8C00' : '#FFA500',
                        },
                      ]}
                    />
                  );
                })}
              </View>
            )}

            {/* Portal */}
            <Animated.View style={portalAnimatedStyle} pointerEvents="none">
              <LinearGradient
                colors={["#FFD70080", "#FF8C0080", "#00000000"]}
                style={styles.portalGradient}
              >
                <View style={styles.portalInner} />
              </LinearGradient>
            </Animated.View>

            {/* Shockwave */}
            <Animated.View style={shockwaveAnimatedStyle} pointerEvents="none" />
          </View>


          {/* Missed banner */}
          {showMissed && (
            <Animated.View 
              entering={FadeIn.duration(200)}
              style={styles.missedBanner}
            >
              <BlurView intensity={80} tint="dark" style={styles.missedBlur}>
                <Feather name="x-circle" size={32} color="#FF6B6B" />
                <ThemedText style={styles.missedText}>MISSED!</ThemedText>
                <ThemedText style={styles.missedSubtext}>Tap the egg to catch it</ThemedText>
              </BlurView>
            </Animated.View>
          )}

          {/* Tap hint - only show when idle */}
          {!isCollecting && !isCatching && !showMissed && (
            <Animated.View 
              entering={FadeInUp.duration(400).springify()}
              style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}
            >
              <View style={styles.hintCapsule}>
                <BlurView intensity={40} tint="dark" style={styles.hintBlur}>
                  <Feather name="target" size={16} color="#FFD700" />
                  <ThemedText style={styles.hintText}>Tap the egg to catch!</ThemedText>
                </BlurView>
              </View>
            </Animated.View>
          )}
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
    width: 240,
    height: 300,
    justifyContent: "center",
    alignItems: "center",
  },
  creatureGlow: {
    position: "absolute",
    width: 260,
    height: 320,
    borderRadius: 130,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 20,
  },
  eggTapArea: {
    width: 240,
    height: 300,
    justifyContent: "center",
    alignItems: "center",
  },
  mysteryEggImage: {
    width: 240,
    height: 300,
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
  lasso: {
    width: 70,
    height: 70,
    justifyContent: "center",
    alignItems: "center",
  },
  lassoInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  lassoRing: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.8)",
    borderStyle: "dashed",
  },
  lassoGlow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  particle: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  portalGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  portalInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.8)",
    borderWidth: 3,
    borderColor: "#FFD700",
  },
  missedBanner: {
    position: "absolute",
    top: "40%",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 100,
  },
  missedBlur: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    gap: Spacing.xs,
  },
  missedText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FF6B6B",
    letterSpacing: 3,
  },
  missedSubtext: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  hintCapsule: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  hintBlur: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    overflow: "hidden",
    gap: Spacing.sm,
  },
  hintText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFD700",
  },
});
