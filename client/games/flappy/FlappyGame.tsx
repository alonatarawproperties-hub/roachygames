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
  runOnJS,
  cancelAnimation,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { FlappyMenuSheet } from "./FlappyMenuSheet";
import { apiRequest } from "@/lib/query-client";
import { FLAPPY_SKINS, RoachySkin, ALL_SPRITES } from "./flappySkins";

export { FLAPPY_SKINS, RoachySkin } from "./flappySkins";

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
const PIPE_SPEED = 4;
const PIPE_SPAWN_INTERVAL = 2800;
const BASE_GAP_SIZE = 200;
const BASE_PIPE_WIDTH = 70;

const BIRD_SIZE = 50;
const BIRD_VISUAL_SIZE = 100;

const COIN_SIZE = 35;
const COIN_SPAWN_INTERVAL = 2500;

const POWERUP_SIZE = 50;
const POWERUP_SPAWN_INTERVAL = 12000;

const CLOUD_SPEED = 1.5;
const CLOUD_SPAWN_INTERVAL = 3000;

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

type GameState = "idle" | "playing" | "dying" | "gameover";

type GameMode = "free" | "ranked";

interface FlappyGameProps {
  onExit?: () => void;
  onScoreSubmit?: (score: number, isRanked: boolean, rankedPeriod?: 'daily' | 'weekly' | null) => void;
  userId?: string | null;
  skin?: RoachySkin;
}

export function FlappyGame({ onExit, onScoreSubmit, userId = null, skin = "default" }: FlappyGameProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  
  // Use portrait dimensions - always use the smaller value as width
  const GAME_WIDTH = Math.min(screenWidth, screenHeight);
  const GAME_HEIGHT = Math.max(screenWidth, screenHeight);
  const GROUND_HEIGHT = BASE_GROUND_HEIGHT + insets.bottom;
  const PLAYABLE_HEIGHT = GAME_HEIGHT - GROUND_HEIGHT;
  
  // Scale game elements based on screen size (base is 390px width)
  const scale = GAME_WIDTH / 390;
  // Cap gap size between 160-220 to maintain difficulty on tablets
  const GAP_SIZE = Math.min(220, Math.max(160, BASE_GAP_SIZE * Math.min(scale, 1.1)));
  const PIPE_WIDTH = Math.max(50, BASE_PIPE_WIDTH * scale);
  const BIRD_X = GAME_WIDTH * 0.2;
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [pipes, setPipes] = useState<Pipe[]>([]);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [clouds, setClouds] = useState<Cloud[]>([]);
  
  const [shieldActive, setShieldActive] = useState(false);
  const [doublePointsActive, setDoublePointsActive] = useState(false);
  const [magnetActive, setMagnetActive] = useState(false);
  const [shieldTimeLeft, setShieldTimeLeft] = useState(0);
  const [doubleTimeLeft, setDoubleTimeLeft] = useState(0);
  const [magnetTimeLeft, setMagnetTimeLeft] = useState(0);
  const [wingFrame, setWingFrame] = useState(0);
  
  const [showMenu, setShowMenu] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>("free");
  const [rankedPeriod, setRankedPeriod] = useState<'daily' | 'weekly' | null>(null);
  const [equippedPowerUps, setEquippedPowerUps] = useState<{
    shield: boolean;
    double: boolean;
    magnet: boolean;
  }>({ shield: false, double: false, magnet: false });
  const [selectedSkin, setSelectedSkin] = useState<RoachySkin>(skin);
  
  useEffect(() => {
    setSelectedSkin(skin);
  }, [skin]);
  
  const shieldEndTimeRef = useRef<number>(0);
  const doubleEndTimeRef = useRef<number>(0);
  const magnetEndTimeRef = useRef<number>(0);
  const powerUpCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const currentSkin = FLAPPY_SKINS[selectedSkin] || FLAPPY_SKINS.default;
  const ROACHY_FRAMES = currentSkin.frames;
  const ROACHY_DEAD = currentSkin.dead;
  
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
  const birdVelocity = useRef(0);
  const birdRotation = useSharedValue(0);
  const groundOffset = useSharedValue(0);
  
  const gameLoopRef = useRef<number | null>(null);
  const pipeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const coinTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const powerUpTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialPipeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const shieldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doubleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const magnetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wingAnimationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const pipeIdRef = useRef(0);
  const coinIdRef = useRef(0);
  const powerUpIdRef = useRef(0);
  const cloudIdRef = useRef(0);
  
  const cloudTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const pipesRef = useRef<Pipe[]>([]);
  const coinsRef = useRef<Coin[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const cloudsRef = useRef<Cloud[]>([]);
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
    if (wingAnimationRef.current) {
      clearInterval(wingAnimationRef.current);
      wingAnimationRef.current = null;
    }
    if (cloudTimerRef.current) {
      clearInterval(cloudTimerRef.current);
      cloudTimerRef.current = null;
    }
    if (powerUpCountdownRef.current) {
      clearInterval(powerUpCountdownRef.current);
      powerUpCountdownRef.current = null;
    }
    cancelAnimation(groundOffset);
  }, [groundOffset]);
  
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
    scoreRef.current = 0;
    
    setPipes([]);
    setCoins([]);
    setPowerUps([]);
    setScore(0);
    setShieldActive(false);
    setDoublePointsActive(false);
    setMagnetActive(false);
    
    birdY.value = playableHeightRef.current / 2;
    birdVelocity.current = 0;
    birdRotation.value = 0;
    
    gameStateRef.current = "idle";
    setGameState("idle");
  }, [clearAllTimers, birdY, birdRotation]);
  
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
    setPipes([...pipesRef.current]);
  }, []);
  
  const spawnCoin = useCallback(() => {
    if (gameStateRef.current !== "playing") return;
    
    const minY = 100;
    const maxY = playableHeightRef.current - 100;
    const y = Math.floor(Math.random() * (maxY - minY)) + minY;
    const value = Math.floor(Math.random() * 50) + 10;
    
    const newCoin: Coin = {
      id: coinIdRef.current++,
      x: gameWidthRef.current,
      y,
      value,
      collected: false,
    };
    
    coinsRef.current = [...coinsRef.current, newCoin];
    setCoins([...coinsRef.current]);
  }, []);
  
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
    setPowerUps([...powerUpsRef.current]);
  }, []);
  
  const spawnCloud = useCallback(() => {
    const sizes: Array<"small" | "medium" | "large"> = ["small", "medium", "large"];
    const size = sizes[Math.floor(Math.random() * sizes.length)];
    const minY = 40;
    const maxY = playableHeightRef.current * 0.5;
    const y = Math.floor(Math.random() * (maxY - minY)) + minY;
    const opacity = 0.4 + Math.random() * 0.4;
    
    const newCloud: Cloud = {
      id: cloudIdRef.current++,
      x: gameWidthRef.current + 100,
      y,
      size,
      opacity,
    };
    
    cloudsRef.current = [...cloudsRef.current, newCloud];
    setClouds([...cloudsRef.current]);
  }, []);
  
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
  
  const gameLoop = useCallback(() => {
    if (gameStateRef.current !== "playing") return;
    
    birdVelocity.current += GRAVITY;
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
    
    pipesRef.current = pipesRef.current.map((pipe) => ({
      ...pipe,
      x: pipe.x - PIPE_SPEED,
    }));
    
    coinsRef.current = coinsRef.current.map((coin) => {
      let newX = coin.x - PIPE_SPEED;
      let newY = coin.y;
      
      if (magnetRef.current && !coin.collected) {
        const dx = birdXRef.current - coin.x;
        const dy = birdY.value - coin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 200 && dist > 0) {
          newX += (dx / dist) * 8;
          newY += (dy / dist) * 8;
        }
      }
      
      return { ...coin, x: newX, y: newY };
    });
    
    powerUpsRef.current = powerUpsRef.current.map((pu) => ({
      ...pu,
      x: pu.x - PIPE_SPEED,
    }));
    
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
    
    pipesRef.current = pipesRef.current.map((pipe) => {
      if (!pipe.passed && pipe.x + currentPipeWidth < currentBirdX) {
        scoreRef.current += 1;
        runOnJS(setScore)(scoreRef.current);
        return { ...pipe, passed: true };
      }
      return pipe;
    });
    
    coinsRef.current = coinsRef.current.map((coin) => {
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
          runOnJS(setScore)(scoreRef.current);
          runOnJS(playSound)("coin");
          return { ...coin, collected: true };
        }
      }
      return coin;
    });
    
    powerUpsRef.current = powerUpsRef.current.map((pu) => {
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
          runOnJS(playSound)("powerup");
          runOnJS(activatePowerUp)(pu.type);
          return { ...pu, collected: true };
        }
      }
      return pu;
    });
    
    pipesRef.current = pipesRef.current.filter((pipe) => pipe.x > -currentPipeWidth);
    coinsRef.current = coinsRef.current.filter((coin) => !coin.collected && coin.x > -COIN_SIZE);
    powerUpsRef.current = powerUpsRef.current.filter((pu) => !pu.collected && pu.x > -POWERUP_SIZE);
    
    cloudsRef.current = cloudsRef.current.map((cloud) => ({
      ...cloud,
      x: cloud.x - CLOUD_SPEED,
    }));
    cloudsRef.current = cloudsRef.current.filter((cloud) => cloud.x > -200);
    
    runOnJS(setPipes)([...pipesRef.current]);
    runOnJS(setCoins)([...coinsRef.current]);
    runOnJS(setPowerUps)([...powerUpsRef.current]);
    runOnJS(setClouds)([...cloudsRef.current]);
    
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [birdY, birdRotation, gameOver, playSound, activatePowerUp]);
  
  const startGame = useCallback(() => {
    clearAllTimers();
    
    pipesRef.current = [];
    coinsRef.current = [];
    powerUpsRef.current = [];
    scoreRef.current = 0;
    shieldRef.current = false;
    doublePointsRef.current = false;
    magnetRef.current = false;
    
    const initialClouds: Cloud[] = [];
    for (let i = 0; i < 4; i++) {
      const sizes: Array<"small" | "medium" | "large"> = ["small", "medium", "large"];
      initialClouds.push({
        id: cloudIdRef.current++,
        x: Math.random() * gameWidthRef.current,
        y: 60 + Math.random() * (playableHeightRef.current * 0.4),
        size: sizes[Math.floor(Math.random() * sizes.length)],
        opacity: 0.4 + Math.random() * 0.4,
      });
    }
    cloudsRef.current = initialClouds;
    
    setPipes([]);
    setCoins([]);
    setPowerUps([]);
    setClouds(initialClouds);
    setScore(0);
    setShieldActive(false);
    setDoublePointsActive(false);
    setMagnetActive(false);
    
    birdY.value = playableHeightRef.current / 2;
    birdVelocity.current = 0;
    birdRotation.value = 0;
    
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
    
    pipeTimerRef.current = setInterval(spawnPipe, PIPE_SPAWN_INTERVAL);
    coinTimerRef.current = setInterval(spawnCoin, COIN_SPAWN_INTERVAL);
    powerUpTimerRef.current = setInterval(spawnPowerUp, POWERUP_SPAWN_INTERVAL);
    cloudTimerRef.current = setInterval(spawnCloud, CLOUD_SPAWN_INTERVAL);
    
    initialPipeTimerRef.current = setTimeout(() => {
      if (gameStateRef.current === "playing") {
        spawnPipe();
      }
    }, 1000);
    
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [birdY, birdRotation, groundOffset, spawnPipe, spawnCoin, spawnPowerUp, spawnCloud, gameLoop, clearAllTimers, equippedPowerUps, activatePowerUp, userId]);
  
  const jump = useCallback(() => {
    if (showMenu) return;
    
    if (gameState === "idle") {
      startGame();
      birdVelocity.current = JUMP_STRENGTH;
      birdRotation.value = withTiming(-20, { duration: 100 });
      playSound("jump");
    } else if (gameState === "playing") {
      birdVelocity.current = JUMP_STRENGTH;
      birdRotation.value = withTiming(-20, { duration: 100 });
      playSound("jump");
    } else if (gameState === "gameover") {
      resetToIdle();
    }
  }, [gameState, startGame, playSound, birdRotation, showMenu, resetToIdle]);
  
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);
  
  useEffect(() => {
    if (gameState === "idle" || gameState === "playing") {
      wingAnimationRef.current = setInterval(() => {
        setWingFrame((prev) => (prev + 1) % 2);
      }, 120);
    } else {
      if (wingAnimationRef.current) {
        clearInterval(wingAnimationRef.current);
        wingAnimationRef.current = null;
      }
    }
    
    return () => {
      if (wingAnimationRef.current) {
        clearInterval(wingAnimationRef.current);
        wingAnimationRef.current = null;
      }
    };
  }, [gameState]);
  
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
  
  const groundStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: groundOffset.value }],
  }));
  
  if (isLoading) {
    return <GameLoadingSplash progress={loadProgress} />;
  }
  
  return (
    <View style={styles.container}>
      <Pressable style={styles.gameArea} onPress={jump}>
        <View style={styles.sky} />
        
        {clouds.map((cloud) => (
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
        ))}
        
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
              <Image
                source={ROACHY_FRAMES[0]}
                style={[styles.roachySpriteAbsolute, { opacity: wingFrame === 0 ? 1 : 0 }]}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
              <Image
                source={ROACHY_FRAMES[1]}
                style={[styles.roachySpriteAbsolute, { opacity: wingFrame === 1 ? 1 : 0 }]}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
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
