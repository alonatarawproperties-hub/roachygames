import React, { useState } from "react";
import { View, StyleSheet, FlatList, Image, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { useHunt, CaughtCreature as HuntCaughtCreature } from "@/context/HuntContext";
import { getCreatureDefinition, getRarityColor, CREATURE_IMAGES } from "@/constants/creatures";
import { InventoryStackParamList } from "@/navigation/InventoryStackNavigator";

type NavigationProp = NativeStackNavigationProp<InventoryStackParamList>;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CreatureGridItemProps {
  creature: HuntCaughtCreature;
  index: number;
  onPress: () => void;
}

function CreatureGridItem({ creature, index, onPress }: CreatureGridItemProps) {
  const def = getCreatureDefinition(creature.templateId);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!def) return null;

  const rarityColor = getRarityColor(creature.rarity as any);

  return (
    <AnimatedPressable
      entering={FadeInDown.delay(index * 50).springify()}
      style={[styles.gridItem, animatedStyle]}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.95);
      }}
      onPressOut={() => {
        scale.value = withSpring(1);
      }}
    >
      <View style={[styles.cardGlow, { backgroundColor: rarityColor }]} />
      <View style={styles.cardContent}>
        <Image source={CREATURE_IMAGES[creature.templateId]} style={styles.creatureImage} />
        
        {creature.isPerfect ? (
          <View style={styles.nftBadge}>
            <Feather name="star" size={12} color="#FFD700" />
          </View>
        ) : null}

        <View style={[styles.rarityBadge, { backgroundColor: rarityColor }]}>
          <ThemedText style={styles.rarityText}>
            {creature.rarity.charAt(0).toUpperCase()}
          </ThemedText>
        </View>
      </View>
      
      <View style={styles.cardInfo}>
        <ThemedText style={styles.creatureName} numberOfLines={1}>
          {creature.name}
        </ThemedText>
        <ThemedText style={styles.levelText}>
          Lv. {creature.level}
        </ThemedText>
      </View>
    </AnimatedPressable>
  );
}

const EGGS_REQUIRED = 10;

function EggSection({ eggCount, onHatch, isHatching }: { eggCount: number; onHatch: () => void; isHatching: boolean }) {
  const canHatch = eggCount >= EGGS_REQUIRED;
  const progress = Math.min(eggCount / EGGS_REQUIRED, 1);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (canHatch && !isHatching) {
      scale.value = withSequence(
        withTiming(0.95, { duration: 100 }),
        withSpring(1)
      );
      onHatch();
    }
  };

  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.eggSection}>
      <View style={styles.eggHeader}>
        <View style={styles.eggIconContainer}>
          <Feather name="gift" size={24} color={GameColors.primary} />
        </View>
        <View style={styles.eggInfo}>
          <ThemedText style={styles.eggTitle}>Collected Eggs</ThemedText>
          <ThemedText style={styles.eggCount}>
            {eggCount} / {EGGS_REQUIRED}
          </ThemedText>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      <AnimatedPressable
        style={[
          styles.hatchButton,
          animatedStyle,
          !canHatch && styles.hatchButtonDisabled,
        ]}
        onPress={handlePress}
        disabled={!canHatch || isHatching}
      >
        {isHatching ? (
          <ThemedText style={styles.hatchButtonText}>Hatching...</ThemedText>
        ) : (
          <>
            <Feather name="zap" size={18} color={canHatch ? GameColors.background : GameColors.textSecondary} />
            <ThemedText style={[styles.hatchButtonText, !canHatch && styles.hatchButtonTextDisabled]}>
              {canHatch ? "HATCH NOW" : `Need ${EGGS_REQUIRED - eggCount} more`}
            </ThemedText>
          </>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { collection, collectedEggs, hatchEggs, walletAddress } = useHunt();
  const [isHatching, setIsHatching] = useState(false);

  console.log("[Inventory] wallet:", walletAddress, "eggs:", collectedEggs, "collection:", collection.length);

  const handleHatch = async () => {
    setIsHatching(true);
    try {
      const result = await hatchEggs();
      if (result.success && result.creature) {
        const def = getCreatureDefinition(result.creature.templateId);
        Alert.alert(
          "Egg Hatched!",
          `You got a ${def?.rarity || 'common'} ${def?.name || 'Roachy'}!`,
          [{ text: "Awesome!" }]
        );
      } else {
        Alert.alert("Hatch Failed", result.error || "Something went wrong");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to hatch eggs");
    } finally {
      setIsHatching(false);
    }
  };

  const renderItem = ({ item, index }: { item: HuntCaughtCreature; index: number }) => (
    <CreatureGridItem
      creature={item}
      index={index}
      onPress={() => navigation.navigate("CreatureDetail", { uniqueId: item.id })}
    />
  );

  const renderHeader = () => (
    <>
      {walletAddress ? (
        <View style={styles.walletInfo}>
          <Feather name="user" size={14} color={GameColors.textSecondary} />
          <ThemedText style={styles.walletText}>
            {walletAddress.slice(-8)}
          </ThemedText>
        </View>
      ) : null}
      
      <Pressable
        style={styles.marketplaceButton}
        onPress={() => WebBrowser.openBrowserAsync(`${process.env.EXPO_PUBLIC_MARKETPLACE_URL || "https://roachy.games"}/marketplace`)}
      >
        <Feather name="shopping-bag" size={18} color={GameColors.primary} />
        <View style={styles.marketplaceInfo}>
          <ThemedText style={styles.marketplaceTitle}>Marketplace</ThemedText>
          <ThemedText style={styles.marketplaceDesc}>Buy power-ups, trade NFTs, and more</ThemedText>
        </View>
        <Feather name="external-link" size={16} color={GameColors.textSecondary} />
      </Pressable>
      
      <View style={styles.gameSectionHeader}>
        <ThemedText style={styles.gameSectionTitle}>Roachy Hunt</ThemedText>
        <View style={styles.gameBadge}>
          <Feather name="map-pin" size={12} color={GameColors.primary} />
          <ThemedText style={styles.gameBadgeText}>GPS Game</ThemedText>
        </View>
      </View>
      
      <EggSection 
        eggCount={collectedEggs} 
        onHatch={handleHatch}
        isHatching={isHatching}
      />
      
      <ThemedText style={styles.collectionTitle}>
        My Collection ({collection.length})
      </ThemedText>
    </>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Feather name="compass" size={48} color={GameColors.textSecondary} />
      </View>
      <ThemedText type="h4" style={styles.emptyTitle}>
        No Creatures Yet
      </ThemedText>
      <ThemedText style={styles.emptyText}>
        Go to the Hunt tab and catch some creatures to build your collection!
      </ThemedText>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={collection}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.md,
          flexGrow: 1,
        }}
        columnWrapperStyle={styles.row}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  gridItem: {
    width: "48%",
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  cardGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    opacity: 0.8,
  },
  cardContent: {
    padding: Spacing.md,
    alignItems: "center",
    position: "relative",
  },
  creatureImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  nftBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: GameColors.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  rarityBadge: {
    position: "absolute",
    top: Spacing.sm,
    left: Spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  rarityText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  cardInfo: {
    padding: Spacing.md,
    paddingTop: 0,
    alignItems: "center",
  },
  creatureName: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  levelText: {
    fontSize: 12,
    color: GameColors.textSecondary,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: GameColors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    color: GameColors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  emptyText: {
    color: GameColors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  eggSection: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: GameColors.primary + "40",
  },
  eggHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  eggIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: GameColors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  eggInfo: {
    flex: 1,
  },
  eggTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  eggCount: {
    fontSize: 20,
    fontWeight: "700",
    color: GameColors.primary,
  },
  progressContainer: {
    marginBottom: Spacing.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: GameColors.surfaceLight,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: GameColors.primary,
    borderRadius: 4,
  },
  hatchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GameColors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  hatchButtonDisabled: {
    backgroundColor: GameColors.surfaceLight,
  },
  hatchButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: GameColors.background,
  },
  hatchButtonTextDisabled: {
    color: GameColors.textSecondary,
  },
  walletInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.sm,
    alignSelf: "center",
  },
  walletText: {
    fontSize: 12,
    color: GameColors.textSecondary,
    fontFamily: "monospace",
  },
  marketplaceButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: GameColors.surface,
    borderWidth: 1,
    borderColor: GameColors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  marketplaceInfo: {
    flex: 1,
  },
  marketplaceTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.primary,
  },
  marketplaceDesc: {
    fontSize: 12,
    color: GameColors.textSecondary,
  },
  gameSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  gameSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  gameBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: GameColors.primary + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  gameBadgeText: {
    fontSize: 11,
    color: GameColors.primary,
    fontWeight: "500",
  },
  collectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.textSecondary,
    marginBottom: Spacing.md,
  },
});
