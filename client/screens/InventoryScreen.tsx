import React, { useCallback, useMemo } from "react";
import { View, StyleSheet, Image, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { Image as ExpoImage } from "expo-image";

import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { useHunt, CaughtCreature as HuntCaughtCreature } from "@/context/HuntContext";
import { getCreatureDefinition, getRarityColor, CREATURE_IMAGES, CreatureRarity } from "@/constants/creatures";
import { InventoryStackParamList } from "@/navigation/InventoryStackNavigator";
import { useFlappySkin } from "@/context/FlappySkinContext";
import { useFlappyTrail } from "@/context/FlappyTrailContext";
import { FLAPPY_SKINS, RoachySkin, SkinDefinition } from "@/games/flappy/flappySkins";
import { FLAPPY_TRAILS, RoachyTrail, TrailDefinition } from "@/games/flappy/flappyTrails";
import { useAuth } from "@/context/AuthContext";
import { useUserNfts } from "@/hooks/useUserNfts";

const SKIN_NFT_MAPPING: Record<RoachySkin, string> = {
  default: "",
  rainbow: "rainbow",
  king: "king",
  queen: "queen",
  prince: "prince",
  princess: "princess",
};

const TRAIL_NFT_MAPPING: Record<RoachyTrail, string> = {
  none: "",
};

type NavigationProp = NativeStackNavigationProp<InventoryStackParamList>;

function CreatureGridItem({ 
  creature, 
  index,
  onPress 
}: { 
  creature: HuntCaughtCreature; 
  index: number;
  onPress: () => void;
}) {
  const definition = getCreatureDefinition(creature.templateId);
  const rarityColor = getRarityColor(creature.rarity as CreatureRarity);

  return (
    <Animated.View entering={FadeIn.delay(index * 50)}>
      <Pressable style={styles.creatureCard} onPress={onPress}>
        <View style={[styles.creatureGlow, { backgroundColor: rarityColor + "30" }]} />
        <Image 
          source={CREATURE_IMAGES[creature.templateId]} 
          style={styles.creatureImage} 
        />
        <View style={[styles.rarityDot, { backgroundColor: rarityColor }]} />
        <ThemedText style={styles.creatureName} numberOfLines={1}>
          {definition?.name || creature.name}
        </ThemedText>
        <ThemedText style={styles.creatureLevel}>Lv.{creature.level}</ThemedText>
        {creature.isPerfect ? (
          <View style={styles.perfectBadge}>
            <Feather name="star" size={10} color="#FFD700" />
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

function EmptyState() {
  const navigation = useNavigation<any>();
  
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Feather name="map-pin" size={48} color={GameColors.textTertiary} />
      </View>
      <ThemedText style={styles.emptyTitle}>No Creatures Yet</ThemedText>
      <ThemedText style={styles.emptyDescription}>
        Explore the map in Roachy Hunt to catch creatures and grow your collection
      </ThemedText>
      <Pressable 
        style={styles.playButton}
        onPress={() => navigation.navigate("HuntMain")}
      >
        <Feather name="play" size={16} color={GameColors.background} />
        <ThemedText style={styles.playButtonText}>Start Hunting</ThemedText>
      </Pressable>
    </View>
  );
}

function SectionHeader({ title, badge }: { title: string; badge?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      {badge ? (
        <View style={styles.sectionBadge}>
          <ThemedText style={styles.sectionBadgeText}>{badge}</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

function FlappySkinCard({
  skinId,
  skin,
  isEquipped,
  onEquip,
  index,
  disabled,
}: {
  skinId: RoachySkin;
  skin: typeof FLAPPY_SKINS.default;
  isEquipped: boolean;
  onEquip: () => void;
  index: number;
  disabled?: boolean;
}) {
  return (
    <Animated.View entering={FadeIn.delay(index * 50)}>
      <Pressable
        style={[styles.skinCard, !disabled && isEquipped && styles.skinCardEquipped, disabled && styles.skinCardDisabled]}
        onPress={disabled ? undefined : onEquip}
        disabled={disabled}
      >
        <View style={styles.cardTopRow}>
          {skin.isNFT ? (
            <View style={styles.nftBadge}>
              <ThemedText style={styles.nftBadgeText}>NFT</ThemedText>
            </View>
          ) : <View style={styles.badgePlaceholder} />}
        </View>
        <ExpoImage source={skin.frames[1]} style={styles.skinImage} contentFit="contain" />
        <ThemedText style={styles.skinName} numberOfLines={1}>{skin.name}</ThemedText>
        {!disabled && isEquipped ? (
          <View style={styles.equippedBadge}>
            <ThemedText style={styles.equippedBadgeText}>EQUIPPED</ThemedText>
          </View>
        ) : <View style={styles.equippedPlaceholder} />}
      </Pressable>
    </Animated.View>
  );
}

function FlappyTrailCard({
  trailId,
  trail,
  isEquipped,
  onEquip,
  index,
  disabled,
}: {
  trailId: RoachyTrail;
  trail: TrailDefinition;
  isEquipped: boolean;
  onEquip: () => void;
  index: number;
  disabled?: boolean;
}) {
  return (
    <Animated.View entering={FadeIn.delay(index * 50)}>
      <Pressable
        style={[styles.skinCard, !disabled && isEquipped && styles.skinCardEquipped, disabled && styles.skinCardDisabled]}
        onPress={disabled ? undefined : onEquip}
        disabled={disabled}
      >
        <View style={styles.cardTopRow}>
          {trail.isNFT ? (
            <View style={styles.nftBadge}>
              <ThemedText style={styles.nftBadgeText}>NFT</ThemedText>
            </View>
          ) : <View style={styles.badgePlaceholder} />}
        </View>
        {trail.asset ? (
          <ExpoImage source={trail.asset} style={styles.skinImage} contentFit="contain" />
        ) : (
          <View style={[styles.skinImage, styles.noTrailPlaceholder]}>
            <Feather name="slash" size={24} color={GameColors.textTertiary} />
          </View>
        )}
        <ThemedText style={styles.skinName} numberOfLines={1}>{trail.name}</ThemedText>
        {!disabled && isEquipped ? (
          <View style={styles.equippedBadge}>
            <ThemedText style={styles.equippedBadgeText}>EQUIPPED</ThemedText>
          </View>
        ) : <View style={styles.equippedPlaceholder} />}
      </Pressable>
    </Animated.View>
  );
}

export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { collection, collectedEggs } = useHunt();
  const { equippedSkin, setEquippedSkin, isLoading: skinLoading } = useFlappySkin();
  const { equippedTrail, setEquippedTrail, isLoading: trailLoading } = useFlappyTrail();
  const { user, isGuest } = useAuth();
  const { nfts, getOwnedSkins } = useUserNfts();
  
  const ownedSkinNames = getOwnedSkins("flappy_roachy");
  
  console.log('[Inventory] User:', user?.id, 'isGuest:', isGuest);
  console.log('[Inventory] NFTs from API:', JSON.stringify(nfts));
  console.log('[Inventory] Owned skin names:', JSON.stringify(ownedSkinNames));

  const isSkinOwned = useCallback((skinId: RoachySkin): boolean => {
    const skin = FLAPPY_SKINS[skinId];
    if (!skin.isNFT) return true;
    
    const nftName = skin.name.toLowerCase().replace(/\s+/g, "_");
    const owned = ownedSkinNames.includes(nftName);
    console.log(`[Inventory] Checking ${skinId}: NFT name="${nftName}", owned=${owned}`);
    return owned;
  }, [ownedSkinNames]);

  const isTrailOwned = useCallback((trailId: RoachyTrail): boolean => {
    if (!FLAPPY_TRAILS[trailId].isNFT) return true;
    return false;
  }, []);

  const navigateToCreature = useCallback((uniqueId: string) => {
    navigation.navigate("CreatureDetail", { uniqueId });
  }, [navigation]);

  const skinEntries = useMemo(() => {
    const all = Object.entries(FLAPPY_SKINS) as [RoachySkin, SkinDefinition][];
    const filtered = all.filter(([skinId, skin]) => {
      if (isGuest) {
        console.log(`[Inventory] Guest: hiding NFT skin ${skinId}`);
        return !skin.isNFT;
      }
      if (!skin.isNFT) return true;
      return isSkinOwned(skinId);
    });
    console.log('[Inventory] Final skins:', filtered.map(([id]) => id));
    return filtered;
  }, [isGuest, isSkinOwned]);
  
  const allTrailEntries = Object.entries(FLAPPY_TRAILS) as [RoachyTrail, TrailDefinition][];
  const trailEntries = allTrailEntries.filter(([trailId, trail]) => {
    if (isGuest) return !trail.isNFT;
    if (!trail.isNFT) return true;
    return isTrailOwned(trailId);
  });

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.md,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.md,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Summary */}
        <Animated.View entering={FadeInDown} style={styles.statsCard}>
          <View style={styles.statItem}>
            <Feather name="hexagon" size={20} color={GameColors.primary} />
            <ThemedText style={styles.statValue}>{collection.length}</ThemedText>
            <ThemedText style={styles.statLabel}>Creatures</ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Feather name="gift" size={20} color={GameColors.gold} />
            <ThemedText style={styles.statValue}>{collectedEggs}</ThemedText>
            <ThemedText style={styles.statLabel}>Eggs</ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Feather name="star" size={20} color="#FFD700" />
            <ThemedText style={styles.statValue}>
              {collection.filter(c => c.isPerfect).length}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Perfect</ThemedText>
          </View>
        </Animated.View>

        {/* Arcade Inventory CTA */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <Pressable 
            style={styles.arcadeCta}
            onPress={() => {
              try {
                (navigation as any).navigate("ArcadeHome", { screen: "Inventory" });
              } catch {
                // Fallback - navigate to root and let it handle tab selection
                (navigation as any).navigate("ArcadeHome");
              }
            }}
          >
            <Feather name="briefcase" size={20} color={GameColors.gold} />
            <View style={styles.arcadeCtaText}>
              <ThemedText style={styles.arcadeCtaTitle}>Full Collection</ThemedText>
              <ThemedText style={styles.arcadeCtaSubtitle}>View all items in Arcade Inventory</ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={GameColors.textSecondary} />
          </Pressable>
        </Animated.View>

        {/* Flappy Roachy Skins */}
        <Animated.View entering={FadeInDown.delay(150)}>
          <SectionHeader title="Flappy Skins" badge={`${skinEntries.length}`} />
          <View style={styles.skinsRow}>
            {skinEntries.map(([skinId, skin], index) => (
              <View key={skinId} style={styles.skinItemWrapper}>
                <FlappySkinCard
                  skinId={skinId}
                  skin={skin}
                  isEquipped={equippedSkin === skinId}
                  onEquip={() => setEquippedSkin(skinId)}
                  index={index}
                  disabled={skinLoading}
                />
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Flappy Roachy Trails */}
        <Animated.View entering={FadeInDown.delay(175)}>
          <SectionHeader title="Flappy Trails" badge={`${trailEntries.length}`} />
          <View style={styles.skinsRow}>
            {trailEntries.map(([trailId, trail], index) => (
              <View key={trailId} style={styles.skinItemWrapper}>
                <FlappyTrailCard
                  trailId={trailId}
                  trail={trail}
                  isEquipped={equippedTrail === trailId}
                  onEquip={() => setEquippedTrail(trailId)}
                  index={index}
                  disabled={trailLoading}
                />
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Collection Grid */}
        {collection.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(200)}>
            <SectionHeader title="Hunt Collection" badge={`${collection.length}`} />
            <View style={styles.creatureGrid}>
              {collection.map((creature, index) => (
                <View key={creature.id} style={styles.gridItemWrapper}>
                  <CreatureGridItem
                    creature={creature}
                    index={index}
                    onPress={() => navigateToCreature(creature.id)}
                  />
                </View>
              ))}
            </View>
          </Animated.View>
        ) : (
          <EmptyState />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: GameColors.textPrimary,
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: GameColors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: GameColors.textTertiary + "30",
    marginHorizontal: Spacing.sm,
  },
  arcadeCta: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: GameColors.gold + "30",
  },
  arcadeCtaText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  arcadeCtaTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  arcadeCtaSubtitle: {
    fontSize: 12,
    color: GameColors.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  sectionBadge: {
    backgroundColor: GameColors.primary + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: GameColors.primary,
  },
  creatureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -Spacing.xs,
  },
  gridItemWrapper: {
    width: "33.33%",
    padding: Spacing.xs,
  },
  creatureCard: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  creatureGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    opacity: 0.5,
  },
  creatureImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: Spacing.xs,
  },
  rarityDot: {
    position: "absolute",
    top: Spacing.xs,
    right: Spacing.xs,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  creatureName: {
    fontSize: 11,
    fontWeight: "600",
    color: GameColors.textPrimary,
    textAlign: "center",
  },
  creatureLevel: {
    fontSize: 10,
    color: GameColors.textSecondary,
    marginTop: 2,
  },
  perfectBadge: {
    position: "absolute",
    top: Spacing.xs,
    left: Spacing.xs,
    backgroundColor: "#FFD70020",
    borderRadius: 8,
    padding: 2,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: GameColors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: GameColors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyDescription: {
    fontSize: 14,
    color: GameColors.textSecondary,
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: GameColors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
  },
  playButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.background,
  },
  skinsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -Spacing.xs,
    marginBottom: Spacing.lg,
  },
  skinItemWrapper: {
    width: "50%",
    maxWidth: 180,
    padding: Spacing.xs,
  },
  skinCard: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  skinCardEquipped: {
    borderColor: GameColors.gold,
    backgroundColor: GameColors.gold + "15",
  },
  skinCardDisabled: {
    opacity: 0.5,
  },
  cardTopRow: {
    width: "100%",
    height: 20,
    alignItems: "flex-end",
    marginBottom: Spacing.xs,
  },
  badgePlaceholder: {
    height: 18,
  },
  skinImage: {
    width: 60,
    height: 60,
    marginBottom: Spacing.sm,
  },
  noTrailPlaceholder: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  skinName: {
    fontSize: 13,
    fontWeight: "600",
    color: GameColors.textPrimary,
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  nftBadge: {
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  nftBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#fff",
  },
  equippedBadge: {
    backgroundColor: GameColors.gold,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginTop: Spacing.xs,
  },
  equippedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1A1A0F",
  },
  equippedPlaceholder: {
    height: 26,
  },
});
