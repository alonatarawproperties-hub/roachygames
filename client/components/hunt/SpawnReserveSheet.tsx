import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import type { Spawn } from "@/context/HuntContext";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = 300;

const RARITY_COLORS: Record<string, string> = {
  common: "#9CA3AF",
  rare: "#3B82F6",
  epic: "#A855F7",
  legendary: "#F59E0B",
};

const SECRET_SOURCE_TYPES = ["EXPLORE", "MICRO_HOTSPOT", "HOT_DROP", "LEGENDARY_BEACON"];

interface SpawnReserveSheetProps {
  visible: boolean;
  spawn: Spawn | null;
  playerDistance: number | null;
  isReserving: boolean;
  reservedUntil: Date | null;
  onClose: () => void;
  onReserve: () => void;
  onNavigate: () => void;
}

export function SpawnReserveSheet({
  visible,
  spawn,
  playerDistance,
  isReserving,
  reservedUntil,
  onClose,
  onReserve,
  onNavigate,
}: SpawnReserveSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (visible && spawn) {
      backdropOpacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 150 });
      translateY.value = withTiming(SHEET_HEIGHT, { duration: 200 });
    }
  }, [visible, spawn]);

  useEffect(() => {
    if (!reservedUntil) {
      setCountdown("");
      return;
    }
    const update = () => {
      const now = Date.now();
      const end = new Date(reservedUntil).getTime();
      const diff = end - now;
      if (diff <= 0) {
        setCountdown("Expired");
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown(`${mins}:${secs.toString().padStart(2, "0")}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [reservedUntil]);

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value * 0.5,
  }));

  if (!spawn) return null;

  const isSecret = !!spawn.sourceType && SECRET_SOURCE_TYPES.includes(spawn.sourceType);
  const showRarity = !isSecret && !!spawn.rarity;
  const rarityColor = spawn.rarity ? (RARITY_COLORS[spawn.rarity] || RARITY_COLORS.common) : GameColors.textSecondary;
  const distanceText = playerDistance
    ? playerDistance >= 1000
      ? `${(playerDistance / 1000).toFixed(1)}km away`
      : `${Math.round(playerDistance)}m away`
    : "Unknown distance";

  const isReserved = !!reservedUntil && new Date(reservedUntil).getTime() > Date.now();
  const CATCH_RADIUS = 100;
  const canCatch = playerDistance !== null && playerDistance <= CATCH_RADIUS;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, animatedBackdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            animatedSheetStyle,
            { paddingBottom: insets.bottom + Spacing.md },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: isSecret ? GameColors.primary + "30" : rarityColor + "30" }]}>
              <Feather name={isSecret ? "help-circle" : "gift"} size={28} color={isSecret ? GameColors.primary : rarityColor} />
            </View>
            <View style={styles.headerText}>
              <ThemedText style={styles.title}>{spawn.name || "Mystery Egg"}</ThemedText>
              <View style={styles.badgeRow}>
                {showRarity ? (
                  <View style={[styles.rarityBadge, { backgroundColor: rarityColor + "30" }]}>
                    <ThemedText style={[styles.rarityText, { color: rarityColor }]}>
                      {spawn.rarity?.toUpperCase()}
                    </ThemedText>
                  </View>
                ) : (
                  <View style={[styles.rarityBadge, { backgroundColor: GameColors.primary + "20" }]}>
                    <ThemedText style={[styles.rarityText, { color: GameColors.primary }]}>
                      ???
                    </ThemedText>
                  </View>
                )}
                <ThemedText style={styles.distance}>{distanceText}</ThemedText>
              </View>
            </View>
          </View>

          {isReserved && countdown ? (
            <View style={styles.timerRow}>
              <Feather name="clock" size={16} color={GameColors.gold} />
              <ThemedText style={styles.timerText}>
                Reserved - {countdown} remaining
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.infoBox}>
            <Feather name="info" size={14} color={GameColors.textSecondary} />
            <ThemedText style={styles.infoText}>
              {isReserved
                ? canCatch
                  ? "You're close enough! Tap to catch this spawn."
                  : "Walk to this spawn before the timer expires to catch it."
                : "Reserve this spawn for 8 minutes. Walk to it and catch before it expires!"}
            </ThemedText>
          </View>

          <View style={styles.actions}>
            {isReserved ? (
              canCatch ? (
                <Button
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onNavigate();
                  }}
                  style={styles.primaryButton}
                >
                  Catch Now
                </Button>
              ) : (
                <Button
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onNavigate();
                  }}
                  style={styles.primaryButton}
                >
                  Navigate
                </Button>
              )
            ) : (
              <Button
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onReserve();
                }}
                disabled={isReserving}
                style={styles.primaryButton}
              >
                {isReserving ? "Reserving..." : "Reserve for 8 min"}
              </Button>
            )}

            <Pressable style={styles.closeButton} onPress={onClose}>
              <ThemedText style={styles.closeText}>Close</ThemedText>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  sheet: {
    backgroundColor: GameColors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    minHeight: SHEET_HEIGHT,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: GameColors.surfaceLight,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: GameColors.textPrimary,
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  rarityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  rarityText: {
    fontSize: 11,
    fontWeight: "700",
  },
  distance: {
    fontSize: 13,
    color: GameColors.textSecondary,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: GameColors.gold + "20",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  timerText: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.gold,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    backgroundColor: GameColors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: GameColors.textSecondary,
    lineHeight: 18,
  },
  actions: {
    gap: Spacing.sm,
  },
  primaryButton: {
    width: "100%",
  },
  closeButton: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  closeText: {
    fontSize: 14,
    color: GameColors.textSecondary,
  },
});
