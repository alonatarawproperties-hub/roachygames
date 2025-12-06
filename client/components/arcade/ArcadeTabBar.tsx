import React from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
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
                size={22}
                color={isActive ? GameColors.gold : GameColors.textTertiary}
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
    backgroundColor: GameColors.surfaceElevated,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: GameColors.gold + "20",
  },
  tab: {
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minWidth: 56,
  },
  iconContainer: {
    width: 44,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  iconContainerActive: {
    backgroundColor: GameColors.gold + "20",
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
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: GameColors.gold,
    marginTop: 2,
  },
});
