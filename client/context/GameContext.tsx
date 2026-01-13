import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  GameState,
  CaughtCreature,
  WildCreature,
  createInitialGameState,
  spawnCreaturesNearLocation,
  attemptCatch,
  generateMockTxHash,
} from '@/constants/gameState';
import { getCreatureDefinition, CreatureRarity } from '@/constants/creatures';

interface HatchResult {
  success: boolean;
  creature?: CaughtCreature;
  error?: string;
}

interface GameContextType {
  state: GameState;
  updateLocation: (latitude: number, longitude: number) => void;
  spawnCreatures: () => void;
  catchCreature: (wildCreature: WildCreature) => Promise<{ success: boolean; creature?: CaughtCreature }>;
  mintCreatureNFT: (uniqueId: string) => Promise<boolean>;
  connectWallet: () => Promise<boolean>;
  disconnectWallet: () => void;
  useEgg: () => boolean;
  addEggs: (count: number) => void;
  setEggCount: (count: number) => void;
  hatchEggs: () => Promise<HatchResult>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const rarityPriority: Record<CreatureRarity, number> = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(createInitialGameState);

  const updateLocation = useCallback((latitude: number, longitude: number) => {
    setState(prev => ({
      ...prev,
      playerLocation: { latitude, longitude },
    }));
  }, []);

  const spawnCreatures = useCallback(() => {
    if (!state.playerLocation) return;
    
    const newCreatures = spawnCreaturesNearLocation(
      state.playerLocation.latitude,
      state.playerLocation.longitude,
      5
    );
    
    setState(prev => ({
      ...prev,
      nearbyCreatures: newCreatures,
    }));
  }, [state.playerLocation]);

  const catchCreature = useCallback(async (wildCreature: WildCreature): Promise<{ success: boolean; creature?: CaughtCreature }> => {
    const definition = getCreatureDefinition(wildCreature.id);
    if (!definition) return { success: false };

    const success = attemptCatch(definition.catchRate);
    
    if (success) {
      const newCreature: CaughtCreature = {
        id: wildCreature.id,
        uniqueId: wildCreature.uniqueId,
        caughtAt: new Date(),
        catchLocation: wildCreature.location,
        level: Math.floor(Math.random() * 10) + 1,
        blockchainMinted: false,
      };

      setState(prev => {
        const newRarityPriority = rarityPriority[definition.rarity];
        const currentRarestId = prev.playerStats.rarestCatch;
        const currentRarestDef = currentRarestId ? getCreatureDefinition(currentRarestId) : null;
        const currentRarityPriority = currentRarestDef ? rarityPriority[currentRarestDef.rarity] : 0;

        return {
          ...prev,
          inventory: [...prev.inventory, newCreature],
          nearbyCreatures: prev.nearbyCreatures.filter(c => c.uniqueId !== wildCreature.uniqueId),
          playerStats: {
            ...prev.playerStats,
            totalCaught: prev.playerStats.totalCaught + 1,
            rarestCatch: newRarityPriority > currentRarityPriority ? wildCreature.id : prev.playerStats.rarestCatch,
          },
        };
      });

      return { success: true, creature: newCreature };
    }

    return { success: false };
  }, []);

  const mintCreatureNFT = useCallback(async (uniqueId: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const txHash = generateMockTxHash();
    
    setState(prev => ({
      ...prev,
      inventory: prev.inventory.map(c =>
        c.uniqueId === uniqueId
          ? { ...c, blockchainMinted: true, txHash }
          : c
      ),
      wallet: {
        ...prev.wallet,
        nftBalance: prev.wallet.nftBalance + 1,
      },
    }));

    return true;
  }, []);

  const connectWallet = useCallback(async (): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockAddress = '0x' + Array.from({ length: 40 }, () => 
      '0123456789abcdef'[Math.floor(Math.random() * 16)]
    ).join('');

    setState(prev => ({
      ...prev,
      wallet: {
        connected: true,
        address: mockAddress,
        nftBalance: prev.wallet.nftBalance,
      },
    }));

    return true;
  }, []);

  const disconnectWallet = useCallback(() => {
    setState(prev => ({
      ...prev,
      wallet: {
        connected: false,
        address: undefined,
        nftBalance: 0,
      },
      inventory: prev.inventory.map(c => ({
        ...c,
        blockchainMinted: false,
        txHash: undefined,
      })),
    }));
  }, []);

  const useEgg = useCallback((): boolean => {
    if (state.eggCount <= 0) return false;
    
    setState(prev => ({
      ...prev,
      eggCount: prev.eggCount - 1,
    }));
    
    return true;
  }, [state.eggCount]);

  const addEggs = useCallback((count: number) => {
    setState(prev => ({
      ...prev,
      eggCount: prev.eggCount + count,
    }));
  }, []);

  const setEggCount = useCallback((count: number) => {
    setState(prev => ({
      ...prev,
      eggCount: count,
    }));
  }, []);

  const hatchEggs = useCallback(async (): Promise<HatchResult> => {
    if (state.eggCount < 10) {
      return { success: false, error: 'Need 10 eggs to hatch' };
    }

    try {
      const { apiRequest } = await import('@/lib/query-client');
      const response = await apiRequest('POST', '/api/hunt/hatch', {
        walletAddress: state.wallet.address || 'guest_player',
        latitude: state.playerLocation?.latitude || 0,
        longitude: state.playerLocation?.longitude || 0,
      });

      const data = await response.json();

      if (data.success && data.creature) {
        const newCreature: CaughtCreature = {
          id: data.creature.templateId,
          uniqueId: data.creature.id,
          caughtAt: new Date(),
          catchLocation: {
            latitude: parseFloat(data.creature.catchLatitude) || 0,
            longitude: parseFloat(data.creature.catchLongitude) || 0,
          },
          level: data.creature.level || 1,
          blockchainMinted: false,
        };

        setState(prev => ({
          ...prev,
          inventory: [...prev.inventory, newCreature],
          eggCount: data.collectedEggs,
        }));

        return { success: true, creature: newCreature };
      }

      return { success: false, error: data.error || 'Hatch failed' };
    } catch (error) {
      console.error('Hatch error:', error);
      return { success: false, error: 'Failed to hatch eggs' };
    }
  }, [state.eggCount, state.wallet.address, state.playerLocation]);

  return (
    <GameContext.Provider
      value={{
        state,
        updateLocation,
        spawnCreatures,
        catchCreature,
        mintCreatureNFT,
        connectWallet,
        disconnectWallet,
        useEgg,
        addEggs,
        setEggCount,
        hatchEggs,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
