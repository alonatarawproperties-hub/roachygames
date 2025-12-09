import React from "react";
import { View, StyleSheet, Pressable, TextInput, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";

interface ArcadeHeaderProps {
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (text: string) => void;
  onWalletPress?: () => void;
  onNotificationPress?: () => void;
  walletConnected?: boolean;
}

export function ArcadeHeader({
  showSearch = true,
  searchValue = "",
  onSearchChange,
  onWalletPress,
  onNotificationPress,
  walletConnected = false,
}: ArcadeHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.sm }]}>
      <View style={styles.topRow}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Feather name="disc" size={22} color={GameColors.gold} />
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              walletConnected && styles.walletConnected,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={onWalletPress}
          >
            {walletConnected ? (
              <View style={styles.walletConnectedDot} />
            ) : null}
            <Feather name="credit-card" size={18} color={walletConnected ? GameColors.secondary : GameColors.gold} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={onNotificationPress}
          >
            <View style={styles.notificationDot} />
            <Feather name="bell" size={18} color={GameColors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {showSearch && (
        <View style={styles.searchContainer}>
          <Feather name="search" size={18} color={GameColors.gold} />
          <TextInput
            style={styles.searchInput}
            placeholder="Game Search..."
            placeholderTextColor={GameColors.textTertiary}
            value={searchValue}
            onChangeText={onSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: GameColors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: GameColors.gold + "40",
    ...Platform.select({
      ios: {
        shadowColor: GameColors.gold,
        shadowOpacity: 0.3,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 0 },
      },
      web: {
        boxShadow: `0 0 12px rgba(255, 215, 0, 0.3)`,
      },
    }),
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: GameColors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: GameColors.surfaceGlow,
  },
  actionButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  walletConnected: {
    borderColor: GameColors.secondary,
    borderWidth: 2,
  },
  walletConnectedDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GameColors.secondary,
    zIndex: 1,
  },
  notificationDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GameColors.error,
    zIndex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.surfaceElevated,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: GameColors.gold + "20",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: GameColors.textPrimary,
    paddingVertical: 6,
    fontWeight: "500",
  },
});
