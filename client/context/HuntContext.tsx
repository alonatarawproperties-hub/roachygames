import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useWallet } from "./WalletContext";

const WALLET_STORAGE_KEY = "roachy_hunt_wallet_address";

export interface Spawn {
  id: string;
  latitude: string;
  longitude: string;
  templateId: string;
  name: string;
  creatureClass: string;
  rarity: string;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
  containedTemplateId?: string | null;
  distance?: number;
}

export interface CaughtCreature {
  id: string;
  templateId: string;
  name: string;
  creatureClass: string;
  rarity: string;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
  level: number;
  xp: number;
  ivHp: number;
  ivAtk: number;
  ivDef: number;
  ivSpd: number;
  isPerfect: boolean;
  catchQuality: string;
}

export interface EconomyStats {
  energy: number;
  maxEnergy: number;
  catchesToday: number;
  maxCatchesPerDay: number;
  catchesSinceRare: number;
  catchesSinceEpic: number;
  currentStreak: number;
  longestStreak: number;
  collectedEggs: number;
}

export interface PhaseIStats {
  walletAddress: string;
  huntsToday: number;
  dailyCap: number;
  streakCount: number;
  longestStreak: number;
  eggs: {
    common: number;
    rare: number;
    epic: number;
    legendary: number;
  };
  pity: {
    rareIn: number;
    epicIn: number;
    legendaryIn: number;
  };
  warmth: number;
  hunterLevel: number;
  hunterXp: number;
  boostTokens: number;
  recentDrops: string[];
  weekKey: string;
  pointsThisWeek: number;
  perfectsThisWeek: number;
}

export interface Egg {
  id: string;
  rarity: string;
  requiredDistance: number;
  walkedDistance: number;
  isIncubating: boolean;
}

export interface Raid {
  id: string;
  latitude: string;
  longitude: string;
  bossName: string;
  bossClass: string;
  rarity: string;
  currentHp: number;
  maxHp: number;
  participantCount: number;
  expiresAt: string;
}

export interface CatchResult {
  success: boolean;
  isMysteryEgg?: boolean;
  isRoachyEgg?: boolean;
  creature?: CaughtCreature;
  eggRarity?: string;
  collectedEggs?: number;
  eggsRequired?: number;
  canHatch?: boolean;
  xpGain?: number;
  streak?: number;
}

interface HatchResult {
  success: boolean;
  creature?: CaughtCreature;
  error?: string;
}

interface HuntContextType {
  walletAddress: string;
  playerLocation: { latitude: number; longitude: number; heading?: number } | null;
  spawns: Spawn[];
  economy: EconomyStats | null;
  phaseIStats: PhaseIStats | null;
  collection: CaughtCreature[];
  eggs: Egg[];
  raids: Raid[];
  isLoading: boolean;
  economyReady: boolean;
  collectedEggs: number;
  updateLocation: (latitude: number, longitude: number, heading?: number) => Promise<void>;
  spawnCreatures: () => Promise<void>;
  catchCreature: (spawnId: string, catchQuality: string) => Promise<CaughtCreature | null>;
  collectEgg: (spawnId: string) => Promise<CatchResult | null>;
  hatchEggs: () => Promise<HatchResult>;
  startIncubation: (eggId: string, incubatorId: string) => Promise<void>;
  walkEgg: (eggId: string, distance: number) => Promise<any>;
  joinRaid: (raidId: string) => Promise<void>;
  attackRaid: (raidId: string, attackPower: number) => Promise<any>;
  claimNode: (nodeId: string, lat: number, lon: number, quality: string) => Promise<any>;
  recycleEggs: (amount: number) => Promise<any>;
  fuseEggs: (rarity: string, times: number) => Promise<any>;
  refreshSpawns: () => void;
  refreshEconomy: () => void;
  refreshPhaseIStats: () => void;
}

const HuntContext = createContext<HuntContextType | null>(null);

export function useHunt() {
  const context = useContext(HuntContext);
  if (!context) {
    throw new Error("useHunt must be used within a HuntProvider");
  }
  return context;
}

interface HuntProviderProps {
  children: ReactNode;
}

// Generate a temporary wallet ID synchronously to avoid query registration issues
function generateTempWalletId(): string {
  return `player_${Math.random().toString(36).substring(2, 15)}`;
}

export function HuntProvider({ children }: HuntProviderProps) {
  const queryClient = useQueryClient();
  const { wallet: solanaWallet } = useWallet();
  // Initialize with a temporary wallet immediately so queries can start
  const [guestWalletAddress, setGuestWalletAddress] = useState<string>(() => generateTempWalletId());
  const [walletSynced, setWalletSynced] = useState(false);
  const [playerLocation, setPlayerLocation] = useState<{ latitude: number; longitude: number; heading?: number } | null>(null);

  const walletAddress = solanaWallet.connected && solanaWallet.address 
    ? solanaWallet.address 
    : guestWalletAddress;

  // Sync with AsyncStorage to maintain persistence across sessions
  useEffect(() => {
    const syncWalletFromStorage = async () => {
      try {
        const storedWallet = await AsyncStorage.getItem(WALLET_STORAGE_KEY);
        if (storedWallet && storedWallet !== guestWalletAddress) {
          // Use the stored wallet instead of the temp one
          setGuestWalletAddress(storedWallet);
        } else if (!storedWallet) {
          // No stored wallet - save the current temp one
          await AsyncStorage.setItem(WALLET_STORAGE_KEY, guestWalletAddress);
        }
      } catch (error) {
        console.error("Failed to sync wallet:", error);
        // Keep using the temp wallet, it's already set
      } finally {
        setWalletSynced(true);
      }
    };
    syncWalletFromStorage();
  }, [guestWalletAddress]);

  const { data: economyData, refetch: refreshEconomy, isFetched: economyFetched, isError: economyError } = useQuery({
    queryKey: ["/api/hunt/economy", walletAddress],
    queryFn: async () => {
      console.log("Economy query starting for:", walletAddress);
      const url = new URL(`/api/hunt/economy/${walletAddress}`, getApiUrl());
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      try {
        const response = await fetch(url.toString(), { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.log("Economy fetch failed:", response.status);
          // Return default economy on error instead of null
          return {
            energy: 100,
            maxEnergy: 100,
            catchesToday: 0,
            maxCatchesPerDay: 50,
            catchesSinceRare: 0,
            catchesSinceEpic: 0,
            currentStreak: 0,
            longestStreak: 0,
            collectedEggs: 0,
          } as EconomyStats;
        }
        const data = await response.json();
        console.log("Economy data loaded:", data.economy);
        return data.economy as EconomyStats;
      } catch (error) {
        clearTimeout(timeoutId);
        console.log("Economy fetch error:", error);
        // Return default economy on error
        return {
          energy: 100,
          maxEnergy: 100,
          catchesToday: 0,
          maxCatchesPerDay: 50,
          catchesSinceRare: 0,
          catchesSinceEpic: 0,
          currentStreak: 0,
          longestStreak: 0,
          collectedEggs: 0,
        } as EconomyStats;
      }
    },
    // Always enabled since walletAddress is guaranteed non-empty from initialization
    retry: 2,
    retryDelay: 1000,
  });

  const { data: spawnsData, refetch: refreshSpawns, isLoading: spawnsLoading } = useQuery({
    queryKey: ["/api/hunt/spawns", playerLocation?.latitude, playerLocation?.longitude],
    queryFn: async () => {
      if (!playerLocation) {
        console.log("No player location, returning empty spawns");
        return [];
      }
      const url = new URL("/api/hunt/spawns", getApiUrl());
      url.searchParams.set("latitude", playerLocation.latitude.toString());
      url.searchParams.set("longitude", playerLocation.longitude.toString());
      url.searchParams.set("radius", "500");
      console.log("Fetching spawns from:", url.toString());
      const response = await fetch(url.toString());
      if (!response.ok) {
        console.log("Spawns fetch failed:", response.status);
        return [];
      }
      const data = await response.json();
      console.log("Spawns response:", data?.spawns?.length || 0, "spawns");
      const mappedSpawns = (data.spawns || []).map((spawn: Spawn) => ({
        ...spawn,
        distance: calculateDistance(
          playerLocation.latitude,
          playerLocation.longitude,
          parseFloat(spawn.latitude),
          parseFloat(spawn.longitude)
        ),
      }));
      console.log("Mapped spawns:", mappedSpawns.length);
      return mappedSpawns;
    },
    enabled: !!playerLocation,
    refetchInterval: 30000,
  });

  const { data: collectionData } = useQuery({
    queryKey: ["/api/hunt/collection", walletAddress],
    queryFn: async () => {
      const url = new URL(`/api/hunt/collection/${walletAddress}`, getApiUrl());
      const response = await fetch(url.toString());
      if (!response.ok) return [];
      const data = await response.json();
      return data.creatures || [];
    },
    // walletAddress is always available from initialization
  });

  const { data: eggsData } = useQuery({
    queryKey: ["/api/hunt/eggs", walletAddress],
    queryFn: async () => {
      const url = new URL(`/api/hunt/eggs/${walletAddress}`, getApiUrl());
      const response = await fetch(url.toString());
      if (!response.ok) return { eggs: [], incubators: [] };
      return await response.json();
    },
    // walletAddress is always available from initialization
  });

  const { data: raidsData } = useQuery({
    queryKey: ["/api/hunt/raids", playerLocation?.latitude, playerLocation?.longitude],
    queryFn: async () => {
      if (!playerLocation) return [];
      const url = new URL("/api/hunt/raids", getApiUrl());
      url.searchParams.set("latitude", playerLocation.latitude.toString());
      url.searchParams.set("longitude", playerLocation.longitude.toString());
      url.searchParams.set("radius", "1000");
      const response = await fetch(url.toString());
      if (!response.ok) return [];
      const data = await response.json();
      return data.raids || [];
    },
    enabled: !!playerLocation,
    refetchInterval: 60000,
  });

  const { data: phaseIData, refetch: refreshPhaseIStats } = useQuery({
    queryKey: ["/api/hunt/me", walletAddress],
    queryFn: async () => {
      const url = new URL("/api/hunt/me", getApiUrl());
      url.searchParams.set("walletAddress", walletAddress);
      const response = await fetch(url.toString());
      if (!response.ok) {
        return {
          walletAddress,
          huntsToday: 0,
          dailyCap: 25,
          streakCount: 0,
          longestStreak: 0,
          eggs: { common: 0, rare: 0, epic: 0, legendary: 0 },
          pity: { rareIn: 20, epicIn: 60, legendaryIn: 200 },
          warmth: 0,
          hunterLevel: 1,
          hunterXp: 0,
          boostTokens: 0,
          recentDrops: [],
          weekKey: "",
          pointsThisWeek: 0,
          perfectsThisWeek: 0,
        } as PhaseIStats;
      }
      return await response.json() as PhaseIStats;
    },
    refetchInterval: 30000,
  });

  const updateLocation = useCallback(async (latitude: number, longitude: number, heading?: number) => {
    setPlayerLocation({ latitude, longitude, heading });
    try {
      await apiRequest("POST", "/api/hunt/location", {
        walletAddress,
        latitude,
        longitude,
      });
    } catch (error) {
      console.error("Failed to update location:", error);
    }
  }, [walletAddress]);

  const spawnCreatures = useCallback(async () => {
    if (!playerLocation) {
      console.log("spawnCreatures: No player location, aborting");
      return;
    }
    try {
      console.log("spawnCreatures: Calling spawn API at", playerLocation);
      const response = await apiRequest("POST", "/api/hunt/spawn", {
        latitude: playerLocation.latitude,
        longitude: playerLocation.longitude,
        count: 15,
      });
      const data = await response.json();
      console.log("spawnCreatures: Response", data);
      refreshSpawns();
    } catch (error) {
      console.error("Failed to spawn creatures:", error);
    }
  }, [playerLocation, refreshSpawns]);

  const catchCreature = useCallback(async (spawnId: string, catchQuality: string): Promise<CaughtCreature | null> => {
    if (!playerLocation) return null;
    try {
      const response = await apiRequest("POST", "/api/hunt/catch", {
        walletAddress,
        spawnId,
        catchQuality,
        latitude: playerLocation.latitude,
        longitude: playerLocation.longitude,
      });
      const data = await response.json();
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/spawns"] });
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/economy", walletAddress] });
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/collection", walletAddress] });
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/eggs", walletAddress] });
        return data.creature;
      }
      return null;
    } catch (error) {
      console.error("Failed to catch creature:", error);
      return null;
    }
  }, [walletAddress, playerLocation, queryClient]);

  const collectEgg = useCallback(async (spawnId: string): Promise<CatchResult | null> => {
    if (!playerLocation) return null;
    try {
      const response = await apiRequest("POST", "/api/hunt/catch", {
        walletAddress,
        spawnId,
        catchQuality: "perfect",
        latitude: playerLocation.latitude,
        longitude: playerLocation.longitude,
      });
      const data = await response.json();
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/spawns"] });
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/economy", walletAddress] });
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/eggs", walletAddress] });
        return {
          success: true,
          isMysteryEgg: data.isMysteryEgg,
          isRoachyEgg: data.isRoachyEgg,
          eggRarity: data.eggRarity,
          collectedEggs: data.collectedEggs,
          eggsRequired: data.eggsRequired,
          canHatch: data.canHatch,
        };
      }
      return null;
    } catch (error) {
      console.error("Failed to collect egg:", error);
      return null;
    }
  }, [walletAddress, playerLocation, queryClient]);

  const startIncubation = useCallback(async (eggId: string, incubatorId: string) => {
    try {
      await apiRequest("POST", `/api/hunt/eggs/${eggId}/incubate`, { incubatorId });
      queryClient.invalidateQueries({ queryKey: ["/api/hunt/eggs", walletAddress] });
    } catch (error) {
      console.error("Failed to start incubation:", error);
    }
  }, [queryClient, walletAddress]);

  const walkEgg = useCallback(async (eggId: string, distance: number) => {
    try {
      const response = await apiRequest("POST", `/api/hunt/eggs/${eggId}/walk`, {
        distance,
        walletAddress,
      });
      const data = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/hunt/eggs", walletAddress] });
      if (data.hatched) {
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/collection", walletAddress] });
      }
      return data;
    } catch (error) {
      console.error("Failed to walk egg:", error);
      return null;
    }
  }, [walletAddress, queryClient]);

  const joinRaid = useCallback(async (raidId: string) => {
    try {
      await apiRequest("POST", `/api/hunt/raids/${raidId}/join`, { walletAddress });
      queryClient.invalidateQueries({ queryKey: ["/api/hunt/raids"] });
    } catch (error) {
      console.error("Failed to join raid:", error);
    }
  }, [walletAddress, queryClient]);

  const attackRaid = useCallback(async (raidId: string, attackPower: number) => {
    try {
      const response = await apiRequest("POST", `/api/hunt/raids/${raidId}/attack`, {
        walletAddress,
        attackPower,
      });
      const data = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/hunt/raids"] });
      return data;
    } catch (error) {
      console.error("Failed to attack raid:", error);
      return null;
    }
  }, [walletAddress, queryClient]);

  const hatchEggs = useCallback(async (): Promise<HatchResult> => {
    const collectedEggs = economyData?.collectedEggs || 0;
    if (collectedEggs < 10) {
      return { success: false, error: "Not enough eggs (need 10)" };
    }
    try {
      const response = await apiRequest("POST", "/api/hunt/hatch", {
        walletAddress,
        latitude: playerLocation?.latitude,
        longitude: playerLocation?.longitude,
      });
      const data = await response.json();
      if (data.success && data.creature) {
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/economy", walletAddress] });
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/collection", walletAddress] });
        return {
          success: true,
          creature: data.creature as CaughtCreature,
        };
      }
      return { success: false, error: data.error || "Hatch failed" };
    } catch (error) {
      console.error("Failed to hatch eggs:", error);
      return { success: false, error: "Failed to hatch eggs" };
    }
  }, [walletAddress, playerLocation, economyData, queryClient]);

  const claimNode = useCallback(async (spawnId: string, lat: number, lon: number, quality: string) => {
    try {
      // Phase I: Use spawn-based claim endpoint
      const response = await apiRequest("POST", "/api/hunt/phase1/claim-spawn", {
        walletAddress,
        spawnId,
        lat,
        lon,
        quality,
      });
      const data = await response.json();
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/me", walletAddress] });
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/economy", walletAddress] });
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/eggs", walletAddress] });
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/spawns"] });
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/phase1"] });
      }
      return data;
    } catch (error) {
      console.error("Failed to claim spawn:", error);
      return { success: false, error: "Failed to claim spawn" };
    }
  }, [walletAddress, queryClient]);

  const recycleEggs = useCallback(async (amount: number) => {
    try {
      const response = await apiRequest("POST", "/api/hunt/recycle", {
        walletAddress,
        amount,
      });
      const data = await response.json();
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/me", walletAddress] });
      }
      return data;
    } catch (error) {
      console.error("Failed to recycle eggs:", error);
      return { success: false, error: "Failed to recycle eggs" };
    }
  }, [walletAddress, queryClient]);

  const fuseEggs = useCallback(async (rarity: string, times: number = 1) => {
    try {
      const response = await apiRequest("POST", "/api/hunt/fuse", {
        walletAddress,
        rarity,
        times,
      });
      const data = await response.json();
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/me", walletAddress] });
      }
      return data;
    } catch (error) {
      console.error("Failed to fuse eggs:", error);
      return { success: false, error: "Failed to fuse eggs" };
    }
  }, [walletAddress, queryClient]);

  return (
    <HuntContext.Provider
      value={{
        walletAddress,
        playerLocation,
        spawns: spawnsData || [],
        economy: economyData || null,
        phaseIStats: phaseIData || null,
        collection: collectionData || [],
        eggs: eggsData?.eggs || [],
        raids: raidsData || [],
        isLoading: spawnsLoading,
        economyReady: economyFetched,
        collectedEggs: economyData?.collectedEggs || 0,
        updateLocation,
        spawnCreatures,
        catchCreature,
        collectEgg,
        hatchEggs,
        startIncubation,
        walkEgg,
        joinRaid,
        attackRaid,
        claimNode,
        recycleEggs,
        fuseEggs,
        refreshSpawns,
        refreshEconomy,
        refreshPhaseIStats,
      }}
    >
      {children}
    </HuntContext.Provider>
  );
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}
