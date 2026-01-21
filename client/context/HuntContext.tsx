import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, apiRequestNoThrow, getApiUrl } from "@/lib/query-client";
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
  rarity: string | null;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
  containedTemplateId?: string | null;
  distance?: number;
  sourceType?: string | null;
  sourceKey?: string | null;
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
  quest?: {
    active: boolean;
    type?: string;
    key?: string;
    expiresInSec?: number;
    distanceM?: number;
    bearingDeg?: number;
    direction?: string;
    progress?: { collected: number; total: number };
    lat?: number;
    lng?: number;
  };
  offers?: {
    micro?: { available: boolean; cooldownEndsInSec?: number };
    hotdrop?: { available: boolean; cooldownEndsInSec?: number };
    beacon?: { available: boolean; claimed?: boolean };
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

export interface SpawnsServerStatus {
  status: number | null;
  ts: number | null;
  error: string | null;
}

interface HuntContextType {
  walletAddress: string;
  playerLocation: { latitude: number; longitude: number; heading?: number } | null;
  spawns: Spawn[];
  questSpawns: Spawn[];
  spawnsFetching: boolean;
  spawnsLoaded: boolean;
  spawnsServerStatus: SpawnsServerStatus;
  huntMeta: HuntMeta | null;
  economy: EconomyStats | null;
  phaseIStats: PhaseIStats | null;
  collection: CaughtCreature[];
  eggs: Egg[];
  raids: Raid[];
  isLoading: boolean;
  economyReady: boolean;
  collectedEggs: number;
  updateLocation: (latitude: number, longitude: number, heading?: number, opts?: { forcePost?: boolean }) => Promise<void>;
  spawnCreatures: (reason?: string) => Promise<void>;
  catchCreature: (spawnId: string, catchQuality: string) => Promise<CaughtCreature | null>;
  collectEgg: (spawnId: string) => Promise<CatchResult | null>;
  missSpawn: (spawnId: string) => Promise<boolean>;
  hatchEggs: () => Promise<HatchResult>;
  startIncubation: (eggId: string, incubatorId: string) => Promise<void>;
  walkEgg: (eggId: string, distance: number) => Promise<any>;
  joinRaid: (raidId: string) => Promise<void>;
  attackRaid: (raidId: string, attackPower: number) => Promise<any>;
  claimNode: (nodeId: string, lat: number, lon: number, quality: string, attemptId?: number) => Promise<any>;
  recycleEggs: (amount: number) => Promise<any>;
  fuseEggs: (rarity: string, times: number) => Promise<any>;
  refreshSpawns: () => void;
  refreshEconomy: () => void;
  refreshPhaseIStats: () => void;
  pingRadar: () => Promise<{ mode: 'hotdrop' | 'nearest_spawn' | 'none'; direction?: string; distanceM?: number; rarity?: string } | null>;
  activateHotspot: (questType: 'MICRO_HOTSPOT' | 'HOT_DROP' | 'LEGENDARY_BEACON') => Promise<{ success: boolean; quest?: any; error?: string }>;
  claimBeacon: () => Promise<{ success: boolean; rewardRarity?: string; error?: string }>;
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

  // Anti-freeze: abort controller + attempt tracking for claimNode
  const claimAbortRef = useRef<AbortController | null>(null);
  const claimAttemptRef = useRef(0);

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
      queryClient.invalidateQueries({ queryKey: ["/api/hunt/spawns"], exact: false });
    }
  }, [user?.id, queryClient]);

  const { data: economyData, refetch: refreshEconomy, isFetched: economyFetched, isError: economyError } = useQuery({
    queryKey: ["/api/hunt/economy"],
    queryFn: async () => {
      console.log("Economy query starting");
      try {
        // Use apiRequest for JWT auth - the walletAddress in URL is ignored by server
        const response = await apiRequest("GET", `/api/hunt/economy/me`);
        
        if (!response.ok) {
          console.log("Economy fetch failed:", response.status);
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
        console.log("Economy fetch error:", error);
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
    retry: 2,
    retryDelay: 1000,
  });

  const [huntMeta, setHuntMeta] = useState<HuntMeta | null>(null);
  const [questSpawns, setQuestSpawns] = useState<Spawn[]>([]);
  const [spawnsServerStatus, setSpawnsServerStatus] = useState<SpawnsServerStatus>({
    status: null,
    ts: null,
    error: null,
  });

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
        setQuestSpawns([]);
        return [];
      }
      const route = `/api/hunt/spawns?latitude=${playerLocation.latitude}&longitude=${playerLocation.longitude}&radius=500`;
      console.log("Fetching spawns from:", route);
      try {
        // Use apiRequest to automatically include Authorization Bearer token
        const response = await apiRequest("GET", route);
        
        // Track server status for diagnostics
        if (!response.ok) {
          const errorCode = response.status;
          let errorMsg = "SPAWNS_FETCH_FAILED";
          if (errorCode === 401) errorMsg = "SESSION_EXPIRED";
          else if (errorCode === 429) errorMsg = "RATE_LIMITED";
          
          console.log(`Spawns fetch failed with status ${errorCode}`);
          setSpawnsServerStatus({ status: errorCode, ts: Date.now(), error: errorMsg });
          setHuntMeta(null);
          setQuestSpawns([]);
          return [];
        }
        
        // Success - clear error state
        setSpawnsServerStatus({ status: 200, ts: Date.now(), error: null });
        
        const data = await response.json();
        console.log("Spawns response:", data?.spawns?.length || 0, "spawns, meta:", data?.meta);
        
        // Store meta for UI display
        if (data.meta) {
          setHuntMeta(data.meta);
        }
        
        // Store quest spawns with distance calculated
        const mappedQuestSpawns = (data.questSpawns || []).map((spawn: Spawn) => ({
          ...spawn,
          distance: calculateDistance(
            playerLocation.latitude,
            playerLocation.longitude,
            parseFloat(spawn.latitude),
            parseFloat(spawn.longitude)
          ),
        }));
        setQuestSpawns(mappedQuestSpawns);
        
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
      } catch (error: any) {
        console.log("Spawns fetch failed:", error);
        setSpawnsServerStatus({ status: null, ts: Date.now(), error: error?.message || "NETWORK_ERROR" });
        setHuntMeta(null);
        setQuestSpawns([]);
        return [];
      }
    },
    enabled: !!playerLocation,
    refetchInterval: 30000,
  });

  const { data: collectionData } = useQuery({
    queryKey: ["/api/hunt/collection"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", `/api/hunt/collection/me`);
        const data = await response.json();
        return data.creatures || [];
      } catch {
        return [];
      }
    },
  });

  const { data: eggsData } = useQuery({
    queryKey: ["/api/hunt/eggs"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", `/api/hunt/eggs/me`);
        return await response.json();
      } catch {
        return { eggs: [], incubators: [] };
      }
    },
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
    queryKey: ["/api/hunt/me"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/hunt/me");
        if (!response.ok) {
          return {
            walletAddress: "",
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
      } catch {
        return {
          walletAddress: "",
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
    },
    refetchInterval: 30000,
  });

  const updateLocation = useCallback(async (
    latitude: number, 
    longitude: number, 
    heading?: number,
    opts?: { forcePost?: boolean }
  ) => {
    setPlayerLocation({ latitude, longitude, heading });

    const now = Date.now();
    const prev = (globalThis as any).__lastHuntPost as { lat: number; lng: number; ts: number } | null;

    const haversineMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371000;
      const toRad = (v: number) => (v * Math.PI) / 180;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(a));
    };

    const moved = prev ? haversineMeters(prev.lat, prev.lng, latitude, longitude) : 999;
    const elapsed = prev ? (now - prev.ts) : 999999;

    const POST_MIN_INTERVAL_MS = 12000;
    
    // Skip spam POST unless:
    // - forcePost is true
    // - OR elapsed >= 12s (periodic keepalive)
    // - OR moved >= 10m
    if (prev && !opts?.forcePost && moved < 10 && elapsed < 10000 && elapsed < POST_MIN_INTERVAL_MS) {
      return; // skip spam POST
    }

    (globalThis as any).__lastHuntPost = { lat: latitude, lng: longitude, ts: now };

    try {
      await apiRequest("POST", "/api/hunt/location", {
        latitude,
        longitude,
      });
    } catch (error) {
      console.error("Failed to update location:", error);
    }
  }, []);

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
  }, [playerLocation, refreshSpawns]);

  const catchCreature = useCallback(async (spawnId: string, catchQuality: string): Promise<CaughtCreature | null> => {
    if (!playerLocation) return null;
    try {
      const response = await apiRequest("POST", "/api/hunt/catch", {
        spawnId,
        catchQuality,
        latitude: playerLocation.latitude,
        longitude: playerLocation.longitude,
      });
      const data = await response.json();
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/spawns"], exact: false });
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/economy"] });
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/collection"] });
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/eggs"] });
        return data.creature;
      }
      return null;
    } catch (error) {
      console.error("Failed to catch creature:", error);
      return null;
    }
  }, [playerLocation, queryClient]);

  const collectEgg = useCallback(async (spawnId: string): Promise<CatchResult | null> => {
    if (!playerLocation) return null;
    try {
      const response = await apiRequest("POST", "/api/hunt/catch", {
        spawnId,
        catchQuality: "perfect",
        latitude: playerLocation.latitude,
        longitude: playerLocation.longitude,
      });
      const data = await response.json();
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/spawns"], exact: false });
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/economy"] });
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/eggs"] });
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
  }, [playerLocation, queryClient]);

  const missSpawn = useCallback(async (spawnId: string): Promise<boolean> => {
    const rid = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    console.log("[HuntContext] missSpawn called", { spawnId, rid });

    // OPTIMISTIC: remove missed spawn from ALL cached spawn queries (lat/lng variants)
    queryClient.setQueriesData(
      { queryKey: ["/api/hunt/spawns"], exact: false },
      (old: any) => {
        if (!old) return old;

        // Some implementations return array, others return object with {spawns}
        if (Array.isArray(old)) {
          return old.filter((s) => s?.id !== spawnId);
        }
        if (old?.spawns && Array.isArray(old.spawns)) {
          return { ...old, spawns: old.spawns.filter((s: any) => s?.id !== spawnId) };
        }
        return old;
      }
    );

    try {
      const res = await apiRequestNoThrow(
        "POST",
        "/api/hunt/miss",
        { spawnId },
        { "x-hunt-rid": rid }
      );

      const text = await res.text();
      console.log("[HuntContext] miss response", { rid, status: res.status, ok: res.ok, body: text });

      let data: any = null;
      try { data = JSON.parse(text); } catch {}

      // Always refetch spawns after miss attempt (success or failure) to converge with server truth
      queryClient.invalidateQueries({ queryKey: ["/api/hunt/spawns"], exact: false });

      return !!data?.success;
    } catch (error) {
      console.error("[HuntContext] miss request failed", { rid, error });

      // Still refetch to converge
      queryClient.invalidateQueries({ queryKey: ["/api/hunt/spawns"], exact: false });

      return false;
    }
  }, [queryClient]);

  const startIncubation = useCallback(async (eggId: string, incubatorId: string) => {
    try {
      await apiRequest("POST", `/api/hunt/eggs/${eggId}/incubate`, { incubatorId });
      queryClient.invalidateQueries({ queryKey: ["/api/hunt/eggs"] });
    } catch (error) {
      console.error("Failed to start incubation:", error);
    }
  }, [queryClient]);

  const walkEgg = useCallback(async (eggId: string, distance: number) => {
    try {
      const response = await apiRequest("POST", `/api/hunt/eggs/${eggId}/walk`, { distance });
      const data = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/hunt/eggs"] });
      if (data.hatched) {
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/collection"] });
      }
      return data;
    } catch (error) {
      console.error("Failed to walk egg:", error);
      return null;
    }
  }, [queryClient]);

  const joinRaid = useCallback(async (raidId: string) => {
    try {
      await apiRequest("POST", `/api/hunt/raids/${raidId}/join`, {});
      queryClient.invalidateQueries({ queryKey: ["/api/hunt/raids"] });
    } catch (error) {
      console.error("Failed to join raid:", error);
    }
  }, [queryClient]);

  const attackRaid = useCallback(async (raidId: string, attackPower: number) => {
    try {
      const response = await apiRequest("POST", `/api/hunt/raids/${raidId}/attack`, { attackPower });
      const data = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/hunt/raids"] });
      return data;
    } catch (error) {
      console.error("Failed to attack raid:", error);
      return null;
    }
  }, [queryClient]);

  const hatchEggs = useCallback(async (): Promise<HatchResult> => {
    const collectedEggs = economyData?.collectedEggs || 0;
    if (collectedEggs < 10) {
      return { success: false, error: "Not enough eggs (need 10)" };
    }
    try {
      const response = await apiRequest("POST", "/api/hunt/hatch", {
        latitude: playerLocation?.latitude,
        longitude: playerLocation?.longitude,
      });
      const data = await response.json();
      if (data.success && data.creature) {
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/economy"] });
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/collection"] });
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
  }, [playerLocation, economyData, queryClient]);

  const claimNode = useCallback(async (spawnId: string, lat: number, lon: number, quality: string, attemptId?: number) => {
    console.log("[ClaimNode] v17 Starting claim:", { spawnId, lat, lon, quality, attemptId });
    
    // Abort any previous in-flight claim
    if (claimAbortRef.current) {
      console.log("[ClaimNode] v17 Aborting previous claim");
      claimAbortRef.current.abort();
    }
    
    // Create new abort controller for this attempt
    const abortController = new AbortController();
    claimAbortRef.current = abortController;
    
    // Track this attempt
    const thisAttempt = attemptId ?? ++claimAttemptRef.current;
    
    try {
      const response = await apiRequest("POST", "/api/hunt/phase1/claim-spawn", {
        spawnId,
        lat,
        lon,
        quality,
      }, {
        signal: abortController.signal,
        timeoutMs: 15000,
      });
      
      // Check if this response is stale (a newer attempt was started)
      if (attemptId !== undefined && claimAttemptRef.current !== thisAttempt) {
        console.log("[ClaimNode] v17 Ignoring stale response, attempt:", thisAttempt, "current:", claimAttemptRef.current);
        return { success: false, error: "Cancelled", stale: true };
      }
      
      console.log("[ClaimNode] v17 Got response, parsing JSON...");
      const data = await response.json();
      console.log("[ClaimNode] v17 Parsed data:", JSON.stringify(data));
      if (data.success || data.eggRarity) {
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/me"] });
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/economy"] });
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/eggs"] });
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/spawns"], exact: false });
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/phase1"] });
      }
      return data;
    } catch (error: any) {
      // Check for abort
      if (error?.name === "AbortError" || (error as any)?.code === "ABORTED") {
        console.log("[ClaimNode] v17 Request aborted/cancelled");
        return { success: false, error: "Cancelled" };
      }
      const errorMsg = error?.message || String(error) || "Network error";
      console.error("[ClaimNode] v17 ERROR:", errorMsg, error);
      return { success: false, error: errorMsg };
    }
  }, [queryClient]);

  const recycleEggs = useCallback(async (amount: number) => {
    try {
      const response = await apiRequest("POST", "/api/hunt/recycle", { amount });
      const data = await response.json();
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/me"] });
      }
      return data;
    } catch (error) {
      console.error("Failed to recycle eggs:", error);
      return { success: false, error: "Failed to recycle eggs" };
    }
  }, [queryClient]);

  const fuseEggs = useCallback(async (rarity: string, times: number = 1) => {
    try {
      const response = await apiRequest("POST", "/api/hunt/inventory/fuse", { rarity, times });
      const data = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/hunt/me"] });
      return data;
    } catch (error) {
      console.error("Failed to fuse eggs:", error);
      throw error;
    }
  }, [queryClient]);

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
      
      const response = await apiRequest("GET", url.pathname + url.search);
      
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
  }, [playerLocation]);

  const activateHotspot = useCallback(async (questType: 'MICRO_HOTSPOT' | 'HOT_DROP' | 'LEGENDARY_BEACON') => {
    if (!playerLocation) {
      return { success: false, error: "No location available" };
    }
    try {
      const response = await apiRequest("POST", "/api/hunt/hotspot/activate", {
        questType,
        latitude: playerLocation.latitude,
        longitude: playerLocation.longitude,
      });
      const data = await response.json();
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/spawns"], exact: false });
      }
      return data;
    } catch (error: any) {
      console.error("[HOTSPOT] Activate error:", error);
      return { success: false, error: error.message || "Failed to activate hotspot" };
    }
  }, [playerLocation, queryClient]);

  const claimBeacon = useCallback(async () => {
    try {
      const response = await apiRequest("POST", "/api/hunt/beacon/claim", {});
      const data = await response.json();
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/spawns"], exact: false });
        queryClient.invalidateQueries({ queryKey: ["/api/hunt/me"] });
      }
      return data;
    } catch (error: any) {
      console.error("[BEACON] Claim error:", error);
      return { success: false, error: error.message || "Failed to claim beacon" };
    }
  }, [queryClient]);

  return (
    <HuntContext.Provider
      value={{
        walletAddress,
        playerLocation,
        spawns: spawnsData || [],
        questSpawns,
        spawnsFetching,
        spawnsLoaded,
        spawnsServerStatus,
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
        missSpawn,
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
        activateHotspot,
        claimBeacon,
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
