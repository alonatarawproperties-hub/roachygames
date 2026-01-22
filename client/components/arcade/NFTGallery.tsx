import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { ROACHY_DEFINITIONS, RoachyDefinition } from "@/constants/creatures";

interface CollectionItem {
  id: string;
  name: string;
  image?: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  creatureId: string;
  level?: number;
}

interface CollectionGalleryProps {
  items?: CollectionItem[];
  onItemPress?: (item: CollectionItem) => void;
  isConnected?: boolean;
  isGuest?: boolean;
  onSignIn?: () => void;
}

const PLACEHOLDER_ITEMS: CollectionItem[] = [
  { id: "1", name: "Shadow Scuttler", rarity: "epic", creatureId: "shadow_scuttler", level: 12 },
  { id: "2", name: "Gutter King", rarity: "legendary", creatureId: "gutter_king", level: 25 },
  { id: "3", name: "Sewer Slink", rarity: "rare", creatureId: "sewer_slink", level: 8 },
  { id: "4", name: "Pipe Phantom", rarity: "common", creatureId: "pipe_phantom", level: 5 },
  { id: "5", name: "Drain Dancer", rarity: "common", creatureId: "drain_dancer", level: 3 },
  { id: "6", name: "Trash Titan", rarity: "epic", creatureId: "trash_titan", level: 15 },
];

const RARITY_COLORS: Record<string, string> = {
  common: "#9CA3AF",
  rare: "#00D9FF",
  epic: "#9B59B6",
  legendary: "#FFD700",
};

const CLASS_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  tank: "shield",
  assassin: "zap",
  mage: "star",
  support: "heart",
};

const getCreatureData = (creatureId: string): RoachyDefinition | undefined => {
  return ROACHY_DEFINITIONS.find((c: RoachyDefinition) => c.id === creatureId);
};

export function NFTGallery({
  items = PLACEHOLDER_ITEMS,
  onItemPress,
  isConnected = true,
  isGuest = false,
  onSignIn,
}: CollectionGalleryProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const filters = ["all", "legendary", "epic", "rare", "common"];

  const filteredItems =
    selectedFilter === "all" ? items : items.filter((item) => item.rarity === selectedFilter);

  if (isGuest || !isConnected) {
    return (
      <Card style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Feather name="image" size={18} color={GameColors.gold} />
            <ThemedText style={styles.title}>My Collection</ThemedText>
          </View>
        </View>
        <View style={styles.emptyState}>
          <Feather name={isGuest ? "user" : "lock"} size={32} color={GameColors.textSecondary} />
          <ThemedText style={styles.emptyText}>
            {isGuest ? "Sign in to view your collection" : "Sign in to view your Roachies"}
          </ThemedText>
          {onSignIn ? (
            <Pressable style={styles.connectButton} onPress={onSignIn}>
              <ThemedText style={styles.connectButtonText}>Sign In</ThemedText>
            </Pressable>
          ) : null}
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Feather name="image" size={18} color={GameColors.gold} />
          <ThemedText style={styles.title}>My Collection</ThemedText>
          <View style={styles.countBadge}>
            <ThemedText style={styles.countText}>{items.length}</ThemedText>
          </View>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {filters.map((filter) => (
          <Pressable
            key={filter}
            style={[
              styles.filterChip,
              selectedFilter === filter && styles.filterChipActive,
              filter !== "all" && { borderColor: RARITY_COLORS[filter] },
            ]}
            onPress={() => setSelectedFilter(filter)}
          >
            <ThemedText
              style={[
                styles.filterText,
                selectedFilter === filter && styles.filterTextActive,
                filter !== "all" && selectedFilter === filter && { color: RARITY_COLORS[filter] },
              ]}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      {filteredItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="inbox" size={32} color={GameColors.textSecondary} />
          <ThemedText style={styles.emptyText}>No Roachies found</ThemedText>
        </View>
      ) : (
        <View style={styles.itemGrid}>
          {filteredItems.map((item) => {
            const creature = getCreatureData(item.creatureId);
            const classIcon = creature ? CLASS_ICONS[creature.roachyClass] : "circle";

            return (
              <Pressable
                key={item.id}
                style={[styles.itemCard, { borderColor: RARITY_COLORS[item.rarity] }]}
                onPress={() => onItemPress?.(item)}
              >
                <View style={[styles.itemImagePlaceholder, { backgroundColor: RARITY_COLORS[item.rarity] + "20" }]}>
                  <Feather name={classIcon} size={28} color={RARITY_COLORS[item.rarity]} />
                </View>

                <View style={[styles.rarityBadge, { backgroundColor: RARITY_COLORS[item.rarity] }]}>
                  <ThemedText style={styles.rarityBadgeText}>
                    {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                  </ThemedText>
                </View>

                <View style={styles.itemInfo}>
                  <ThemedText style={styles.itemName} numberOfLines={1}>
                    {item.name}
                  </ThemedText>
                  <View style={styles.itemMeta}>
                    <View style={[styles.rarityDot, { backgroundColor: RARITY_COLORS[item.rarity] }]} />
                    <ThemedText style={styles.itemLevel}>Lv.{item.level}</ThemedText>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.footer}>
        <Feather name="info" size={12} color={GameColors.textSecondary} />
        <ThemedText style={styles.footerText}>Catch more Roachies to grow your collection</ThemedText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  countBadge: {
    backgroundColor: GameColors.gold + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
    color: GameColors.gold,
  },
  filterScroll: {
    marginBottom: Spacing.md,
  },
  filterContainer: {
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: GameColors.surface,
    backgroundColor: GameColors.surface + "40",
  },
  filterChipActive: {
    backgroundColor: GameColors.gold + "20",
    borderColor: GameColors.gold,
  },
  filterText: {
    fontSize: 12,
    color: GameColors.textSecondary,
  },
  filterTextActive: {
    color: GameColors.gold,
    fontWeight: "600",
  },
  itemGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  itemCard: {
    width: "48%",
    backgroundColor: GameColors.surface + "60",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  itemImagePlaceholder: {
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  rarityBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  rarityBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#fff",
    textTransform: "uppercase",
  },
  itemInfo: {
    padding: Spacing.sm,
  },
  itemName: {
    fontSize: 13,
    fontWeight: "600",
    color: GameColors.textPrimary,
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rarityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemLevel: {
    fontSize: 11,
    color: GameColors.textSecondary,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: GameColors.textSecondary,
  },
  connectButton: {
    backgroundColor: GameColors.gold,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  connectButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: GameColors.background,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: GameColors.surface + "40",
  },
  footerText: {
    fontSize: 11,
    color: GameColors.textSecondary,
  },
});
