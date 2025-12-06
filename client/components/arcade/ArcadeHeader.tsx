import React from "react";
import { View, StyleSheet, Pressable, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";

interface ArcadeHeaderProps {
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (text: string) => void;
  onWalletPress?: () => void;
  onNotificationPress?: () => void;
}

export function ArcadeHeader({
  showSearch = true,
  searchValue = "",
  onSearchChange,
  onWalletPress,
  onNotificationPress,
}: ArcadeHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.sm }]}>
      <View style={styles.topRow}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Feather name="disc" size={20} color={GameColors.primary} />
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
            <Feather name="credit-card" size={18} color={GameColors.textSecondary} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={onNotificationPress}
          >
            <Feather name="bell" size={18} color={GameColors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {showSearch && (
        <View style={styles.searchContainer}>
          <Feather name="search" size={18} color={GameColors.textSecondary} />
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
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: GameColors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: GameColors.primary + "40",
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: GameColors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: GameColors.textPrimary,
    paddingVertical: 4,
  },
});
