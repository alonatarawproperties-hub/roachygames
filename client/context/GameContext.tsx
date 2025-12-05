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

interface GameContextType {
  state: GameState;
  updateLocation: (latitude: number, longitude: number) => void;
  spawnCreatures: () => void;
  catchCreature: (wildCreature: WildCreature) => Promise<{ success: boolean; creature?: CaughtCreature }>;
  mintCreatureNFT: (uniqueId: string) => Promise<boolean>;
  connectWallet: () => Promise<boolean>;
  disconnectWallet: () => void;
  useCatchball: () => boolean;
  addCatchballs: (count: number) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const rarityPriority: Record<CreatureRarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
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

  const useCatchball = useCallback((): boolean => {
    if (state.catchballCount <= 0) return false;
    
    setState(prev => ({
      ...prev,
      catchballCount: prev.catchballCount - 1,
    }));
    
    return true;
  }, [state.catchballCount]);

  const addCatchballs = useCallback((count: number) => {
    setState(prev => ({
      ...prev,
      catchballCount: prev.catchballCount + count,
    }));
  }, []);

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
        useCatchball,
        addCatchballs,
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
