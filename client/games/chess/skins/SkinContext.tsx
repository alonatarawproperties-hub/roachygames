import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChessSkin, CHESS_SKINS, getSkinById, getAllSkins } from './index';
import { useAuth } from '@/context/AuthContext';

// God accounts have access to ALL skins without purchasing
const GOD_ACCOUNTS = [
  'zajkcomshop@gmail.com',
];

interface SkinContextType {
  currentSkin: ChessSkin;
  setCurrentSkin: (skinId: string) => void;
  ownedSkins: string[];
  addOwnedSkin: (skinId: string) => void;
  isGodAccount: boolean;
}

const SkinContext = createContext<SkinContextType | null>(null);

const SKIN_STORAGE_KEY = '@chess_skin';
const OWNED_SKINS_KEY = '@owned_chess_skins';

export function SkinProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentSkin, setCurrentSkinState] = useState<ChessSkin>(CHESS_SKINS.default);
  const [storedOwnedSkins, setStoredOwnedSkins] = useState<string[]>(['default']);
  
  // Check if current user is a god account
  const isGodAccount = useMemo(() => {
    const email = user?.email?.toLowerCase();
    const isGod = email ? GOD_ACCOUNTS.includes(email) : false;
    console.log('[SkinContext] God account check:', { email, isGod, godAccounts: GOD_ACCOUNTS });
    return isGod;
  }, [user?.email]);
  
  // God accounts own all skins, regular users own what's in storage
  const ownedSkins = useMemo(() => {
    if (isGodAccount) {
      return getAllSkins().map(skin => skin.id);
    }
    return storedOwnedSkins;
  }, [isGodAccount, storedOwnedSkins]);

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
        setStoredOwnedSkins(JSON.parse(savedOwned));
      }
    } catch (error) {
      console.error('Failed to load owned skins:', error);
    }
  };

  const setCurrentSkin = async (skinId: string) => {
    const skin = getSkinById(skinId);
    // God accounts can equip any skin, regular users need to own it
    if (skin && (isGodAccount || ownedSkins.includes(skinId))) {
      setCurrentSkinState(skin);
      try {
        await AsyncStorage.setItem(SKIN_STORAGE_KEY, skinId);
      } catch (error) {
        console.error('Failed to save skin preference:', error);
      }
    }
  };

  const addOwnedSkin = async (skinId: string) => {
    if (!storedOwnedSkins.includes(skinId)) {
      const newOwned = [...storedOwnedSkins, skinId];
      setStoredOwnedSkins(newOwned);
      try {
        await AsyncStorage.setItem(OWNED_SKINS_KEY, JSON.stringify(newOwned));
      } catch (error) {
        console.error('Failed to save owned skins:', error);
      }
    }
  };

  return (
    <SkinContext.Provider value={{ currentSkin, setCurrentSkin, ownedSkins, addOwnedSkin, isGodAccount }}>
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
      isGodAccount: false,
    };
  }
  return context;
}
