import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSpring,
  withSequence,
  runOnJS,
  cancelAnimation,
  Easing,
  interpolate,
  useFrameCallback,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { FlappyMenuSheet } from "./FlappyMenuSheet";
import { apiRequest } from "@/lib/query-client";
import { FLAPPY_SKINS, RoachySkin, ALL_SPRITES } from "./flappySkins";
import { FLAPPY_TRAILS, RoachyTrail, ALL_TRAIL_ASSETS } from "./flappyTrails";
import { useFlappyTrail } from "@/context/FlappyTrailContext";

export { FLAPPY_SKINS, RoachySkin } from "./flappySkins";
export { FLAPPY_TRAILS, RoachyTrail } from "./flappyTrails";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const POWERUP_SHIELD = require("@/assets/powerup-shield.png");
const POWERUP_DOUBLE = require("@/assets/powerup-double.png");
const POWERUP_MAGNET = require("@/assets/powerup-magnet.png");

function ExitButton({ style, onPress }: { style?: any; onPress?: () => void }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.85, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  };

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress?.();
  };

  return (
    <AnimatedPressable
      style={[style, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <Feather name="x" size={24} color="#fff" />
    </AnimatedPressable>
  );
}

function PowerUpIndicator({ 
  type, 
  timeLeft, 
  isActive 
}: { 
  type: "shield" | "double" | "magnet"; 
  timeLeft: number; 
  isActive: boolean;
}) {
  const pulseScale = useSharedValue(1);
  const isExpiring = timeLeft <= 2 && timeLeft > 0;
  
  useEffect(() => {
    if (isExpiring) {
      pulseScale.value = withRepeat(
        withTiming(1.3, { duration: 250, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      cancelAnimation(pulseScale);
      pulseScale.value = withTiming(1, { duration: 150 });
    }
  }, [isExpiring, pulseScale]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));
  
  if (!isActive) return null;
  
  const config = {
    shield: { bg: "#3B82F6", border: "#1D4ED8" },
    double: { bg: "#F59E0B", border: "#B45309" },
    magnet: { bg: "#EF4444", border: "#B91C1C" },
  }[type];
  
  return (
    <Animated.View 
      style={[
        powerUpIndicatorStyles.container, 
        { backgroundColor: config.bg, borderColor: config.border },
        isExpiring && powerUpIndicatorStyles.expiring,
        animatedStyle,
      ]}
    >
      <Image
        source={type === "shield" ? POWERUP_SHIELD : type === "double" ? POWERUP_DOUBLE : POWERUP_MAGNET}
        style={powerUpIndicatorStyles.powerUpIcon}
        contentFit="contain"
      />
    </Animated.View>
  );
}

const powerUpIndicatorStyles = StyleSheet.create({
  container: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    marginBottom: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  expiring: {
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  powerUpIcon: {
    width: 28,
    height: 28,
  },
});

// Android-only animated pipe component that reads from INDIVIDUAL shared values (no arrays = no GC)
function AnimatedPipeSlot({ 
  pipeX, 
  pipeTopHeight, 
  pipeWidth, 
  gapSize, 
  playableHeight 
}: { 
  pipeX: Animated.SharedValue<number>; 
  pipeTopHeight: Animated.SharedValue<number>; 
  pipeWidth: number; 
  gapSize: number; 
  playableHeight: number;
}) {
  const topPipeStyle = useAnimatedStyle(() => {
    const x = pipeX.value;
    const topHeight = pipeTopHeight.value;
    // Hide if off-screen (x < -100)
    if (x < -100) {
      return { opacity: 0, left: -1000, height: 0, width: pipeWidth };
    }
    return {
      opacity: 1,
      left: x,
      height: topHeight,
      width: pipeWidth,
    };
  });
  
  const bottomPipeStyle = useAnimatedStyle(() => {
    const x = pipeX.value;
    const topHeight = pipeTopHeight.value;
    if (x < -100) {
      return { opacity: 0, left: -1000, top: 0, height: 0, width: pipeWidth };
    }
    return {
      opacity: 1,
      left: x,
      top: topHeight + gapSize,
      height: playableHeight - topHeight - gapSize,
      width: pipeWidth,
    };
  });
  
  return (
    <>
      <Animated.View style={[animatedPipeStyles.pipe, animatedPipeStyles.pipeTop, topPipeStyle]}>
        <View style={[animatedPipeStyles.pipeCapTop, { width: pipeWidth + 12 }]} />
        <View style={animatedPipeStyles.pipeHighlight} />
      </Animated.View>
      <Animated.View style={[animatedPipeStyles.pipe, animatedPipeStyles.pipeBottom, bottomPipeStyle]}>
        <View style={[animatedPipeStyles.pipeCapBottom, { width: pipeWidth + 12 }]} />
        <View style={animatedPipeStyles.pipeHighlight} />
      </Animated.View>
    </>
  );
}

const animatedPipeStyles = StyleSheet.create({
  pipe: {
    position: "absolute",
    backgroundColor: "#2D5A27",
    borderWidth: 3,
    borderColor: "#1E3D1B",
    zIndex: 50,
  },
  pipeTop: {
    top: 0,
    borderTopWidth: 0,
  },
  pipeBottom: {
    borderBottomWidth: 0,
  },
  pipeCapTop: {
    position: "absolute",
    bottom: -2,
    left: -6,
    height: 30,
    backgroundColor: "#3D7A37",
    borderWidth: 3,
    borderColor: "#1E3D1B",
    borderRadius: 4,
  },
  pipeCapBottom: {
    position: "absolute",
    top: -2,
    left: -6,
    height: 30,
    backgroundColor: "#3D7A37",
    borderWidth: 3,
    borderColor: "#1E3D1B",
    borderRadius: 4,
  },
  pipeHighlight: {
    position: "absolute",
    left: 4,
    top: 0,
    bottom: 0,
    width: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 4,
  },
});

// Android-only animated coin component that reads from INDIVIDUAL shared values (no arrays = no GC)
function AnimatedCoinSlot({ 
  coinX, 
  coinY, 
  coinSize 
}: { 
  coinX: Animated.SharedValue<number>; 
  coinY: Animated.SharedValue<number>;
  coinSize: number;
}) {
  const coinStyle = useAnimatedStyle(() => {
    const x = coinX.value;
    const y = coinY.value;
    if (x < -100) {
      return { opacity: 0, left: -1000, top: 0 };
    }
    return {
      opacity: 1,
      left: x - coinSize / 2,
      top: y - coinSize / 2,
    };
  });
  
  return (
    <Animated.View style={[animatedCoinStyles.coin, coinStyle]}>
      <ThemedText style={animatedCoinStyles.coinText}>1</ThemedText>
    </Animated.View>
  );
}

const animatedCoinStyles = StyleSheet.create({
  coin: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: GameColors.gold,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#B8860B",
  },
  coinText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#5D4300",
  },
});

// Android-only animated cloud component for 60fps cloud animation
function AnimatedCloudSlot({ 
  cloudX, 
  cloudY,
  cloudSize,
  cloudOpacity,
}: { 
  cloudX: Animated.SharedValue<number>; 
  cloudY: Animated.SharedValue<number>;
  cloudSize: Animated.SharedValue<number>;
  cloudOpacity: Animated.SharedValue<number>;
}) {
  const cloudStyle = useAnimatedStyle(() => {
    const x = cloudX.value;
    if (x < -200) {
      return { opacity: 0, left: -1000, top: 0, width: 0, height: 0 };
    }
    const size = cloudSize.value;
    const dimensions = size === 0 ? { width: 50, height: 25 } : size === 1 ? { width: 80, height: 40 } : { width: 120, height: 50 };
    return {
      opacity: cloudOpacity.value,
      left: x,
      top: cloudY.value,
      width: dimensions.width,
      height: dimensions.height,
    };
  });
  
  const puff1Style = useAnimatedStyle(() => {
    const size = cloudSize.value;
    const puffSize = size === 0 ? 18 : size === 1 ? 28 : 36;
    return { width: puffSize, height: puffSize, borderRadius: puffSize / 2 };
  });
  
  const puff2Style = useAnimatedStyle(() => {
    const size = cloudSize.value;
    const puffSize = size === 0 ? 22 : size === 1 ? 36 : 44;
    return { width: puffSize, height: puffSize, borderRadius: puffSize / 2 };
  });
  
  const puff3Style = useAnimatedStyle(() => {
    const size = cloudSize.value;
    const puffSize = size === 0 ? 16 : size === 1 ? 24 : 32;
    return { width: puffSize, height: puffSize, borderRadius: puffSize / 2 };
  });
  
  return (
    <Animated.View style={[animatedCloudStyles.cloud, cloudStyle]}>
      <Animated.View style={[animatedCloudStyles.puff, animatedCloudStyles.puff1, puff1Style]} />
      <Animated.View style={[animatedCloudStyles.puff, animatedCloudStyles.puff2, puff2Style]} />
      <Animated.View style={[animatedCloudStyles.puff, animatedCloudStyles.puff3, puff3Style]} />
    </Animated.View>
  );
}

const animatedCloudStyles = StyleSheet.create({
  cloud: {
    position: "absolute",
    zIndex: 5,
  },
  puff: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  puff1: {
    left: 0,
    bottom: 0,
  },
  puff2: {
    left: "30%",
    bottom: "20%",
  },
  puff3: {
    right: 0,
    bottom: 0,
  },
});

function GameLoadingSplash({ progress }: { progress: number }) {
  const bobY = useSharedValue(0);
  const rotation = useSharedValue(-5);
  const [wingFrame, setWingFrame] = useState(0);
  
  useEffect(() => {
    bobY.value = withRepeat(
      withTiming(12, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    
    rotation.value = withRepeat(
      withTiming(5, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    
    const wingInterval = setInterval(() => {
      setWingFrame(prev => (prev + 1) % 2);
    }, 120);
    
    return () => clearInterval(wingInterval);
  }, []);
  
  const flyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bobY.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));
  
  const currentSprite = FLAPPY_SKINS.default.frames[wingFrame];
  
  return (
    <View style={loadingStyles.container}>
      <LinearGradient
        colors={["#0a0a0a", "#1a1a2e", "#0a0a0a"]}
        style={StyleSheet.absoluteFillObject}
      />
      
      <Animated.View style={[loadingStyles.iconContainer, flyStyle]}>
        <Image
          source={currentSprite}
          style={loadingStyles.roachyIcon}
          contentFit="contain"
        />
      </Animated.View>
      
      <ThemedText style={loadingStyles.title}>Flappy Roachy</ThemedText>
      <ThemedText style={loadingStyles.subtitle}>Loading game assets...</ThemedText>
      
      <View style={loadingStyles.progressContainer}>
        <View style={loadingStyles.progressBar}>
          <View style={[loadingStyles.progressFill, { width: `${progress}%` }]} />
        </View>
        <ThemedText style={loadingStyles.progressText}>{Math.round(progress)}%</ThemedText>
      </View>
    </View>
  );
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
  },
  iconContainer: {
    width: 120,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  roachyIcon: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: GameColors.gold,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: GameColors.textSecondary,
    marginBottom: 32,
  },
  progressContainer: {
    width: "60%",
    alignItems: "center",
  },
  progressBar: {
    width: "100%",
    height: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: GameColors.gold,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: GameColors.textSecondary,
    marginTop: 8,
  },
});

const BASE_GROUND_HEIGHT = 80;

const GRAVITY = 0.6;
const JUMP_STRENGTH = -12;
const MAX_FALL_SPEED = 15;
const BASE_PIPE_SPEED = 4;
const BASE_PIPE_SPAWN_INTERVAL = 2800;
const BASE_GAP_SIZE = 200;
const BASE_PIPE_WIDTH = 70;
const BASE_SCREEN_WIDTH = 390;

const BIRD_SIZE = 50;
const BIRD_VISUAL_SIZE = 100;

const COIN_SIZE = 35;
const COIN_SPAWN_INTERVAL = 2500;

const POWERUP_SIZE = 50;
const POWERUP_SPAWN_INTERVAL = 12000;

const CLOUD_SPEED = 1.5;

interface Cloud {
  id: number;
  x: number;
  y: number;
  size: "small" | "medium" | "large";
  opacity: number;
}

interface Pipe {
  id: number;
  x: number;
  topHeight: number;
  passed: boolean;
}

interface Coin {
  id: number;
  x: number;
  y: number;
  value: number;
  collected: boolean;
}

interface PowerUp {
  id: number;
  x: number;
  y: number;
  type: "shield" | "double" | "magnet";
  collected: boolean;
}

interface TrailParticle {
  id: number;
  x: number;
  y: number;
  opacity: number;
  scale: number;
  rotation: number;
}

const TRAIL_PARTICLE_SPAWN_INTERVAL = 3;
const TRAIL_PARTICLE_FADE_SPEED = 0.04;

type GameState = "idle" | "playing" | "dying" | "gameover";

type GameMode = "free" | "ranked";

interface PerformanceSettings {
  cloudsEnabled: boolean;
  trailsEnabled: boolean;
  cloudSpawnInterval: number;
  maxTrailParticles: number;
}

const DEFAULT_PERFORMANCE: PerformanceSettings = {
  cloudsEnabled: Platform.OS !== "android",
  trailsEnabled: Platform.OS !== "android",
  cloudSpawnInterval: 3000,
  maxTrailParticles: 12,
};

interface FlappyGameProps {
  onExit?: () => void;
  onScoreSubmit?: (score: number, isRanked: boolean, rankedPeriod?: 'daily' | 'weekly' | null) => void;
  userId?: string | null;
  skin?: RoachySkin;
  trail?: RoachyTrail;
  performanceSettings?: PerformanceSettings;
}

export function FlappyGame({ onExit, onScoreSubmit, userId = null, skin = "default", trail = "none", performanceSettings = DEFAULT_PERFORMANCE }: FlappyGameProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  
  // Track actual layout dimensions for accurate sizing on tablets
  const [layoutDimensions, setLayoutDimensions] = useState<{ width: number; height: number } | null>(null);
  
  // Use layout dimensions if available, otherwise fall back to window dimensions
  const actualWidth = layoutDimensions?.width ?? screenWidth;
  const actualHeight = layoutDimensions?.height ?? screenHeight;
  
  // Use portrait dimensions - always use the smaller value as width
  const GAME_WIDTH = Math.min(actualWidth, actualHeight);
  const GAME_HEIGHT = Math.max(actualWidth, actualHeight);
  const GROUND_HEIGHT = BASE_GROUND_HEIGHT + insets.bottom;
  const PLAYABLE_HEIGHT = GAME_HEIGHT - GROUND_HEIGHT;
  
  // Scale game elements based on screen size (base is 390px width)
  const scale = GAME_WIDTH / BASE_SCREEN_WIDTH;
  // Cap gap size between 160-220 to maintain difficulty on tablets
  const GAP_SIZE = Math.min(220, Math.max(160, BASE_GAP_SIZE * Math.min(scale, 1.1)));
  const PIPE_WIDTH = Math.max(50, BASE_PIPE_WIDTH * scale);
  const BIRD_X = GAME_WIDTH * 0.2;
  
  // Scale pipe speed based on screen width so gameplay feels consistent
  // Slower on Android to reduce lag and give more reaction time
  const PIPE_SPEED = Platform.OS === "android" 
    ? Math.max(2.5, Math.min(5, BASE_PIPE_SPEED * Math.pow(scale, 0.6)))
    : Math.max(3, Math.min(8, BASE_PIPE_SPEED * Math.pow(scale, 0.7)));
  
  // Calculate spawn interval to maintain consistent visual gap between pipes
  // Android: Wider spacing (2.2 screen widths) for better gameplay
  // iOS/Web: Standard spacing (1.8 screen widths)
  const TARGET_GAP_SCREENS = Platform.OS === "android" ? 2.2 : 1.8;
  const targetGapPixels = TARGET_GAP_SCREENS * GAME_WIDTH;
  const PIPE_SPAWN_INTERVAL = Math.round((targetGapPixels / PIPE_SPEED) * 16.67);
  
  // Handle layout changes to get accurate dimensions
  const handleLayout = useCallback((event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setLayoutDimensions({ width, height });
  }, []);
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [pipes, setPipes] = useState<Pipe[]>([]);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [clouds, setClouds] = useState<Cloud[]>([]);
  const [trailParticles, setTrailParticles] = useState<TrailParticle[]>([]);
  
  const [shieldActive, setShieldActive] = useState(false);
  const [doublePointsActive, setDoublePointsActive] = useState(false);
  const [magnetActive, setMagnetActive] = useState(false);
  const [shieldTimeLeft, setShieldTimeLeft] = useState(0);
  const [doubleTimeLeft, setDoubleTimeLeft] = useState(0);
  const [magnetTimeLeft, setMagnetTimeLeft] = useState(0);
  
  const [showMenu, setShowMenu] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>("free");
  const [rankedPeriod, setRankedPeriod] = useState<'daily' | 'weekly' | null>(null);
  const [equippedPowerUps, setEquippedPowerUps] = useState<{
    shield: boolean;
    double: boolean;
    magnet: boolean;
  }>({ shield: false, double: false, magnet: false });
  const [selectedSkin, setSelectedSkin] = useState<RoachySkin>(skin);
  const { equippedTrail, setEquippedTrail } = useFlappyTrail();
  
  useEffect(() => {
    setSelectedSkin(skin);
  }, [skin]);
  
  const handleSelectTrail = useCallback((newTrail: RoachyTrail) => {
    setEquippedTrail(newTrail);
  }, [setEquippedTrail]);
  
  const shieldEndTimeRef = useRef<number>(0);
  const doubleEndTimeRef = useRef<number>(0);
  const magnetEndTimeRef = useRef<number>(0);
  const powerUpCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const currentSkin = FLAPPY_SKINS[selectedSkin] || FLAPPY_SKINS.default;
  const ROACHY_FRAMES = currentSkin.frames;
  const ROACHY_DEAD = currentSkin.dead;
  
  const currentTrail = FLAPPY_TRAILS[equippedTrail] || FLAPPY_TRAILS.none;
  const TRAIL_ASSET = currentTrail.asset;
  
  useEffect(() => {
    let isMounted = true;
    
    async function preloadAssets() {
      const totalAssets = ALL_SPRITES.length;
      let loaded = 0;
      
      for (const sprite of ALL_SPRITES) {
        try {
          await Image.prefetch(sprite);
        } catch (e) {
        }
        loaded++;
        if (isMounted) {
          setLoadProgress((loaded / totalAssets) * 100);
        }
      }
      
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      if (isMounted) {
        setIsLoading(false);
      }
    }
    
    preloadAssets();
    
    return () => {
      isMounted = false;
    };
  }, []);
  
  const birdY = useSharedValue(PLAYABLE_HEIGHT / 2);
  const birdVelocitySV = useSharedValue(0); // Shared value for UI thread access
  const birdVelocity = useRef(0); // Keep ref for JS thread compatibility
  const birdRotation = useSharedValue(0);
  const groundOffset = useSharedValue(0);
  const wingOpacity = useSharedValue(1);
  
  const gameLoopRef = useRef<number | null>(null);
  const pipeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const coinTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const powerUpTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialPipeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const shieldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doubleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const magnetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const pipeIdRef = useRef(0);
  const coinIdRef = useRef(0);
  const powerUpIdRef = useRef(0);
  const cloudIdRef = useRef(0);
  
  const cloudTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const pipesRef = useRef<Pipe[]>([]);
  const coinsRef = useRef<Coin[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const cloudsRef = useRef<Cloud[]>([]);
  const trailParticlesRef = useRef<TrailParticle[]>([]);
  const trailParticleIdRef = useRef(0);
  const trailSpawnCounterRef = useRef(0);
  const cloudRenderCounterRef = useRef(0);
  const shieldRef = useRef(false);
  const doublePointsRef = useRef(false);
  const magnetRef = useRef(false);
  const scoreRef = useRef(0);
  const gameStateRef = useRef<GameState>("idle");
  
  const playableHeightRef = useRef(PLAYABLE_HEIGHT);
  playableHeightRef.current = PLAYABLE_HEIGHT;
  
  // Refs for dynamic game dimensions (used in callbacks)
  const gameWidthRef = useRef(GAME_WIDTH);
  gameWidthRef.current = GAME_WIDTH;
  const pipeWidthRef = useRef(PIPE_WIDTH);
  pipeWidthRef.current = PIPE_WIDTH;
  const gapSizeRef = useRef(GAP_SIZE);
  gapSizeRef.current = GAP_SIZE;
  const birdXRef = useRef(BIRD_X);
  birdXRef.current = BIRD_X;
  const pipeSpeedRef = useRef(PIPE_SPEED);
  pipeSpeedRef.current = PIPE_SPEED;
  const pipeSpawnIntervalRef = useRef(PIPE_SPAWN_INTERVAL);
  pipeSpawnIntervalRef.current = PIPE_SPAWN_INTERVAL;
  
  const lastFrameTimeRef = useRef<number>(0);
  const TARGET_FRAME_TIME = 16.67;
  const renderFrameCounterRef = useRef(0);
  const { cloudsEnabled, trailsEnabled, cloudSpawnInterval, maxTrailParticles } = performanceSettings;
  
  // Android performance: Per-slot shared values for zero-GC UI thread animation
  const isAndroid = Platform.OS === "android";
  const MAX_PIPES = 6;
  const MAX_COINS = 8;
  
  // Individual shared values per pipe slot (no arrays = no GC)
  const pipe0X = useSharedValue(-1000);
  const pipe0H = useSharedValue(0);
  const pipe1X = useSharedValue(-1000);
  const pipe1H = useSharedValue(0);
  const pipe2X = useSharedValue(-1000);
  const pipe2H = useSharedValue(0);
  const pipe3X = useSharedValue(-1000);
  const pipe3H = useSharedValue(0);
  const pipe4X = useSharedValue(-1000);
  const pipe4H = useSharedValue(0);
  const pipe5X = useSharedValue(-1000);
  const pipe5H = useSharedValue(0);
  
  // Individual shared values per coin slot
  const coin0X = useSharedValue(-1000);
  const coin0Y = useSharedValue(0);
  const coin1X = useSharedValue(-1000);
  const coin1Y = useSharedValue(0);
  const coin2X = useSharedValue(-1000);
  const coin2Y = useSharedValue(0);
  const coin3X = useSharedValue(-1000);
  const coin3Y = useSharedValue(0);
  const coin4X = useSharedValue(-1000);
  const coin4Y = useSharedValue(0);
  const coin5X = useSharedValue(-1000);
  const coin5Y = useSharedValue(0);
  const coin6X = useSharedValue(-1000);
  const coin6Y = useSharedValue(0);
  const coin7X = useSharedValue(-1000);
  const coin7Y = useSharedValue(0);
  
  // Individual shared values per cloud slot (for 60fps cloud animation on Android)
  const MAX_CLOUDS = 6;
  const cloud0X = useSharedValue(-1000);
  const cloud0Y = useSharedValue(0);
  const cloud0Size = useSharedValue(0); // 0=small, 1=medium, 2=large
  const cloud0Opacity = useSharedValue(0);
  const cloud1X = useSharedValue(-1000);
  const cloud1Y = useSharedValue(0);
  const cloud1Size = useSharedValue(0);
  const cloud1Opacity = useSharedValue(0);
  const cloud2X = useSharedValue(-1000);
  const cloud2Y = useSharedValue(0);
  const cloud2Size = useSharedValue(0);
  const cloud2Opacity = useSharedValue(0);
  const cloud3X = useSharedValue(-1000);
  const cloud3Y = useSharedValue(0);
  const cloud3Size = useSharedValue(0);
  const cloud3Opacity = useSharedValue(0);
  const cloud4X = useSharedValue(-1000);
  const cloud4Y = useSharedValue(0);
  const cloud4Size = useSharedValue(0);
  const cloud4Opacity = useSharedValue(0);
  const cloud5X = useSharedValue(-1000);
  const cloud5Y = useSharedValue(0);
  const cloud5Size = useSharedValue(0);
  const cloud5Opacity = useSharedValue(0);
  
  // Refs to access all shared values by index (for spawn/despawn logic)
  const pipeXSlots = useRef([pipe0X, pipe1X, pipe2X, pipe3X, pipe4X, pipe5X]);
  const pipeHSlots = useRef([pipe0H, pipe1H, pipe2H, pipe3H, pipe4H, pipe5H]);
  const coinXSlots = useRef([coin0X, coin1X, coin2X, coin3X, coin4X, coin5X, coin6X, coin7X]);
  const coinYSlots = useRef([coin0Y, coin1Y, coin2Y, coin3Y, coin4Y, coin5Y, coin6Y, coin7Y]);
  const cloudXSlots = useRef([cloud0X, cloud1X, cloud2X, cloud3X, cloud4X, cloud5X]);
  const cloudYSlots = useRef([cloud0Y, cloud1Y, cloud2Y, cloud3Y, cloud4Y, cloud5Y]);
  const cloudSizeSlots = useRef([cloud0Size, cloud1Size, cloud2Size, cloud3Size, cloud4Size, cloud5Size]);
  const cloudOpacitySlots = useRef([cloud0Opacity, cloud1Opacity, cloud2Opacity, cloud3Opacity, cloud4Opacity, cloud5Opacity]);
  
  // CRITICAL: Shared values for all game parameters - JS values get frozen in worklets!
  const pipeSpeedSV = useSharedValue(PIPE_SPEED);
  const playableHeightSV = useSharedValue(PLAYABLE_HEIGHT);
  
  // Legacy array shared values (kept for iOS/web compatibility)
  const pipePositionsX = useSharedValue<number[]>(new Array(MAX_PIPES).fill(-1000));
  const pipePositionsTopHeight = useSharedValue<number[]>(new Array(MAX_PIPES).fill(0));
  const coinPositionsX = useSharedValue<number[]>(new Array(MAX_COINS).fill(-1000));
  const coinPositionsY = useSharedValue<number[]>(new Array(MAX_COINS).fill(0));
  const coinValues = useSharedValue<number[]>(new Array(MAX_COINS).fill(0));
  const frameCallbackActive = useSharedValue(false);
  
  // Sync refs to shared values for Android rendering (called from game loop)
  // This runs on JS thread and updates shared values which trigger UI thread animations
  const syncEntitiesToSharedValues = useCallback(() => {
    // Sync pipes - reuse arrays to reduce GC
    const pipeLen = Math.min(pipesRef.current.length, MAX_PIPES);
    const newPipeX: number[] = [];
    const newPipeTopHeight: number[] = [];
    for (let i = 0; i < MAX_PIPES; i++) {
      if (i < pipeLen) {
        newPipeX.push(pipesRef.current[i].x);
        newPipeTopHeight.push(pipesRef.current[i].topHeight);
      } else {
        newPipeX.push(-1000);
        newPipeTopHeight.push(0);
      }
    }
    pipePositionsX.value = newPipeX;
    pipePositionsTopHeight.value = newPipeTopHeight;
    
    // Sync coins
    const newCoinX: number[] = [];
    const newCoinY: number[] = [];
    const newCoinVals: number[] = [];
    let coinIdx = 0;
    for (let i = 0; i < coinsRef.current.length && coinIdx < MAX_COINS; i++) {
      if (!coinsRef.current[i].collected) {
        newCoinX.push(coinsRef.current[i].x);
        newCoinY.push(coinsRef.current[i].y);
        newCoinVals.push(coinsRef.current[i].value);
        coinIdx++;
      }
    }
    // Fill remaining slots
    while (newCoinX.length < MAX_COINS) {
      newCoinX.push(-1000);
      newCoinY.push(0);
      newCoinVals.push(0);
    }
    coinPositionsX.value = newCoinX;
    coinPositionsY.value = newCoinY;
    coinValues.value = newCoinVals;
  }, [pipePositionsX, pipePositionsTopHeight, coinPositionsX, coinPositionsY, coinValues]);
  
  const playSound = useCallback((type: "jump" | "coin" | "hit" | "powerup") => {
    if (Platform.OS !== "web") {
      switch (type) {
        case "jump":
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case "coin":
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case "hit":
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case "powerup":
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
      }
    }
  }, []);
  
  const clearAllTimers = useCallback(() => {
    // Deactivate UI thread frame callback (Android)
    frameCallbackActive.value = false;
    
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    if (pipeTimerRef.current) {
      clearInterval(pipeTimerRef.current);
      pipeTimerRef.current = null;
    }
    if (coinTimerRef.current) {
      clearInterval(coinTimerRef.current);
      coinTimerRef.current = null;
    }
    if (powerUpTimerRef.current) {
      clearInterval(powerUpTimerRef.current);
      powerUpTimerRef.current = null;
    }
    if (initialPipeTimerRef.current) {
      clearTimeout(initialPipeTimerRef.current);
      initialPipeTimerRef.current = null;
    }
    if (shieldTimerRef.current) {
      clearTimeout(shieldTimerRef.current);
      shieldTimerRef.current = null;
    }
    if (doubleTimerRef.current) {
      clearTimeout(doubleTimerRef.current);
      doubleTimerRef.current = null;
    }
    if (magnetTimerRef.current) {
      clearTimeout(magnetTimerRef.current);
      magnetTimerRef.current = null;
    }
    cancelAnimation(wingOpacity);
    if (cloudTimerRef.current) {
      clearInterval(cloudTimerRef.current);
      cloudTimerRef.current = null;
    }
    if (powerUpCountdownRef.current) {
      clearInterval(powerUpCountdownRef.current);
      powerUpCountdownRef.current = null;
    }
    cancelAnimation(groundOffset);
  }, [groundOffset, wingOpacity]);
  
  const stopGame = useCallback(() => {
    clearAllTimers();
    
    shieldRef.current = false;
    doublePointsRef.current = false;
    magnetRef.current = false;
    shieldEndTimeRef.current = 0;
    doubleEndTimeRef.current = 0;
    magnetEndTimeRef.current = 0;
    setShieldActive(false);
    setDoublePointsActive(false);
    setMagnetActive(false);
    setShieldTimeLeft(0);
    setDoubleTimeLeft(0);
    setMagnetTimeLeft(0);
  }, [clearAllTimers]);
  
  const resetToIdle = useCallback(() => {
    clearAllTimers();
    
    pipesRef.current = [];
    coinsRef.current = [];
    powerUpsRef.current = [];
    trailParticlesRef.current = [];
    trailSpawnCounterRef.current = 0;
    scoreRef.current = 0;
    
    setPipes([]);
    setCoins([]);
    setPowerUps([]);
    setTrailParticles([]);
    setScore(0);
    setShieldActive(false);
    setDoublePointsActive(false);
    setMagnetActive(false);
    
    // Reset shared values for Android animated rendering
    pipePositionsX.value = new Array(MAX_PIPES).fill(-1000);
    pipePositionsTopHeight.value = new Array(MAX_PIPES).fill(0);
    coinPositionsX.value = new Array(MAX_COINS).fill(-1000);
    coinPositionsY.value = new Array(MAX_COINS).fill(0);
    coinValues.value = new Array(MAX_COINS).fill(0);
    
    birdY.value = playableHeightRef.current / 2;
    birdVelocity.current = 0;
    birdRotation.value = 0;
    
    gameStateRef.current = "idle";
    setGameState("idle");
  }, [clearAllTimers, birdY, birdRotation, pipePositionsX, pipePositionsTopHeight, coinPositionsX, coinPositionsY, coinValues]);
  
  const showGameOverScreen = useCallback(() => {
    gameStateRef.current = "gameover";
    setGameState("gameover");
    
    const finalScore = scoreRef.current;
    if (finalScore > highScore) {
      setHighScore(finalScore);
    }
    
    if (onScoreSubmit && finalScore > 0) {
      onScoreSubmit(finalScore, gameMode === "ranked", rankedPeriod);
    }
  }, [highScore, onScoreSubmit, gameMode, rankedPeriod]);
  
  const deathLoop = useCallback(() => {
    if (gameStateRef.current !== "dying") return;
    
    birdVelocity.current += GRAVITY;
    if (birdVelocity.current > MAX_FALL_SPEED) {
      birdVelocity.current = MAX_FALL_SPEED;
    }
    
    const newY = birdY.value + birdVelocity.current;
    birdY.value = newY;
    
    const targetRotation = Math.min(90, birdVelocity.current * 6);
    birdRotation.value = targetRotation;
    
    if (newY >= playableHeightRef.current - BIRD_SIZE / 2) {
      birdY.value = playableHeightRef.current - BIRD_SIZE / 2;
      birdRotation.value = 90;
      
      runOnJS(playSound)("hit");
      
      setTimeout(() => {
        runOnJS(showGameOverScreen)();
      }, 500);
      return;
    }
    
    gameLoopRef.current = requestAnimationFrame(deathLoop);
  }, [birdY, birdRotation, playSound, showGameOverScreen]);
  
  const gameOver = useCallback(() => {
    if (gameStateRef.current !== "playing") return;
    
    gameStateRef.current = "dying";
    setGameState("dying");
    
    if (pipeTimerRef.current) {
      clearInterval(pipeTimerRef.current);
      pipeTimerRef.current = null;
    }
    if (coinTimerRef.current) {
      clearInterval(coinTimerRef.current);
      coinTimerRef.current = null;
    }
    if (powerUpTimerRef.current) {
      clearInterval(powerUpTimerRef.current);
      powerUpTimerRef.current = null;
    }
    if (initialPipeTimerRef.current) {
      clearTimeout(initialPipeTimerRef.current);
      initialPipeTimerRef.current = null;
    }
    cancelAnimation(groundOffset);
    
    playSound("hit");
    
    birdVelocity.current = -6;
    
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
    gameLoopRef.current = requestAnimationFrame(deathLoop);
  }, [playSound, groundOffset, deathLoop]);
  
  const spawnPipe = useCallback(() => {
    if (gameStateRef.current !== "playing") return;
    
    const minHeight = 80;
    const maxHeight = playableHeightRef.current - gapSizeRef.current - minHeight - 50;
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight)) + minHeight;
    
    const newPipe: Pipe = {
      id: pipeIdRef.current++,
      x: gameWidthRef.current,
      topHeight,
      passed: false,
    };
    
    pipesRef.current = [...pipesRef.current, newPipe];
    
    // Android: Find empty slot and set individual shared values (zero GC)
    if (isAndroid) {
      const slots = pipeXSlots.current;
      const heightSlots = pipeHSlots.current;
      for (let i = 0; i < MAX_PIPES; i++) {
        if (slots[i].value < -100) {
          slots[i].value = gameWidthRef.current;
          heightSlots[i].value = topHeight;
          break;
        }
      }
    }
  }, [isAndroid]);
  
  const spawnCoin = useCallback(() => {
    if (gameStateRef.current !== "playing") return;
    
    const minY = 100;
    const maxY = playableHeightRef.current - 100;
    const y = Math.floor(Math.random() * (maxY - minY)) + minY;
    const value = Math.floor(Math.random() * 5) + 1;
    
    const newCoin: Coin = {
      id: coinIdRef.current++,
      x: gameWidthRef.current,
      y,
      value,
      collected: false,
    };
    
    coinsRef.current = [...coinsRef.current, newCoin];
    
    // Android: Find empty slot and set individual shared values (zero GC)
    if (isAndroid) {
      const xSlots = coinXSlots.current;
      const ySlots = coinYSlots.current;
      for (let i = 0; i < MAX_COINS; i++) {
        if (xSlots[i].value < -100) {
          xSlots[i].value = gameWidthRef.current;
          ySlots[i].value = y;
          break;
        }
      }
    }
  }, [isAndroid]);
  
  const spawnPowerUp = useCallback(() => {
    if (gameStateRef.current !== "playing") return;
    
    const minY = 120;
    const maxY = playableHeightRef.current - 120;
    const y = Math.floor(Math.random() * (maxY - minY)) + minY;
    const types: Array<"shield" | "double" | "magnet"> = ["shield", "double", "magnet"];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const newPowerUp: PowerUp = {
      id: powerUpIdRef.current++,
      x: gameWidthRef.current,
      y,
      type,
      collected: false,
    };
    
    powerUpsRef.current = [...powerUpsRef.current, newPowerUp];
    // Don't call setPowerUps here - let the throttled game loop sync to React state
  }, []);
  
  const spawnCloud = useCallback(() => {
    const sizes: Array<"small" | "medium" | "large"> = ["small", "medium", "large"];
    const size = sizes[Math.floor(Math.random() * sizes.length)];
    const minY = 40;
    const maxY = playableHeightRef.current * 0.5;
    const y = Math.floor(Math.random() * (maxY - minY)) + minY;
    const opacity = 0.4 + Math.random() * 0.4;
    const x = gameWidthRef.current + 100;
    
    const newCloud: Cloud = {
      id: cloudIdRef.current++,
      x,
      y,
      size,
      opacity,
    };
    
    cloudsRef.current = [...cloudsRef.current, newCloud];
    
    // Android: Find empty slot and set individual shared values for 60fps animation
    if (isAndroid) {
      const slots = cloudXSlots.current;
      for (let i = 0; i < MAX_CLOUDS; i++) {
        if (slots[i].value < -150) {
          slots[i].value = x;
          cloudYSlots.current[i].value = y;
          cloudSizeSlots.current[i].value = size === "small" ? 0 : size === "medium" ? 1 : 2;
          cloudOpacitySlots.current[i].value = opacity;
          break;
        }
      }
    }
    // Don't call setClouds here - let the throttled game loop sync to React state
  }, [isAndroid]);
  
  const activatePowerUp = useCallback((type: "shield" | "double" | "magnet") => {
    if (gameStateRef.current !== "playing") return;
    
    const now = Date.now();
    
    switch (type) {
      case "shield":
        if (shieldTimerRef.current) clearTimeout(shieldTimerRef.current);
        shieldRef.current = true;
        shieldEndTimeRef.current = now + 5000;
        setShieldActive(true);
        setShieldTimeLeft(5);
        shieldTimerRef.current = setTimeout(() => {
          if (gameStateRef.current === "playing") {
            shieldRef.current = false;
            shieldEndTimeRef.current = 0;
            setShieldActive(false);
            setShieldTimeLeft(0);
          }
        }, 5000);
        break;
      case "double":
        if (doubleTimerRef.current) clearTimeout(doubleTimerRef.current);
        doublePointsRef.current = true;
        doubleEndTimeRef.current = now + 10000;
        setDoublePointsActive(true);
        setDoubleTimeLeft(10);
        doubleTimerRef.current = setTimeout(() => {
          if (gameStateRef.current === "playing") {
            doublePointsRef.current = false;
            doubleEndTimeRef.current = 0;
            setDoublePointsActive(false);
            setDoubleTimeLeft(0);
          }
        }, 10000);
        break;
      case "magnet":
        if (magnetTimerRef.current) clearTimeout(magnetTimerRef.current);
        magnetRef.current = true;
        magnetEndTimeRef.current = now + 8000;
        setMagnetActive(true);
        setMagnetTimeLeft(8);
        magnetTimerRef.current = setTimeout(() => {
          if (gameStateRef.current === "playing") {
            magnetRef.current = false;
            magnetEndTimeRef.current = 0;
            setMagnetActive(false);
            setMagnetTimeLeft(0);
          }
        }, 8000);
        break;
    }
  }, []);
  
  // Android frame throttle counter - runs collision detection at ~20fps instead of 60fps
  const androidFrameSkipRef = useRef(0);
  const ANDROID_FRAME_SKIP = 3; // Run every 3rd frame = ~20fps collision detection
  
  const gameLoop = useCallback((timestamp: number) => {
    if (gameStateRef.current !== "playing") return;
    
    // Android: Skip frames to reduce JS thread load
    // UI thread (useFrameCallback) handles smooth 60fps rendering
    // JS thread only needs to run collision detection at ~20fps
    if (isAndroid) {
      androidFrameSkipRef.current++;
      if (androidFrameSkipRef.current < ANDROID_FRAME_SKIP) {
        // Schedule next frame but skip expensive collision work
        // DON'T update lastFrameTimeRef here - let delta accumulate
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }
      androidFrameSkipRef.current = 0;
    }
    
    // Calculate delta time from last PROCESSED frame (not skipped frame)
    if (lastFrameTimeRef.current === 0) {
      lastFrameTimeRef.current = timestamp;
    }
    const deltaTime = timestamp - lastFrameTimeRef.current;
    lastFrameTimeRef.current = timestamp;
    
    // Allow higher delta multiplier on Android to prevent stacking when frames drop
    // Cap at 5 to prevent teleporting on extreme lag spikes
    const deltaMultiplier = Math.min(deltaTime / TARGET_FRAME_TIME, Platform.OS === "android" ? 5 : 3);
    
    // On Android, bird physics are handled by UI thread (useFrameCallback)
    // On iOS/web, handle bird physics here on JS thread
    if (!isAndroid) {
      birdVelocity.current += GRAVITY * deltaMultiplier;
      if (birdVelocity.current > MAX_FALL_SPEED) {
        birdVelocity.current = MAX_FALL_SPEED;
      }
      
      const newY = birdY.value + birdVelocity.current;
      birdY.value = newY;
      
      const targetRotation = Math.min(Math.max(birdVelocity.current * 3, -20), 70);
      birdRotation.value = withTiming(targetRotation, { duration: 80 });
      
      if (newY <= BIRD_SIZE / 2) {
        birdY.value = BIRD_SIZE / 2;
        birdVelocity.current = 0;
      }
      
      if (!shieldRef.current && newY >= playableHeightRef.current - BIRD_SIZE / 2) {
        runOnJS(gameOver)();
        return;
      }
    }
    
    const currentPipeSpeed = pipeSpeedRef.current * deltaMultiplier;
    
    // On Android, entity movement is handled by UI thread (useFrameCallback)
    // On iOS/web, move entities here on JS thread
    if (!isAndroid) {
      // Mutate in place to avoid garbage collection
      for (let i = 0; i < pipesRef.current.length; i++) {
        pipesRef.current[i].x -= currentPipeSpeed;
      }
      
      for (let i = 0; i < coinsRef.current.length; i++) {
        const coin = coinsRef.current[i];
        coin.x -= currentPipeSpeed;
        
        if (magnetRef.current && !coin.collected) {
          const dx = birdXRef.current - coin.x;
          const dy = birdY.value - coin.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 200 && dist > 0) {
            coin.x += (dx / dist) * 8 * deltaMultiplier;
            coin.y += (dy / dist) * 8 * deltaMultiplier;
          }
        }
      }
      
      for (let i = 0; i < powerUpsRef.current.length; i++) {
        powerUpsRef.current[i].x -= currentPipeSpeed;
      }
    } else {
      // Android: Sync velocity from shared value back to ref for JS-side logic
      birdVelocity.current = birdVelocitySV.value;
      
      // Sync pipe positions from individual shared values back to refs for collision detection
      const pipeXVals = [pipe0X.value, pipe1X.value, pipe2X.value, pipe3X.value, pipe4X.value, pipe5X.value];
      for (let i = 0; i < pipesRef.current.length && i < MAX_PIPES; i++) {
        if (pipeXVals[i] > -200) {
          pipesRef.current[i].x = pipeXVals[i];
        }
      }
      
      // Sync coin positions from individual shared values
      const coinXVals = [coin0X.value, coin1X.value, coin2X.value, coin3X.value, coin4X.value, coin5X.value, coin6X.value, coin7X.value];
      for (let i = 0; i < coinsRef.current.length && i < MAX_COINS; i++) {
        if (coinXVals[i] > -200) {
          coinsRef.current[i].x = coinXVals[i];
        }
      }
    }
    
    const currentBirdX = birdXRef.current;
    const currentPipeWidth = pipeWidthRef.current;
    const currentGapSize = gapSizeRef.current;
    
    const birdLeft = currentBirdX - BIRD_SIZE / 2 + 10;
    const birdRight = currentBirdX + BIRD_SIZE / 2 - 10;
    const birdTop = birdY.value - BIRD_SIZE / 2 + 10;
    const birdBottom = birdY.value + BIRD_SIZE / 2 - 10;
    
    if (!shieldRef.current) {
      for (const pipe of pipesRef.current) {
        const pipeLeft = pipe.x;
        const pipeRight = pipe.x + currentPipeWidth;
        
        if (birdRight > pipeLeft && birdLeft < pipeRight) {
          if (birdTop < pipe.topHeight || birdBottom > pipe.topHeight + currentGapSize) {
            runOnJS(gameOver)();
            return;
          }
        }
      }
    }
    
    // Check pipe passing and score (mutate in place)
    for (let i = 0; i < pipesRef.current.length; i++) {
      const pipe = pipesRef.current[i];
      if (!pipe.passed && pipe.x + currentPipeWidth < currentBirdX) {
        scoreRef.current += 1;
        pipe.passed = true;
        runOnJS(setScore)(scoreRef.current);
      }
    }
    
    // Check coin collection (mutate in place)
    for (let i = 0; i < coinsRef.current.length; i++) {
      const coin = coinsRef.current[i];
      if (!coin.collected) {
        const coinLeft = coin.x - COIN_SIZE / 2;
        const coinRight = coin.x + COIN_SIZE / 2;
        const coinTop = coin.y - COIN_SIZE / 2;
        const coinBottom = coin.y + COIN_SIZE / 2;
        
        if (
          birdRight > coinLeft &&
          birdLeft < coinRight &&
          birdBottom > coinTop &&
          birdTop < coinBottom
        ) {
          const points = doublePointsRef.current ? coin.value * 2 : coin.value;
          scoreRef.current += points;
          coin.collected = true;
          runOnJS(setScore)(scoreRef.current);
          runOnJS(playSound)("coin");
        }
      }
    }
    
    // Check powerup collection (mutate in place)
    for (let i = 0; i < powerUpsRef.current.length; i++) {
      const pu = powerUpsRef.current[i];
      if (!pu.collected) {
        const puLeft = pu.x - POWERUP_SIZE / 2;
        const puRight = pu.x + POWERUP_SIZE / 2;
        const puTop = pu.y - POWERUP_SIZE / 2;
        const puBottom = pu.y + POWERUP_SIZE / 2;
        
        if (
          birdRight > puLeft &&
          birdLeft < puRight &&
          birdBottom > puTop &&
          birdTop < puBottom
        ) {
          pu.collected = true;
          runOnJS(playSound)("powerup");
          runOnJS(activatePowerUp)(pu.type);
        }
      }
    }
    
    // In-place array compaction to avoid GC (no filter() allocations)
    let pipeWriteIdx = 0;
    for (let i = 0; i < pipesRef.current.length; i++) {
      if (pipesRef.current[i].x > -currentPipeWidth) {
        pipesRef.current[pipeWriteIdx++] = pipesRef.current[i];
      }
    }
    pipesRef.current.length = pipeWriteIdx;
    
    let coinWriteIdx = 0;
    for (let i = 0; i < coinsRef.current.length; i++) {
      const coin = coinsRef.current[i];
      if (!coin.collected && coin.x > -COIN_SIZE) {
        coinsRef.current[coinWriteIdx++] = coin;
      }
    }
    coinsRef.current.length = coinWriteIdx;
    
    let puWriteIdx = 0;
    for (let i = 0; i < powerUpsRef.current.length; i++) {
      const pu = powerUpsRef.current[i];
      if (!pu.collected && pu.x > -POWERUP_SIZE) {
        powerUpsRef.current[puWriteIdx++] = pu;
      }
    }
    powerUpsRef.current.length = puWriteIdx;
    
    // Update clouds in place (mutate to avoid GC)
    if (cloudsEnabled) {
      for (let i = 0; i < cloudsRef.current.length; i++) {
        cloudsRef.current[i].x -= CLOUD_SPEED * deltaMultiplier;
      }
      // In-place compaction for clouds too
      let cloudWriteIdx = 0;
      for (let i = 0; i < cloudsRef.current.length; i++) {
        if (cloudsRef.current[i].x > -200) {
          cloudsRef.current[cloudWriteIdx++] = cloudsRef.current[i];
        }
      }
      cloudsRef.current.length = cloudWriteIdx;
    }
    
    // Update trail particles in place (mutate to avoid GC)
    if (trailsEnabled && TRAIL_ASSET) {
      trailSpawnCounterRef.current += deltaMultiplier;
      if (trailSpawnCounterRef.current >= TRAIL_PARTICLE_SPAWN_INTERVAL) {
        trailSpawnCounterRef.current = 0;
        const newParticle: TrailParticle = {
          id: trailParticleIdRef.current++,
          x: currentBirdX - 40,
          y: birdY.value,
          opacity: 0.8,
          scale: 1.0,
          rotation: birdRotation.value,
        };
        trailParticlesRef.current.push(newParticle);
        if (trailParticlesRef.current.length > maxTrailParticles) {
          trailParticlesRef.current.shift();
        }
      }
      
      // Update particles in place and track which to remove
      let writeIdx = 0;
      for (let i = 0; i < trailParticlesRef.current.length; i++) {
        const p = trailParticlesRef.current[i];
        p.x -= currentPipeSpeed * 0.5;
        p.opacity -= TRAIL_PARTICLE_FADE_SPEED * deltaMultiplier;
        p.scale *= Math.pow(0.97, deltaMultiplier);
        if (p.opacity > 0) {
          trailParticlesRef.current[writeIdx++] = p;
        }
      }
      trailParticlesRef.current.length = writeIdx;
    }
    
    // Android: Entity positions are updated on UI thread via useFrameCallback
    // iOS/Web: Use React state updates as before
    renderFrameCounterRef.current++;
    
    if (isAndroid) {
      // Android: ZERO React state updates during gameplay!
      // All rendering driven by shared values (pipe0X, coin0X, etc.)
      // PowerUps handled separately via refs, not rendered via React state
    } else {
      // iOS/Web: Standard React state updates every frame
      runOnJS(setPipes)(pipesRef.current.slice());
      runOnJS(setCoins)(coinsRef.current.slice());
      runOnJS(setPowerUps)(powerUpsRef.current.slice());
      
      if (cloudsEnabled) {
        runOnJS(setClouds)(cloudsRef.current.slice());
      }
      if (trailsEnabled) {
        runOnJS(setTrailParticles)(trailParticlesRef.current.slice());
      }
    }
    
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [birdY, birdRotation, gameOver, playSound, activatePowerUp, TRAIL_ASSET, cloudsEnabled, trailsEnabled, maxTrailParticles, isAndroid, pipePositionsX, pipePositionsTopHeight, coinPositionsX, coinPositionsY]);
  
  // Sync velocity from shared value to ref (for JS-side logic like collisions)
  const syncVelocityToRef = useCallback((velocity: number) => {
    birdVelocity.current = velocity;
  }, []);
  
  // Android UI thread frame callback - handles ALL physics on UI thread
  // This is critical for smooth 60fps on Android - JS thread cannot keep up
  useFrameCallback((frameInfo) => {
    'worklet';
    if (!frameCallbackActive.value) return;
    
    const deltaTime = frameInfo.timeSincePreviousFrame ?? 16.67;
    const deltaMultiplier = Math.min(deltaTime / 16.67, 5);
    
    // Update bird physics on UI thread using shared values
    birdVelocitySV.value += GRAVITY * deltaMultiplier;
    if (birdVelocitySV.value > MAX_FALL_SPEED) {
      birdVelocitySV.value = MAX_FALL_SPEED;
    }
    
    const newY = birdY.value + birdVelocitySV.value;
    birdY.value = newY;
    
    // Direct rotation update (no withTiming for performance)
    const targetRotation = Math.min(Math.max(birdVelocitySV.value * 3, -20), 70);
    birdRotation.value = targetRotation;
    
    // Ceiling check
    if (newY <= BIRD_SIZE / 2) {
      birdY.value = BIRD_SIZE / 2;
      birdVelocitySV.value = 0;
    }
    
    // Floor collision - use shared value for playable height
    if (newY >= playableHeightSV.value - BIRD_SIZE / 2) {
      frameCallbackActive.value = false;
      runOnJS(gameOver)();
      return;
    }
    
    // === MOVE PIPE AND COIN POSITIONS ON UI THREAD ===
    // CRITICAL FIX: Use shared value for pipe speed (JS refs get frozen in worklets!)
    const pipeSpeed = pipeSpeedSV.value * deltaMultiplier;
    
    // Move pipes - direct mutation of individual shared values (zero GC)
    if (pipe0X.value > -200) pipe0X.value -= pipeSpeed;
    if (pipe1X.value > -200) pipe1X.value -= pipeSpeed;
    if (pipe2X.value > -200) pipe2X.value -= pipeSpeed;
    if (pipe3X.value > -200) pipe3X.value -= pipeSpeed;
    if (pipe4X.value > -200) pipe4X.value -= pipeSpeed;
    if (pipe5X.value > -200) pipe5X.value -= pipeSpeed;
    
    // Move coins - direct mutation of individual shared values (zero GC)
    if (coin0X.value > -100) coin0X.value -= pipeSpeed;
    if (coin1X.value > -100) coin1X.value -= pipeSpeed;
    if (coin2X.value > -100) coin2X.value -= pipeSpeed;
    if (coin3X.value > -100) coin3X.value -= pipeSpeed;
    if (coin4X.value > -100) coin4X.value -= pipeSpeed;
    if (coin5X.value > -100) coin5X.value -= pipeSpeed;
    if (coin6X.value > -100) coin6X.value -= pipeSpeed;
    if (coin7X.value > -100) coin7X.value -= pipeSpeed;
    
    // Move clouds - 60fps cloud animation on UI thread (CLOUD_SPEED = 1.5)
    const cloudSpeed = 1.5 * deltaMultiplier;
    
    // Move and despawn clouds - reset all shared values when cloud goes off-screen
    if (cloud0X.value > -200) {
      cloud0X.value -= cloudSpeed;
      if (cloud0X.value <= -200) { cloud0X.value = -1000; cloud0Opacity.value = 0; }
    }
    if (cloud1X.value > -200) {
      cloud1X.value -= cloudSpeed;
      if (cloud1X.value <= -200) { cloud1X.value = -1000; cloud1Opacity.value = 0; }
    }
    if (cloud2X.value > -200) {
      cloud2X.value -= cloudSpeed;
      if (cloud2X.value <= -200) { cloud2X.value = -1000; cloud2Opacity.value = 0; }
    }
    if (cloud3X.value > -200) {
      cloud3X.value -= cloudSpeed;
      if (cloud3X.value <= -200) { cloud3X.value = -1000; cloud3Opacity.value = 0; }
    }
    if (cloud4X.value > -200) {
      cloud4X.value -= cloudSpeed;
      if (cloud4X.value <= -200) { cloud4X.value = -1000; cloud4Opacity.value = 0; }
    }
    if (cloud5X.value > -200) {
      cloud5X.value -= cloudSpeed;
      if (cloud5X.value <= -200) { cloud5X.value = -1000; cloud5Opacity.value = 0; }
    }
    
    // Note: Velocity synced back to JS ref in gameLoop (less frequent, reduces JS bridge overhead)
  }, isAndroid);
  
  const startGame = useCallback(() => {
    clearAllTimers();
    
    pipesRef.current = [];
    coinsRef.current = [];
    powerUpsRef.current = [];
    trailParticlesRef.current = [];
    trailSpawnCounterRef.current = 0;
    scoreRef.current = 0;
    shieldRef.current = false;
    doublePointsRef.current = false;
    magnetRef.current = false;
    lastFrameTimeRef.current = 0;
    renderFrameCounterRef.current = 0;
    androidFrameSkipRef.current = 0;
    
    const initialClouds: Cloud[] = [];
    if (cloudsEnabled) {
      for (let i = 0; i < 4; i++) {
        const sizes: Array<"small" | "medium" | "large"> = ["small", "medium", "large"];
        const sizeVal = sizes[Math.floor(Math.random() * sizes.length)];
        const x = Math.random() * gameWidthRef.current;
        const y = 60 + Math.random() * (playableHeightRef.current * 0.4);
        const opacity = 0.4 + Math.random() * 0.4;
        initialClouds.push({
          id: cloudIdRef.current++,
          x,
          y,
          size: sizeVal,
          opacity,
        });
        
        // Android: Initialize cloud shared values for 60fps animation
        if (isAndroid && i < MAX_CLOUDS) {
          cloudXSlots.current[i].value = x;
          cloudYSlots.current[i].value = y;
          cloudSizeSlots.current[i].value = sizeVal === "small" ? 0 : sizeVal === "medium" ? 1 : 2;
          cloudOpacitySlots.current[i].value = opacity;
        }
      }
    }
    
    // Android: Reset remaining cloud slots
    if (isAndroid) {
      for (let i = initialClouds.length; i < MAX_CLOUDS; i++) {
        cloudXSlots.current[i].value = -1000;
      }
    }
    
    cloudsRef.current = initialClouds;
    
    setPipes([]);
    setCoins([]);
    setPowerUps([]);
    setClouds(initialClouds);
    setTrailParticles([]);
    setScore(0);
    setShieldActive(false);
    setDoublePointsActive(false);
    setMagnetActive(false);
    
    birdY.value = playableHeightRef.current / 2;
    birdVelocity.current = 0;
    birdRotation.value = 0;
    
    // Android: Reset individual shared values for UI thread rendering (zero GC)
    if (isAndroid) {
      pipe0X.value = -1000; pipe0H.value = 0;
      pipe1X.value = -1000; pipe1H.value = 0;
      pipe2X.value = -1000; pipe2H.value = 0;
      pipe3X.value = -1000; pipe3H.value = 0;
      pipe4X.value = -1000; pipe4H.value = 0;
      pipe5X.value = -1000; pipe5H.value = 0;
      coin0X.value = -1000; coin0Y.value = 0;
      coin1X.value = -1000; coin1Y.value = 0;
      coin2X.value = -1000; coin2Y.value = 0;
      coin3X.value = -1000; coin3Y.value = 0;
      coin4X.value = -1000; coin4Y.value = 0;
      coin5X.value = -1000; coin5Y.value = 0;
      coin6X.value = -1000; coin6Y.value = 0;
      coin7X.value = -1000; coin7Y.value = 0;
    }
    
    groundOffset.value = withRepeat(
      withTiming(-100, { duration: 1000, easing: Easing.linear }),
      -1,
      false
    );
    
    gameStateRef.current = "playing";
    setGameState("playing");
    
    const consumeAndActivatePowerUp = async (type: "shield" | "double" | "magnet") => {
      if (!userId) return;
      try {
        await apiRequest("POST", "/api/flappy/inventory/use", { userId, powerUpType: type });
        activatePowerUp(type);
      } catch (error) {
        console.log(`Failed to use ${type} power-up:`, error);
      }
    };
    
    if (equippedPowerUps.shield) {
      consumeAndActivatePowerUp("shield");
      setEquippedPowerUps((prev) => ({ ...prev, shield: false }));
    }
    if (equippedPowerUps.double) {
      consumeAndActivatePowerUp("double");
      setEquippedPowerUps((prev) => ({ ...prev, double: false }));
    }
    if (equippedPowerUps.magnet) {
      consumeAndActivatePowerUp("magnet");
      setEquippedPowerUps((prev) => ({ ...prev, magnet: false }));
    }
    
    pipeTimerRef.current = setInterval(spawnPipe, pipeSpawnIntervalRef.current);
    coinTimerRef.current = setInterval(spawnCoin, COIN_SPAWN_INTERVAL);
    // Powerups disabled - will be sold as consumables in marketplace
    if (cloudsEnabled) {
      cloudTimerRef.current = setInterval(spawnCloud, cloudSpawnInterval);
    }
    
    initialPipeTimerRef.current = setTimeout(() => {
      if (gameStateRef.current === "playing") {
        spawnPipe();
      }
    }, 1000);
    
    // On Android: Use UI thread for bird physics (frameCallbackActive) + JS thread for entity updates
    // On iOS/web: Use JS thread for everything
    if (isAndroid) {
      frameCallbackActive.value = true;
      birdVelocitySV.value = 0;
      pipeSpeedSV.value = pipeSpeedRef.current; // Sync shared value for worklet
      playableHeightSV.value = playableHeightRef.current; // Sync for floor collision
    }
    // Always start JS game loop (needed for entity updates on all platforms)
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [birdY, birdRotation, groundOffset, spawnPipe, spawnCoin, spawnCloud, gameLoop, clearAllTimers, equippedPowerUps, activatePowerUp, userId, isAndroid, frameCallbackActive, pipePositionsX, pipePositionsTopHeight, coinPositionsX, coinPositionsY, coinValues]);
  
  const jump = useCallback(() => {
    if (showMenu) return;
    
    if (gameState === "idle") {
      startGame();
      birdVelocity.current = JUMP_STRENGTH;
      if (isAndroid) birdVelocitySV.value = JUMP_STRENGTH; // Sync shared value for UI thread
      birdRotation.value = withTiming(-20, { duration: 100 });
      playSound("jump");
    } else if (gameState === "playing") {
      birdVelocity.current = JUMP_STRENGTH;
      if (isAndroid) birdVelocitySV.value = JUMP_STRENGTH; // Sync shared value for UI thread
      birdRotation.value = withTiming(-20, { duration: 100 });
      playSound("jump");
    } else if (gameState === "gameover") {
      resetToIdle();
    }
  }, [gameState, startGame, playSound, birdRotation, showMenu, resetToIdle, isAndroid, birdVelocitySV]);
  
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);
  
  useEffect(() => {
    if (gameState === "idle" || gameState === "playing") {
      const wingSpeed = Platform.OS === "android" ? 150 : 120;
      wingOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(1, { duration: wingSpeed }),
          withTiming(0, { duration: 0 }),
          withTiming(0, { duration: wingSpeed })
        ),
        -1,
        false
      );
    } else {
      cancelAnimation(wingOpacity);
      wingOpacity.value = 1;
    }
    
    return () => {
      cancelAnimation(wingOpacity);
    };
  }, [gameState, wingOpacity]);
  
  useEffect(() => {
    if (gameState === "playing") {
      powerUpCountdownRef.current = setInterval(() => {
        const now = Date.now();
        if (shieldEndTimeRef.current > 0) {
          const remaining = Math.max(0, Math.ceil((shieldEndTimeRef.current - now) / 1000));
          setShieldTimeLeft(remaining);
        }
        if (doubleEndTimeRef.current > 0) {
          const remaining = Math.max(0, Math.ceil((doubleEndTimeRef.current - now) / 1000));
          setDoubleTimeLeft(remaining);
        }
        if (magnetEndTimeRef.current > 0) {
          const remaining = Math.max(0, Math.ceil((magnetEndTimeRef.current - now) / 1000));
          setMagnetTimeLeft(remaining);
        }
      }, 100);
    } else {
      if (powerUpCountdownRef.current) {
        clearInterval(powerUpCountdownRef.current);
        powerUpCountdownRef.current = null;
      }
    }
    
    return () => {
      if (powerUpCountdownRef.current) {
        clearInterval(powerUpCountdownRef.current);
        powerUpCountdownRef.current = null;
      }
    };
  }, [gameState]);
  
  const birdStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: birdY.value - BIRD_VISUAL_SIZE / 2 },
      { rotate: `${birdRotation.value}deg` },
    ],
  }));
  
  const wingFrame0Style = useAnimatedStyle(() => ({
    opacity: wingOpacity.value,
  }));
  
  const wingFrame1Style = useAnimatedStyle(() => ({
    opacity: 1 - wingOpacity.value,
  }));
  
  const groundStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: groundOffset.value }],
  }));
  
  if (isLoading) {
    return <GameLoadingSplash progress={loadProgress} />;
  }
  
  return (
    <View style={styles.container} onLayout={handleLayout}>
      <Pressable style={styles.gameArea} onPress={jump}>
        <View style={styles.sky} />
        
        {/* Clouds - Android uses AnimatedCloudSlot for 60fps, iOS/Web uses React state */}
        {isAndroid ? (
          <>
            <AnimatedCloudSlot cloudX={cloud0X} cloudY={cloud0Y} cloudSize={cloud0Size} cloudOpacity={cloud0Opacity} />
            <AnimatedCloudSlot cloudX={cloud1X} cloudY={cloud1Y} cloudSize={cloud1Size} cloudOpacity={cloud1Opacity} />
            <AnimatedCloudSlot cloudX={cloud2X} cloudY={cloud2Y} cloudSize={cloud2Size} cloudOpacity={cloud2Opacity} />
            <AnimatedCloudSlot cloudX={cloud3X} cloudY={cloud3Y} cloudSize={cloud3Size} cloudOpacity={cloud3Opacity} />
            <AnimatedCloudSlot cloudX={cloud4X} cloudY={cloud4Y} cloudSize={cloud4Size} cloudOpacity={cloud4Opacity} />
            <AnimatedCloudSlot cloudX={cloud5X} cloudY={cloud5Y} cloudSize={cloud5Size} cloudOpacity={cloud5Opacity} />
          </>
        ) : (
          clouds.map((cloud) => (
            <View
              key={cloud.id}
              style={[
                styles.cloud,
                cloud.size === "small" && styles.cloudSmall,
                cloud.size === "medium" && styles.cloudMedium,
                cloud.size === "large" && styles.cloudLarge,
                { left: cloud.x, top: cloud.y, opacity: cloud.opacity },
              ]}
            >
              <View style={styles.cloudPuff1} />
              <View style={styles.cloudPuff2} />
              <View style={styles.cloudPuff3} />
            </View>
          ))
        )}
        
        {/* Android: Use slot-based animated components with individual shared values (zero GC) */}
        {/* iOS/Web: Use React state-based rendering */}
        {isAndroid ? (
          <>
            {/* Pipe slots - each reads from its own individual shared value */}
            <AnimatedPipeSlot pipeX={pipe0X} pipeTopHeight={pipe0H} pipeWidth={PIPE_WIDTH} gapSize={GAP_SIZE} playableHeight={PLAYABLE_HEIGHT} />
            <AnimatedPipeSlot pipeX={pipe1X} pipeTopHeight={pipe1H} pipeWidth={PIPE_WIDTH} gapSize={GAP_SIZE} playableHeight={PLAYABLE_HEIGHT} />
            <AnimatedPipeSlot pipeX={pipe2X} pipeTopHeight={pipe2H} pipeWidth={PIPE_WIDTH} gapSize={GAP_SIZE} playableHeight={PLAYABLE_HEIGHT} />
            <AnimatedPipeSlot pipeX={pipe3X} pipeTopHeight={pipe3H} pipeWidth={PIPE_WIDTH} gapSize={GAP_SIZE} playableHeight={PLAYABLE_HEIGHT} />
            <AnimatedPipeSlot pipeX={pipe4X} pipeTopHeight={pipe4H} pipeWidth={PIPE_WIDTH} gapSize={GAP_SIZE} playableHeight={PLAYABLE_HEIGHT} />
            <AnimatedPipeSlot pipeX={pipe5X} pipeTopHeight={pipe5H} pipeWidth={PIPE_WIDTH} gapSize={GAP_SIZE} playableHeight={PLAYABLE_HEIGHT} />
            {/* Coin slots - each reads from its own individual shared value */}
            <AnimatedCoinSlot coinX={coin0X} coinY={coin0Y} coinSize={COIN_SIZE} />
            <AnimatedCoinSlot coinX={coin1X} coinY={coin1Y} coinSize={COIN_SIZE} />
            <AnimatedCoinSlot coinX={coin2X} coinY={coin2Y} coinSize={COIN_SIZE} />
            <AnimatedCoinSlot coinX={coin3X} coinY={coin3Y} coinSize={COIN_SIZE} />
            <AnimatedCoinSlot coinX={coin4X} coinY={coin4Y} coinSize={COIN_SIZE} />
            <AnimatedCoinSlot coinX={coin5X} coinY={coin5Y} coinSize={COIN_SIZE} />
            <AnimatedCoinSlot coinX={coin6X} coinY={coin6Y} coinSize={COIN_SIZE} />
            <AnimatedCoinSlot coinX={coin7X} coinY={coin7Y} coinSize={COIN_SIZE} />
          </>
        ) : (
          <>
            {pipes.map((pipe) => (
              <React.Fragment key={pipe.id}>
                <View
                  style={[
                    styles.pipe,
                    styles.pipeTop,
                    { left: pipe.x, height: pipe.topHeight, width: PIPE_WIDTH },
                  ]}
                >
                  <View style={[styles.pipeCapTop, { width: PIPE_WIDTH + 12 }]} />
                  <View style={styles.pipeHighlight} />
                </View>
                <View
                  style={[
                    styles.pipe,
                    styles.pipeBottom,
                    {
                      left: pipe.x,
                      top: pipe.topHeight + GAP_SIZE,
                      height: PLAYABLE_HEIGHT - pipe.topHeight - GAP_SIZE,
                      width: PIPE_WIDTH,
                    },
                  ]}
                >
                  <View style={[styles.pipeCapBottom, { width: PIPE_WIDTH + 12 }]} />
                  <View style={styles.pipeHighlight} />
                </View>
              </React.Fragment>
            ))}
            {coins.map((coin) => (
              <View
                key={coin.id}
                style={[
                  styles.coin,
                  { left: coin.x - COIN_SIZE / 2, top: coin.y - COIN_SIZE / 2 },
                ]}
              >
                <ThemedText style={styles.coinText}>{coin.value}</ThemedText>
              </View>
            ))}
          </>
        )}
        
        {powerUps.map((pu) => (
          <View
            key={pu.id}
            style={[
              styles.powerUp,
              { left: pu.x - POWERUP_SIZE / 2, top: pu.y - POWERUP_SIZE / 2 },
            ]}
          >
            <View style={styles.powerUpAura} />
            <Image
              source={pu.type === "shield" ? POWERUP_SHIELD : pu.type === "double" ? POWERUP_DOUBLE : POWERUP_MAGNET}
              style={styles.powerUpImage}
              contentFit="contain"
            />
          </View>
        ))}
        
        {TRAIL_ASSET && gameState === "playing" && trailParticles.map((particle) => (
          <View 
            key={particle.id}
            style={[
              styles.trailParticle, 
              { 
                left: particle.x - 60,
                top: particle.y - 30,
                opacity: particle.opacity,
                transform: [
                  { scale: particle.scale },
                  { rotate: `${particle.rotation}deg` },
                ],
              }
            ]}
          >
            <Image
              source={TRAIL_ASSET}
              style={styles.trailImage}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          </View>
        ))}
        
        <Animated.View style={[styles.bird, birdStyle, { left: BIRD_X - BIRD_VISUAL_SIZE / 2 }]}>
          {shieldActive && <View style={styles.shieldAura} />}
          {gameState === "dying" || gameState === "gameover" ? (
            <Image
              source={ROACHY_DEAD}
              style={styles.roachySprite}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.roachySprite}>
              <Animated.View style={[styles.roachySpriteAbsolute, wingFrame0Style]}>
                <Image
                  source={ROACHY_FRAMES[0]}
                  style={styles.roachySpriteAbsolute}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />
              </Animated.View>
              <Animated.View style={[styles.roachySpriteAbsolute, wingFrame1Style]}>
                <Image
                  source={ROACHY_FRAMES[1]}
                  style={styles.roachySpriteAbsolute}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />
              </Animated.View>
            </View>
          )}
        </Animated.View>
        
        <View style={[styles.ground, { height: GROUND_HEIGHT }]}>
          <View style={styles.grassTop} />
          <Animated.View style={[styles.groundPattern, groundStyle]} />
        </View>
        
        <View style={[styles.scoreContainer, { top: insets.top + 20 }]}>
          <ThemedText style={styles.scoreText}>{score}</ThemedText>
        </View>
        
        {(shieldActive || doublePointsActive || magnetActive) && (
          <View style={[styles.powerUpIndicators, { top: insets.top + 10 }]}>
            <PowerUpIndicator type="shield" timeLeft={shieldTimeLeft} isActive={shieldActive} />
            <PowerUpIndicator type="double" timeLeft={doubleTimeLeft} isActive={doublePointsActive} />
            <PowerUpIndicator type="magnet" timeLeft={magnetTimeLeft} isActive={magnetActive} />
          </View>
        )}
        
        {gameState === "idle" && (
          <View style={styles.overlay}>
            <View style={styles.startCard}>
              <ThemedText style={styles.title}>Flappy Roachy</ThemedText>
              <ThemedText style={styles.subtitle}>
                {gameMode === "ranked" 
                  ? (rankedPeriod === 'daily' ? "Daily Challenge" : "Weekly Championship")
                  : "Free Play"}
              </ThemedText>
              <View style={styles.instructionRow}>
                <Feather name="zap" size={20} color={GameColors.gold} />
                <ThemedText style={styles.instruction}>Collect coins for points</ThemedText>
              </View>
              <View style={styles.instructionRow}>
                <Feather name="shield" size={20} color="#3B82F6" />
                <ThemedText style={styles.instruction}>Grab power-ups for bonuses</ThemedText>
              </View>
              <View style={styles.instructionRow}>
                <Feather name="x-circle" size={20} color="#EF4444" />
                <ThemedText style={styles.instruction}>Avoid the pipes!</ThemedText>
              </View>
              <ThemedText style={styles.tapPrompt}>Tap anywhere to start</ThemedText>
              
              <Pressable
                style={styles.menuButton}
                onPress={() => setShowMenu(true)}
              >
                <Feather name="menu" size={18} color="#fff" />
                <ThemedText style={styles.menuButtonText}>Leaderboards & Backpack</ThemedText>
              </Pressable>
            </View>
          </View>
        )}
        
        {gameState === "gameover" && (
          <View style={styles.overlay}>
            <View style={styles.gameOverCard}>
              <ThemedText style={styles.gameOverTitle}>Game Over</ThemedText>
              <View style={styles.scoreRow}>
                <ThemedText style={styles.scoreLabel}>Score</ThemedText>
                <ThemedText style={styles.finalScore}>{score}</ThemedText>
              </View>
              <View style={styles.scoreRow}>
                <ThemedText style={styles.scoreLabel}>Best</ThemedText>
                <ThemedText style={styles.highScoreText}>{highScore}</ThemedText>
              </View>
              <ThemedText style={styles.tapPrompt}>Tap to play again</ThemedText>
            </View>
          </View>
        )}
      </Pressable>
      
      <ExitButton style={[styles.exitButton, { top: insets.top + 10 }]} onPress={onExit} />
      
      <FlappyMenuSheet
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        userId={userId}
        onPlayRanked={(period: 'daily' | 'weekly') => {
          setGameMode("ranked");
          setRankedPeriod(period);
          setShowMenu(false);
        }}
        onPlayFree={() => {
          setGameMode("free");
          setRankedPeriod(null);
          setShowMenu(false);
        }}
        onEquipPowerUp={(type) => {
          setEquippedPowerUps((prev) => ({ ...prev, [type]: true }));
        }}
        equippedPowerUps={equippedPowerUps}
        selectedSkin={selectedSkin}
        onSelectSkin={setSelectedSkin}
        selectedTrail={equippedTrail}
        onSelectTrail={handleSelectTrail}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#70c5ce",
  },
  gameArea: {
    flex: 1,
    overflow: "hidden",
  },
  sky: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#70c5ce",
  },
  bird: {
    position: "absolute",
    width: BIRD_VISUAL_SIZE,
    height: BIRD_VISUAL_SIZE,
    zIndex: 100,
  },
  roachySprite: {
    width: BIRD_VISUAL_SIZE + 20,
    height: BIRD_VISUAL_SIZE + 20,
    marginTop: -10,
    marginLeft: -10,
  },
  trail: {
    position: "absolute",
    width: 120,
    height: 60,
    zIndex: 5,
  },
  trailParticle: {
    position: "absolute",
    width: 120,
    height: 60,
    zIndex: 5,
  },
  trailImage: {
    width: 120,
    height: 60,
  },
  roachySpriteAbsolute: {
    position: "absolute",
    top: 0,
    left: 0,
    width: BIRD_VISUAL_SIZE + 20,
    height: BIRD_VISUAL_SIZE + 20,
  },
  shieldAura: {
    position: "absolute",
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "#3B82F6",
    backgroundColor: "rgba(59, 130, 246, 0.2)",
  },
  pipe: {
    position: "absolute",
    backgroundColor: "#73bf2e",
    borderWidth: 3,
    borderColor: "#2d5016",
    zIndex: 50,
  },
  pipeTop: {
    top: 0,
  },
  pipeBottom: {},
  pipeCapTop: {
    position: "absolute",
    bottom: -3,
    left: -6,
    height: 26,
    backgroundColor: "#73bf2e",
    borderWidth: 3,
    borderColor: "#2d5016",
    borderRadius: 4,
  },
  pipeCapBottom: {
    position: "absolute",
    top: -3,
    left: -6,
    height: 26,
    backgroundColor: "#73bf2e",
    borderWidth: 3,
    borderColor: "#2d5016",
    borderRadius: 4,
  },
  pipeHighlight: {
    position: "absolute",
    left: 8,
    top: 0,
    bottom: 0,
    width: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  coin: {
    position: "absolute",
    width: COIN_SIZE,
    height: COIN_SIZE,
    backgroundColor: "#FFD700",
    borderRadius: COIN_SIZE / 2,
    borderWidth: 3,
    borderColor: "#B8860B",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 60,
  },
  coinText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#8B4513",
  },
  powerUp: {
    position: "absolute",
    width: POWERUP_SIZE,
    height: POWERUP_SIZE,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 60,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 10,
  },
  powerUpAura: {
    position: "absolute",
    width: POWERUP_SIZE + 16,
    height: POWERUP_SIZE + 16,
    borderRadius: (POWERUP_SIZE + 16) / 2,
    backgroundColor: "rgba(255, 215, 0, 0.3)",
    top: -8,
    left: -8,
  },
  powerUpImage: {
    width: POWERUP_SIZE,
    height: POWERUP_SIZE,
  },
  cloud: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    zIndex: 5,
  },
  cloudSmall: {
    width: 60,
    height: 30,
  },
  cloudMedium: {
    width: 90,
    height: 45,
  },
  cloudLarge: {
    width: 120,
    height: 60,
  },
  cloudPuff1: {
    position: "absolute",
    left: 0,
    bottom: 0,
    width: "40%",
    height: "60%",
    backgroundColor: "#fff",
    borderRadius: 100,
  },
  cloudPuff2: {
    position: "absolute",
    left: "25%",
    bottom: 0,
    width: "50%",
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 100,
  },
  cloudPuff3: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: "40%",
    height: "70%",
    backgroundColor: "#fff",
    borderRadius: 100,
  },
  ground: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#DED895",
    zIndex: 200,
    overflow: "hidden",
  },
  grassTop: {
    height: 15,
    backgroundColor: "#73bf2e",
    borderBottomWidth: 3,
    borderBottomColor: "#2d5016",
  },
  groundPattern: {
    position: "absolute",
    top: 15,
    left: 0,
    width: "200%", // Dynamic width applied inline
    height: "100%",
    backgroundColor: "#DED895",
  },
  scoreContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 300,
  },
  scoreText: {
    fontSize: 48,
    fontWeight: "900",
    color: "#fff",
    textShadowColor: "#000",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  powerUpIndicators: {
    position: "absolute",
    left: 16,
    flexDirection: "column",
    alignItems: "flex-start",
    zIndex: 300,
  },
  indicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  indicatorShield: {
    backgroundColor: "#3B82F6",
  },
  indicatorDouble: {
    backgroundColor: "#F59E0B",
  },
  indicatorMagnet: {
    backgroundColor: "#EF4444",
  },
  indicatorText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fff",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 500,
  },
  startCard: {
    backgroundColor: GameColors.surface,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    width: "85%",
    maxWidth: 320,
    borderWidth: 2,
    borderColor: GameColors.gold,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: GameColors.gold,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 18,
    color: GameColors.textSecondary,
    marginBottom: Spacing.xl,
  },
  instructionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  instruction: {
    fontSize: 14,
    color: GameColors.textSecondary,
  },
  tapPrompt: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.gold,
    marginTop: Spacing.lg,
  },
  gameOverCard: {
    backgroundColor: GameColors.surface,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    width: "85%",
    maxWidth: 320,
    borderWidth: 2,
    borderColor: "#EF4444",
  },
  gameOverTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#EF4444",
    marginBottom: Spacing.lg,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  scoreLabel: {
    fontSize: 18,
    color: GameColors.textSecondary,
  },
  finalScore: {
    fontSize: 24,
    fontWeight: "800",
    color: GameColors.gold,
  },
  highScoreText: {
    fontSize: 24,
    fontWeight: "800",
    color: GameColors.textPrimary,
  },
  exitButton: {
    position: "absolute",
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 600,
  },
  menuButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: GameColors.surfaceLight,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  menuButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});
