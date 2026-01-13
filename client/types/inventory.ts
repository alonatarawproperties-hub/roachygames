/**
 * Centralized Arcade Inventory Types
 * 
 * This module defines game-agnostic inventory types that work across
 * ALL games in the Roachy Games arcade platform.
 */

import type { ImageSourcePropType } from "react-native";

export type InventoryItemType = 
  | 'creature'
  | 'egg'
  | 'nft'
  | 'equipment'
  | 'consumable'
  | 'currency'
  | 'badge'
  | 'collectible';

export type InventoryItemStatus =
  | 'owned'
  | 'incubating'
  | 'locked'
  | 'ready_to_mint'
  | 'equipped'
  | 'expired';

export type RarityTier = 
  | 'common'
  | 'rare'
  | 'epic'
  | 'legendary';

export interface InventoryItemMedia {
  icon?: string;
  image?: ImageSourcePropType;
  color?: string;
  backgroundColor?: string;
}

export interface InventoryItemBlockchain {
  mintAddress?: string;
  isMintable: boolean;
  tokenStandard?: string;
}

export interface InventoryItemProgress {
  current?: number;
  target?: number;
  label?: string;
}

export interface InventoryItemAction {
  id: string;
  label: string;
  icon?: string;
  route?: {
    gameId: string;
    screen: string;
    params?: Record<string, unknown>;
  };
}

/**
 * Universal inventory item that can represent any collectible
 * from any game in the arcade.
 */
export interface ArcadeInventoryItem {
  id: string;
  gameId: string;
  itemType: InventoryItemType;
  displayName: string;
  description?: string;
  media: InventoryItemMedia;
  rarityTier?: RarityTier;
  quantity: number;
  status: InventoryItemStatus;
  progress?: InventoryItemProgress;
  blockchain: InventoryItemBlockchain;
  createdAt: Date;
  updatedAt?: Date;
  actions?: InventoryItemAction[];
  metadata?: Record<string, unknown>;
  gamePayload?: unknown;
}

/**
 * Interface for game-specific inventory adapters.
 * Each game must implement this to contribute items to the central inventory.
 */
export interface GameInventoryAdapter {
  gameId: string;
  gameName: string;
  gameIcon: string;
  fetchInventory: (walletId: string) => Promise<ArcadeInventoryItem[]>;
  isLoading?: boolean;
  error?: Error | null;
}

/**
 * Aggregated inventory state from all games
 */
export interface ArcadeInventoryState {
  items: ArcadeInventoryItem[];
  isLoading: boolean;
  error: Error | null;
  gameStats: Map<string, {
    gameId: string;
    gameName: string;
    itemCount: number;
  }>;
}

/**
 * Filter options for the inventory view
 */
export type InventoryFilter = 'all' | InventoryItemType;

/**
 * Metadata for each item type - used for dynamic UI rendering
 * This allows any game to register new item types with appropriate labels and icons
 */
export interface ItemTypeMetadata {
  type: InventoryItemType;
  label: string;
  pluralLabel: string;
  icon: string;
  priority: number; // Lower = higher priority in display order
  emptyMessage: string;
  emptyHint?: string;
}

/**
 * Registry of all known item types and their display metadata
 * Games can extend this by adding entries for their unique item types
 */
export const ITEM_TYPE_REGISTRY: Record<InventoryItemType, ItemTypeMetadata> = {
  creature: {
    type: 'creature',
    label: 'Creature',
    pluralLabel: 'Creatures',
    icon: 'target',
    priority: 1,
    emptyMessage: 'No creatures yet',
    emptyHint: 'Play games to catch creatures',
  },
  egg: {
    type: 'egg',
    label: 'Egg',
    pluralLabel: 'Eggs',
    icon: 'package',
    priority: 2,
    emptyMessage: 'No eggs collected',
  },
  nft: {
    type: 'nft',
    label: 'NFT',
    pluralLabel: 'NFTs',
    icon: 'hexagon',
    priority: 3,
    emptyMessage: 'No NFTs minted',
    emptyHint: 'Collect perfect items to mint NFTs',
  },
  equipment: {
    type: 'equipment',
    label: 'Equipment',
    pluralLabel: 'Equipment',
    icon: 'shield',
    priority: 4,
    emptyMessage: 'No equipment owned',
  },
  consumable: {
    type: 'consumable',
    label: 'Consumable',
    pluralLabel: 'Consumables',
    icon: 'zap',
    priority: 5,
    emptyMessage: 'No consumables',
  },
  currency: {
    type: 'currency',
    label: 'Currency',
    pluralLabel: 'Currencies',
    icon: 'dollar-sign',
    priority: 6,
    emptyMessage: 'No currencies',
  },
  badge: {
    type: 'badge',
    label: 'Badge',
    pluralLabel: 'Badges',
    icon: 'award',
    priority: 7,
    emptyMessage: 'No badges earned',
    emptyHint: 'Complete achievements to earn badges',
  },
  collectible: {
    type: 'collectible',
    label: 'Collectible',
    pluralLabel: 'Collectibles',
    icon: 'star',
    priority: 8,
    emptyMessage: 'No collectibles',
  },
};

/**
 * Get metadata for an item type, with sensible defaults for unknown types
 */
export function getItemTypeMetadata(type: InventoryItemType): ItemTypeMetadata {
  return ITEM_TYPE_REGISTRY[type] || {
    type,
    label: type.charAt(0).toUpperCase() + type.slice(1),
    pluralLabel: type.charAt(0).toUpperCase() + type.slice(1) + 's',
    icon: 'box',
    priority: 99,
    emptyMessage: `No ${type}s`,
  };
}

/**
 * Helper to get game info from gameId
 */
export interface GameInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
}
