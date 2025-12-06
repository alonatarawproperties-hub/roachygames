import React from "react";
import { View, StyleSheet, Pressable, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { GameEntry } from "@/constants/gamesCatalog";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TILE_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md) / 2;

interface GameTileProps {
  game: GameEntry;
  onPress: () => void;
  featured?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const CATEGORY_COLORS: Record<string, string> = {
  hunt: "#22C55E",
  battle: "#EF4444",
  puzzle: "#8B5CF6",
  adventure: "#06B6D4",
};

export function GameTile({ game, onPress, featured = false }: GameTileProps) {
  const scale = useSharedValue(1);
  const categoryColor = CATEGORY_COLORS[game.category] || GameColors.primary;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const handlePress = () => {
    if (game.isLocked) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    }
  };

  if (featured) {
    return (
      <AnimatedPressable
        style={[styles.featuredTile, animatedStyle]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
      >
        <View style={[styles.featuredGlow, { backgroundColor: categoryColor }]} />
        
        <View style={styles.featuredContent}>
          <View style={styles.featuredIconContainer}>
            <View style={[styles.featuredIcon, { backgroundColor: categoryColor }]}>
              <Feather name={game.iconName as any} size={32} color="#fff" />
            </View>
            {!game.isLocked && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <ThemedText style={styles.liveText}>LIVE</ThemedText>
              </View>
            )}
          </View>

          <View style={styles.featuredInfo}>
            <ThemedText style={styles.featuredTitle}>{game.title}</ThemedText>
            <ThemedText style={styles.featuredTagline}>{game.tagline}</ThemedText>
            <ThemedText style={styles.featuredDescription} numberOfLines={2}>
              {game.description}
            </ThemedText>

            <View style={styles.featuredMeta}>
              <View style={styles.metaItem}>
                <Feather name="users" size={14} color={GameColors.textSecondary} />
                <ThemedText style={styles.metaText}>{game.playerCount}</ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.playButtonContainer}>
            <View style={[styles.playButton, { backgroundColor: categoryColor }]}>
              <Feather name="play" size={24} color="#fff" />
            </View>
          </View>
        </View>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      style={[styles.tile, animatedStyle, game.isLocked && styles.tileLocked]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <View style={[styles.tileGlow, { backgroundColor: categoryColor }]} />
      
      <View style={[styles.iconContainer, { backgroundColor: categoryColor + "20" }]}>
        <Feather
          name={game.iconName as any}
          size={28}
          color={game.isLocked ? GameColors.textSecondary : categoryColor}
        />
        {game.isLocked && (
          <View style={styles.lockOverlay}>
            <Feather name="lock" size={16} color={GameColors.textSecondary} />
          </View>
        )}
      </View>

      <ThemedText
        style={[styles.tileTitle, game.isLocked && styles.tileTitleLocked]}
      >
        {game.title}
      </ThemedText>
      <ThemedText style={styles.tileTagline}>{game.tagline}</ThemedText>

      {game.isComingSoon && (
        <View style={styles.comingSoonBadge}>
          <ThemedText style={styles.comingSoonText}>COMING SOON</ThemedText>
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: TILE_WIDTH,
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    overflow: "hidden",
  },
  tileLocked: {
    opacity: 0.6,
  },
  tileGlow: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: BorderRadius.lg,
    borderBottomLeftRadius: BorderRadius.lg,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  lockOverlay: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: GameColors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  tileTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: GameColors.textPrimary,
    marginBottom: 2,
  },
  tileTitleLocked: {
    color: GameColors.textSecondary,
  },
  tileTagline: {
    fontSize: 12,
    color: GameColors.textSecondary,
  },
  comingSoonBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: GameColors.primary + "30",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  comingSoonText: {
    fontSize: 8,
    fontWeight: "700",
    color: GameColors.primary,
  },
  featuredTile: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: GameColors.surfaceLight,
  },
  featuredGlow: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
  },
  featuredContent: {
    flexDirection: "row",
    padding: Spacing.lg,
    alignItems: "center",
  },
  featuredIconContainer: {
    marginRight: Spacing.md,
  },
  featuredIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.success + "20",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: Spacing.xs,
    alignSelf: "center",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GameColors.success,
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: "700",
    color: GameColors.success,
  },
  featuredInfo: {
    flex: 1,
  },
  featuredTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: GameColors.textPrimary,
  },
  featuredTagline: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.primary,
    marginBottom: Spacing.xs,
  },
  featuredDescription: {
    fontSize: 12,
    color: GameColors.textSecondary,
    lineHeight: 18,
  },
  featuredMeta: {
    flexDirection: "row",
    marginTop: Spacing.sm,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: GameColors.textSecondary,
  },
  playButtonContainer: {
    marginLeft: Spacing.md,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
});
