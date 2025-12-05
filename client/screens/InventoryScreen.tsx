import React from "react";
import { View, StyleSheet, FlatList, Image, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { useGame } from "@/context/GameContext";
import { getCreatureDefinition, getRarityColor, CREATURE_IMAGES } from "@/constants/creatures";
import { CaughtCreature } from "@/constants/gameState";
import { InventoryStackParamList } from "@/navigation/InventoryStackNavigator";

type NavigationProp = NativeStackNavigationProp<InventoryStackParamList>;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CreatureGridItemProps {
  creature: CaughtCreature;
  index: number;
  onPress: () => void;
}

function CreatureGridItem({ creature, index, onPress }: CreatureGridItemProps) {
  const def = getCreatureDefinition(creature.id);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!def) return null;

  const rarityColor = getRarityColor(def.rarity);

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
        <Image source={CREATURE_IMAGES[creature.id]} style={styles.creatureImage} />
        
        {creature.blockchainMinted ? (
          <View style={styles.nftBadge}>
            <Feather name="check-circle" size={12} color="#4ECDC4" />
          </View>
        ) : null}

        <View style={[styles.rarityBadge, { backgroundColor: rarityColor }]}>
          <ThemedText style={styles.rarityText}>
            {def.rarity.charAt(0).toUpperCase()}
          </ThemedText>
        </View>
      </View>
      
      <View style={styles.cardInfo}>
        <ThemedText style={styles.creatureName} numberOfLines={1}>
          {def.name}
        </ThemedText>
        <ThemedText style={styles.levelText}>
          Lv. {creature.level}
        </ThemedText>
      </View>
    </AnimatedPressable>
  );
}

export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { state } = useGame();

  const renderItem = ({ item, index }: { item: CaughtCreature; index: number }) => (
    <CreatureGridItem
      creature={item}
      index={index}
      onPress={() => navigation.navigate("CreatureDetail", { uniqueId: item.uniqueId })}
    />
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
        data={state.inventory}
        renderItem={renderItem}
        keyExtractor={(item) => item.uniqueId}
        numColumns={2}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.md,
          flexGrow: 1,
        }}
        columnWrapperStyle={styles.row}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
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
});
