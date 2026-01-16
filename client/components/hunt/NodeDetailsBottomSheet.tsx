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
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import type { MapNode, NodeQuality, NodeType } from "@/hooks/useMapNodes";
import { getQualityColor, getTypeLabel, getTypeBadgeColor, getExpiryTimeLeft, distanceMeters } from "@/hooks/useMapNodes";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = 280;

interface NodeDetailsBottomSheetProps {
  visible: boolean;
  node: MapNode | null;
  playerLat: number | null;
  playerLng: number | null;
  isReserving: boolean;
  onClose: () => void;
  onReserve: () => void;
  onNavigate: () => void;
}

export function NodeDetailsBottomSheet({
  visible,
  node,
  playerLat,
  playerLng,
  isReserving,
  onClose,
  onReserve,
  onNavigate,
}: NodeDetailsBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const [expiryText, setExpiryText] = useState("");

  useEffect(() => {
    if (visible && node) {
      backdropOpacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 150 });
      translateY.value = withTiming(SHEET_HEIGHT, { duration: 200 });
    }
  }, [visible, node]);

  useEffect(() => {
    if (!node) return;
    const update = () => setExpiryText(getExpiryTimeLeft(node.expiresAt));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [node?.expiresAt]);

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value * 0.5,
  }));

  if (!node) return null;

  const distance = playerLat && playerLng
    ? Math.round(distanceMeters(playerLat, playerLng, node.lat, node.lng))
    : null;

  const qualityColor = getQualityColor(node.quality);
  const typeLabel = getTypeLabel(node.type);
  const typeBadgeColor = getTypeBadgeColor(node.type);

  const isReservedByMe = node.status === "RESERVED";
  const isAvailable = node.status === "AVAILABLE";
  const isArrived = node.status === "ARRIVED";

  const getCtaText = () => {
    if (isReserving) return "Reserving...";
    if (isArrived) return "Collect";
    if (isReservedByMe) return "Navigate";
    if (isAvailable) return "Reserve";
    return "Reserved";
  };

  const getCtaAction = () => {
    if (isArrived || isReservedByMe) {
      onNavigate();
    } else if (isAvailable) {
      onReserve();
    }
  };

  const isCtaDisabled = !isAvailable && !isReservedByMe && !isArrived;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View style={[styles.backdrop, animatedBackdropStyle]} />
        </Pressable>

        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + Spacing.lg },
            animatedSheetStyle,
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.qualityBadge, { backgroundColor: qualityColor }]}>
                <ThemedText style={styles.qualityText}>{node.quality}</ThemedText>
              </View>
              {typeLabel ? (
                <View style={[styles.typeBadge, { backgroundColor: typeBadgeColor }]}>
                  <ThemedText style={styles.typeText}>{typeLabel}</ThemedText>
                </View>
              ) : null}
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Feather name="x" size={24} color={GameColors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.content}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Feather name="clock" size={16} color={GameColors.textSecondary} />
                <ThemedText style={styles.infoLabel}>Expires</ThemedText>
                <ThemedText style={[styles.infoValue, expiryText === "Expired" && { color: "#EF4444" }]}>
                  {expiryText}
                </ThemedText>
              </View>

              <View style={styles.infoItem}>
                <Feather name="navigation" size={16} color={GameColors.textSecondary} />
                <ThemedText style={styles.infoLabel}>Distance</ThemedText>
                <ThemedText style={styles.infoValue}>
                  {distance !== null ? `${distance}m` : "--"}
                </ThemedText>
              </View>

              <View style={styles.infoItem}>
                <Feather name="map-pin" size={16} color={GameColors.textSecondary} />
                <ThemedText style={styles.infoLabel}>Type</ThemedText>
                <ThemedText style={styles.infoValue}>{node.type}</ThemedText>
              </View>
            </View>

            {node.reservedUntil && isReservedByMe ? (
              <View style={styles.reservedBanner}>
                <Feather name="lock" size={14} color={GameColors.gold} />
                <ThemedText style={styles.reservedText}>
                  Reserved until {new Date(node.reservedUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </ThemedText>
              </View>
            ) : null}
          </View>

          <View style={styles.footer}>
            <Button
              onPress={getCtaAction}
              disabled={isCtaDisabled || isReserving}
              style={[
                styles.ctaButton,
                isReservedByMe && { backgroundColor: GameColors.primary },
              ]}
            >
              <ThemedText style={styles.ctaButtonText}>{getCtaText()}</ThemedText>
            </Button>
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
    paddingTop: Spacing.sm,
    minHeight: SHEET_HEIGHT,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: GameColors.textTertiary,
    alignSelf: "center",
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  qualityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  qualityText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  typeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  content: {
    flex: 1,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  infoItem: {
    alignItems: "center",
    gap: 4,
  },
  infoLabel: {
    fontSize: 11,
    color: GameColors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  reservedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: "rgba(255, 193, 7, 0.1)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  reservedText: {
    fontSize: 12,
    color: GameColors.gold,
  },
  footer: {
    marginTop: "auto",
  },
  ctaButton: {
    marginTop: Spacing.sm,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});
