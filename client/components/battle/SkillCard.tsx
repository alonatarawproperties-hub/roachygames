import React, { useRef } from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { Feather } from "@expo/vector-icons";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";

type SkillType = "GUARD" | "PIERCE" | "BURST" | "FOCUS";

interface SkillCardProps {
  title: string;
  typeLabel: SkillType;
  cooldown?: number;
  disabled?: boolean;
  selected?: boolean;
  onPress: () => void;
  size?: "normal" | "small";
}

const TYPE_COLORS: Record<SkillType, string> = {
  PIERCE: "#E53935",
  BURST: "#FF9800",
  GUARD: "#2196F3",
  FOCUS: "#9C27B0",
};

const TYPE_ICONS: Record<SkillType, keyof typeof Feather.glyphMap> = {
  PIERCE: "target",
  BURST: "zap",
  GUARD: "shield",
  FOCUS: "eye",
};

export function SkillCard({
  title,
  typeLabel,
  cooldown = 0,
  disabled = false,
  selected = false,
  onPress,
  size = "normal",
}: SkillCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const typeColor = TYPE_COLORS[typeLabel] || GameColors.primary;
  const isOnCooldown = cooldown > 0;
  const isDisabled = disabled || isOnCooldown;

  const handlePressIn = () => {
    if (isDisabled) return;
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
    >
      <Animated.View
        style={[
          styles.card,
          size === "small" && styles.cardSmall,
          selected && styles.cardSelected,
          isDisabled && styles.cardDisabled,
          { transform: [{ scale: scaleAnim }] },
          selected && { borderColor: typeColor, shadowColor: typeColor },
        ]}
      >
        <View style={styles.topRow}>
          <View style={[styles.iconCircle, { backgroundColor: `${typeColor}30` }]}>
            <Feather name={TYPE_ICONS[typeLabel]} size={size === "small" ? 12 : 16} color={typeColor} />
          </View>
          <Text
            style={[styles.title, size === "small" && styles.titleSmall, isDisabled && styles.textDisabled]}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {title}
          </Text>
        </View>

        <View style={[styles.typeBadge, { backgroundColor: `${typeColor}25` }]}>
          <Text style={[styles.typeText, { color: typeColor }]}>{typeLabel}</Text>
        </View>

        <View style={styles.bottomRow}>
          {isOnCooldown ? (
            <View style={styles.cooldownPill}>
              <Feather name="clock" size={10} color="rgba(255,255,255,0.6)" />
              <Text style={styles.cooldownText}>CD {cooldown}</Text>
            </View>
          ) : (
            <View style={[styles.readyPill, { backgroundColor: `${typeColor}20` }]}>
              <Text style={[styles.readyText, { color: typeColor }]}>READY</Text>
            </View>
          )}
        </View>

        {isOnCooldown && (
          <View style={styles.cooldownOverlay}>
            <Text style={styles.cooldownBigText}>{cooldown}</Text>
          </View>
        )}

        {selected && <View style={[styles.selectedGlow, { backgroundColor: typeColor }]} />}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 90,
    height: 100,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
    padding: Spacing.sm,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  cardSmall: {
    width: 70,
    height: 80,
    padding: Spacing.xs,
  },
  cardSelected: {
    borderWidth: 2,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  titleSmall: {
    fontSize: 8,
  },
  textDisabled: {
    color: "rgba(255,255,255,0.5)",
  },
  typeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  bottomRow: {
    alignItems: "flex-start",
  },
  cooldownPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
  },
  cooldownText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 9,
    fontWeight: "600",
  },
  readyPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  readyText: {
    fontSize: 9,
    fontWeight: "700",
  },
  cooldownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: BorderRadius.md,
  },
  cooldownBigText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
  },
  selectedGlow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.8,
  },
});

export default SkillCard;
