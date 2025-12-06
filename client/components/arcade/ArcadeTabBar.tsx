import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing } from "@/constants/theme";

interface TabItem {
  icon: string;
  label: string;
  isActive?: boolean;
}

interface ArcadeTabBarProps {
  activeTab: string;
  onTabPress: (tab: string) => void;
}

const TABS: TabItem[] = [
  { icon: "clock", label: "Recent" },
  { icon: "heart", label: "Favorites" },
  { icon: "play-circle", label: "Games" },
  { icon: "bar-chart-2", label: "Stats" },
  { icon: "settings", label: "Settings" },
];

export function ArcadeTabBar({ activeTab, onTabPress }: ArcadeTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + Spacing.xs }]}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.label;
        return (
          <Pressable
            key={tab.label}
            style={styles.tab}
            onPress={() => onTabPress(tab.label)}
          >
            <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
              <Feather
                name={tab.icon as any}
                size={20}
                color={isActive ? GameColors.primary : GameColors.textTertiary}
              />
            </View>
            {isActive && (
              <ThemedText style={styles.label}>{tab.label}</ThemedText>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: GameColors.surface,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: GameColors.surfaceLight,
  },
  tab: {
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minWidth: 56,
  },
  iconContainer: {
    width: 40,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  iconContainerActive: {
    backgroundColor: GameColors.primary + "20",
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    color: GameColors.primary,
    marginTop: 2,
  },
});
