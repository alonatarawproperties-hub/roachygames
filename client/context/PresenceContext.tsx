import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import * as Crypto from "expo-crypto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/lib/query-client";
import { useAuth } from "@/context/AuthContext";

interface PresenceStats {
  onlineCount: number;
  playingByGame: Record<string, number>;
}

interface NearbyPlayer {
  lat: number;
  lng: number;
}

interface PresenceContextType {
  stats: PresenceStats;
  nearbyPlayers: NearbyPlayer[];
  isVisible: boolean;
  setCurrentGame: (gameId: string | null) => void;
  setLocation: (lat: number, lng: number) => void;
  setVisibility: (visible: boolean) => void;
}

const PresenceContext = createContext<PresenceContextType>({
  stats: { onlineCount: 0, playingByGame: {} },
  nearbyPlayers: [],
  isVisible: true,
  setCurrentGame: () => {},
  setLocation: () => {},
  setVisibility: () => {},
});

const HEARTBEAT_INTERVAL_MS = 30000;
const VISIBILITY_KEY = "presence_visible";

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [stats, setStats] = useState<PresenceStats>({
    onlineCount: 0,
    playingByGame: {},
  });
  const [nearbyPlayers, setNearbyPlayers] = useState<NearbyPlayer[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const sessionIdRef = useRef<string | null>(null);
  const currentGameRef = useRef<string | null>(null);
  const locationRef = useRef<{ lat: number; lng: number } | null>(null);
  const visibleRef = useRef(true);
  const heartbeatInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    AsyncStorage.getItem(VISIBILITY_KEY).then((val) => {
      const visible = val !== "false";
      setIsVisible(visible);
      visibleRef.current = visible;
    });
  }, []);

  const getSessionId = useCallback(async (): Promise<string> => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = await Crypto.randomUUID();
    }
    return sessionIdRef.current;
  }, []);

  const sendHeartbeat = useCallback(async () => {
    try {
      const sid = await getSessionId();
      const loc = locationRef.current;
      const response = await fetch(`${getApiUrl()}/api/presence/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sid,
          userId: user?.id || null,
          currentGame: currentGameRef.current,
          lat: loc?.lat ?? null,
          lng: loc?.lng ?? null,
          visible: visibleRef.current,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats({
          onlineCount: data.onlineCount || 0,
          playingByGame: data.playingByGame || {},
        });
        setNearbyPlayers(data.nearbyPlayers || []);
      }
    } catch (error) {
      // Silently fail - presence is non-critical
    }
  }, [user?.id, getSessionId]);

  const sendLeave = useCallback(async () => {
    try {
      if (!sessionIdRef.current) return;
      await fetch(`${getApiUrl()}/api/presence/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionIdRef.current }),
      });
    } catch (error) {
      // Silently fail
    }
  }, []);

  const setCurrentGame = useCallback((gameId: string | null) => {
    currentGameRef.current = gameId;
    sendHeartbeat();
  }, [sendHeartbeat]);

  const setLocation = useCallback((lat: number, lng: number) => {
    locationRef.current = { lat, lng };
  }, []);

  const setVisibility = useCallback(async (visible: boolean) => {
    visibleRef.current = visible;
    setIsVisible(visible);
    await AsyncStorage.setItem(VISIBILITY_KEY, visible ? "true" : "false");
    sendHeartbeat();
  }, [sendHeartbeat]);

  useEffect(() => {
    sendHeartbeat();
    
    heartbeatInterval.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        sendLeave();
      } else if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        sendHeartbeat();
      }
      appState.current = nextAppState;
    });

    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      subscription.remove();
      sendLeave();
    };
  }, [sendHeartbeat, sendLeave]);

  return (
    <PresenceContext.Provider value={{ stats, nearbyPlayers, isVisible, setCurrentGame, setLocation, setVisibility }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresenceContext() {
  return useContext(PresenceContext);
}

export function useGamePresence(gameId: string) {
  const { setCurrentGame } = usePresenceContext();
  
  useEffect(() => {
    setCurrentGame(gameId);
    return () => {
      setCurrentGame(null);
    };
  }, [gameId, setCurrentGame]);
}
