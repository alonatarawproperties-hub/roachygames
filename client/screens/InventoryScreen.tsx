import React, { useState, useCallback } from "react";
import { View, StyleSheet, FlatList, Image, Pressable, Alert, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { useHunt, CaughtCreature as HuntCaughtCreature } from "@/context/HuntContext";
import { useAuth } from "@/context/AuthContext";
import { getCreatureDefinition, getRarityColor, CREATURE_IMAGES } from "@/constants/creatures";
import { InventoryStackParamList } from "@/navigation/InventoryStackNavigator";

type NavigationProp = NativeStackNavigationProp<InventoryStackParamList>;

type TabType = "all" | "flappy" | "hunt" | "mate" | "wallet";

const TABS: { id: TabType; label: string; icon: string }[] = [
  { id: "all", label: "All", icon: "grid" },
  { id: "flappy", label: "Flappy", icon: "zap" },
  { id: "hunt", label: "Hunt", icon: "map-pin" },
  { id: "mate", label: "Mate", icon: "grid" },
  { id: "wallet", label: "Wallet", icon: "credit-card" },
];

const EGGS_REQUIRED = 10;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface FlappyInventory {
  userId: string;
  shield: number;
  double: number;
  magnet: number;
}

function TabButton({ 
  tab, 
  isActive, 
  onPress 
}: { 
  tab: typeof TABS[0]; 
  isActive: boolean; 
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.tabButton, isActive && styles.tabButtonActive]}
      onPress={onPress}
    >
      <Feather 
        name={tab.icon as any} 
        size={16} 
        color={isActive ? GameColors.background : GameColors.textSecondary} 
      />
      <ThemedText 
        style={[styles.tabLabel, isActive && styles.tabLabelActive]}
      >
        {tab.label}
      </ThemedText>
    </Pressable>
  );
}

function PowerUpCard({ 
  type, 
  count, 
  label, 
  icon, 
  color,
  onPlay 
}: { 
  type: string;
  count: number; 
  label: string; 
  icon: string;
  color: string;
  onPlay: () => void;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[styles.powerUpCard, animatedStyle]}
      onPressIn={() => { scale.value = withSpring(0.97); }}
      onPressOut={() => { scale.value = withSpring(1); }}
      onPress={onPlay}
    >
      <View style={[styles.powerUpIcon, { backgroundColor: color + "20" }]}>
        <Feather name={icon as any} size={24} color={color} />
      </View>
      <View style={styles.powerUpInfo}>
        <ThemedText style={styles.powerUpLabel}>{label}</ThemedText>
        <ThemedText style={styles.powerUpCount}>
          {count > 0 ? `${count} owned` : "None owned"}
        </ThemedText>
      </View>
      <View style={[styles.powerUpBadge, count > 0 ? { backgroundColor: color } : styles.powerUpBadgeEmpty]}>
        <ThemedText style={[styles.powerUpBadgeText, count === 0 && { color: GameColors.textSecondary }]}>
          {count}
        </ThemedText>
      </View>
    </AnimatedPressable>
  );
}

function EmptyState({ 
  icon, 
  title, 
  description, 
  buttonLabel, 
  onPress 
}: { 
  icon: string; 
  title: string; 
  description: string; 
  buttonLabel: string;
  onPress: () => void;
}) {
  return (
    <Animated.View entering={FadeIn} style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Feather name={icon as any} size={48} color={GameColors.textSecondary} />
      </View>
      <ThemedText style={styles.emptyTitle}>{title}</ThemedText>
      <ThemedText style={styles.emptyDescription}>{description}</ThemedText>
      <Pressable style={styles.emptyButton} onPress={onPress}>
        <ThemedText style={styles.emptyButtonText}>{buttonLabel}</ThemedText>
      </Pressable>
    </Animated.View>
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

function AllTab({ 
  flappyInventory, 
  huntCollection, 
  huntEggs,
  chyBalance,
  onNavigate 
}: { 
  flappyInventory: FlappyInventory | null;
  huntCollection: number;
  huntEggs: number;
  chyBalance: number;
  onNavigate: (tab: TabType) => void;
}) {
  const totalFlappyItems = flappyInventory 
    ? flappyInventory.shield + flappyInventory.double + flappyInventory.magnet 
    : 0;
  const totalItems = totalFlappyItems + huntCollection;

  return (
    <Animated.View entering={FadeInDown} style={styles.tabContent}>
      <View style={styles.statsCard}>
        <ThemedText style={styles.statsNumber}>{totalItems}</ThemedText>
        <ThemedText style={styles.statsLabel}>Total Items</ThemedText>
      </View>

      <View style={styles.walletPreview}>
        <View style={styles.currencyRow}>
          <Feather name="zap" size={18} color={GameColors.primary} />
          <ThemedText style={styles.currencyLabel}>CHY</ThemedText>
          <ThemedText style={styles.currencyValue}>{chyBalance.toLocaleString()}</ThemedText>
        </View>
      </View>

      <SectionHeader title="Games" />

      <Pressable style={styles.gameCard} onPress={() => onNavigate("flappy")}>
        <View style={[styles.gameIcon, { backgroundColor: "#FF6B6B20" }]}>
          <Feather name="zap" size={24} color="#FF6B6B" />
        </View>
        <View style={styles.gameInfo}>
          <ThemedText style={styles.gameName}>Flappy Roachy</ThemedText>
          <ThemedText style={styles.gameItemCount}>
            {totalFlappyItems} power-ups
          </ThemedText>
        </View>
        <Feather name="chevron-right" size={20} color={GameColors.textSecondary} />
      </Pressable>

      <Pressable style={styles.gameCard} onPress={() => onNavigate("hunt")}>
        <View style={[styles.gameIcon, { backgroundColor: "#00FF8820" }]}>
          <Feather name="map-pin" size={24} color="#00FF88" />
        </View>
        <View style={styles.gameInfo}>
          <ThemedText style={styles.gameName}>Roachy Hunt</ThemedText>
          <ThemedText style={styles.gameItemCount}>
            {huntCollection} creatures, {huntEggs} eggs
          </ThemedText>
        </View>
        <Feather name="chevron-right" size={20} color={GameColors.textSecondary} />
      </Pressable>

      <Pressable style={styles.gameCard} onPress={() => onNavigate("mate")}>
        <View style={[styles.gameIcon, { backgroundColor: "#9D4EDD20" }]}>
          <Feather name="grid" size={24} color="#9D4EDD" />
        </View>
        <View style={styles.gameInfo}>
          <ThemedText style={styles.gameName}>Roachy Mate</ThemedText>
          <ThemedText style={styles.gameItemCount}>No items yet</ThemedText>
        </View>
        <Feather name="chevron-right" size={20} color={GameColors.textSecondary} />
      </Pressable>
    </Animated.View>
  );
}

function FlappyTab({ 
  inventory, 
  isLoading,
  onPlay,
  onMarketplace
}: { 
  inventory: FlappyInventory | null;
  isLoading: boolean;
  onPlay: () => void;
  onMarketplace: () => void;
}) {
  const totalItems = inventory 
    ? inventory.shield + inventory.double + inventory.magnet 
    : 0;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ThemedText style={styles.loadingText}>Loading...</ThemedText>
      </View>
    );
  }

  if (totalItems === 0) {
    return (
      <EmptyState
        icon="zap"
        title="No Power-ups Yet"
        description="Play Flappy Roachy to earn coins and buy power-ups from the marketplace"
        buttonLabel="Visit Marketplace"
        onPress={onMarketplace}
      />
    );
  }

  return (
    <Animated.View entering={FadeInDown} style={styles.tabContent}>
      <View style={styles.gameHeader}>
        <View style={[styles.gameHeaderIcon, { backgroundColor: "#FF6B6B20" }]}>
          <Feather name="zap" size={28} color="#FF6B6B" />
        </View>
        <View>
          <ThemedText style={styles.gameHeaderTitle}>Flappy Roachy</ThemedText>
          <ThemedText style={styles.gameHeaderSubtitle}>{totalItems} power-ups</ThemedText>
        </View>
        <Pressable style={styles.playButton} onPress={onPlay}>
          <Feather name="play" size={16} color={GameColors.background} />
          <ThemedText style={styles.playButtonText}>Play</ThemedText>
        </Pressable>
      </View>

      <SectionHeader title="Power-ups" />

      <PowerUpCard
        type="shield"
        count={inventory?.shield || 0}
        label="Shield"
        icon="shield"
        color="#00D9FF"
        onPlay={onPlay}
      />
      <PowerUpCard
        type="double"
        count={inventory?.double || 0}
        label="Double Points"
        icon="star"
        color="#FFD700"
        onPlay={onPlay}
      />
      <PowerUpCard
        type="magnet"
        count={inventory?.magnet || 0}
        label="Coin Magnet"
        icon="target"
        color="#FF6B6B"
        onPlay={onPlay}
      />

      <Pressable style={styles.marketplaceLink} onPress={onMarketplace}>
        <Feather name="shopping-bag" size={18} color={GameColors.primary} />
        <ThemedText style={styles.marketplaceLinkText}>Get more power-ups</ThemedText>
        <Feather name="external-link" size={14} color={GameColors.textSecondary} />
      </Pressable>
    </Animated.View>
  );
}

function HuntTab({ 
  collection, 
  eggs,
  isHatching,
  onHatch,
  onCreaturePress,
  onPlay
}: { 
  collection: HuntCaughtCreature[];
  eggs: number;
  isHatching: boolean;
  onHatch: () => void;
  onCreaturePress: (uniqueId: string) => void;
  onPlay: () => void;
}) {
  if (collection.length === 0 && eggs === 0) {
    return (
      <EmptyState
        icon="map-pin"
        title="No Creatures Yet"
        description="Explore the map in Roachy Hunt to catch creatures and collect eggs"
        buttonLabel="Start Hunting"
        onPress={onPlay}
      />
    );
  }

  return (
    <Animated.View entering={FadeInDown} style={styles.tabContent}>
      <View style={styles.gameHeader}>
        <View style={[styles.gameHeaderIcon, { backgroundColor: "#00FF8820" }]}>
          <Feather name="map-pin" size={28} color="#00FF88" />
        </View>
        <View>
          <ThemedText style={styles.gameHeaderTitle}>Roachy Hunt</ThemedText>
          <ThemedText style={styles.gameHeaderSubtitle}>
            {collection.length} creatures, {eggs} eggs
          </ThemedText>
        </View>
        <Pressable style={styles.playButton} onPress={onPlay}>
          <Feather name="play" size={16} color={GameColors.background} />
          <ThemedText style={styles.playButtonText}>Hunt</ThemedText>
        </Pressable>
      </View>

      <EggSection 
        eggCount={eggs} 
        onHatch={onHatch}
        isHatching={isHatching}
      />

      <SectionHeader title="My Collection" badge={`${collection.length}`} />

      <View style={styles.creatureGrid}>
        {collection.map((creature, index) => (
          <View key={creature.id} style={styles.gridItemWrapper}>
            <CreatureGridItem
              creature={creature}
              index={index}
              onPress={() => onCreaturePress(creature.id)}
            />
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

function MateTab({ onPlay }: { onPlay: () => void }) {
  return (
    <EmptyState
      icon="grid"
      title="Coming Soon"
      description="Roachy Mate inventory will include tournament tickets, cosmetic pieces, and more"
      buttonLabel="Play Chess"
      onPress={onPlay}
    />
  );
}

function WalletTab({ 
  chyBalance,
  diamondBalance,
  onMarketplace 
}: { 
  chyBalance: number;
  diamondBalance: number;
  onMarketplace: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown} style={styles.tabContent}>
      <SectionHeader title="Currencies" />

      <View style={styles.currencyCard}>
        <View style={[styles.currencyIcon, { backgroundColor: GameColors.primary + "20" }]}>
          <Feather name="zap" size={24} color={GameColors.primary} />
        </View>
        <View style={styles.currencyInfo}>
          <ThemedText style={styles.currencyName}>CHY</ThemedText>
          <ThemedText style={styles.currencyDescription}>In-game currency</ThemedText>
        </View>
        <ThemedText style={styles.currencyAmount}>{chyBalance.toLocaleString()}</ThemedText>
      </View>

      <View style={styles.currencyCard}>
        <View style={[styles.currencyIcon, { backgroundColor: "#FF6B6B20" }]}>
          <Feather name="hexagon" size={24} color="#FF6B6B" />
        </View>
        <View style={styles.currencyInfo}>
          <ThemedText style={styles.currencyName}>ROACHY</ThemedText>
          <ThemedText style={styles.currencyDescription}>SPL Token (Solana)</ThemedText>
        </View>
        <ThemedText style={styles.currencyAmount}>0</ThemedText>
      </View>

      <View style={styles.currencyCard}>
        <View style={[styles.currencyIcon, { backgroundColor: "#00D9FF20" }]}>
          <Feather name="octagon" size={24} color="#00D9FF" />
        </View>
        <View style={styles.currencyInfo}>
          <ThemedText style={styles.currencyName}>Diamonds</ThemedText>
          <ThemedText style={styles.currencyDescription}>Premium currency</ThemedText>
        </View>
        <ThemedText style={styles.currencyAmount}>{diamondBalance}</ThemedText>
      </View>

      <View style={styles.walletNote}>
        <Feather name="info" size={14} color={GameColors.textSecondary} />
        <ThemedText style={styles.walletNoteText}>
          Connect a Solana wallet to trade ROACHY tokens and earn Diamonds
        </ThemedText>
      </View>

      <Pressable style={styles.marketplaceButton} onPress={onMarketplace}>
        <Feather name="shopping-bag" size={18} color={GameColors.primary} />
        <ThemedText style={styles.marketplaceButtonText}>Visit Marketplace</ThemedText>
        <Feather name="external-link" size={14} color={GameColors.textSecondary} />
      </Pressable>
    </Animated.View>
  );
}

export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const { collection, collectedEggs, hatchEggs, refreshEconomy } = useHunt();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [isHatching, setIsHatching] = useState(false);

  const { data: flappyInventory, isLoading: flappyLoading } = useQuery<FlappyInventory>({
    queryKey: ["/api/flappy/inventory", user?.id],
    enabled: !!user?.id,
  });

  const openMarketplace = useCallback(() => {
    WebBrowser.openBrowserAsync(
      `${process.env.EXPO_PUBLIC_MARKETPLACE_URL || "https://roachy.games"}/marketplace`
    );
  }, []);

  const handleHatch = useCallback(async () => {
    setIsHatching(true);
    try {
      const result = await hatchEggs();
      if (result.success && result.creature) {
        const def = getCreatureDefinition(result.creature.templateId);
        refreshEconomy();
        if (user?.walletAddress) {
          queryClient.invalidateQueries({ queryKey: ["/api/hunt/collection", user.walletAddress] });
        }
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
  }, [hatchEggs, refreshEconomy, queryClient, user?.walletAddress]);

  const navigateToCreature = useCallback((uniqueId: string) => {
    navigation.navigate("CreatureDetail", { uniqueId });
  }, [navigation]);

  const navigateToGame = useCallback((game: string) => {
    if (game === "flappy") {
      navigation.getParent()?.navigate("Games", { 
        screen: "FlappyGame" 
      });
    } else if (game === "hunt") {
      navigation.getParent()?.navigate("Hunt");
    } else if (game === "mate") {
      navigation.getParent()?.navigate("Games", { 
        screen: "ChessGame" 
      });
    }
  }, [navigation]);

  const renderTabContent = () => {
    switch (activeTab) {
      case "all":
        return (
          <AllTab
            flappyInventory={flappyInventory || null}
            huntCollection={collection.length}
            huntEggs={collectedEggs}
            chyBalance={user?.chyBalance || 0}
            onNavigate={setActiveTab}
          />
        );
      case "flappy":
        return (
          <FlappyTab
            inventory={flappyInventory || null}
            isLoading={flappyLoading}
            onPlay={() => navigateToGame("flappy")}
            onMarketplace={openMarketplace}
          />
        );
      case "hunt":
        return (
          <HuntTab
            collection={collection}
            eggs={collectedEggs}
            isHatching={isHatching}
            onHatch={handleHatch}
            onCreaturePress={navigateToCreature}
            onPlay={() => navigateToGame("hunt")}
          />
        );
      case "mate":
        return <MateTab onPlay={() => navigateToGame("mate")} />;
      case "wallet":
        return (
          <WalletTab 
            chyBalance={user?.chyBalance || 0} 
            diamondBalance={user?.diamondBalance || 0}
            onMarketplace={openMarketplace} 
          />
        );
      default:
        return null;
    }
  };

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
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBar}
        >
          {TABS.map((tab) => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onPress={() => setActiveTab(tab.id)}
            />
          ))}
        </ScrollView>

        {renderTabContent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
  },
  tabBar: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.full,
  },
  tabButtonActive: {
    backgroundColor: GameColors.primary,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.textSecondary,
  },
  tabLabelActive: {
    color: GameColors.background,
  },
  tabContent: {
    flex: 1,
  },
  loadingContainer: {
    padding: Spacing["3xl"],
    alignItems: "center",
  },
  loadingText: {
    color: GameColors.textSecondary,
  },
  statsCard: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  statsNumber: {
    fontSize: 48,
    fontWeight: "700",
    color: GameColors.primary,
  },
  statsLabel: {
    fontSize: 14,
    color: GameColors.textSecondary,
    marginTop: Spacing.xs,
  },
  walletPreview: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  currencyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  currencyLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  currencyValue: {
    fontSize: 16,
    fontWeight: "700",
    color: GameColors.primary,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  sectionBadge: {
    backgroundColor: GameColors.primary + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  sectionBadgeText: {
    fontSize: 12,
    color: GameColors.primary,
    fontWeight: "600",
  },
  gameCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  gameIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  gameInfo: {
    flex: 1,
  },
  gameName: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  gameItemCount: {
    fontSize: 13,
    color: GameColors.textSecondary,
    marginTop: 2,
  },
  gameHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  gameHeaderIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  gameHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  gameHeaderSubtitle: {
    fontSize: 13,
    color: GameColors.textSecondary,
    marginTop: 2,
  },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: GameColors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginLeft: "auto",
  },
  playButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: GameColors.background,
  },
  powerUpCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  powerUpIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  powerUpInfo: {
    flex: 1,
  },
  powerUpLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  powerUpCount: {
    fontSize: 13,
    color: GameColors.textSecondary,
    marginTop: 2,
  },
  powerUpBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
  },
  powerUpBadgeEmpty: {
    backgroundColor: GameColors.surfaceLight,
  },
  powerUpBadgeText: {
    fontSize: 14,
    fontWeight: "700",
    color: GameColors.background,
  },
  marketplaceLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  marketplaceLinkText: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.primary,
  },
  creatureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridItemWrapper: {
    width: "48%",
    marginBottom: Spacing.md,
  },
  gridItem: {
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
  eggSection: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
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
  currencyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  currencyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyName: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  currencyDescription: {
    fontSize: 12,
    color: GameColors.textSecondary,
    marginTop: 2,
  },
  currencyAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  walletNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  walletNoteText: {
    flex: 1,
    fontSize: 13,
    color: GameColors.textSecondary,
    lineHeight: 18,
  },
  marketplaceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: GameColors.surface,
    borderWidth: 1,
    borderColor: GameColors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
  },
  marketplaceButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.primary,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: GameColors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: GameColors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 14,
    color: GameColors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  emptyButton: {
    backgroundColor: GameColors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: GameColors.background,
  },
});
