import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
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

interface GameListItemProps {
  game: GameEntry;
  onPress: () => void;
  playTime?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  hunt: { bg: "#22C55E30", text: "#22C55E" },
  battle: { bg: "#EF444430", text: "#EF4444" },
  puzzle: { bg: "#8B5CF630", text: "#8B5CF6" },
  adventure: { bg: "#06B6D430", text: "#06B6D4" },
};

const CATEGORY_LABELS: Record<string, string> = {
  hunt: "Adventure",
  battle: "Strategy",
  puzzle: "Puzzle",
  adventure: "Fantasy",
};

export function GameListItem({ game, onPress, playTime = "20:30" }: GameListItemProps) {
  const scale = useSharedValue(1);
  const categoryStyle = CATEGORY_COLORS[game.category] || CATEGORY_COLORS.hunt;

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
    if (game.isLocked) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  return (
    <AnimatedPressable
      style={[styles.container, animatedStyle, game.isLocked && styles.locked]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <View style={styles.thumbnail}>
        <Feather
          name={game.iconName as any}
          size={24}
          color={game.isLocked ? GameColors.textTertiary : GameColors.primary}
        />
        {game.isLocked && (
          <View style={styles.lockBadge}>
            <Feather name="lock" size={10} color={GameColors.textSecondary} />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <ThemedText
          style={[styles.title, game.isLocked && styles.titleLocked]}
          numberOfLines={1}
        >
          {game.title}
        </ThemedText>
        <View style={styles.metaRow}>
          <Feather name="clock" size={12} color={GameColors.textTertiary} />
          <ThemedText style={styles.metaText}>{playTime}</ThemedText>
        </View>
      </View>

      <View style={[styles.categoryBadge, { backgroundColor: categoryStyle.bg }]}>
        <ThemedText style={[styles.categoryText, { color: categoryStyle.text }]}>
          {CATEGORY_LABELS[game.category] || "Game"}
        </ThemedText>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  locked: {
    opacity: 0.6,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: GameColors.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  lockBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: GameColors.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: GameColors.surface,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: GameColors.textPrimary,
    marginBottom: 4,
  },
  titleLocked: {
    color: GameColors.textSecondary,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: GameColors.textTertiary,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
