import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Alert,
  Pressable,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  withSequence,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const GoogleLogo = ({ size = 24 }: { size?: number }) => (
  <Image
    source={{ uri: "https://www.google.com/favicon.ico" }}
    style={{ width: size, height: size }}
    contentFit="contain"
  />
);

function AnimatedMascot() {
  const bobY = useSharedValue(0);
  const rotation = useSharedValue(-3);
  const glowOpacity = useSharedValue(0.4);
  const [wingFrame, setWingFrame] = useState(0);

  useEffect(() => {
    bobY.value = withRepeat(
      withTiming(10, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    rotation.value = withRepeat(
      withTiming(3, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    glowOpacity.value = withRepeat(
      withTiming(0.8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    const wingInterval = setInterval(() => {
      setWingFrame((prev) => (prev + 1) % 2);
    }, 150);

    return () => clearInterval(wingInterval);
  }, [bobY, rotation, glowOpacity]);

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bobY.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={mascotStyles.container}>
      <Animated.View style={[mascotStyles.glowRing, glowStyle]} />
      <Animated.View style={[mascotStyles.mascotWrapper, mascotStyle]}>
        <Image
          source={require("../../assets/roachy-logo.png")}
          style={mascotStyles.mascot}
          contentFit="contain"
        />
      </Animated.View>
    </View>
  );
}

const mascotStyles = StyleSheet.create({
  container: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  glowRing: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: GameColors.gold,
    shadowColor: GameColors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 30,
  },
  mascotWrapper: {
    width: 120,
    height: 120,
  },
  mascot: {
    width: 120,
    height: 120,
    borderRadius: 30,
  },
});

function GlassCard({ children }: { children: React.ReactNode }) {
  const glowPulse = useSharedValue(0.2);

  useEffect(() => {
    glowPulse.value = withRepeat(
      withTiming(0.4, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [glowPulse]);

  const borderGlowStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(255, 215, 0, ${glowPulse.value})`,
  }));

  return (
    <Animated.View style={[glassStyles.container, borderGlowStyle]}>
      {Platform.OS === "ios" ? (
        <BlurView intensity={40} tint="dark" style={glassStyles.blur}>
          <View style={glassStyles.content}>{children}</View>
        </BlurView>
      ) : (
        <View style={[glassStyles.blur, glassStyles.androidFallback]}>
          <View style={glassStyles.content}>{children}</View>
        </View>
      )}
    </Animated.View>
  );
}

const glassStyles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255, 215, 0, 0.3)",
    shadowColor: GameColors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  blur: {
    overflow: "hidden",
  },
  androidFallback: {
    backgroundColor: "rgba(26, 15, 8, 0.95)",
  },
  content: {
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
});

function PrimaryButton({
  onPress,
  disabled,
  loading,
  icon,
  children,
}: {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);
  const glowIntensity = useSharedValue(0.5);

  useEffect(() => {
    glowIntensity.value = withRepeat(
      withTiming(0.8, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [glowIntensity]);

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowIntensity.value,
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[primaryButtonStyles.container, animatedStyle, glowStyle, disabled && primaryButtonStyles.disabled]}
    >
      <LinearGradient
        colors={["#FFFFFF", "#F5F5F5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={primaryButtonStyles.gradient}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#333333" />
        ) : (
          icon
        )}
        <ThemedText style={primaryButtonStyles.text}>{children}</ThemedText>
      </LinearGradient>
    </AnimatedPressable>
  );
}

const primaryButtonStyles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    minHeight: 56,
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: Spacing.xl,
    gap: 12,
    minHeight: 56,
  },
  text: {
    color: "#1A1A1A",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  disabled: {
    opacity: 0.5,
  },
});

function SecondaryButton({
  onPress,
  disabled,
  icon,
  children,
}: {
  onPress: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[secondaryButtonStyles.container, animatedStyle, disabled && secondaryButtonStyles.disabled]}
    >
      {icon}
      <ThemedText style={secondaryButtonStyles.text}>{children}</ThemedText>
    </AnimatedPressable>
  );
}

const secondaryButtonStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    gap: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: "rgba(212, 165, 116, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    minHeight: 48,
  },
  text: {
    color: GameColors.textSecondary,
    fontSize: 15,
    fontWeight: "500",
  },
  disabled: {
    opacity: 0.5,
  },
});

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  const pulseOpacity = useSharedValue(0.6);

  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [pulseOpacity]);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  return (
    <View style={featureStyles.item}>
      <Animated.View style={[featureStyles.iconContainer, iconStyle]}>
        <Feather name={icon as any} size={22} color={GameColors.gold} />
      </Animated.View>
      <ThemedText style={featureStyles.text}>{text}</ThemedText>
    </View>
  );
}

const featureStyles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: GameColors.textSecondary,
    fontSize: 15,
    fontWeight: "500",
  },
});

function AnimatedBackground() {
  const gradientPosition = useSharedValue(0);

  useEffect(() => {
    gradientPosition.value = withRepeat(
      withTiming(1, { duration: 8000, easing: Easing.linear }),
      -1,
      true
    );
  }, [gradientPosition]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={["#0D0806", "#1A0F08", "#120A05", "#0A0604", "#050302"]}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={bgStyles.particleContainer}>
        {Array.from({ length: 12 }).map((_, i) => (
          <Particle key={i} index={i} />
        ))}
      </View>
    </View>
  );
}

function Particle({ index }: { index: number }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    const delay = index * 400;
    const duration = 4000 + Math.random() * 3000;

    setTimeout(() => {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.3 + Math.random() * 0.3, { duration: duration / 2 }),
          withTiming(0, { duration: duration / 2 })
        ),
        -1,
        false
      );

      translateY.value = withRepeat(
        withTiming(-100 - Math.random() * 100, { duration, easing: Easing.linear }),
        -1,
        false
      );

      translateX.value = withRepeat(
        withSequence(
          withTiming(10 + Math.random() * 20, { duration: duration / 2 }),
          withTiming(-10 - Math.random() * 20, { duration: duration / 2 })
        ),
        -1,
        true
      );
    }, delay);
  }, [index, opacity, translateY, translateX]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
    ],
  }));

  const left = 10 + (index % 6) * 15 + Math.random() * 10;
  const size = 2 + Math.random() * 3;

  return (
    <Animated.View
      style={[
        bgStyles.particle,
        style,
        {
          left: `${left}%`,
          bottom: -20,
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    />
  );
}

const bgStyles = StyleSheet.create({
  particleContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  particle: {
    position: "absolute",
    backgroundColor: GameColors.gold,
    shadowColor: GameColors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
});

export function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { continueAsGuest, loginWithGoogle, isLoading } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleAuth = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsGoogleLoading(true);
    try {
      const result = await loginWithGoogle();
      if (!result.success) {
        if (result.error !== "Sign-in cancelled") {
          Alert.alert("Sign-in Failed", result.error || "Google sign-in failed. Please try again.");
        }
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGuestMode = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsSubmitting(true);
    try {
      const result = await continueAsGuest();
      if (!result.success) {
        Alert.alert("Error", result.error || "Failed to continue as guest");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = isSubmitting || isLoading;

  return (
    <ThemedView style={styles.container}>
      <AnimatedBackground />

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + Spacing["2xl"],
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={styles.heroSection}>
          <AnimatedMascot />
          <View style={styles.titleContainer}>
            <ThemedText style={styles.title}>Roachy Games</ThemedText>
            <ThemedText style={styles.tagline}>Play Games, Earn Rewards</ThemedText>
          </View>
        </View>

        <View style={styles.authSection}>
          <GlassCard>
            <PrimaryButton
              onPress={handleGoogleAuth}
              disabled={isDisabled}
              loading={isGoogleLoading}
              icon={<GoogleLogo size={24} />}
            >
              {isGoogleLoading ? "Signing in..." : "Continue with Google"}
            </PrimaryButton>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <ThemedText style={styles.dividerText}>or</ThemedText>
              <View style={styles.dividerLine} />
            </View>

            <SecondaryButton
              onPress={handleGuestMode}
              disabled={isDisabled}
              icon={<Feather name="user" size={20} color={GameColors.textSecondary} />}
            >
              Continue as Guest
            </SecondaryButton>
          </GlassCard>
        </View>

        <View style={styles.featuresSection}>
          <FeatureItem icon="play-circle" text="Play Free Games" />
          <FeatureItem icon="award" text="Earn Chy Coins" />
          <FeatureItem icon="gift" text="Claim Rewards on Web" />
        </View>

        <ThemedText style={styles.disclaimer}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: "space-between",
  },
  heroSection: {
    alignItems: "center",
    gap: Spacing.lg,
    marginTop: Spacing.xl,
  },
  titleContainer: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
    textShadowColor: "rgba(255, 215, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  tagline: {
    fontSize: 17,
    color: GameColors.gold,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  authSection: {
    marginVertical: Spacing.xl,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  dividerText: {
    color: "rgba(255, 255, 255, 0.4)",
    paddingHorizontal: Spacing.md,
    fontSize: 13,
    fontWeight: "500",
  },
  featuresSection: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  disclaimer: {
    textAlign: "center",
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.35)",
    lineHeight: 18,
    paddingHorizontal: Spacing.lg,
  },
});
