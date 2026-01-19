import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useWallet } from "./WalletContext";
import { useAuth } from "./AuthContext";

// Storage key prefix - will be combined with user ID for per-user storage
// V2: Fresh prefix to force new unique wallets per user (fixes duplicate wallet bug)
const WALLET_STORAGE_PREFIX = "roachy_hunt_v2_";
// Legacy key for migration
const LEGACY_WALLET_KEY = "roachy_hunt_wallet_address";

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
  dailyCapBase: number;
  dailyCapStreakBonus: number;
  streakCount: number;
  longestStreak: number;
  streakXpMult?: number;
  heatModeActive?: boolean;
  heatModeUntil?: string | null;
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
  warmthCap: number;
  level: number;
  xp: number;
  xpThisLevel: number;
  xpToNextLevel: number;
  currentLevelStartXp: number;
  nextLevelTotalXp: number;
  unlockedFeatures: {
    trackerPing: boolean;
    secondAttempt: boolean;
    heatMode: boolean;
  };
  nextUnlock: string | null;
  warmthShopCosts: {
    trackerPing: number;
    secondAttempt: number;
    heatMode: number;
  };
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

export interface HuntMeta {
  home: {
    target: number;
    current: number;
    nextTopUpInSec: number | null;
  };
  hotdrop: {
    active: boolean;
    distanceM?: number;
    bearingDeg?: number;
    direction?: string;
    expiresInSec?: number;
  };
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
  spawnsFetching: boolean;
  spawnsLoaded: boolean;
  huntMeta: HuntMeta | null;
  economy: EconomyStats | null;
  phaseIStats: PhaseIStats | null;
  collection: CaughtCreature[];
  eggs: Egg[];
  raids: Raid[];
  isLoading: boolean;
  economyReady: boolean;
  collectedEggs: number;
  updateLocation: (latitude: number, longitude: number, heading?: number) => Promise<void>;
  spawnCreatures: (reason?: string) => Promise<void>;
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
  pingRadar: () => Promise<{ mode: 'hotdrop' | 'nearest_spawn' | 'none'; direction?: string; distanceM?: number; rarity?: string } | null>;
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
  const { user } = useAuth();
  
  // Initialize with a temporary wallet immediately so queries can start
  const [guestWalletAddress, setGuestWalletAddress] = useState<string>(() => generateTempWalletId());
  const [walletSynced, setWalletSynced] = useState(false);
  const [playerLocation, setPlayerLocation] = useState<{ latitude: number; longitude: number; heading?: number } | null>(null);

  // User-specific storage key - ensures each logged-in user has their own hunt progress
  const userStorageKey = useMemo(() => {
    if (user?.id) {
      return `${WALLET_STORAGE_PREFIX}${user.id}`;
    }
    // Fallback for guests (not logged in) - use device-level storage
    return `${WALLET_STORAGE_PREFIX}guest_device`;
  }, [user?.id]);

  // Priority: 1. Connected Solana wallet, 2. User-specific player ID
  const walletAddress = solanaWallet.connected && solanaWallet.address 
    ? solanaWallet.address 
    : guestWalletAddress;

  // Sync with AsyncStorage to maintain persistence across sessions
  // Uses user-specific key so each account has separate progress
  useEffect(() => {
    const syncWalletFromStorage = async () => {
      try {
        // First check for user-specific wallet
        const storedWallet = await AsyncStorage.getItem(userStorageKey);
        
        if (storedWallet && storedWallet !== guestWalletAddress) {
          // Use the stored wallet for this user
          console.log(`[Hunt] Loaded wallet for user: ${user?.id || 'guest'}`, storedWallet);
          setGuestWalletAddress(storedWallet);
        } else if (!storedWallet) {
          // No wallet for this user yet - check for legacy migration
          const legacyWallet = await AsyncStorage.getItem(LEGACY_WALLET_KEY);
          const legacyMigratedKey = `${LEGACY_WALLET_KEY}_migrated`;
          const alreadyMigrated = await AsyncStorage.getItem(legacyMigratedKey);
          
          if (legacyWallet && user?.id && !alreadyMigrated) {
            // Migrate legacy wallet to FIRST user only (one-time migration)
            console.log(`[Hunt] Migrating legacy wallet to first user: ${user.id}`, legacyWallet);
            await AsyncStorage.setItem(userStorageKey, legacyWallet);
            await AsyncStorage.setItem(legacyMigratedKey, user.id); // Mark as migrated
            setGuestWalletAddress(legacyWallet);
          } else {
            // Generate new unique wallet for this user
            const newWalletId = `player_${user?.id || 'guest'}_${Date.now()}`;
            console.log(`[Hunt] Creating new wallet for user: ${user?.id || 'guest'}`, newWalletId);
            await AsyncStorage.setItem(userStorageKey, newWalletId);
            setGuestWalletAddress(newWalletId);
          }
        }
      } catch (error) {
        console.error("Failed to sync wallet:", error);
        // Keep using the temp wallet, it's already set
      } finally {
        setWalletSynced(true);
      }
    };
    syncWalletFromStorage();
  }, [userStorageKey, user?.id]);

  // Invalidate all hunt queries when user changes to ensure fresh data for each account
  useEffect(() => {
    if (user?.id) {
      console.log(`[Hunt] User changed to ${user.id}, invalidating hunt queries`);
      queryClient.invalidateQueries({ queryKey: ["/api/hunt/economy"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hunt/collection"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hunt/eggs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hunt/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hunt/spawns"] });
    }
  }, [user?.id, queryClient]);

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

  const [huntMeta, setHuntMeta] = useState<HuntMeta | null>(null);

  const {
    data: spawnsData,
    refetch: refreshSpawns,
    isLoading: spawnsLoading,
    isFetching: spawnsFetching,
    isSuccess: spawnsLoaded,
  } = useQuery({
    queryKey: ["/api/hunt/spawns", playerLocation?.latitude, playerLocation?.longitude],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      if (!playerLocation) {
        console.log("No player location, returning empty spawns");
        setHuntMeta(null);
        return [];
      }
      const url = new URL("/api/hunt/spawns", getApiUrl());
      url.searchParams.set("latitude", playerLocation.latitude.toString());
      url.searchParams.set("longitude", playerLocation.longitude.toString());
      url.searchParams.set("radius", "500");
      console.log("Fetching spawns from:", url.toString());
      const response = await fetch(url.toString(), {
        headers: { "x-wallet-address": walletAddress },
      });
      if (!response.ok) {
        console.log("Spawns fetch failed:", response.status);
        setHuntMeta(null);
        return [];
      }
      const data = await response.json();
      console.log("Spawns response:", data?.spawns?.length || 0, "spawns, meta:", data?.meta);
      
      // Store meta for UI display
      if (data.meta) {
        setHuntMeta(data.meta);
      }
      
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
          dailyCapBase: 25,
          dailyCapStreakBonus: 0,
          streakCount: 0,
          longestStreak: 0,
          eggs: { common: 0, rare: 0, epic: 0, legendary: 0 },
          pity: { rareIn: 20, epicIn: 60, legendaryIn: 180 },
          warmth: 0,
          warmthCap: 10,
          level: 1,
          xp: 0,
          xpThisLevel: 0,
          xpToNextLevel: 500,
          currentLevelStartXp: 0,
          nextLevelTotalXp: 500,
          unlockedFeatures: { trackerPing: false, secondAttempt: false, heatMode: false },
          nextUnlock: "Tracker Ping at Lv.3",
          warmthShopCosts: { trackerPing: 3, secondAttempt: 5, heatMode: 10 },
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

  const spawnCreatures = useCallback(async (reason: string = "unknown") => {
    if (!playerLocation) {
      console.log("[HUNT][SPAWN] ABORT no location. reason=", reason);
      return;
    }
    try {
      console.log("[HUNT][SPAWN] CALLED reason=", reason, "loc=", playerLocation);
      const response = await apiRequest("POST", "/api/hunt/spawn", {
        latitude: playerLocation.latitude,
        longitude: playerLocation.longitude,
        walletAddress,
        reason,
      });
      const data = await response.json();
      console.log("[HUNT][SPAWN] RESPONSE", data);
      if (data.created > 0) {
        refreshSpawns();
      } else if (data.skipped) {
        console.log("[HUNT][SPAWN] SKIPPED reason=", data.reason, "cooldown=", data.cooldownRemaining);
      }
    } catch (error) {
      console.error("[HUNT][SPAWN] ERROR", error);
    }
  }, [playerLocation, walletAddress, refreshSpawns]);

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
    console.log("[ClaimNode] v16 Starting claim:", { spawnId, lat, lon, quality, walletAddress });
    try {
      // Phase I: Use spawn-based claim endpoint
      const response = await apiRequest("POST", "/api/hunt/phase1/claim-spawn", {
        walletAddress,
        spawnId,
        lat,
        lon,
        quality,
      });
      console.log("[ClaimNode] v16 Got response, parsing JSON...");
      const data = await response.json();
      console.log("[ClaimNode] v16 Parsed data:", JSON.stringify(data));
      if (data.success || data.eggRarity) {
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/me", walletAddress] });
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/economy", walletAddress] });
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/eggs", walletAddress] });
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/spawns"] });
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/phase1"] });
      }
      return data;
    } catch (error: any) {
      // v16: Return ACTUAL error message, not hardcoded
      const errorMsg = error?.message || String(error) || "Network error";
      console.error("[ClaimNode] v16 ERROR:", errorMsg, error);
      return { success: false, error: errorMsg };
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
      const response = await apiRequest("POST", "/api/hunt/inventory/fuse", {
        walletAddress,
        rarity,
        times,
      });
      const data = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/hunt/me", walletAddress] });
      return data;
    } catch (error) {
      console.error("Failed to fuse eggs:", error);
      throw error;
    }
  }, [walletAddress, queryClient]);

  const pingRadar = useCallback(async (): Promise<{ mode: 'hotdrop' | 'nearest_spawn' | 'none'; direction?: string; distanceM?: number; rarity?: string } | null> => {
    if (!playerLocation) {
      console.log("[RADAR] No player location");
      return null;
    }
    try {
      const url = new URL("/api/hunt/radar", getApiUrl());
      url.searchParams.set("latitude", playerLocation.latitude.toString());
      url.searchParams.set("longitude", playerLocation.longitude.toString());
      console.log("[RADAR] Pinging:", url.toString());
      
      const response = await fetch(url.toString(), {
        headers: { "x-wallet-address": walletAddress },
      });
      
      if (!response.ok) {
        console.log("[RADAR] Failed:", response.status);
        return null;
      }
      
      const data = await response.json();
      console.log("[RADAR] Result:", data);
      return data;
    } catch (error) {
      console.error("[RADAR] Error:", error);
      return null;
    }
  }, [playerLocation, walletAddress]);

  return (
    <HuntContext.Provider
      value={{
        walletAddress,
        playerLocation,
        spawns: spawnsData || [],
        spawnsFetching,
        spawnsLoaded,
        huntMeta,
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
        pingRadar,
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
