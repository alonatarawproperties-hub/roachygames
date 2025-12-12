import React from "react";
import { View, StyleSheet, Pressable, Platform, Image } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius, GlowStyles } from "@/constants/theme";
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
  const glowOpacity = useSharedValue(0.4);

  React.useEffect(() => {
    glowOpacity.value = withRepeat(
      withTiming(0.8, { duration: 2000 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
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
      <Animated.View style={[styles.glowBorder, glowStyle]} />
      
      <View style={styles.heroBackground}>
        <LinearGradient
          colors={["#3D2418", "#2D1810", "#1A0F08"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        <View style={styles.heroIconContainer}>
          <View style={styles.heroIcon}>
            {game.coverImage ? (
              <Image
                source={game.coverImage}
                style={styles.heroImage}
                resizeMode="cover"
              />
            ) : (
              <Feather name={game.iconName as any} size={48} color={GameColors.gold} />
            )}
          </View>
        </View>

        <View style={styles.viewerBadge}>
          <Feather name="eye" size={12} color={GameColors.gold} />
          <ThemedText style={styles.viewerText}>{viewerCount}</ThemedText>
        </View>

        <View style={styles.liveBadge}>
          <View style={styles.liveIndicator} />
          <ThemedText style={styles.liveText}>LIVE</ThemedText>
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
    position: "relative",
    borderWidth: 2,
    borderColor: GameColors.primary + "60",
  },
  glowBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: GameColors.gold,
    ...(Platform.OS === "ios" ? GlowStyles.standard : {}),
  },
  heroBackground: {
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  heroIconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  heroIcon: {
    width: 90,
    height: 90,
    borderRadius: 22,
    backgroundColor: GameColors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: GameColors.gold + "60",
    overflow: "hidden",
    ...(Platform.OS === "ios" ? GlowStyles.subtle : {}),
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  viewerBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.background + "E6",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
    borderWidth: 1,
    borderColor: GameColors.gold + "40",
  },
  viewerText: {
    fontSize: 11,
    fontWeight: "700",
    color: GameColors.gold,
  },
  liveBadge: {
    position: "absolute",
    top: Spacing.sm,
    left: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.error + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
    borderWidth: 1,
    borderColor: GameColors.error + "60",
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GameColors.error,
  },
  liveText: {
    fontSize: 10,
    fontWeight: "700",
    color: GameColors.error,
  },
  controlsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: GameColors.surfaceElevated,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: GameColors.gold + "20",
  },
  mediaControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: GameColors.surfaceGlow,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: GameColors.textTertiary + "40",
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GameColors.primary,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: GameColors.primary,
        shadowOpacity: 0.6,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
      },
      android: { elevation: 8 },
      web: {
        boxShadow: `0 0 16px rgba(255, 149, 0, 0.6)`,
      },
    }),
  },
  timeContainer: {
    backgroundColor: GameColors.surfaceGlow,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: GameColors.gold + "30",
  },
  timeText: {
    fontSize: 13,
    fontWeight: "700",
    color: GameColors.gold,
    fontVariant: ["tabular-nums"],
  },
});
