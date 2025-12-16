import React, { createContext, useContext, useState, useCallback } from "react";
import { RoachySkin } from "@/games/flappy/flappySkins";

export { RoachySkin };

interface FlappySkinContextType {
  equippedSkin: RoachySkin;
  setEquippedSkin: (skin: RoachySkin) => void;
  isLoading: boolean;
}

const FlappySkinContext = createContext<FlappySkinContextType | null>(null);

export function FlappySkinProvider({ children }: { children: React.ReactNode }) {
  const [equippedSkin, setEquippedSkinState] = useState<RoachySkin>("default");
  const [isLoading, setIsLoading] = useState(false);

  const setEquippedSkin = useCallback((skin: RoachySkin) => {
    setEquippedSkinState(skin);
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
