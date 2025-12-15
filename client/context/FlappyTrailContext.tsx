import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type RoachyTrail = "none" | "breeze";

interface FlappyTrailContextType {
  equippedTrail: RoachyTrail;
  setEquippedTrail: (trail: RoachyTrail) => void;
  isLoading: boolean;
}

const STORAGE_KEY = "flappy_equipped_trail";

const FlappyTrailContext = createContext<FlappyTrailContextType | null>(null);

export function FlappyTrailProvider({ children }: { children: React.ReactNode }) {
  const [equippedTrail, setEquippedTrailState] = useState<RoachyTrail>("none");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTrail() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === "none" || stored === "breeze") {
          setEquippedTrailState(stored);
        }
      } catch (e) {
      } finally {
        setIsLoading(false);
      }
    }
    loadTrail();
  }, []);

  const setEquippedTrail = useCallback(async (trail: RoachyTrail) => {
    setEquippedTrailState(trail);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, trail);
    } catch (e) {
    }
  }, []);

  return (
    <FlappyTrailContext.Provider value={{ equippedTrail, setEquippedTrail, isLoading }}>
      {children}
    </FlappyTrailContext.Provider>
  );
}

export function useFlappyTrail() {
  const context = useContext(FlappyTrailContext);
  if (!context) {
    throw new Error("useFlappyTrail must be used within FlappyTrailProvider");
  }
  return context;
}
