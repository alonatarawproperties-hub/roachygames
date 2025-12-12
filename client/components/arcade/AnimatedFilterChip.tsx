import React from "react";
import { Pressable, StyleSheet, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AnimatedFilterChipProps {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  isActive: boolean;
  onPress: () => void;
  count?: number;
}

export function AnimatedFilterChip({
  label,
  icon,
  isActive,
  onPress,
  count,
}: AnimatedFilterChipProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  };

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <AnimatedPressable
      style={[
        styles.chip,
        isActive && styles.chipActive,
        animatedStyle,
      ]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      {icon ? (
        <Feather
          name={icon}
          size={14}
          color={isActive ? GameColors.gold : GameColors.textSecondary}
        />
      ) : null}
      <ThemedText
        style={[
          styles.chipText,
          isActive && styles.chipTextActive,
        ]}
      >
        {label}{count !== undefined ? ` (${count})` : ""}
      </ThemedText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: GameColors.surfaceElevated,
    borderWidth: 1,
    borderColor: GameColors.surfaceGlow,
  },
  chipActive: {
    backgroundColor: GameColors.gold + "20",
    borderColor: GameColors.gold + "40",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: GameColors.textSecondary,
  },
  chipTextActive: {
    color: GameColors.gold,
  },
});
