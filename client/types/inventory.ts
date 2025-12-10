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
  | 'uncommon'
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
 * Helper to get game info from gameId
 */
export interface GameInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
}
