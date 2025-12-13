import React, { useState, useRef } from "react";
import { View, StyleSheet, Dimensions, Pressable, Animated } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface OnboardingStep {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  highlight?: string;
}

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip?: () => void;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    icon: "zap",
    title: "Welcome to Roachy Games",
    description: "The ultimate arcade where you hunt, collect, and earn rewards with your Roachies.",
    highlight: "Adventure Gaming",
  },
  {
    id: "hunt",
    icon: "map-pin",
    title: "Hunt Roachies",
    description: "Explore the real world using GPS to find and catch rare Roachies. The rarer they are, the more you earn!",
    highlight: "GPS-Based Hunting",
  },
  {
    id: "collect",
    icon: "archive",
    title: "Build Your Collection",
    description: "Collect all 12 unique Roachies across 4 classes: Tank, Assassin, Mage, and Support.",
    highlight: "12 Unique Creatures",
  },
  {
    id: "earn",
    icon: "dollar-sign",
    title: "Earn Chy Coins",
    description: "Catch Roachies, complete daily challenges, and climb the leaderboard to earn Chy Coins.",
    highlight: "In-Game Rewards",
  },
];

export function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
      
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
      }, 150);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
      
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
      }, 150);
    }
  };

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <LinearGradient
      colors={[GameColors.background, "#1a0f08", GameColors.background]}
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <View style={styles.header}>
        {onSkip ? (
          <Pressable style={styles.skipButton} onPress={onSkip}>
            <ThemedText style={styles.skipText}>Skip</ThemedText>
          </Pressable>
        ) : (
          <View style={styles.skipButton} />
        )}
        <View style={styles.progressDots}>
          {ONBOARDING_STEPS.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentStep && styles.dotActive,
                index < currentStep && styles.dotCompleted,
              ]}
            />
          ))}
        </View>
        <View style={styles.skipButton} />
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.iconContainer}>
          <View style={styles.iconGlow} />
          <View style={styles.iconCircle}>
            <Feather name={step.icon} size={48} color={GameColors.gold} />
          </View>
        </View>

        {step.highlight ? (
          <View style={styles.highlightBadge}>
            <ThemedText style={styles.highlightText}>{step.highlight}</ThemedText>
          </View>
        ) : null}

        <ThemedText style={styles.title}>{step.title}</ThemedText>
        <ThemedText style={styles.description}>{step.description}</ThemedText>
      </Animated.View>

      <View style={styles.footer}>
        {currentStep > 0 ? (
          <Pressable style={styles.backButton} onPress={handleBack}>
            <Feather name="arrow-left" size={20} color={GameColors.textSecondary} />
          </Pressable>
        ) : (
          <View style={styles.backButton} />
        )}

        <Pressable style={styles.nextButton} onPress={handleNext}>
          <LinearGradient
            colors={[GameColors.gold, "#D97706"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextButtonGradient}
          >
            <ThemedText style={styles.nextButtonText}>
              {isLastStep ? "Get Started" : "Next"}
            </ThemedText>
            <Feather 
              name={isLastStep ? "check" : "arrow-right"} 
              size={18} 
              color="#000" 
            />
          </LinearGradient>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  skipButton: {
    width: 60,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.textSecondary,
  },
  progressDots: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GameColors.surfaceGlow,
  },
  dotActive: {
    width: 24,
    backgroundColor: GameColors.gold,
  },
  dotCompleted: {
    backgroundColor: GameColors.gold + "60",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  iconContainer: {
    marginBottom: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  iconGlow: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: GameColors.gold + "15",
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: GameColors.gold + "20",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: GameColors.gold + "40",
  },
  highlightBadge: {
    backgroundColor: GameColors.gold + "20",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
  },
  highlightText: {
    fontSize: 12,
    fontWeight: "700",
    color: GameColors.gold,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: GameColors.textPrimary,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: GameColors.textSecondary,
    textAlign: "center",
    maxWidth: SCREEN_WIDTH * 0.85,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: GameColors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  nextButton: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  nextButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
});
