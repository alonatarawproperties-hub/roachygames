import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Pressable,
  Platform,
  ActivityIndicator,
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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const ROACHY_SPRITE_1 = require("@assets/Untitled_design_1765503061373.png");
const ROACHY_SPRITE_2 = require("@assets/Untitled_design_-_8_1765505842312.png");
const ROACHY_SPRITE_3 = require("@assets/Untitled_design_-_7_1765505842312.png");
const ROACHY_SPRITE_DEAD = require("@assets/Untitled_design_1765504788923.png");

const ALL_SPRITES = [ROACHY_SPRITE_1, ROACHY_SPRITE_2, ROACHY_SPRITE_3, ROACHY_SPRITE_DEAD];

function GameLoadingSplash({ progress }: { progress: number }) {
  const pulseScale = useSharedValue(1);
  
  useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);
  
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));
  
  return (
    <View style={loadingStyles.container}>
      <LinearGradient
        colors={["#0a0a0a", "#1a1a2e", "#0a0a0a"]}
        style={StyleSheet.absoluteFillObject}
      />
      
      <Animated.View style={[loadingStyles.iconContainer, pulseStyle]}>
        <Image
          source={ROACHY_SPRITE_1}
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

const GAME_WIDTH = SCREEN_WIDTH;
const BASE_GROUND_HEIGHT = 80;

const GRAVITY = 0.6;
const JUMP_STRENGTH = -12;
const MAX_FALL_SPEED = 15;
const PIPE_SPEED = 4;
const PIPE_SPAWN_INTERVAL = 2800;
const GAP_SIZE = 200;
const PIPE_WIDTH = 70;

const BIRD_SIZE = 50;
const BIRD_X = GAME_WIDTH * 0.2;

const COIN_SIZE = 35;
const COIN_SPAWN_INTERVAL = 2500;

const POWERUP_SIZE = 40;
const POWERUP_SPAWN_INTERVAL = 12000;

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

interface FlappyGameProps {
  onExit?: () => void;
  onScoreSubmit?: (score: number) => void;
}

export function FlappyGame({ onExit, onScoreSubmit }: FlappyGameProps) {
  const insets = useSafeAreaInsets();
  
  const GROUND_HEIGHT = BASE_GROUND_HEIGHT + insets.bottom;
  const GAME_HEIGHT = SCREEN_HEIGHT;
  const PLAYABLE_HEIGHT = GAME_HEIGHT - GROUND_HEIGHT;
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [pipes, setPipes] = useState<Pipe[]>([]);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  
  const [shieldActive, setShieldActive] = useState(false);
  const [doublePointsActive, setDoublePointsActive] = useState(false);
  const [magnetActive, setMagnetActive] = useState(false);
  const [wingFrame, setWingFrame] = useState(0);
  
  const ROACHY_FRAMES = [
    ROACHY_SPRITE_1,
    ROACHY_SPRITE_2,
    ROACHY_SPRITE_3,
    ROACHY_SPRITE_2,
  ];
  const ROACHY_DEAD = ROACHY_SPRITE_DEAD;
  
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
  
  const pipesRef = useRef<Pipe[]>([]);
  const coinsRef = useRef<Coin[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const shieldRef = useRef(false);
  const doublePointsRef = useRef(false);
  const magnetRef = useRef(false);
  const scoreRef = useRef(0);
  const gameStateRef = useRef<GameState>("idle");
  
  const playableHeightRef = useRef(PLAYABLE_HEIGHT);
  playableHeightRef.current = PLAYABLE_HEIGHT;
  
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
    cancelAnimation(groundOffset);
  }, [groundOffset]);
  
  const stopGame = useCallback(() => {
    clearAllTimers();
    
    shieldRef.current = false;
    doublePointsRef.current = false;
    magnetRef.current = false;
    setShieldActive(false);
    setDoublePointsActive(false);
    setMagnetActive(false);
  }, [clearAllTimers]);
  
  const showGameOverScreen = useCallback(() => {
    gameStateRef.current = "gameover";
    setGameState("gameover");
    
    const finalScore = scoreRef.current;
    if (finalScore > highScore) {
      setHighScore(finalScore);
    }
    
    if (onScoreSubmit && finalScore > 0) {
      onScoreSubmit(finalScore);
    }
  }, [highScore, onScoreSubmit]);
  
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
    const maxHeight = playableHeightRef.current - GAP_SIZE - minHeight - 50;
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight)) + minHeight;
    
    const newPipe: Pipe = {
      id: pipeIdRef.current++,
      x: GAME_WIDTH,
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
      x: GAME_WIDTH,
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
      x: GAME_WIDTH,
      y,
      type,
      collected: false,
    };
    
    powerUpsRef.current = [...powerUpsRef.current, newPowerUp];
    setPowerUps([...powerUpsRef.current]);
  }, []);
  
  const activatePowerUp = useCallback((type: "shield" | "double" | "magnet") => {
    if (gameStateRef.current !== "playing") return;
    
    switch (type) {
      case "shield":
        if (shieldTimerRef.current) clearTimeout(shieldTimerRef.current);
        shieldRef.current = true;
        setShieldActive(true);
        shieldTimerRef.current = setTimeout(() => {
          if (gameStateRef.current === "playing") {
            shieldRef.current = false;
            setShieldActive(false);
          }
        }, 5000);
        break;
      case "double":
        if (doubleTimerRef.current) clearTimeout(doubleTimerRef.current);
        doublePointsRef.current = true;
        setDoublePointsActive(true);
        doubleTimerRef.current = setTimeout(() => {
          if (gameStateRef.current === "playing") {
            doublePointsRef.current = false;
            setDoublePointsActive(false);
          }
        }, 10000);
        break;
      case "magnet":
        if (magnetTimerRef.current) clearTimeout(magnetTimerRef.current);
        magnetRef.current = true;
        setMagnetActive(true);
        magnetTimerRef.current = setTimeout(() => {
          if (gameStateRef.current === "playing") {
            magnetRef.current = false;
            setMagnetActive(false);
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
    
    const targetRotation = Math.min(Math.max(birdVelocity.current * 4, -30), 90);
    birdRotation.value = withTiming(targetRotation, { duration: 100 });
    
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
        const dx = BIRD_X - coin.x;
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
    
    const birdLeft = BIRD_X - BIRD_SIZE / 2 + 10;
    const birdRight = BIRD_X + BIRD_SIZE / 2 - 10;
    const birdTop = birdY.value - BIRD_SIZE / 2 + 10;
    const birdBottom = birdY.value + BIRD_SIZE / 2 - 10;
    
    if (!shieldRef.current) {
      for (const pipe of pipesRef.current) {
        const pipeLeft = pipe.x;
        const pipeRight = pipe.x + PIPE_WIDTH;
        
        if (birdRight > pipeLeft && birdLeft < pipeRight) {
          if (birdTop < pipe.topHeight || birdBottom > pipe.topHeight + GAP_SIZE) {
            runOnJS(gameOver)();
            return;
          }
        }
      }
    }
    
    pipesRef.current = pipesRef.current.map((pipe) => {
      if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
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
    
    pipesRef.current = pipesRef.current.filter((pipe) => pipe.x > -PIPE_WIDTH);
    coinsRef.current = coinsRef.current.filter((coin) => !coin.collected && coin.x > -COIN_SIZE);
    powerUpsRef.current = powerUpsRef.current.filter((pu) => !pu.collected && pu.x > -POWERUP_SIZE);
    
    runOnJS(setPipes)([...pipesRef.current]);
    runOnJS(setCoins)([...coinsRef.current]);
    runOnJS(setPowerUps)([...powerUpsRef.current]);
    
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
    
    groundOffset.value = withRepeat(
      withTiming(-100, { duration: 1000, easing: Easing.linear }),
      -1,
      false
    );
    
    gameStateRef.current = "playing";
    setGameState("playing");
    
    pipeTimerRef.current = setInterval(spawnPipe, PIPE_SPAWN_INTERVAL);
    coinTimerRef.current = setInterval(spawnCoin, COIN_SPAWN_INTERVAL);
    powerUpTimerRef.current = setInterval(spawnPowerUp, POWERUP_SPAWN_INTERVAL);
    
    initialPipeTimerRef.current = setTimeout(() => {
      if (gameStateRef.current === "playing") {
        spawnPipe();
      }
    }, 1000);
    
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [birdY, birdRotation, groundOffset, spawnPipe, spawnCoin, spawnPowerUp, gameLoop, clearAllTimers]);
  
  const jump = useCallback(() => {
    if (gameState === "idle") {
      startGame();
      birdVelocity.current = JUMP_STRENGTH;
      playSound("jump");
    } else if (gameState === "playing") {
      birdVelocity.current = JUMP_STRENGTH;
      playSound("jump");
    } else if (gameState === "gameover") {
      startGame();
      birdVelocity.current = JUMP_STRENGTH;
      playSound("jump");
    }
  }, [gameState, startGame, playSound]);
  
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);
  
  useEffect(() => {
    if (gameState === "idle" || gameState === "playing") {
      wingAnimationRef.current = setInterval(() => {
        setWingFrame((prev) => (prev + 1) % 4);
      }, 100);
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
  
  const birdStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: birdY.value - BIRD_SIZE / 2 },
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
        
        {pipes.map((pipe) => (
          <React.Fragment key={pipe.id}>
            <View
              style={[
                styles.pipe,
                styles.pipeTop,
                { left: pipe.x, height: pipe.topHeight },
              ]}
            >
              <View style={styles.pipeCapTop} />
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
                },
              ]}
            >
              <View style={styles.pipeCapBottom} />
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
              pu.type === "shield" && styles.powerUpShield,
              pu.type === "double" && styles.powerUpDouble,
              pu.type === "magnet" && styles.powerUpMagnet,
              { left: pu.x - POWERUP_SIZE / 2, top: pu.y - POWERUP_SIZE / 2 },
            ]}
          >
            <Feather
              name={pu.type === "shield" ? "shield" : pu.type === "double" ? "x" : "disc"}
              size={20}
              color="#fff"
            />
          </View>
        ))}
        
        <Animated.View style={[styles.bird, birdStyle, { left: BIRD_X - BIRD_SIZE / 2 }]}>
          {shieldActive && <View style={styles.shieldAura} />}
          <Image
            source={
              gameState === "dying" || gameState === "gameover"
                ? ROACHY_DEAD
                : ROACHY_FRAMES[wingFrame]
            }
            style={styles.roachySprite}
            contentFit="contain"
          />
        </Animated.View>
        
        <View style={[styles.ground, { height: GROUND_HEIGHT }]}>
          <View style={styles.grassTop} />
          <Animated.View style={[styles.groundPattern, groundStyle]} />
        </View>
        
        <View style={[styles.scoreContainer, { top: insets.top + 20 }]}>
          <ThemedText style={styles.scoreText}>{score}</ThemedText>
        </View>
        
        {(shieldActive || doublePointsActive || magnetActive) && (
          <View style={[styles.powerUpIndicators, { top: insets.top + 70 }]}>
            {shieldActive && (
              <View style={[styles.indicator, styles.indicatorShield]}>
                <Feather name="shield" size={14} color="#fff" />
              </View>
            )}
            {doublePointsActive && (
              <View style={[styles.indicator, styles.indicatorDouble]}>
                <ThemedText style={styles.indicatorText}>x2</ThemedText>
              </View>
            )}
            {magnetActive && (
              <View style={[styles.indicator, styles.indicatorMagnet]}>
                <Feather name="disc" size={14} color="#fff" />
              </View>
            )}
          </View>
        )}
        
        {gameState === "idle" && (
          <View style={styles.overlay}>
            <View style={styles.startCard}>
              <ThemedText style={styles.title}>Flappy Roachy</ThemedText>
              <ThemedText style={styles.subtitle}>Tap to fly!</ThemedText>
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
    width: BIRD_SIZE,
    height: BIRD_SIZE,
    zIndex: 100,
  },
  roachySprite: {
    width: BIRD_SIZE + 20,
    height: BIRD_SIZE + 20,
    marginTop: -10,
    marginLeft: -10,
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
    width: PIPE_WIDTH,
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
    width: PIPE_WIDTH + 12,
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
    width: PIPE_WIDTH + 12,
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
    borderRadius: POWERUP_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 60,
    borderWidth: 3,
  },
  powerUpShield: {
    backgroundColor: "#3B82F6",
    borderColor: "#1D4ED8",
  },
  powerUpDouble: {
    backgroundColor: "#F59E0B",
    borderColor: "#B45309",
  },
  powerUpMagnet: {
    backgroundColor: "#EF4444",
    borderColor: "#B91C1C",
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
    width: GAME_WIDTH * 2,
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
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
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
});
