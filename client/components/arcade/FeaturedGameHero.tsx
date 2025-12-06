import React from "react";
import { View, StyleSheet, Pressable, ImageBackground } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { GameEntry } from "@/constants/gamesCatalog";

interface FeaturedGameHeroProps {
  game: GameEntry;
  onPress: () => void;
  viewerCount?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FeaturedGameHero({
  game,
  onPress,
  viewerCount = "27.5k",
}: FeaturedGameHeroProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <AnimatedPressable
      style={[styles.container, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <View style={styles.heroBackground}>
        <LinearGradient
          colors={["#2a1810", "#1a0f08", "#120a05"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        <View style={styles.heroIconContainer}>
          <View style={styles.heroIcon}>
            <Feather name={game.iconName as any} size={48} color={GameColors.primary} />
          </View>
        </View>

        <View style={styles.viewerBadge}>
          <Feather name="eye" size={12} color={GameColors.textPrimary} />
          <ThemedText style={styles.viewerText}>{viewerCount}</ThemedText>
        </View>
      </View>

      <View style={styles.controlsBar}>
        <View style={styles.mediaControls}>
          <Pressable style={styles.controlButton}>
            <Feather name="rotate-ccw" size={16} color={GameColors.textSecondary} />
          </Pressable>
          <Pressable style={styles.playButton}>
            <Feather name="play" size={18} color={GameColors.background} />
          </Pressable>
          <Pressable style={styles.controlButton}>
            <Feather name="volume-2" size={16} color={GameColors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.timeContainer}>
          <ThemedText style={styles.timeText}>02 : 05 : 87</ThemedText>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  heroBackground: {
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  heroIconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: GameColors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: GameColors.primary + "40",
  },
  viewerBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.background + "CC",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  viewerText: {
    fontSize: 11,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  controlsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: GameColors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  mediaControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: GameColors.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: GameColors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  timeContainer: {
    backgroundColor: GameColors.surfaceLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "600",
    color: GameColors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
});
