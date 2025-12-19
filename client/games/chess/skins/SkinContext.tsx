import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChessSkin, CHESS_SKINS, getSkinById } from './index';

interface SkinContextType {
  currentSkin: ChessSkin;
  setCurrentSkin: (skinId: string) => void;
  ownedSkins: string[];
  addOwnedSkin: (skinId: string) => void;
}

const SkinContext = createContext<SkinContextType | null>(null);

const SKIN_STORAGE_KEY = '@chess_skin';
const OWNED_SKINS_KEY = '@owned_chess_skins';

export function SkinProvider({ children }: { children: ReactNode }) {
  const [currentSkin, setCurrentSkinState] = useState<ChessSkin>(CHESS_SKINS.default);
  const [ownedSkins, setOwnedSkins] = useState<string[]>(['default']);

  useEffect(() => {
    loadSkinPreference();
    loadOwnedSkins();
  }, []);

  const loadSkinPreference = async () => {
    try {
      const savedSkinId = await AsyncStorage.getItem(SKIN_STORAGE_KEY);
      if (savedSkinId) {
        const skin = getSkinById(savedSkinId);
        if (skin) {
          setCurrentSkinState(skin);
        }
      }
    } catch (error) {
      console.error('Failed to load skin preference:', error);
    }
  };

  const loadOwnedSkins = async () => {
    try {
      const savedOwned = await AsyncStorage.getItem(OWNED_SKINS_KEY);
      if (savedOwned) {
        setOwnedSkins(JSON.parse(savedOwned));
      }
    } catch (error) {
      console.error('Failed to load owned skins:', error);
    }
  };

  const setCurrentSkin = async (skinId: string) => {
    const skin = getSkinById(skinId);
    if (skin && ownedSkins.includes(skinId)) {
      setCurrentSkinState(skin);
      try {
        await AsyncStorage.setItem(SKIN_STORAGE_KEY, skinId);
      } catch (error) {
        console.error('Failed to save skin preference:', error);
      }
    }
  };

  const addOwnedSkin = async (skinId: string) => {
    if (!ownedSkins.includes(skinId)) {
      const newOwned = [...ownedSkins, skinId];
      setOwnedSkins(newOwned);
      try {
        await AsyncStorage.setItem(OWNED_SKINS_KEY, JSON.stringify(newOwned));
      } catch (error) {
        console.error('Failed to save owned skins:', error);
      }
    }
  };

  return (
    <SkinContext.Provider value={{ currentSkin, setCurrentSkin, ownedSkins, addOwnedSkin }}>
      {children}
    </SkinContext.Provider>
  );
}

export function useChessSkin() {
  const context = useContext(SkinContext);
  if (!context) {
    return {
      currentSkin: CHESS_SKINS.default,
      setCurrentSkin: () => {},
      ownedSkins: ['default'],
      addOwnedSkin: () => {},
    };
  }
  return context;
}
