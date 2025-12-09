import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Linking } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { ROACHY_DEFINITIONS, RoachyDefinition } from "@/constants/creatures";

interface NFTItem {
  id: string;
  name: string;
  image?: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  creatureId: string;
  mintAddress?: string;
  level?: number;
}

interface NFTGalleryProps {
  nfts?: NFTItem[];
  onNFTPress?: (nft: NFTItem) => void;
  isConnected?: boolean;
  onConnectWallet?: () => void;
}

const PLACEHOLDER_NFTS: NFTItem[] = [
  { id: "1", name: "Shadow Scuttler", rarity: "epic", creatureId: "shadow_scuttler", mintAddress: "Abc...xyz", level: 12 },
  { id: "2", name: "Gutter King", rarity: "legendary", creatureId: "gutter_king", mintAddress: "Def...uvw", level: 25 },
  { id: "3", name: "Sewer Slink", rarity: "rare", creatureId: "sewer_slink", mintAddress: "Ghi...rst", level: 8 },
  { id: "4", name: "Pipe Phantom", rarity: "uncommon", creatureId: "pipe_phantom", mintAddress: "Jkl...opq", level: 5 },
  { id: "5", name: "Drain Dancer", rarity: "common", creatureId: "drain_dancer", mintAddress: "Mno...lmn", level: 3 },
  { id: "6", name: "Trash Titan", rarity: "epic", creatureId: "trash_titan", mintAddress: "Pqr...ijk", level: 15 },
];

const RARITY_COLORS: Record<string, string> = {
  common: "#9CA3AF",
  uncommon: "#22C55E",
  rare: "#3B82F6",
  epic: "#8B5CF6",
  legendary: "#F59E0B",
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

const openMarketplace = (mintAddress?: string) => {
  if (mintAddress) {
    Linking.openURL(`https://magiceden.io/item-details/${mintAddress}`);
  } else {
    Linking.openURL("https://magiceden.io/marketplace/roachy_games");
  }
};

export function NFTGallery({
  nfts = PLACEHOLDER_NFTS,
  onNFTPress,
  isConnected = true,
  onConnectWallet,
}: NFTGalleryProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const filters = ["all", "legendary", "epic", "rare", "uncommon", "common"];

  const filteredNFTs =
    selectedFilter === "all" ? nfts : nfts.filter((nft) => nft.rarity === selectedFilter);

  if (!isConnected) {
    return (
      <Card style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Feather name="image" size={18} color={GameColors.gold} />
            <ThemedText style={styles.title}>My NFTs</ThemedText>
          </View>
        </View>
        <View style={styles.emptyState}>
          <Feather name="lock" size={32} color={GameColors.textSecondary} />
          <ThemedText style={styles.emptyText}>Connect wallet to view your NFTs</ThemedText>
          {onConnectWallet ? (
            <Pressable style={styles.connectButton} onPress={onConnectWallet}>
              <ThemedText style={styles.connectButtonText}>Connect Wallet</ThemedText>
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
          <ThemedText style={styles.title}>My NFTs</ThemedText>
          <View style={styles.countBadge}>
            <ThemedText style={styles.countText}>{nfts.length}</ThemedText>
          </View>
        </View>
        <Pressable style={styles.marketplaceButton} onPress={() => openMarketplace()}>
          <ThemedText style={styles.marketplaceText}>Marketplace</ThemedText>
          <Feather name="external-link" size={12} color={GameColors.gold} />
        </Pressable>
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

      {filteredNFTs.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="inbox" size={32} color={GameColors.textSecondary} />
          <ThemedText style={styles.emptyText}>No NFTs found</ThemedText>
        </View>
      ) : (
        <View style={styles.nftGrid}>
          {filteredNFTs.map((nft) => {
            const creature = getCreatureData(nft.creatureId);
            const classIcon = creature ? CLASS_ICONS[creature.roachyClass] : "circle";

            return (
              <Pressable
                key={nft.id}
                style={[styles.nftCard, { borderColor: RARITY_COLORS[nft.rarity] }]}
                onPress={() => (onNFTPress ? onNFTPress(nft) : openMarketplace(nft.mintAddress))}
              >
                <View style={[styles.nftImagePlaceholder, { backgroundColor: RARITY_COLORS[nft.rarity] + "20" }]}>
                  <Feather name={classIcon} size={28} color={RARITY_COLORS[nft.rarity]} />
                </View>

                <View style={styles.nftInfo}>
                  <ThemedText style={styles.nftName} numberOfLines={1}>
                    {nft.name}
                  </ThemedText>
                  <View style={styles.nftMeta}>
                    <View style={[styles.rarityDot, { backgroundColor: RARITY_COLORS[nft.rarity] }]} />
                    <ThemedText style={styles.nftLevel}>Lv.{nft.level}</ThemedText>
                  </View>
                </View>

                <View style={styles.viewButton}>
                  <Feather name="external-link" size={12} color={GameColors.textSecondary} />
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.footer}>
        <Feather name="info" size={12} color={GameColors.textSecondary} />
        <ThemedText style={styles.footerText}>Tap any NFT to view on Magic Eden</ThemedText>
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
  marketplaceButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  marketplaceText: {
    fontSize: 12,
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
  nftGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  nftCard: {
    width: "48%",
    backgroundColor: GameColors.surface + "60",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  nftImagePlaceholder: {
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  nftInfo: {
    padding: Spacing.sm,
  },
  nftName: {
    fontSize: 13,
    fontWeight: "600",
    color: GameColors.textPrimary,
    marginBottom: 4,
  },
  nftMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rarityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nftLevel: {
    fontSize: 11,
    color: GameColors.textSecondary,
  },
  viewButton: {
    position: "absolute",
    top: Spacing.xs,
    right: Spacing.xs,
    padding: 4,
    backgroundColor: GameColors.background + "80",
    borderRadius: BorderRadius.sm,
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
