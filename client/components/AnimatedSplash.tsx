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
  withRepeat,
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

function SolanaLogo({ size = 20 }: { size?: number }) {
  const barHeight = size * 0.18;
  const barSpacing = size * 0.08;
  
  return (
    <View style={{ width: size, height: size, justifyContent: "center", alignItems: "center" }}>
      <LinearGradient
        colors={["#00FFA3", "#DC1FFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size * 0.9,
          height: barHeight,
          borderRadius: 2,
          marginBottom: barSpacing,
          transform: [{ skewX: "-15deg" }],
        }}
      />
      <LinearGradient
        colors={["#00FFA3", "#DC1FFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size * 0.9,
          height: barHeight,
          borderRadius: 2,
          marginBottom: barSpacing,
          transform: [{ skewX: "-15deg" }],
        }}
      />
      <LinearGradient
        colors={["#00FFA3", "#DC1FFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size * 0.9,
          height: barHeight,
          borderRadius: 2,
          transform: [{ skewX: "-15deg" }],
        }}
      />
    </View>
  );
}

export default function AnimatedSplash({ onAnimationComplete }: AnimatedSplashProps) {
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [animationComplete, setAnimationComplete] = useState(false);
  
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const logoRotate = useSharedValue(-10);
  const logoBounce = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(30);
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.8);
  const particleProgress = useSharedValue(0);
  const progressBarWidth = useSharedValue(0);
  const ringScale = useSharedValue(0.5);
  const ringOpacity = useSharedValue(0);
  const shimmerProgress = useSharedValue(0);

  useEffect(() => {
    let isMounted = true;
    
    async function preloadAssets() {
      const total = HOMEPAGE_ASSETS.length;
      let loaded = 0;
      
      const validAssets = HOMEPAGE_ASSETS.filter(Boolean);
      
      for (const assetModule of validAssets) {
        try {
          const asset = Asset.fromModule(assetModule);
          await asset.downloadAsync();
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
    logoOpacity.value = withTiming(1, { duration: 800 });
    logoScale.value = withSpring(1, { damping: 8, stiffness: 80 });
    logoRotate.value = withSpring(0, { damping: 12, stiffness: 100 });
    
    logoBounce.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
    
    glowOpacity.value = withSequence(
      withDelay(200, withTiming(1, { duration: 600 })),
      withTiming(0.6, { duration: 400 })
    );
    glowScale.value = withSequence(
      withDelay(200, withSpring(1.3, { damping: 10, stiffness: 60 })),
      withSpring(1.1, { damping: 15, stiffness: 80 })
    );
    
    ringOpacity.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1000 }),
          withTiming(0, { duration: 1000 })
        ),
        -1,
        false
      )
    );
    ringScale.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(0.6, { duration: 0 }),
          withTiming(1.8, { duration: 2000 })
        ),
        -1,
        false
      )
    );
    
    shimmerProgress.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );
    
    titleOpacity.value = withDelay(500, withTiming(1, { duration: 600 }));
    titleTranslateY.value = withDelay(500, withSpring(0, { damping: 15, stiffness: 80 }));
    
    particleProgress.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );

    const timer = setTimeout(() => {
      setAnimationComplete(true);
    }, 2500);

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
    transform: [
      { scale: logoScale.value },
      { rotate: `${logoRotate.value}deg` },
      { translateY: logoBounce.value },
    ],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(shimmerProgress.value, [0, 1], [-width, width]) },
    ],
  }));

  const particle1Style = useAnimatedStyle(() => ({
    opacity: interpolate(particleProgress.value, [0, 0.1, 0.7, 1], [0, 0.8, 0.8, 0]),
    transform: [
      { translateY: interpolate(particleProgress.value, [0, 1], [50, -300]) },
      { translateX: interpolate(particleProgress.value, [0, 1], [0, 60]) },
      { scale: interpolate(particleProgress.value, [0, 0.5, 1], [0.5, 1, 0.3]) },
    ],
  }));

  const particle2Style = useAnimatedStyle(() => ({
    opacity: interpolate(particleProgress.value, [0.1, 0.2, 0.8, 1], [0, 0.6, 0.6, 0]),
    transform: [
      { translateY: interpolate(particleProgress.value, [0, 1], [80, -250]) },
      { translateX: interpolate(particleProgress.value, [0, 1], [0, -80]) },
      { scale: interpolate(particleProgress.value, [0, 0.5, 1], [0.3, 1.2, 0.2]) },
    ],
  }));

  const particle3Style = useAnimatedStyle(() => ({
    opacity: interpolate(particleProgress.value, [0.2, 0.3, 0.85, 1], [0, 0.9, 0.9, 0]),
    transform: [
      { translateY: interpolate(particleProgress.value, [0, 1], [60, -280]) },
      { translateX: interpolate(particleProgress.value, [0, 1], [0, 100]) },
      { scale: interpolate(particleProgress.value, [0, 0.5, 1], [0.4, 1, 0.4]) },
    ],
  }));

  const particle4Style = useAnimatedStyle(() => ({
    opacity: interpolate(particleProgress.value, [0.15, 0.25, 0.75, 1], [0, 0.7, 0.7, 0]),
    transform: [
      { translateY: interpolate(particleProgress.value, [0, 1], [70, -320]) },
      { translateX: interpolate(particleProgress.value, [0, 1], [0, -50]) },
      { scale: interpolate(particleProgress.value, [0, 0.5, 1], [0.6, 1.1, 0.3]) },
    ],
  }));

  const particle5Style = useAnimatedStyle(() => ({
    opacity: interpolate(particleProgress.value, [0.3, 0.4, 0.9, 1], [0, 0.5, 0.5, 0]),
    transform: [
      { translateY: interpolate(particleProgress.value, [0, 1], [90, -260]) },
      { translateX: interpolate(particleProgress.value, [0, 1], [0, 40]) },
      { scale: interpolate(particleProgress.value, [0, 0.5, 1], [0.3, 0.8, 0.2]) },
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

      <Animated.View style={[styles.backgroundGlow1, glowAnimatedStyle]}>
        <LinearGradient
          colors={["transparent", "rgba(245, 158, 11, 0.2)", "rgba(217, 119, 6, 0.15)", "transparent"]}
          style={styles.radialGlow}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>

      <Animated.View style={[styles.backgroundGlow2, glowAnimatedStyle]}>
        <LinearGradient
          colors={["transparent", "rgba(234, 88, 12, 0.1)", "transparent"]}
          style={styles.horizontalGlow}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
        />
      </Animated.View>

      <Animated.View style={[styles.shimmerOverlay, shimmerStyle]}>
        <LinearGradient
          colors={["transparent", "rgba(255, 255, 255, 0.05)", "transparent"]}
          style={styles.shimmer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </Animated.View>

      <Animated.View style={[styles.particle, styles.particle1, particle1Style]} />
      <Animated.View style={[styles.particle, styles.particle2, particle2Style]} />
      <Animated.View style={[styles.particle, styles.particle3, particle3Style]} />
      <Animated.View style={[styles.particle, styles.particle4, particle4Style]} />
      <Animated.View style={[styles.particle, styles.particle5, particle5Style]} />

      <View style={styles.content}>
        <View style={styles.logoWrapper}>
          <Animated.View style={[styles.pulseRing, ringAnimatedStyle]} />
          <Animated.View style={[styles.pulseRing2, ringAnimatedStyle]} />
          
          <Animated.View style={[styles.logoGlowOuter, glowAnimatedStyle]} />
          
          <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
            <View style={styles.logoGlow} />
            <View style={styles.logoInnerGlow} />
            <Image
              source={require("../../assets/images/roachy-logo.png")}
              style={styles.logo}
              contentFit="contain"
            />
          </Animated.View>
        </View>

        <Animated.Text style={[styles.title, titleAnimatedStyle]}>
          Roachy Games
        </Animated.Text>

        <Animated.Text style={[styles.subtitle, titleAnimatedStyle]}>
          Play. Earn. Collect.
        </Animated.Text>
        
        <Animated.View style={[styles.progressContainer, titleAnimatedStyle]}>
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, progressStyle]}>
              <LinearGradient
                colors={[GameColors.gold, GameColors.primary]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </Animated.View>
          </View>
          <Animated.Text style={styles.progressText}>
            {assetsLoaded ? "Ready!" : `Loading ${Math.round(loadProgress)}%`}
          </Animated.Text>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <Animated.View style={[styles.poweredBy, titleAnimatedStyle]}>
          <SolanaLogo size={22} />
          <Animated.Text style={styles.poweredByText}>
            Powered by
          </Animated.Text>
          <Animated.Text style={styles.solanaText}>
            Solana
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
    overflow: "hidden",
  },
  backgroundGlow1: {
    position: "absolute",
    top: height * 0.2,
    left: -width * 0.25,
    right: -width * 0.25,
    height: height * 0.5,
  },
  radialGlow: {
    flex: 1,
    borderRadius: width,
  },
  backgroundGlow2: {
    position: "absolute",
    top: height * 0.35,
    left: 0,
    right: 0,
    height: height * 0.3,
  },
  horizontalGlow: {
    flex: 1,
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  shimmer: {
    width: width * 0.5,
    height: "100%",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 60,
  },
  logoWrapper: {
    width: 220,
    height: 220,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  pulseRing: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: "rgba(245, 158, 11, 0.4)",
  },
  pulseRing2: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
  },
  logoGlowOuter: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
  },
  logoContainer: {
    width: 160,
    height: 160,
    justifyContent: "center",
    alignItems: "center",
  },
  logoGlow: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(245, 158, 11, 0.2)",
  },
  logoInnerGlow: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(251, 191, 36, 0.1)",
  },
  logo: {
    width: 140,
    height: 140,
  },
  title: {
    fontSize: 38,
    fontWeight: "800",
    color: GameColors.primary,
    letterSpacing: 1,
    textShadowColor: "rgba(245, 158, 11, 0.6)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 15,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.textSecondary,
    letterSpacing: 4,
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
    borderRadius: 3,
    overflow: "hidden",
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
  poweredByText: {
    fontSize: 13,
    color: "rgba(212, 165, 116, 0.7)",
    letterSpacing: 1,
    marginLeft: 4,
  },
  solanaText: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(212, 165, 116, 0.9)",
    letterSpacing: 1,
  },
  particle: {
    position: "absolute",
    borderRadius: 50,
  },
  particle1: {
    width: 8,
    height: 8,
    left: width * 0.25,
    top: height * 0.55,
    backgroundColor: GameColors.gold,
  },
  particle2: {
    width: 6,
    height: 6,
    left: width * 0.75,
    top: height * 0.6,
    backgroundColor: GameColors.primary,
  },
  particle3: {
    width: 10,
    height: 10,
    left: width * 0.4,
    top: height * 0.65,
    backgroundColor: "rgba(251, 191, 36, 0.8)",
  },
  particle4: {
    width: 5,
    height: 5,
    left: width * 0.6,
    top: height * 0.58,
    backgroundColor: GameColors.gold,
  },
  particle5: {
    width: 7,
    height: 7,
    left: width * 0.35,
    top: height * 0.7,
    backgroundColor: "rgba(245, 158, 11, 0.6)",
  },
});
