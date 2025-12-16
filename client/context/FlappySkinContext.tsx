import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RoachySkin, FLAPPY_SKINS } from "@/games/flappy/flappySkins";

export { RoachySkin };

interface FlappySkinContextType {
  equippedSkin: RoachySkin;
  setEquippedSkin: (skin: RoachySkin) => void;
  isLoading: boolean;
}

const STORAGE_KEY = "flappy_equipped_skin";

const FlappySkinContext = createContext<FlappySkinContextType | null>(null);

export function FlappySkinProvider({ children }: { children: React.ReactNode }) {
  const [equippedSkin, setEquippedSkinState] = useState<RoachySkin>("default");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSkin() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && stored in FLAPPY_SKINS) {
          setEquippedSkinState(stored as RoachySkin);
        }
      } catch (e) {
      } finally {
        setIsLoading(false);
      }
    }
    loadSkin();
  }, []);

  const setEquippedSkin = useCallback(async (skin: RoachySkin) => {
    setEquippedSkinState(skin);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, skin);
    } catch (e) {
    }
  }, []);

  return (
    <FlappySkinContext.Provider value={{ equippedSkin, setEquippedSkin, isLoading }}>
      {children}
    </FlappySkinContext.Provider>
  );
}

export function useFlappySkin() {
  const context = useContext(FlappySkinContext);
  if (!context) {
    throw new Error("useFlappySkin must be used within FlappySkinProvider");
  }
  return context;
}
