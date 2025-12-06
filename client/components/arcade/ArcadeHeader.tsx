import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";

interface ArcadeHeaderProps {
  walletConnected?: boolean;
  onWalletPress?: () => void;
  onSettingsPress?: () => void;
}

export function ArcadeHeader({
  walletConnected = false,
  onWalletPress,
  onSettingsPress,
}: ArcadeHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.sm }]}>
      <View style={styles.logoContainer}>
        <View style={styles.logoIcon}>
          <Feather name="play-circle" size={28} color={GameColors.primary} />
        </View>
        <View>
          <ThemedText style={styles.logoText}>Roachy</ThemedText>
          <ThemedText style={styles.logoSubtext}>Games</ThemedText>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={onWalletPress}
        >
          <Feather
            name={walletConnected ? "check-circle" : "link"}
            size={20}
            color={walletConnected ? GameColors.success : GameColors.textSecondary}
          />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={onSettingsPress}
        >
          <Feather name="settings" size={20} color={GameColors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  logoIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: GameColors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: GameColors.primary,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "800",
    color: GameColors.primary,
    letterSpacing: -0.5,
  },
  logoSubtext: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.textSecondary,
    marginTop: -4,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GameColors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: GameColors.surfaceLight,
  },
  actionButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
});
