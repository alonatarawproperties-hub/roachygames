/**
 * Centralized Arcade Inventory Context
 * 
 * Aggregates inventory items from ALL games in the arcade platform.
 * Each game registers an adapter that converts its items to the
 * universal ArcadeInventoryItem format.
 */

import React, { createContext, useContext, useMemo, useCallback } from "react";
import { useHunt } from "./HuntContext";
import { GAMES_CATALOG } from "@/constants/gamesCatalog";
import { CREATURE_IMAGES } from "@/constants/creatures";
import type {
  ArcadeInventoryItem,
  ArcadeInventoryState,
  InventoryFilter,
  InventoryItemType,
  GameInfo,
  RarityTier,
} from "@/types/inventory";

interface ArcadeInventoryContextType extends ArcadeInventoryState {
  getFilteredItems: (filter: InventoryFilter) => ArcadeInventoryItem[];
  getItemsByGame: (gameId: string) => ArcadeInventoryItem[];
  getItemsByType: (type: InventoryItemType) => ArcadeInventoryItem[];
  getGameInfo: (gameId: string) => GameInfo | null;
  getTotalCount: () => number;
  getCountByType: (type: InventoryItemType) => number;
  getMintableCount: () => number;
  refetch: () => void;
}

const ArcadeInventoryContext = createContext<ArcadeInventoryContextType | null>(null);

/**
 * Map rarity string to RarityTier enum
 */
function mapRarity(rarity: string): RarityTier {
  const rarityMap: Record<string, RarityTier> = {
    common: "common",
    uncommon: "uncommon",
    rare: "rare",
    epic: "epic",
    legendary: "legendary",
  };
  return rarityMap[rarity.toLowerCase()] || "common";
}

/**
 * Get rarity color for display
 */
function getRarityColor(rarity: RarityTier): string {
  const colors: Record<RarityTier, string> = {
    common: "#9CA3AF",
    uncommon: "#10B981",
    rare: "#3B82F6",
    epic: "#8B5CF6",
    legendary: "#F59E0B",
  };
  return colors[rarity];
}

export function ArcadeInventoryProvider({ children }: { children: React.ReactNode }) {
  const hunt = useHunt();

  /**
   * ADAPTER: Roachy Hunt - Creatures
   * Converts Hunt creatures to universal inventory items
   */
  const huntCreatureItems: ArcadeInventoryItem[] = useMemo(() => {
    if (!hunt.collection) return [];
    
    return hunt.collection.map((creature) => {
      const rarity = mapRarity(creature.rarity);
      return {
        id: `hunt-creature-${creature.id}`,
        gameId: "roachy-hunt",
        itemType: "creature" as const,
        displayName: creature.name,
        description: `A ${creature.rarity} ${creature.creatureClass} Roachy`,
        media: {
          image: CREATURE_IMAGES[creature.templateId],
          icon: creature.creatureClass,
          color: getRarityColor(rarity),
          backgroundColor: getRarityColor(rarity) + "20",
        },
        rarityTier: rarity,
        quantity: 1,
        status: creature.isPerfect ? "ready_to_mint" as const : "owned" as const,
        blockchain: {
          isMintable: creature.isPerfect === true,
        },
        createdAt: new Date(),
        actions: [
          {
            id: "view",
            label: "View Details",
            icon: "eye",
            route: {
              gameId: "roachy-hunt",
              screen: "CreatureDetail",
              params: { creatureId: creature.id },
            },
          },
        ],
        metadata: {
          creatureClass: creature.creatureClass,
          isPerfect: creature.isPerfect,
          level: creature.level,
        },
        gamePayload: creature,
      };
    });
  }, [hunt.collection]);

  /**
   * ADAPTER: Roachy Hunt - Eggs
   * Converts Hunt eggs to universal inventory items
   */
  const huntEggItems: ArcadeInventoryItem[] = useMemo(() => {
    if (!hunt.eggs) return [];
    
    return hunt.eggs.map((egg) => {
      const rarity = mapRarity(egg.rarity);
      const progress = egg.isIncubating ? {
        current: egg.walkedDistance,
        target: egg.requiredDistance,
        label: `${egg.walkedDistance.toFixed(1)}/${egg.requiredDistance}km`,
      } : undefined;

      return {
        id: `hunt-egg-${egg.id}`,
        gameId: "roachy-hunt",
        itemType: "egg" as const,
        displayName: `${egg.rarity} Egg`,
        description: egg.isIncubating 
          ? `Incubating - ${((egg.walkedDistance / egg.requiredDistance) * 100).toFixed(0)}% complete`
          : "Ready to incubate",
        media: {
          icon: "package",
          color: getRarityColor(rarity),
          backgroundColor: getRarityColor(rarity) + "20",
        },
        rarityTier: rarity,
        quantity: 1,
        status: egg.isIncubating ? "incubating" as const : "owned" as const,
        progress,
        blockchain: {
          isMintable: false,
        },
        createdAt: new Date(),
        actions: [
          {
            id: "incubate",
            label: egg.isIncubating ? "View Progress" : "Start Incubating",
            icon: egg.isIncubating ? "clock" : "play",
            route: {
              gameId: "roachy-hunt",
              screen: "Eggs",
              params: { eggId: egg.id },
            },
          },
        ],
        metadata: {
          requiredDistance: egg.requiredDistance,
          walkedDistance: egg.walkedDistance,
          isIncubating: egg.isIncubating,
        },
        gamePayload: egg,
      };
    });
  }, [hunt.eggs]);

  /**
   * FUTURE ADAPTERS - Stub implementations for upcoming games
   * When games launch, implement their adapters here
   */

  // Roachy Battles - will have battle cards, equipment
  const battlesItems: ArcadeInventoryItem[] = useMemo(() => {
    // TODO: Implement when Roachy Battles launches
    return [];
  }, []);

  // Flappy Roach - will have skins, power-ups
  const flappyItems: ArcadeInventoryItem[] = useMemo(() => {
    // TODO: Implement when Flappy Roach launches
    return [];
  }, []);

  // Roachy Mate - will have breeding items, genetics
  const mateItems: ArcadeInventoryItem[] = useMemo(() => {
    // TODO: Implement when Roachy Mate launches
    return [];
  }, []);

  /**
   * Aggregate ALL items from ALL games
   */
  const allItems: ArcadeInventoryItem[] = useMemo(() => {
    return [
      ...huntCreatureItems,
      ...huntEggItems,
      ...battlesItems,
      ...flappyItems,
      ...mateItems,
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [huntCreatureItems, huntEggItems, battlesItems, flappyItems, mateItems]);

  /**
   * Calculate per-game statistics
   */
  const gameStats = useMemo(() => {
    const stats = new Map<string, { gameId: string; gameName: string; itemCount: number }>();
    
    allItems.forEach((item) => {
      const existing = stats.get(item.gameId);
      const game = GAMES_CATALOG.find((g) => g.id === item.gameId);
      
      if (existing) {
        existing.itemCount++;
      } else {
        stats.set(item.gameId, {
          gameId: item.gameId,
          gameName: game?.title || item.gameId,
          itemCount: 1,
        });
      }
    });
    
    return stats;
  }, [allItems]);

  /**
   * Loading state - aggregate from all game sources
   */
  const isLoading = hunt.isLoading;

  /**
   * Filter items by type
   */
  const getFilteredItems = useCallback((filter: InventoryFilter): ArcadeInventoryItem[] => {
    if (filter === "all") return allItems;
    return allItems.filter((item) => item.itemType === filter);
  }, [allItems]);

  /**
   * Get items from a specific game
   */
  const getItemsByGame = useCallback((gameId: string): ArcadeInventoryItem[] => {
    return allItems.filter((item) => item.gameId === gameId);
  }, [allItems]);

  /**
   * Get items of a specific type
   */
  const getItemsByType = useCallback((type: InventoryItemType): ArcadeInventoryItem[] => {
    return allItems.filter((item) => item.itemType === type);
  }, [allItems]);

  /**
   * Get game info for display
   */
  const getGameInfo = useCallback((gameId: string): GameInfo | null => {
    const game = GAMES_CATALOG.find((g) => g.id === gameId);
    if (!game) return null;
    
    return {
      id: game.id,
      name: game.title,
      icon: game.iconName,
      color: "#F7C948",
    };
  }, []);

  /**
   * Get total item count
   */
  const getTotalCount = useCallback(() => allItems.length, [allItems]);

  /**
   * Get count by item type
   */
  const getCountByType = useCallback((type: InventoryItemType): number => {
    return allItems.filter((item) => item.itemType === type).length;
  }, [allItems]);

  /**
   * Get count of mintable items
   */
  const getMintableCount = useCallback((): number => {
    return allItems.filter((item) => item.blockchain.isMintable).length;
  }, [allItems]);

  /**
   * Refetch all inventory data
   */
  const refetch = useCallback(() => {
    hunt.refreshSpawns();
    hunt.refreshEconomy();
    // Add refetch calls for other games when implemented
  }, [hunt]);

  const value: ArcadeInventoryContextType = {
    items: allItems,
    isLoading,
    error: null,
    gameStats,
    getFilteredItems,
    getItemsByGame,
    getItemsByType,
    getGameInfo,
    getTotalCount,
    getCountByType,
    getMintableCount,
    refetch,
  };

  return (
    <ArcadeInventoryContext.Provider value={value}>
      {children}
    </ArcadeInventoryContext.Provider>
  );
}

export function useArcadeInventory() {
  const context = useContext(ArcadeInventoryContext);
  if (!context) {
    throw new Error("useArcadeInventory must be used within ArcadeInventoryProvider");
  }
  return context;
}
