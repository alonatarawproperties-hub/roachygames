import React, { useEffect, useState } from "react";
import { View, StyleSheet, Dimensions, Platform } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Asset } from "expo-asset";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { GameColors } from "@/constants/theme";
import { GAMES_CATALOG } from "@/constants/gamesCatalog";

const { width, height } = Dimensions.get("window");

const roachyLogo = require("../../assets/images/roachy-logo.png");
const appIcon = require("../../assets/images/icon.png");

const HOMEPAGE_ASSETS = [
  roachyLogo,
  appIcon,
  ...GAMES_CATALOG.filter((g) => g.coverImage).map((g) => g.coverImage),
];

interface AnimatedSplashProps {
  onAnimationComplete: () => void;
}

export default function AnimatedSplash({ onAnimationComplete }: AnimatedSplashProps) {
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [animationComplete, setAnimationComplete] = useState(false);
  
  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(30);
  const glowOpacity = useSharedValue(0);
  const particleProgress = useSharedValue(0);
  const progressBarWidth = useSharedValue(0);

  useEffect(() => {
    let isMounted = true;
    
    async function preloadAssets() {
      const total = HOMEPAGE_ASSETS.length;
      let loaded = 0;
      
      for (const assetModule of HOMEPAGE_ASSETS) {
        try {
          const asset = Asset.fromModule(assetModule);
          await asset.downloadAsync();
          if (asset.localUri) {
            await Image.prefetch(asset.localUri);
          }
        } catch (e) {
        }
        loaded++;
        if (isMounted) {
          const progress = (loaded / total) * 100;
          setLoadProgress(progress);
          progressBarWidth.value = withTiming(progress, { duration: 150 });
        }
      }
      
      if (isMounted) {
        setAssetsLoaded(true);
      }
    }
    
    preloadAssets();
    
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 600 });
    logoScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    
    glowOpacity.value = withSequence(
      withDelay(300, withTiming(0.8, { duration: 800 })),
      withTiming(0.4, { duration: 1000 })
    );
    
    titleOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    titleTranslateY.value = withDelay(400, withSpring(0, { damping: 15, stiffness: 80 }));
    
    particleProgress.value = withTiming(1, { duration: 2000, easing: Easing.linear });

    const timer = setTimeout(() => {
      setAnimationComplete(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (assetsLoaded && animationComplete) {
      const exitDelay = setTimeout(() => {
        onAnimationComplete();
      }, 300);
      return () => clearTimeout(exitDelay);
    }
  }, [assetsLoaded, animationComplete, onAnimationComplete]);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const particle1Style = useAnimatedStyle(() => ({
    opacity: interpolate(particleProgress.value, [0, 0.2, 0.8, 1], [0, 0.6, 0.6, 0]),
    transform: [
      { translateY: interpolate(particleProgress.value, [0, 1], [100, -200]) },
      { translateX: interpolate(particleProgress.value, [0, 1], [0, 30]) },
    ],
  }));

  const particle2Style = useAnimatedStyle(() => ({
    opacity: interpolate(particleProgress.value, [0.1, 0.3, 0.9, 1], [0, 0.5, 0.5, 0]),
    transform: [
      { translateY: interpolate(particleProgress.value, [0, 1], [150, -150]) },
      { translateX: interpolate(particleProgress.value, [0, 1], [0, -40]) },
    ],
  }));

  const particle3Style = useAnimatedStyle(() => ({
    opacity: interpolate(particleProgress.value, [0.2, 0.4, 0.85, 1], [0, 0.7, 0.7, 0]),
    transform: [
      { translateY: interpolate(particleProgress.value, [0, 1], [120, -180]) },
      { translateX: interpolate(particleProgress.value, [0, 1], [0, 50]) },
    ],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressBarWidth.value}%`,
  }));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1a0f08", "#120a05", "#0a0503"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <Animated.View style={[styles.glowContainer, glowAnimatedStyle]}>
        <LinearGradient
          colors={["transparent", "rgba(245, 158, 11, 0.15)", "transparent"]}
          style={styles.glow}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>

      <Animated.View style={[styles.particle, styles.particle1, particle1Style]} />
      <Animated.View style={[styles.particle, styles.particle2, particle2Style]} />
      <Animated.View style={[styles.particle, styles.particle3, particle3Style]} />

      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <View style={styles.logoGlow} />
          <Image
            source={require("../../assets/images/roachy-logo.png")}
            style={styles.logo}
            contentFit="contain"
          />
        </Animated.View>

        <Animated.Text style={[styles.title, titleAnimatedStyle]}>
          Roachy Games
        </Animated.Text>

        <Animated.Text style={[styles.subtitle, titleAnimatedStyle]}>
          Play. Earn. Collect.
        </Animated.Text>
        
        <Animated.View style={[styles.progressContainer, titleAnimatedStyle]}>
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, progressStyle]} />
          </View>
          <Animated.Text style={styles.progressText}>
            {assetsLoaded ? "Ready!" : `Loading ${Math.round(loadProgress)}%`}
          </Animated.Text>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <Animated.View style={[styles.poweredBy, titleAnimatedStyle]}>
          <View style={styles.solanaIndicator} />
          <Animated.Text style={styles.poweredByText}>
            Powered by Solana
          </Animated.Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
  },
  glowContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  glow: {
    width: width * 1.5,
    height: height * 0.6,
    borderRadius: width,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 60,
  },
  logoContainer: {
    width: 160,
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  logoGlow: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
  },
  logo: {
    width: 140,
    height: 140,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: GameColors.primary,
    letterSpacing: 1,
    textShadowColor: "rgba(245, 158, 11, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "500",
    color: GameColors.textSecondary,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 32,
  },
  progressContainer: {
    width: "60%",
    alignItems: "center",
    marginTop: 16,
  },
  progressBar: {
    width: "100%",
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: GameColors.gold,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: GameColors.textSecondary,
    marginTop: 8,
    letterSpacing: 1,
  },
  footer: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  poweredBy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  solanaIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#14F195",
  },
  poweredByText: {
    fontSize: 12,
    color: "rgba(212, 165, 116, 0.6)",
    letterSpacing: 1,
  },
  particle: {
    position: "absolute",
    borderRadius: 50,
    backgroundColor: GameColors.primary,
  },
  particle1: {
    width: 6,
    height: 6,
    left: width * 0.3,
    top: height * 0.6,
  },
  particle2: {
    width: 4,
    height: 4,
    left: width * 0.7,
    top: height * 0.65,
  },
  particle3: {
    width: 5,
    height: 5,
    left: width * 0.5,
    top: height * 0.7,
  },
});
