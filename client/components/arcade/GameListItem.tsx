import React from "react";
import { View, StyleSheet, Pressable, Platform, Image } from "react-native";
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

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  strategy: { bg: "#9D4EDD20", text: "#9D4EDD", border: "#9D4EDD40" },
  battle: { bg: "#FF336620", text: "#FF3366", border: "#FF336640" },
  arcade: { bg: "#F5920020", text: "#F59200", border: "#F5920040" },
  adventure: { bg: "#00D9FF20", text: "#00D9FF", border: "#00D9FF40" },
};

const CATEGORY_LABELS: Record<string, string> = {
  strategy: "Strategy",
  battle: "Battle",
  arcade: "Arcade",
  adventure: "Adventure",
};

export function GameListItem({ game, onPress, playTime = "20:30" }: GameListItemProps) {
  const scale = useSharedValue(1);
  const categoryStyle = CATEGORY_COLORS[game.category] || CATEGORY_COLORS.adventure;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
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
      <View style={[styles.thumbnail, { borderColor: categoryStyle.border }]}>
        {game.coverImage ? (
          <Image
            source={game.coverImage}
            style={styles.thumbnailImage}
            resizeMode="cover"
          />
        ) : (
          <Feather
            name={game.iconName as any}
            size={24}
            color={game.isLocked ? GameColors.textTertiary : categoryStyle.text}
          />
        )}
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

      <View style={[
        styles.categoryBadge, 
        { 
          backgroundColor: categoryStyle.bg,
          borderColor: categoryStyle.border,
        }
      ]}>
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
    backgroundColor: GameColors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: GameColors.surfaceGlow,
  },
  locked: {
    opacity: 0.5,
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: GameColors.surfaceGlow,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    overflow: "hidden",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
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
    borderColor: GameColors.surfaceElevated,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: GameColors.textPrimary,
    marginBottom: 4,
  },
  titleLocked: {
    color: GameColors.textTertiary,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
