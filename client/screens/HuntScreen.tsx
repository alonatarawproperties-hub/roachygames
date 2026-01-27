import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Platform,
  Dimensions,
  Linking,
  AppState,
  AppStateStatus,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { CameraEncounter } from "@/components/CameraEncounter";
import { CatchMiniGame } from "@/components/CatchMiniGame";
import { EggReveal } from "@/components/EggReveal";
import { RaidBattleMiniGame } from "@/components/RaidBattleMiniGame";
import { MapViewWrapper, MapViewWrapperRef } from "@/components/MapViewWrapper";
import { HuntLoadingOverlay } from "@/components/HuntLoadingOverlay";
import { HuntLeaderboard } from "@/components/hunt/HuntLeaderboard";
import { EggCollectedModal } from "@/components/hunt/EggCollectedModal";
import { FusionAnimationModal } from "@/components/hunt/FusionAnimationModal";
import { LevelProgressSheet } from "@/components/hunt/LevelProgressSheet";
import { NodeDetailsBottomSheet } from "@/components/hunt/NodeDetailsBottomSheet";
import { SpawnReserveSheet } from "@/components/hunt/SpawnReserveSheet";
import { HuntCoachmarks } from "@/components/hunt/HuntCoachmarks";
import { WhatNextSheet, WhatNextContent, FaqContent } from "@/components/hunt/WhatNextSheet";
import { HuntDebugOverlay } from "@/components/hunt/HuntDebugOverlay";
import {
  isOnboardingCompleted,
  setOnboardingCompleted,
  canShowTip,
  markTipShown,
  hasSeenQuestKey,
  markQuestKeySeen,
  formatSeconds,
} from "@/lib/huntGuides";
import { useHunt, Spawn, CaughtCreature, Egg, Raid, SpawnsServerStatus } from "@/context/HuntContext";

// GPS status helper - driven by actual location timestamps, NOT server responses
function getGpsLabel(lastGpsTs: number | null, acc: number | null): { label: string; color: "good" | "warning" | "danger" } {
  if (!lastGpsTs) return { label: "No Signal", color: "danger" };
  const ageSec = (Date.now() - lastGpsTs) / 1000;
  if (ageSec > 30) return { label: `No Signal ${Math.round(ageSec / 60)}m`, color: "danger" };
  if (acc == null) return { label: "GPS...", color: "warning" };
  if (acc <= 20) return { label: `Excellent ${Math.round(ageSec)}s`, color: "good" };
  if (acc <= 50) return { label: `Good ${Math.round(ageSec)}s`, color: "good" };
  if (acc <= 100) return { label: `Fair ${Math.round(ageSec)}s`, color: "warning" };
  return { label: `Weak ${Math.round(ageSec)}s`, color: "warning" };
}

// Server error message helper
function getServerErrorMessage(status: SpawnsServerStatus): string | null {
  if (!status.error) return null;
  if (status.error === "SESSION_EXPIRED") return "Session expired — please log in again";
  if (status.error === "RATE_LIMITED") return "Rate limited — retry in a bit";
  if (status.error === "NETWORK_ERROR") return "Network error — check your connection";
  return "Failed to load spawns";
}

import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { useGamePresence, usePresenceContext } from "@/context/PresenceContext";
import { useMapNodes, useReserveNode, MapNode } from "@/hooks/useMapNodes";

const RARITY_COLORS: Record<string, string> = {
  common: "#9CA3AF",
  rare: "#00D9FF",
  epic: "#9B59B6",
  legendary: "#FFD700",
};

const RARITY_GLOWS: Record<string, { color: string; opacity: number; radius: number }> = {
  common: { color: "#9CA3AF", opacity: 0.3, radius: 8 },
  rare: { color: "#00D9FF", opacity: 0.5, radius: 12 },
  epic: { color: "#9B59B6", opacity: 0.6, radius: 16 },
  legendary: { color: "#FFD700", opacity: 0.8, radius: 20 },
};

const EGG_IMAGES = {
  common: require('@/assets/hunt/egg-common.png'),
  rare: require('@/assets/hunt/egg-rare.png'),
  epic: require('@/assets/hunt/egg-epic.png'),
  legendary: require('@/assets/hunt/egg-legendary.png'),
};

const EggIcon = ({ rarity, size = 40 }: { rarity: string; size?: number }) => {
  const glow = RARITY_GLOWS[rarity] || RARITY_GLOWS.common;
  const imageSource = EGG_IMAGES[rarity as keyof typeof EGG_IMAGES] || EGG_IMAGES.common;
  
  return (
    <View style={{
      width: size,
      height: size * 1.3,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: glow.color,
      shadowOpacity: glow.opacity,
      shadowRadius: glow.radius,
      shadowOffset: { width: 0, height: 0 },
    }}>
      <Image
        source={imageSource}
        style={{
          width: size,
          height: size * 1.3,
        }}
        resizeMode="contain"
      />
    </View>
  );
};

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function getSpawnPosition(id: string, index: number): { left: `${number}%`; top: `${number}%` } {
  const hash = hashString(id + index);
  const left = 15 + (hash % 70);
  const top = 10 + ((hash >> 8) % 60);
  return { left: `${left}%` as `${number}%`, top: `${top}%` as `${number}%` };
}

export default function HuntScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const {
    walletAddress,
    playerLocation,
    spawns,
    questSpawns,
    spawnsFetching,
    spawnsLoaded,
    spawnsServerStatus,
    huntMeta,
    economy,
    phaseIStats,
    economyReady,
    collection,
    eggs,
    raids,
    isLoading,
    collectedEggs,
    updateLocation,
    catchCreature,
    collectEgg,
    missSpawn,
    walkEgg,
    joinRaid,
    attackRaid,
    refreshSpawns,
    refreshPhaseIStats,
    claimNode,
    pingRadar,
    activateHotspot,
    claimBeacon,
  } = useHunt();
  
  // Import shared constants for Home Drop radius
  const { CATCH_RADIUS_M } = require("@/lib/hunt-constants");
  
  // QueryClient for force refetch after catch
  const queryClient = useQueryClient();
  
  useGamePresence("roachy-hunt");
  const { nearbyPlayers, isVisible, setVisibility, setLocation: setPresenceLocation } = usePresenceContext();
  
  useEffect(() => {
    if (playerLocation) {
      setPresenceLocation(playerLocation.latitude, playerLocation.longitude);
    }
  }, [playerLocation?.latitude, playerLocation?.longitude, setPresenceLocation]);

  // NOTE: Spawns are now created server-side via drip/explore logic in GET /api/hunt/spawns
  // No need to call spawnCreatures on mount - the GET request handles drip creation

  const [locationError, setLocationError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [selectedSpawn, setSelectedSpawn] = useState<Spawn | null>(null);
  const [showCameraEncounter, setShowCameraEncounter] = useState(false);
  const [showCatchGame, setShowCatchGame] = useState(false);
  const [caughtCreature, setCaughtCreature] = useState<CaughtCreature | null>(null);
  const [catchQuality, setCatchQuality] = useState<"perfect" | "great" | "good" | null>(null);
  const [collectedEggInfo, setCollectedEggInfo] = useState<{
    rarity: "common" | "rare" | "epic" | "legendary";
    xpAwarded: number;
    pointsAwarded: number;
    quality: "perfect" | "great" | "good";
    pity: { rareIn: number; epicIn: number; legendaryIn: number };
  } | null>(null);
  const [selectedRaid, setSelectedRaid] = useState<Raid | null>(null);
  const [activeTab, setActiveTab] = useState<"map" | "collection" | "eggs" | "leaderboard">("map");
  const [mapReady, setMapReady] = useState(false);
  const [showLevelSheet, setShowLevelSheet] = useState(false);
  const mapRef = useRef<MapViewWrapperRef>(null);
  
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  const [reservedByMe, setReservedByMe] = useState<Record<string, true>>({});
  const [showNodeSheet, setShowNodeSheet] = useState(false);
  const [reserveToast, setReserveToast] = useState<string | null>(null);
  const lastMarkerTapRef = useRef<number>(0);
  
  const [showSpawnReserveSheet, setShowSpawnReserveSheet] = useState(false);
  const [spawnReservations, setSpawnReservations] = useState<Record<string, Date>>({}); 
  const [isReservingSpawn, setIsReservingSpawn] = useState(false);
  
  // Area Cleared countdown timer state
  const [homeCountdown, setHomeCountdown] = useState<number | null>(null);
  const [hotdropCountdown, setHotdropCountdown] = useState<number | null>(null);
  // Removed: radarCooldown, radarResult, radarResultVisibleUntil (Ping Radar removed)
  const [activatingQuest, setActivatingQuest] = useState<string | null>(null);
  const [questCountdown, setQuestCountdown] = useState<number | null>(null);
  
  // Hunt guides state
  const [showCoachmarks, setShowCoachmarks] = useState(false);
  const [showHelpSheet, setShowHelpSheet] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [tipMessage, setTipMessage] = useState<string | null>(null);
  const [showDebugOverlay, setShowDebugOverlay] = useState(false);
  const tipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [coachTipDismissed, setCoachTipDismissed] = useState(true);

  useEffect(() => {
    const checkCoachTipDismissed = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const dismissedDate = await AsyncStorage.getItem('hunt_coach_tip_dismissed');
        setCoachTipDismissed(dismissedDate === today);
      } catch {
        setCoachTipDismissed(false);
      }
    };
    checkCoachTipDismissed();
  }, []);

  const dismissCoachTip = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await AsyncStorage.setItem('hunt_coach_tip_dismissed', today);
      setCoachTipDismissed(true);
    } catch {}
  }, []);
  
  // Banner latch - keep visible for minimum time to prevent flicker
  const [bannerVisibleUntil, setBannerVisibleUntil] = useState(0);
  const MIN_VISIBLE_MS = 8000;
  
  // HOME DROP: Single radius - visible == catchable (CATCH_RADIUS_M = 50m)
  const spawnRangeCounts = useMemo(() => {
    const homeSpawns = (spawns || []).filter((s: Spawn) => {
      // Only count home-type spawns (home, drip, or null/undefined for backwards compat)
      return !s.sourceType || s.sourceType === 'home' || s.sourceType === 'drip' || s.sourceType === 'HOME';
    });
    
    let inRangeCount = 0;
    
    for (const s of homeSpawns) {
      const dist = typeof s.distance === "number" ? s.distance : null;
      if (dist !== null && dist <= CATCH_RADIUS_M) {
        inRangeCount++;
      }
    }
    
    // HOME DROP: visible == catchable, no separate "out of range" eggs
    return { 
      inRangeCount, 
      outOfRangeCount: 0,
      closestOutOfRange: null,
      visibleCount: inRangeCount 
    };
  }, [spawns, CATCH_RADIUS_M]);
  
  const { inRangeCount, outOfRangeCount, closestOutOfRange } = spawnRangeCounts;
  
  // Compute banner visibility OUTSIDE renderAreaClearedBanner
  // Banner shows when: no eggs in catch range (even if some are nearby but out of range)
  const hasCountdownData = homeCountdown !== null || !!huntMeta?.hotdrop?.active || !!huntMeta?.quest?.active;
  const showBannerRaw = spawnsLoaded && !spawnsFetching && inRangeCount === 0;
  
  // Debug log for banner visibility + offers
  useEffect(() => {
    if (spawnsLoaded) {
      console.log("[BannerDBG]", { inRangeCount, outOfRangeCount, closestDist: closestOutOfRange?.distance, homeCountdown });
      console.log("[OFFERS]", JSON.stringify(huntMeta?.offers));
    }
  }, [spawnsLoaded, inRangeCount, outOfRangeCount, closestOutOfRange, homeCountdown, huntMeta?.offers]);
  
  useEffect(() => {
    if (showBannerRaw) {
      setBannerVisibleUntil((prev) => Math.max(prev, Date.now() + MIN_VISIBLE_MS));
    }
  }, [showBannerRaw]);
  
  const showBanner = showBannerRaw || Date.now() < bannerVisibleUntil;
  
  // Update countdown timers from huntMeta
  useEffect(() => {
    if (huntMeta?.home?.nextTopUpInSec) {
      setHomeCountdown(huntMeta.home.nextTopUpInSec);
    } else {
      setHomeCountdown(null);
    }
    if (huntMeta?.hotdrop?.expiresInSec) {
      setHotdropCountdown(huntMeta.hotdrop.expiresInSec);
    } else {
      setHotdropCountdown(null);
    }
    if (huntMeta?.quest?.expiresInSec) {
      setQuestCountdown(huntMeta.quest.expiresInSec);
    } else {
      setQuestCountdown(null);
    }
  }, [huntMeta]);
  
  // Tick countdown timers every second
  useEffect(() => {
    const interval = setInterval(() => {
      setHomeCountdown(prev => prev !== null && prev > 0 ? prev - 1 : null);
      setHotdropCountdown(prev => prev !== null && prev > 0 ? prev - 1 : null);
      setQuestCountdown(prev => prev !== null && prev > 0 ? prev - 1 : null);
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const [debug, setDebug] = useState({
    build: "v1.0.0-node-b14",
    tapCount: 0,
    lastTap: "",
    nodeId: "",
    reserve: "",
    lastNet: "",
    ts: "",
    nodes: 0,
  });
  
  const dbg = useCallback((patch: Partial<typeof debug>) => {
    setDebug((d) => ({
      ...d,
      ...patch,
      tapCount: (d.tapCount ?? 0) + 1,
      ts: new Date().toISOString(),
    }));
  }, []);
  
  const { data: mapNodesData, refetch: refetchMapNodes } = useMapNodes(
    playerLocation?.latitude ?? null,
    playerLocation?.longitude ?? null
  );
  const reserveNodeMutation = useReserveNode();
  const loadingFadeAnim = useSharedValue(1);
  const hasAutoSpawned = useRef(false);
  const activeSpawnRef = useRef<Spawn | null>(null);
  const playerLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  
  // Anti-freeze: catch lock + sequence tracking
  const catchLockRef = useRef(false);
  const catchSeqRef = useRef(0);

  const pulseAnim = useSharedValue(1);

  const gpsReady = !!playerLocation;
  const dataReady = economyReady;
  const allReady = gpsReady && dataReady && mapReady;

  // Persist player location to ref so it's always available (even when camera encounter pauses updates)
  useEffect(() => {
    if (playerLocation) {
      playerLocationRef.current = {
        latitude: playerLocation.latitude,
        longitude: playerLocation.longitude,
      };
    }
  }, [playerLocation]);

  const handleRequestPermission = useCallback(async () => {
    if (Platform.OS !== "web") {
      try {
        await Linking.openSettings();
      } catch (error) {
        console.error("Failed to open settings:", error);
      }
    }
  }, []);

  useEffect(() => {
    if (allReady) {
      loadingFadeAnim.value = withTiming(0, { duration: 400, easing: Easing.ease });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [allReady]);

  // Check onboarding status on mount
  useEffect(() => {
    (async () => {
      const completed = await isOnboardingCompleted();
      if (!completed && allReady) {
        setShowCoachmarks(true);
      }
    })();
  }, [allReady]);

  // Tip display helper
  const showTip = useCallback(async (tipId: string, message: string) => {
    const can = await canShowTip(tipId);
    if (!can) return;
    await markTipShown(tipId);
    setTipMessage(message);
    if (tipTimeoutRef.current) clearTimeout(tipTimeoutRef.current);
    tipTimeoutRef.current = setTimeout(() => setTipMessage(null), 4000);
  }, []);

  // Contextual tip: No eggs in range
  useEffect(() => {
    if (spawnsLoaded && inRangeCount === 0 && homeCountdown && homeCountdown > 0) {
      if (outOfRangeCount > 0) {
        showTip("tip_move_closer", `${outOfRangeCount} egg${outOfRangeCount > 1 ? 's' : ''} nearby — move closer to catch!`);
      } else {
        showTip("tip_area_cleared", `No eggs nearby. Next Home Drop in ${formatSeconds(homeCountdown)}.`);
      }
    }
  }, [spawnsLoaded, inRangeCount, outOfRangeCount, homeCountdown, showTip]);

  // Contextual tip: Quest active
  useEffect(() => {
    if (huntMeta?.quest?.active && huntMeta.quest.key) {
      (async () => {
        const seen = await hasSeenQuestKey(huntMeta.quest!.key!);
        if (!seen) {
          await markQuestKeySeen(huntMeta.quest!.key!);
          showTip("tip_quest_active", "Quest live on map. Follow the marker!");
        }
      })();
    }
  }, [huntMeta?.quest?.active, huntMeta?.quest?.key, showTip]);

  // Contextual tip: Pity close
  useEffect(() => {
    if (phaseIStats?.pity?.epicIn !== undefined && phaseIStats.pity.epicIn <= 5 && phaseIStats.pity.epicIn > 0) {
      showTip("tip_pity_close", `Epic pity soon! ${phaseIStats.pity.epicIn} catches to guaranteed Epic.`);
    }
  }, [phaseIStats?.pity?.epicIn, showTip]);

  // HOME DROP: visible == catchable, so no "walk closer" tip needed
  // (Tip removed - all visible eggs are now catchable)

  // Cleanup tip timeout
  useEffect(() => {
    return () => {
      if (tipTimeoutRef.current) clearTimeout(tipTimeoutRef.current);
    };
  }, []);

  const loadingOverlayStyle = useAnimatedStyle(() => ({
    opacity: loadingFadeAnim.value,
    pointerEvents: loadingFadeAnim.value > 0 ? "auto" as const : "none" as const,
  }));

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1000, easing: Easing.ease }),
        withTiming(1, { duration: 1000, easing: Easing.ease })
      ),
      -1
    );
  }, []);

  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsStale, setGpsStale] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastRawGpsTs, setLastRawGpsTs] = useState<number | null>(null);
  const [lastAcceptedGpsTs, setLastAcceptedGpsTs] = useState<number | null>(null);

  const bestAccuracyRef = useRef<number>(Infinity);
  const lastRawTickRef = useRef<number>(0);
  const lastAcceptedTickRef = useRef<number>(0);
  const lastPostTickRef = useRef<number>(0); // Track when we last POSTed to server
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const isMountedRef = useRef(true);
  const lastAcceptedRef = useRef<{
    lat: number;
    lng: number;
    ts: number;
    accuracy: number;
  } | null>(null);
  
  // Smoothed position for EMA filtering
  const lastSmoothedRef = useRef<{ lat: number; lng: number } | null>(null);
  // Last heartbeat accept timestamp (for stationary updates)
  const lastHeartbeatTickRef = useRef<number>(0);

  function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371000;
    const toRad = (v: number) => (v * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  // Detect stale GPS (no ACCEPTED updates for 15 seconds)
  useEffect(() => {
    const staleCheckInterval = setInterval(() => {
      const now = Date.now();
      const lastAccepted = lastAcceptedTickRef.current;
      const isStale = !lastAccepted || (now - lastAccepted) > 15000;
      setGpsStale(isStale);
    }, 1000);
    return () => clearInterval(staleCheckInterval);
  }, []);

  const gpsNoSignal = useMemo(() => {
    if (permissionDenied) return true;
    const lastRaw = lastRawTickRef.current;
    if (!lastRaw) return true;
    return (Date.now() - lastRaw) > 30000;
  }, [permissionDenied, lastRawGpsTs]);

  const gpsWeak = useMemo(() => {
    if (gpsNoSignal) return false;
    const lastAccepted = lastAcceptedTickRef.current;
    if (!lastAccepted) return true;
    return (Date.now() - lastAccepted) > 15000;
  }, [gpsNoSignal, lastAcceptedGpsTs]);

  const startLocationTracking = useCallback(async () => {
    let hasInitialLocation = false;
    
    try {
      // First check current permission status
      const { status: currentStatus } = await Location.getForegroundPermissionsAsync();
      console.log("[Hunt] Current permission status:", currentStatus);
      
      if (currentStatus !== "granted") {
        // Try requesting if not granted
        const { status } = await Location.requestForegroundPermissionsAsync();
        console.log("[Hunt] Requested permission status:", status);
        if (status !== "granted") {
          setLocationError("Location permission required for hunting");
          setPermissionDenied(true);
          return;
        }
      }
      
      setPermissionDenied(false);
      setLocationError(null);

      if (Platform.OS === "android") {
        try {
          await Location.enableNetworkProviderAsync();
        } catch {
        }
      }

      // FAST initial location - accept lower accuracy to start quickly
      try {
        console.log("[Hunt] Getting quick initial location...");
        const quickLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        if (isMountedRef.current && quickLocation && !hasInitialLocation) {
          const heading = quickLocation.coords.heading;
          const accuracy = quickLocation.coords.accuracy ?? 100;
          const rawTs = quickLocation.timestamp ?? Date.now();
          
          setLastRawGpsTs(rawTs);
          lastRawTickRef.current = Date.now();
          setGpsAccuracy(accuracy);
          
          hasInitialLocation = true;
          bestAccuracyRef.current = accuracy;
          setLastAcceptedGpsTs(rawTs);
          lastAcceptedTickRef.current = Date.now();
          updateLocation(
            quickLocation.coords.latitude, 
            quickLocation.coords.longitude,
            heading !== null && heading >= 0 ? heading : 0
          );
          console.log(`[Hunt] Quick initial location accuracy: ${accuracy}m`);
        }
      } catch (error) {
        console.log("[Hunt] Quick location failed, waiting for watch...", error);
      }

      // Clean up existing subscription
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
      }

      locationSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,  // More frequent updates for smoother tracking
          distanceInterval: 1, // Let our filter handle distance, get raw stream
        },
        (newLocation) => {
          if (!isMountedRef.current) return;

          const coords = newLocation.coords;
          const accuracy = coords.accuracy ?? 999;
          const ts = newLocation.timestamp ?? Date.now();
          const now = Date.now();

          setLastRawGpsTs(ts);
          lastRawTickRef.current = now;
          setGpsAccuracy(accuracy);

          const rawLat = coords.latitude;
          const rawLng = coords.longitude;

          // === ACCURACY-AWARE THRESHOLDS ===
          // Reject truly bad accuracy (>120m is unusable)
          if (accuracy > 120) {
            return;
          }

          // Dynamic thresholds based on accuracy
          const minMoveToUpdate = accuracy <= 15 ? 4 : accuracy <= 30 ? 6 : 10;
          const stationaryDist = Math.min(12, Math.max(4, accuracy * 0.25));
          const HEARTBEAT_INTERVAL_MS = 8000; // Accept stationary update every 8s
          const POST_MIN_INTERVAL_MS = 12000; // POST to server every 12s minimum

          // === EMA SMOOTHING ===
          // Alpha depends on accuracy: smoother when accuracy is better
          const alpha = accuracy <= 10 ? 0.25 : accuracy <= 25 ? 0.35 : accuracy <= 50 ? 0.45 : 0.60;
          
          let smoothedLat: number;
          let smoothedLng: number;
          
          if (!lastSmoothedRef.current) {
            // First point - no smoothing
            smoothedLat = rawLat;
            smoothedLng = rawLng;
          } else {
            // Apply EMA: newSmoothed = alpha*raw + (1-alpha)*prev
            smoothedLat = alpha * rawLat + (1 - alpha) * lastSmoothedRef.current.lat;
            smoothedLng = alpha * rawLng + (1 - alpha) * lastSmoothedRef.current.lng;
          }
          lastSmoothedRef.current = { lat: smoothedLat, lng: smoothedLng };

          // Always accept the very first fix
          if (!lastAcceptedRef.current) {
            lastAcceptedRef.current = { lat: smoothedLat, lng: smoothedLng, ts, accuracy };
            lastHeartbeatTickRef.current = now;
            lastPostTickRef.current = now;
            hasInitialLocation = true;

            setLastAcceptedGpsTs(ts);
            lastAcceptedTickRef.current = now;
            setGpsStale(false);
            const heading = coords.heading;
            updateLocation(
              smoothedLat,
              smoothedLng,
              heading !== null && heading >= 0 ? heading : undefined,
              { forcePost: true }
            );
            return;
          }

          const prev = lastAcceptedRef.current;
          const dtSec = Math.max(0.1, (ts - prev.ts) / 1000);
          const distM = haversineMeters(prev.lat, prev.lng, smoothedLat, smoothedLng);
          const speed = distM / dtSec; // m/s

          // === SPEED-BASED TELEPORT DETECTION ===
          // Reject if speed > 12 m/s (43 kph) - impossible on foot
          if (speed > 12) {
            return;
          }
          // Reject fast + inaccurate (suspicious)
          if (speed > 6 && accuracy > 50) {
            return;
          }

          // === HEARTBEAT ACCEPT (for stationary users) ===
          const timeSinceAccepted = now - lastAcceptedTickRef.current;
          const isHeartbeatDue = timeSinceAccepted >= HEARTBEAT_INTERVAL_MS && accuracy <= 35;

          // === MOVEMENT CHECK ===
          const accuracyImprovedALot = accuracy + 10 < prev.accuracy;
          const isStationary = distM < stationaryDist;
          const isMinimalMove = distM < minMoveToUpdate;

          // Reject jitter if stationary and no heartbeat due
          if (isStationary && !accuracyImprovedALot && !isHeartbeatDue) {
            return;
          }

          // Reject minimal movement unless accuracy improved or heartbeat due
          if (isMinimalMove && !accuracyImprovedALot && !isHeartbeatDue) {
            return;
          }

          // === ACCEPT THIS FIX ===
          // IMPORTANT: Update accepted tick IMMEDIATELY regardless of POST
          lastAcceptedRef.current = { lat: smoothedLat, lng: smoothedLng, ts, accuracy };
          hasInitialLocation = true;
          setLastAcceptedGpsTs(ts);
          lastAcceptedTickRef.current = now;
          setGpsStale(false); // Clear stale immediately on accept

          if (isHeartbeatDue || isStationary) {
            lastHeartbeatTickRef.current = now;
          }

          if (accuracy < bestAccuracyRef.current) {
            bestAccuracyRef.current = accuracy;
          }

          // === POST THROTTLING ===
          // POST to server only if enough time elapsed OR significant movement
          const timeSincePost = now - lastPostTickRef.current;
          const shouldPost = timeSincePost >= POST_MIN_INTERVAL_MS || distM >= 10;

          if (shouldPost) {
            lastPostTickRef.current = now;
          }

          const heading = coords.heading;
          updateLocation(
            smoothedLat,
            smoothedLng,
            heading !== null && heading >= 0 ? heading : undefined,
            { forcePost: shouldPost }
          );
        }
      );
    } catch (error) {
      console.error("[Hunt] Location tracking error:", error);
      setLocationError("Could not get location. Please try again.");
    }
  }, [updateLocation]);

  // Initial location tracking
  useEffect(() => {
    isMountedRef.current = true;
    startLocationTracking();
    
    return () => {
      isMountedRef.current = false;
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
      }
    };
  }, [startLocationTracking]);

  // Re-check permission when app returns from background (e.g., from Settings)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active" && permissionDenied) {
        console.log("[Hunt] App became active, re-checking location permission...");
        setRetryCount(prev => prev + 1);
        startLocationTracking();
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [permissionDenied, startLocationTracking]);

  // NOTE: Auto-spawn logic removed - drip system now creates spawns server-side via GET /api/hunt/spawns
  // The server checks session timestamps and creates 1 drip spawn every 4 minutes automatically

  const handleSpawnTap = (spawn: Spawn) => {
    dbg({ lastTap: "SPAWN_TAP", nodeId: spawn.id });
    console.log("[handleSpawnTap] Spawn tapped:", spawn.id, spawn.name, "distance:", spawn.distance);
    
    // HOME DROP: visible == catchable (same radius CATCH_RADIUS_M = 50m)
    const dist = spawn.distance || 0;
    
    if (dist > CATCH_RADIUS_M) {
      dbg({ reserve: "TOO_FAR" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    
    if (playerLocation) {
      playerLocationRef.current = {
        latitude: playerLocation.latitude,
        longitude: playerLocation.longitude,
      };
    }
    
    setSelectedSpawn(spawn);
    activeSpawnRef.current = spawn;
    
    // HOME DROP: All visible eggs are catchable - go straight to encounter
    dbg({ reserve: "IN_RANGE" });
    setShowCameraEncounter(true);
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };
  
  const getActiveReservation = () => {
    const now = Date.now();
    for (const [spawnId, until] of Object.entries(spawnReservations)) {
      if (new Date(until).getTime() > now) {
        return spawnId;
      }
    }
    return null;
  };
  
  const handleReserveSpawn = async () => {
    if (!selectedSpawn) return;
    
    const existingReservation = getActiveReservation();
    if (existingReservation && existingReservation !== selectedSpawn.id) {
      dbg({ reserve: "ALREADY_RESERVED" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setReserveToast("You already have an active reservation!");
      setTimeout(() => setReserveToast(null), 3000);
      return;
    }
    
    setIsReservingSpawn(true);
    dbg({ reserve: "RESERVING..." });
    
    const reserveUntil = new Date(Date.now() + 8 * 60 * 1000);
    setSpawnReservations({ [selectedSpawn.id]: reserveUntil });
    
    setIsReservingSpawn(false);
    dbg({ reserve: `OK until ${reserveUntil.toLocaleTimeString()}` });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };
  
  const handleSpawnNavigate = () => {
    if (!selectedSpawn) return;
    
    // HOME DROP: visible == catchable - always go to encounter
    setShowSpawnReserveSheet(false);
    setShowCameraEncounter(true);
  };

  const handleNodeTap = useCallback((node: MapNode) => {
    dbg({ lastTap: "NODE_PRESS", nodeId: node.nodeId });
    console.log("NODE_TAP", node.nodeId, node.type, node.quality);
    
    lastMarkerTapRef.current = Date.now();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedNode(node);
    setShowNodeSheet(true);
  }, [dbg]);
  
  const handleMapPress = useCallback(() => {
    dbg({ lastTap: "MAP_PRESS" });
    console.log("MAP_PRESS");
  }, [dbg]);

  const handleReserveNode = useCallback(async () => {
    if (!selectedNode || !playerLocation) {
      console.log("RESERVE_BLOCKED: no node or location", { selectedNode: !!selectedNode, playerLocation: !!playerLocation });
      dbg({ reserve: "BLOCKED: missing data" });
      setReserveToast("Missing node or location");
      setTimeout(() => setReserveToast(null), 3000);
      return;
    }

    console.log("RESERVE_START", {
      nodeId: selectedNode.nodeId,
      type: selectedNode.type,
      quality: selectedNode.quality,
      playerLat: playerLocation.latitude,
      playerLng: playerLocation.longitude,
    });
    dbg({ reserve: "START", lastNet: "/api/map/nodes/reserve" });
    setReserveToast("Calling /api/map/nodes/reserve...");

    try {
      const result = await reserveNodeMutation.mutateAsync({
        nodeId: selectedNode.nodeId,
        lat: playerLocation.latitude,
        lng: playerLocation.longitude,
      });
      
      console.log("RESERVE_SUCCESS", JSON.stringify(result));
      dbg({ reserve: `OK: ${result.reservationId?.slice(0,8) || "done"}` });
      
      setReservedByMe((prev) => ({ ...prev, [selectedNode.nodeId]: true }));
      
      setSelectedNode((prev) =>
        prev ? { ...prev, status: "RESERVED", reservedUntil: result.reservedUntil } : null
      );
      
      setReserveToast(`RESERVED! ID: ${result.reservationId?.slice(0,8) || "ok"} until ${result.reservedUntil ? new Date(result.reservedUntil).toLocaleTimeString() : "?"}`);
      setTimeout(() => setReserveToast(null), 5000);
      
      refetchMapNodes();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error("RESERVE_FAIL", error.message, error);
      dbg({ reserve: `ERR: ${error?.message ?? "unknown"}` });
      setReserveToast(`FAIL: ${error.message || "Unknown error"}`);
      setTimeout(() => setReserveToast(null), 5000);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [selectedNode, playerLocation, reserveNodeMutation, refetchMapNodes, dbg]);

  const handleNavigateToNode = useCallback(() => {
    if (!selectedNode) return;
    console.log("NAVIGATE_TO_NODE", selectedNode.nodeId);
    setShowNodeSheet(false);
  }, [selectedNode]);

  const handleCloseNodeSheet = useCallback(() => {
    const timeSinceTap = Date.now() - lastMarkerTapRef.current;
    if (timeSinceTap < 300) return;
    setShowNodeSheet(false);
    setSelectedNode(null);
  }, []);

  const [isCollecting, setIsCollecting] = useState(false);

  const handleStartCatch = async (passedSpawn: Spawn) => {
    console.log("[handleStartCatch] v12 CALLED with spawn:", passedSpawn?.id, JSON.stringify(passedSpawn));
    
    const cleanupEncounter = () => {
      setIsCollecting(false);
      setShowCameraEncounter(false);
      setSelectedSpawn(null);
      activeSpawnRef.current = null;
    };
    
    // Anti-freeze: Block if already processing a catch
    if (catchLockRef.current) {
      console.log("[handleStartCatch] v12 BLOCKED: catchLockRef is true");
      return;
    }
    
    // USE THE PASSED SPAWN - this is the fix!
    const spawn = passedSpawn;
    
    // Guard: No spawn = can't proceed
    if (!spawn) {
      console.log("[handleStartCatch] ERROR: No spawn passed");
      cleanupEncounter();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    
    // Anti-freeze: Lock and track this attempt
    catchLockRef.current = true;
    const thisAttempt = ++catchSeqRef.current;
    console.log("[handleStartCatch] v11 Lock acquired, attempt:", thisAttempt);
    
    // CRITICAL: Show loading state FIRST, before ANY other logic
    // This ensures user sees feedback immediately
    setIsCollecting(true);
    console.log("[handleStartCatch] Set isCollecting=true");
    
    try {
      // LOCATION: Parse spawn coordinates with fallbacks
      let spawnLat = parseFloat(String(spawn.latitude));
      let spawnLon = parseFloat(String(spawn.longitude));
      
      // Validate coordinates - if NaN, try numeric properties
      if (isNaN(spawnLat) || isNaN(spawnLon)) {
        console.log("[handleStartCatch] WARNING: spawn lat/lon parse failed, trying numeric");
        spawnLat = Number(spawn.latitude) || 0;
        spawnLon = Number(spawn.longitude) || 0;
      }
      
      console.log("[handleStartCatch] Parsed coords:", spawnLat, spawnLon);
      
      // Use spawn coords as default location (player is within 100m anyway)
      let loc = { latitude: spawnLat, longitude: spawnLon };
      
      // Try player's exact location if available
      if (playerLocationRef.current && playerLocationRef.current.latitude && playerLocationRef.current.longitude) {
        loc = playerLocationRef.current;
        console.log("[handleStartCatch] Using playerLocationRef");
      } else if (playerLocation && playerLocation.latitude && playerLocation.longitude) {
        loc = { latitude: playerLocation.latitude, longitude: playerLocation.longitude };
        console.log("[handleStartCatch] Using playerLocation state");
      } else {
        console.log("[handleStartCatch] Using spawn coords as location");
      }
      
      // Final validation - ensure we have valid numbers
      if (isNaN(loc.latitude) || isNaN(loc.longitude)) {
        console.log("[handleStartCatch] ERROR: Final coords are NaN!");
        // Don't close modal yet - show error but keep modal open for debugging
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        if (thisAttempt === catchSeqRef.current) setIsCollecting(false);
        catchLockRef.current = false;
        return; // Stay on camera screen
      }
      
      console.log("[handleStartCatch] Final loc:", loc.latitude, loc.longitude);
      console.log("[handleStartCatch] Calling claimNode API...");
      
      // Call the API with attemptId for stale response detection
      const result = await claimNode(
        spawn.id,
        loc.latitude,
        loc.longitude,
        "perfect",
        thisAttempt
      );
      
      // Anti-freeze: Ignore stale responses - but ALWAYS clean up
      if (thisAttempt !== catchSeqRef.current) {
        console.log("[handleStartCatch] v12 Ignoring stale response, attempt:", thisAttempt, "current:", catchSeqRef.current);
        cleanupEncounter();
        return;
      }
      
      console.log("[Phase1] API result:", JSON.stringify(result));
      
      // v14 FIX: Check for eggRarity (the actual data) instead of success flag
      // Backend was returning eggRarity but with success:false, causing reveal to never show
      console.log("[Phase1] v14 API result:", JSON.stringify(result));
      
      if (result && result.eggRarity) {
        // GOT AN EGG! Show the reveal
        const normalizedRarity = (result.eggRarity === "uncommon" ? "common" : result.eggRarity) as "common" | "rare" | "epic" | "legendary";
        console.log("[Phase1] v15 GOT EGG! Rarity:", normalizedRarity);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // 1) Set reveal payload FIRST (sync) - prevents reveal from being lost
        setCollectedEggInfo({
          rarity: normalizedRarity,
          xpAwarded: result.xpAwarded || 0,
          pointsAwarded: result.pointsAwarded || 0,
          quality: "perfect",
          pity: result.pity || { rareIn: 20, epicIn: 60, legendaryIn: 200 },
        });
        
        // 2) Close encounter AFTER payload is set (next tick)
        requestAnimationFrame(() => {
          cleanupEncounter();
        });
        
        // Force refetch all hunt data immediately (not lazy invalidate)
        Promise.allSettled([
          queryClient.refetchQueries({ queryKey: ["/api/hunt/me"] }),
          queryClient.refetchQueries({ queryKey: ["/api/hunt/spawns"], exact: false }),
          queryClient.refetchQueries({ queryKey: ["/api/hunt/phase1"], exact: false }),
          queryClient.refetchQueries({ queryKey: ["/api/map/nodes"], exact: false }),
          queryClient.refetchQueries({ queryKey: ["/api/hunt/nodes"], exact: false }),
          queryClient.refetchQueries({ queryKey: ["/api/hunt/economy"], exact: false }),
        ]).then(() => {
          console.log("[Phase1] Force refetch complete after catch");
        });
        refreshPhaseIStats();
        return;
      } else if (result && result.error) {
        // Actual error from server
        console.log("[Phase1] Server error:", result.error);
        
        // Anti-freeze: Cancelled/Timeout ALWAYS cleans up silently
        if (result.error === "Cancelled" || result.error === "Timeout") {
          cleanupEncounter();
          return;
        }
        
        setIsCollecting(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Catch Failed", result.error, [{ text: "OK", onPress: cleanupEncounter }]);
      } else {
        // Unknown response
        console.log("[Phase1] Unknown response:", JSON.stringify(result));
        setIsCollecting(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Catch Failed", "Something went wrong", [{ text: "OK", onPress: cleanupEncounter }]);
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error) || "Network error";
      console.error("[Phase1] Network error:", errorMsg);
      
      // Anti-freeze: AbortError ALWAYS cleans up
      if (error?.name === "AbortError" || (error as any)?.code === "ABORTED") {
        cleanupEncounter();
        return;
      }
      
      // Only show alert if this is still the current attempt
      if (thisAttempt === catchSeqRef.current) {
        setIsCollecting(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Connection Error", errorMsg, [{ text: "OK", onPress: cleanupEncounter }]);
      }
    } finally {
      // Always release the lock
      catchLockRef.current = false;
      console.log("[handleStartCatch] v12 Lock released");
    }
  };

  const handleCancelEncounter = () => {
    setShowCameraEncounter(false);
    setSelectedSpawn(null);
    activeSpawnRef.current = null;
  };

  const handleMissEncounter = async (spawn: Spawn) => {
    // Player missed the egg - remove it from server
    console.log("[Hunt] handleMissEncounter called for spawn:", spawn.id);
    const result = await missSpawn(spawn.id);
    console.log("[Hunt] missSpawn result:", result);
    return result;
  };

  const handleCatchResult = async (quality: "perfect" | "great" | "good" | "miss") => {
    if (!selectedSpawn || quality === "miss") {
      setShowCatchGame(false);
      setSelectedSpawn(null);
      activeSpawnRef.current = null;
      return;
    }

    const caught = await catchCreature(selectedSpawn.id, quality);
    if (caught) {
      setCaughtCreature(caught);
      setCatchQuality(quality);
    }
    setShowCatchGame(false);
    setSelectedSpawn(null);
    activeSpawnRef.current = null;
  };

  const handleEscape = () => {
    setShowCatchGame(false);
    setSelectedSpawn(null);
    activeSpawnRef.current = null;
  };

  const handleEggCollected = useCallback(async (quality: "perfect" | "great" | "good" = "perfect") => {
    const spawn = activeSpawnRef.current;
    const loc = playerLocation;
    console.log("[EggCollect] handleEggCollected CALLED - spawn:", spawn?.id, "location:", !!loc, "quality:", quality);
    
    if (!spawn) {
      console.log("[EggCollect] ERROR: No spawn in activeSpawnRef!");
      setShowCatchGame(false);
      return;
    }
    if (!loc) {
      console.log("[EggCollect] ERROR: No playerLocation!");
      setShowCatchGame(false);
      return;
    }
    
    console.log("[EggCollect] Calling claimNode API with spawnId:", spawn.id);
    const result = await claimNode(
      spawn.id,
      loc.latitude,
      loc.longitude,
      quality
    );
    
    console.log("[EggCollect] API response:", JSON.stringify(result));
    
    if (result && result.success) {
      const normalizedRarity = (result.eggRarity === "uncommon" ? "common" : result.eggRarity) as "common" | "rare" | "epic" | "legendary";
      console.log("[EggCollect] SUCCESS! Setting modal with rarity:", normalizedRarity);
      setCollectedEggInfo({
        rarity: normalizedRarity,
        xpAwarded: result.xpAwarded || 0,
        pointsAwarded: result.pointsAwarded || 0,
        quality: quality,
        pity: result.pity || { rareIn: 20, epicIn: 60, legendaryIn: 200 },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refreshPhaseIStats();
    } else {
      console.log("[EggCollect] FAILED:", result?.error);
    }
    setShowCatchGame(false);
    setSelectedSpawn(null);
    activeSpawnRef.current = null;
  }, [playerLocation, claimNode, refreshPhaseIStats]);

  const handleRevealComplete = () => {
    setCaughtCreature(null);
    setCatchQuality(null);
    refreshSpawns();
  };

  const handleRaidComplete = (rewards: any) => {
    setSelectedRaid(null);
  };

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const renderEconomyPanel = () => {
    const stats = phaseIStats;
    if (!stats && !economy) return null;

    const huntsToday = stats?.huntsToday ?? economy?.catchesToday ?? 0;
    const dailyCap = stats?.dailyCap ?? 25;
    const streakCount = stats?.streakCount ?? economy?.currentStreak ?? 0;
    const streakXpMult = stats?.streakXpMult ?? 1.0;
    const heatModeActive = stats?.heatModeActive ?? false;
    const rareIn = stats?.pity?.rareIn ?? Math.max(0, 20 - (economy?.catchesSinceRare ?? 0));
    const epicIn = stats?.pity?.epicIn ?? Math.max(0, 60 - (economy?.catchesSinceEpic ?? 0));
    const legendaryIn = stats?.pity?.legendaryIn ?? 250;
    const hunterLevel = stats?.level ?? stats?.hunterLevel ?? 1;
    const warmth = stats?.warmth ?? 0;
    const huntProgress = Math.min(1, huntsToday / dailyCap);

    return (
      <View style={styles.premiumStatsCard}>
        <View style={styles.statsGlassOverlay} />
        <View style={styles.statsHeader}>
          <View style={styles.statsHeaderLeft}>
            <ThemedText style={styles.statsTitle}>Hunter Stats</ThemedText>
            {heatModeActive && (
              <View style={styles.heatModeBadge}>
                <Feather name="thermometer" size={10} color="#FFFFFF" />
                <ThemedText style={styles.heatModeText}>HEAT</ThemedText>
              </View>
            )}
          </View>
          <Pressable 
            style={styles.levelBadgePremium}
            onPress={() => setShowLevelSheet(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="award" size={12} color={GameColors.gold} />
            <ThemedText style={styles.levelTextPremium}>Lv.{hunterLevel}</ThemedText>
            <Feather name="chevron-right" size={12} color={GameColors.textTertiary} />
          </Pressable>
        </View>
        
        <View style={styles.statsMainRow}>
          <View style={styles.statBlock}>
            <View style={styles.statIconCircle}>
              <Feather name="crosshair" size={16} color={GameColors.primary} />
            </View>
            <ThemedText style={styles.statValuePremium}>{huntsToday}/{dailyCap}</ThemedText>
            <ThemedText style={styles.statLabelPremium}>Today</ThemedText>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statBlock}>
            <View style={[styles.statIconCircle, { backgroundColor: '#22C55E20' }]}>
              <Feather name="zap" size={16} color="#22C55E" />
            </View>
            <View style={styles.statValueRow}>
              <ThemedText style={styles.statValuePremium}>{streakCount}</ThemedText>
              {streakXpMult > 1 && (
                <View style={styles.xpMultBadge}>
                  <ThemedText style={styles.xpMultText}>{streakXpMult.toFixed(1)}x</ThemedText>
                </View>
              )}
            </View>
            <ThemedText style={styles.statLabelPremium}>Streak</ThemedText>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statBlock}>
            <View style={[styles.statIconCircle, { backgroundColor: heatModeActive ? '#EF444420' : '#F9731620' }]}>
              <Feather name={heatModeActive ? "thermometer" : "sun"} size={16} color={heatModeActive ? "#EF4444" : "#F97316"} />
            </View>
            <ThemedText style={[styles.statValuePremium, heatModeActive && { color: '#EF4444' }]}>{warmth}</ThemedText>
            <ThemedText style={styles.statLabelPremium}>Warmth</ThemedText>
          </View>
        </View>
        
        <View style={styles.pityRowPremium}>
          <View style={styles.pityPill}>
            <ThemedText style={styles.pityPillLabel}>Rare in</ThemedText>
            <ThemedText style={[styles.pityPillValue, { color: RARITY_COLORS.rare }]}>{rareIn}</ThemedText>
          </View>
          <View style={styles.pityPill}>
            <ThemedText style={styles.pityPillLabel}>Epic in</ThemedText>
            <ThemedText style={[styles.pityPillValue, { color: RARITY_COLORS.epic }]}>{epicIn}</ThemedText>
          </View>
          <View style={styles.pityPill}>
            <ThemedText style={styles.pityPillLabel}>Legendary in</ThemedText>
            <ThemedText style={[styles.pityPillValue, { color: RARITY_COLORS.legendary }]}>{legendaryIn}</ThemedText>
          </View>
        </View>
      </View>
    );
  };

  const centerOnPlayer = () => {
    if (mapRef.current) {
      mapRef.current.centerOnPlayer();
    }
  };

  const allMapNodes = React.useMemo(() => {
    if (!mapNodesData) {
      console.log("[HuntScreen] No mapNodesData yet");
      return [];
    }
    const total = mapNodesData.personalNodes.length + mapNodesData.hotspots.length + mapNodesData.events.length;
    console.log(`[HuntScreen] mapNodesData: ${total} nodes (${mapNodesData.personalNodes.length} personal, ${mapNodesData.hotspots.length} hotspots, ${mapNodesData.events.length} events)`);
    return [
      ...mapNodesData.personalNodes,
      ...mapNodesData.hotspots,
      ...mapNodesData.events,
    ];
  }, [mapNodesData]);

  // Update debug with node count
  useEffect(() => {
    setDebug((d) => ({ ...d, nodes: allMapNodes.length }));
  }, [allMapNodes.length]);

  // Cleanup expired reservations from reservedByMe
  useEffect(() => {
    if (allMapNodes.length === 0) return;
    const nodeMap = new Map(allMapNodes.map((n) => [n.nodeId, n]));
    setReservedByMe((prev) => {
      const next: Record<string, true> = {};
      for (const nodeId of Object.keys(prev)) {
        const node = nodeMap.get(nodeId);
        if (node && node.status === "RESERVED" && node.reservedUntil) {
          if (new Date(node.reservedUntil).getTime() > Date.now()) {
            next[nodeId] = true;
          }
        }
      }
      return next;
    });
  }, [allMapNodes]);

  // Check if user is brand new (no catches today)
  const isNewPlayer = (economy?.catchesToday ?? 0) === 0;
  
  const renderAreaClearedBanner = () => {
    // showBanner is computed at parent level to prevent flicker
    if (!showBanner) return null;
    
    // Determine banner title and icon based on context
    let bannerTitle: string;
    let bannerIcon: keyof typeof Feather.glyphMap = "info";
    let bannerIconColor = GameColors.primary;
    
    // Banner priority: Hot Drop available > Hot Drop cooldown > Home Drop cooldown > No eggs
    const hotDropOffer = huntMeta?.offers?.hotdrop;
    const hotDropAvailable = !!hotDropOffer?.available;
    const hotDropCooldown = hotDropOffer?.cooldownEndsInSec;
    
    if (isNewPlayer) {
      // New player with no eggs - show welcome message
      bannerTitle = "Welcome! Eggs will spawn nearby soon.";
      bannerIcon = "gift";
      bannerIconColor = GameColors.gold;
    } else if (hotDropAvailable) {
      // Hot Drop is available - highlight it
      bannerTitle = "Hot Drop available! Tap to activate";
      bannerIcon = "zap";
      bannerIconColor = "#FF6B35";
    } else if (hotDropCooldown && hotDropCooldown > 0) {
      // Hot Drop on cooldown - show timer
      const mins = Math.ceil(hotDropCooldown / 60);
      bannerTitle = `Hot Drop in ${mins}m • Try Micro Hotspot`;
      bannerIcon = "clock";
      bannerIconColor = GameColors.textSecondary;
    } else if (homeCountdown !== null && homeCountdown > 0) {
      // Home Drop countdown
      bannerTitle = `Next Home Drop in ${formatCountdown(homeCountdown)}`;
      bannerIcon = "clock";
      bannerIconColor = GameColors.textSecondary;
    } else {
      // Fallback
      bannerTitle = "No eggs in range";
      bannerIcon = "map-pin";
    }
    
    return (
      <View style={styles.areaClearedBanner}>
        <View style={styles.areaClearedHeader}>
          <Feather name={bannerIcon} size={20} color={bannerIconColor} />
          <ThemedText style={styles.areaClearedTitle}>{bannerTitle}</ThemedText>
        </View>
        
        {/* Quest Offers - Micro > Hot Drop > Beacon */}
        {!huntMeta?.quest?.active && huntMeta?.offers && (
          <View style={styles.questOffersRowInline}>
            {huntMeta.offers.micro && (
              <Pressable 
                style={[
                  styles.questOfferButtonSmall, 
                  !huntMeta.offers.micro.available && styles.questOfferButtonDisabled
                ]}
                onPress={async () => {
                  if (!huntMeta.offers?.micro?.available) return;
                  setActivatingQuest('MICRO_HOTSPOT');
                  const result = await activateHotspot('MICRO_HOTSPOT');
                  setActivatingQuest(null);
                  if (result.success) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    refreshSpawns();
                  }
                }}
                disabled={!huntMeta.offers.micro.available || !!activatingQuest}
              >
                <Feather name="map-pin" size={14} color={huntMeta.offers.micro.available ? GameColors.primary : GameColors.textTertiary} />
                <ThemedText style={[styles.questOfferTextSmall, !huntMeta.offers.micro.available && styles.questOfferTextDisabled]}>
                  {huntMeta.offers.micro.available ? 'Micro' : `${Math.ceil((huntMeta.offers.micro.cooldownEndsInSec || 0) / 60)}m`}
                </ThemedText>
              </Pressable>
            )}
            {huntMeta.offers.hotdrop && (
              <Pressable 
                style={[
                  styles.questOfferButtonSmall, 
                  !huntMeta.offers.hotdrop.available && styles.questOfferButtonDisabled
                ]}
                onPress={async () => {
                  if (!huntMeta.offers?.hotdrop?.available) return;
                  setActivatingQuest('HOT_DROP');
                  const result = await activateHotspot('HOT_DROP');
                  setActivatingQuest(null);
                  if (result.success) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    refreshSpawns();
                  }
                }}
                disabled={!huntMeta.offers.hotdrop.available || !!activatingQuest}
              >
                <Feather name="zap" size={14} color={huntMeta.offers.hotdrop.available ? '#FF6B35' : GameColors.textTertiary} />
                <ThemedText style={[styles.questOfferTextSmall, !huntMeta.offers.hotdrop.available && styles.questOfferTextDisabled]}>
                  {huntMeta.offers.hotdrop.available ? 'Hot Drop' : `${Math.ceil((huntMeta.offers.hotdrop.cooldownEndsInSec || 0) / 60)}m`}
                </ThemedText>
              </Pressable>
            )}
            {huntMeta.offers.beacon && (
              <Pressable 
                style={[
                  styles.questOfferButtonSmall, 
                  (!huntMeta.offers.beacon.available || huntMeta.offers.beacon.claimed) && styles.questOfferButtonDisabled
                ]}
                onPress={async () => {
                  if (!huntMeta.offers?.beacon?.available || huntMeta.offers.beacon.claimed) return;
                  setActivatingQuest('LEGENDARY_BEACON');
                  const result = await activateHotspot('LEGENDARY_BEACON');
                  setActivatingQuest(null);
                  if (result.success) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    refreshSpawns();
                  }
                }}
                disabled={!huntMeta.offers.beacon.available || huntMeta.offers.beacon.claimed || !!activatingQuest}
              >
                <Feather name="star" size={14} color={huntMeta.offers.beacon.available && !huntMeta.offers.beacon.claimed ? GameColors.gold : GameColors.textTertiary} />
                <ThemedText style={[styles.questOfferTextSmall, (!huntMeta.offers.beacon.available || huntMeta.offers.beacon.claimed) && styles.questOfferTextDisabled]}>
                  {huntMeta.offers.beacon.claimed ? 'Done' : 'Beacon'}
                </ThemedText>
              </Pressable>
            )}
          </View>
        )}
        
        {huntMeta?.hotdrop?.active && (
          <View style={styles.hotdropRow}>
            <Feather name="zap" size={14} color={GameColors.gold} />
            <ThemedText style={styles.hotdropText}>
              Hot Drop: LIVE • {huntMeta.hotdrop.direction} • {((huntMeta.hotdrop.distanceM || 0) / 1000).toFixed(1)}km
              {hotdropCountdown !== null && hotdropCountdown > 0 && ` • ${formatCountdown(hotdropCountdown)} left`}
            </ThemedText>
          </View>
        )}
        
        {huntMeta?.quest?.active && (
          <View style={styles.questTrackerRow}>
            <Feather 
              name={huntMeta.quest.type === 'LEGENDARY_BEACON' ? 'star' : huntMeta.quest.type === 'HOT_DROP' ? 'zap' : 'map-pin'} 
              size={14} 
              color={huntMeta.quest.type === 'LEGENDARY_BEACON' ? GameColors.gold : huntMeta.quest.type === 'HOT_DROP' ? '#FF6B35' : GameColors.primary} 
            />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.questText}>
                {huntMeta.quest.type === 'LEGENDARY_BEACON' ? 'Beacon Quest' : huntMeta.quest.type === 'HOT_DROP' ? 'Hot Drop Quest' : 'Micro Hotspot'}
                {' • '}{huntMeta.quest.direction} • {((huntMeta.quest.distanceM || 0) / 1000).toFixed(1)}km
              </ThemedText>
              <ThemedText style={styles.questProgress}>
                Progress: {huntMeta.quest.progress?.collected || 0}/{huntMeta.quest.progress?.total || 0} eggs
                {questCountdown !== null && questCountdown > 0 && ` • ${formatCountdown(questCountdown)} left`}
              </ThemedText>
              <ThemedText style={styles.questHint}>Quest marker on map - zoom out if needed</ThemedText>
            </View>
            {huntMeta.quest.type === 'LEGENDARY_BEACON' && 
             huntMeta.quest.progress?.collected === huntMeta.quest.progress?.total && (
              <Pressable 
                style={[styles.claimBeaconButton, activatingQuest && styles.claimBeaconButtonDisabled]}
                onPress={async () => {
                  setActivatingQuest('claiming');
                  const result = await claimBeacon();
                  setActivatingQuest(null);
                  if (result.success) {
                    Alert.alert('Beacon Claimed!', `You received a ${result.rewardRarity?.toUpperCase()} egg!`);
                    refreshSpawns();
                  } else {
                    Alert.alert('Error', result.error || 'Failed to claim beacon');
                  }
                }}
                disabled={!!activatingQuest}
              >
                <Feather name="gift" size={14} color="#fff" />
                <ThemedText style={styles.claimBeaconText}>Claim</ThemedText>
              </Pressable>
            )}
          </View>
        )}
      </View>
    );
  };

  const questMarker = useMemo(() => {
    const quest = huntMeta?.quest;
    if (!quest?.active || !quest.lat || !quest.lng || !quest.key) return null;
    const type = quest.type as 'HOT_DROP' | 'MICRO_HOTSPOT' | 'LEGENDARY_BEACON';
    if (!['HOT_DROP', 'MICRO_HOTSPOT', 'LEGENDARY_BEACON'].includes(type)) return null;
    return { id: quest.key, lat: quest.lat, lng: quest.lng, type };
  }, [huntMeta?.quest]);

  const handleQuestMarkerTap = () => {
    if (!huntMeta?.quest) return;
    const typeName = huntMeta.quest.type === 'LEGENDARY_BEACON' ? 'Beacon Quest' :
                     huntMeta.quest.type === 'HOT_DROP' ? 'Hot Drop' : 'Micro Hotspot';
    Alert.alert(
      typeName,
      `Mystery Egg cluster nearby!\n\nWalk to this hotspot area before it expires to reveal and catch eggs.\n\nDistance: ${((huntMeta.quest.distanceM || 0) / 1000).toFixed(1)}km ${huntMeta.quest.direction}`
    );
  };

  const renderMapView = () => {
    return (
      <View style={{ flex: 1 }}>
        {renderAreaClearedBanner()}
        <MapViewWrapper
          ref={mapRef}
          playerLocation={playerLocation}
          spawns={spawns}
          questSpawns={questSpawns}
          raids={raids}
          mapNodes={allMapNodes}
          nearbyPlayers={nearbyPlayers}
          questMarker={questMarker}
          gpsAccuracy={gpsAccuracy}
          gpsNoSignal={!!locationError || gpsNoSignal}
          gpsWeak={gpsWeak}
          isVisible={isVisible}
          reservedByMe={reservedByMe}
          onToggleVisibility={() => setVisibility(!isVisible)}
          onSpawnTap={handleSpawnTap}
          onRaidTap={(raid) => setSelectedRaid(raid)}
          onNodeTap={handleNodeTap}
          onQuestMarkerTap={handleQuestMarkerTap}
          onMapPress={handleMapPress}
          onRefresh={() => {
            refreshSpawns();
            refetchMapNodes();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          onMapReady={() => setMapReady(true)}
          onHelpPress={() => setShowHelpSheet(true)}
          onFaqPress={() => setShowFaq(true)}
          onToggleDebug={() => setShowDebugOverlay(v => !v)}
        />
        {/* Quest hint toast */}
        {!coachTipDismissed && !showHelpSheet && !showFaq && (
          <View style={styles.hintToast}>
            <Feather name="zap" size={12} color={GameColors.gold} />
            <ThemedText style={styles.hintToastText}>
              {huntMeta?.quest?.active ? "Follow marker • Eggs inside ring count" : "Tap eggs • Try Micro/Hot Drop"}
            </ThemedText>
            <Pressable hitSlop={10} onPress={dismissCoachTip}>
              <Feather name="x" size={12} color="rgba(244,214,176,0.6)" />
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  const renderCollection = () => (
    <ScrollView
      style={styles.collectionContainer}
      contentContainerStyle={styles.collectionContent}
    >
      <ThemedText type="h4" style={styles.sectionTitle}>
        Your Collection
      </ThemedText>
      <Card style={styles.emptyCard}>
        <Feather name="gift" size={48} color={GameColors.gold} />
        <ThemedText style={[styles.emptyText, { color: GameColors.gold }]}>
          Hatching Coming Soon!
        </ThemedText>
        <ThemedText style={styles.emptyText}>
          Collect eggs now. Your Roachies will hatch when Phase II launches.
        </ThemedText>
      </Card>
    </ScrollView>
  );

  const [recycleAmount, setRecycleAmount] = useState(1);
  const [fuseTimes, setFuseTimes] = useState(1);
  const [selectedFuseRarity, setSelectedFuseRarity] = useState<'common' | 'rare' | 'epic'>('common');
  const [isRecycling, setIsRecycling] = useState(false);
  const [isFusing, setIsFusing] = useState(false);
  const [fuseResult, setFuseResult] = useState<{ successCount: number; failCount: number } | null>(null);
  const [fusionAnimation, setFusionAnimation] = useState<{
    visible: boolean;
    inputRarity: 'common' | 'rare' | 'epic';
    outputRarity: 'rare' | 'epic' | 'legendary';
    inputCount: number;
    successCount: number;
    failCount: number;
  } | null>(null);

  const { recycleEggs, fuseEggs } = useHunt();

  const FUSION_COSTS: Record<'common' | 'rare' | 'epic', number> = {
    common: 5,
    rare: 20,
    epic: 30,
  };

  const FUSION_CHANCES: Record<'common' | 'rare' | 'epic', number> = {
    common: 100,
    rare: 15,
    epic: 5,
  };

  const FUSION_TARGETS: Record<'common' | 'rare' | 'epic', string> = {
    common: 'rare',
    rare: 'epic',
    epic: 'legendary',
  };

  const handleRecycle = async () => {
    if (!phaseIStats || (phaseIStats.eggs.common || 0) < recycleAmount) return;
    setIsRecycling(true);
    try {
      await recycleEggs(recycleAmount);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refreshPhaseIStats();
    } catch (error) {
      console.error("Recycle error:", error);
    }
    setIsRecycling(false);
  };

  const handleFuse = async () => {
    console.log("[Fusion] handleFuse called", { selectedFuseRarity, fuseTimes });
    const cost = FUSION_COSTS[selectedFuseRarity];
    const eggCount = phaseIStats?.eggs[selectedFuseRarity] || 0;
    const required = fuseTimes * cost;
    console.log("[Fusion] Eggs check:", { eggCount, required, cost });
    
    if (eggCount < required) {
      console.log("[Fusion] Not enough eggs, returning early");
      Alert.alert("Not Enough Eggs", `You need ${required} ${selectedFuseRarity} eggs but only have ${eggCount}.`);
      return;
    }
    
    setIsFusing(true);
    setFuseResult(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      console.log("[Fusion] Calling fuseEggs API...");
      const result = await fuseEggs(selectedFuseRarity, fuseTimes);
      console.log("[Fusion] API result:", result);
      
      const targetRarity = FUSION_TARGETS[selectedFuseRarity] as 'rare' | 'epic' | 'legendary';
      const inputCount = fuseTimes * FUSION_COSTS[selectedFuseRarity];
      
      setFusionAnimation({
        visible: true,
        inputRarity: selectedFuseRarity,
        outputRarity: targetRarity,
        inputCount,
        successCount: result.successCount,
        failCount: result.failCount,
      });
      
      refreshPhaseIStats();
    } catch (error: any) {
      console.error("[Fusion] Error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Fusion Failed", error?.message || "Something went wrong. Please try again.");
    } finally {
      setIsFusing(false);
    }
  };

  const getFuseMaxTimes = (rarity: 'common' | 'rare' | 'epic') => {
    const eggCount = phaseIStats?.eggs[rarity] || 0;
    return Math.floor(eggCount / FUSION_COSTS[rarity]);
  };

  const renderEggs = () => {
    const eggs = phaseIStats?.eggs || { common: 0, rare: 0, epic: 0, legendary: 0 };
    const totalEggs = eggs.common + eggs.rare + eggs.epic + eggs.legendary;
    const targetRarity = FUSION_TARGETS[selectedFuseRarity];
    const fusionCost = FUSION_COSTS[selectedFuseRarity];
    const fusionChance = FUSION_CHANCES[selectedFuseRarity];

    return (
      <ScrollView
        style={styles.eggsContainer}
        contentContainerStyle={styles.eggsContentPremium}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inventoryHeader}>
          <ThemedText style={styles.inventoryTitle}>Egg Inventory</ThemedText>
          <View style={styles.totalBadge}>
            <Feather name="package" size={14} color={GameColors.gold} />
            <ThemedText style={styles.totalCount}>{totalEggs}</ThemedText>
          </View>
        </View>
        
        <View style={styles.eggGridRow}>
          {(['common', 'rare'] as const).map((rarity) => {
            const glow = RARITY_GLOWS[rarity];
            const count = eggs[rarity];
            return (
              <View 
                key={rarity} 
                style={[
                  styles.eggCardPremium,
                  { 
                    borderColor: RARITY_COLORS[rarity] + "40",
                    shadowColor: glow.color,
                    shadowOpacity: count > 0 ? glow.opacity * 0.5 : 0,
                    shadowRadius: glow.radius,
                    shadowOffset: { width: 0, height: 0 },
                  }
                ]}
              >
                <View style={styles.eggCardInner}>
                  <EggIcon rarity={rarity} size={48} />
                  <View style={styles.eggCardInfo}>
                    <ThemedText style={[styles.eggCardCount, { color: RARITY_COLORS[rarity] }]}>
                      {count}
                    </ThemedText>
                    <ThemedText style={styles.eggCardLabel}>
                      {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                    </ThemedText>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
        <View style={styles.eggGridRow}>
          {(['epic', 'legendary'] as const).map((rarity) => {
            const glow = RARITY_GLOWS[rarity];
            const count = eggs[rarity];
            return (
              <View 
                key={rarity} 
                style={[
                  styles.eggCardPremium,
                  { 
                    borderColor: RARITY_COLORS[rarity] + "40",
                    shadowColor: glow.color,
                    shadowOpacity: count > 0 ? glow.opacity * 0.5 : 0,
                    shadowRadius: glow.radius,
                    shadowOffset: { width: 0, height: 0 },
                  }
                ]}
              >
                <View style={styles.eggCardInner}>
                  <EggIcon rarity={rarity} size={48} />
                  <View style={styles.eggCardInfo}>
                    <ThemedText style={[styles.eggCardCount, { color: RARITY_COLORS[rarity] }]}>
                      {count}
                    </ThemedText>
                    <ThemedText style={styles.eggCardLabel}>
                      {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                    </ThemedText>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.sectionDivider}>
          <View style={styles.dividerLine} />
          <ThemedText style={styles.dividerText}>Actions</ThemedText>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.actionCardPremium}>
          <View style={styles.actionCardHeader}>
            <View style={styles.actionIconCircle}>
              <Feather name="refresh-cw" size={18} color="#F97316" />
            </View>
            <View style={styles.actionCardHeaderText}>
              <ThemedText style={styles.actionTitlePremium}>Recycle Commons</ThemedText>
              <ThemedText style={styles.actionSubtitle}>Convert eggs to warmth for future benefits</ThemedText>
            </View>
          </View>
          
          <View style={styles.actionControlRow}>
            <View style={styles.amountControlsPremium}>
              <Pressable 
                style={[styles.amountBtnPremium, recycleAmount <= 1 && styles.amountBtnDisabled]}
                onPress={() => setRecycleAmount(Math.max(1, recycleAmount - 1))}
              >
                <Feather name="minus" size={18} color={recycleAmount <= 1 ? GameColors.textTertiary : GameColors.textPrimary} />
              </Pressable>
              <View style={styles.amountDisplay}>
                <ThemedText style={styles.amountValuePremium}>{recycleAmount}</ThemedText>
                <ThemedText style={styles.amountLabelPremium}>eggs</ThemedText>
              </View>
              <Pressable 
                style={[styles.amountBtnPremium, recycleAmount >= eggs.common && styles.amountBtnDisabled]}
                onPress={() => setRecycleAmount(Math.min(eggs.common || 1, recycleAmount + 1))}
              >
                <Feather name="plus" size={18} color={recycleAmount >= eggs.common ? GameColors.textTertiary : GameColors.textPrimary} />
              </Pressable>
            </View>
            
            <Pressable 
              style={[
                styles.actionButtonPremium,
                (eggs.common < recycleAmount || isRecycling) && styles.actionButtonPremiumDisabled
              ]}
              onPress={handleRecycle}
              disabled={eggs.common < recycleAmount || isRecycling}
            >
              <Feather name="sun" size={16} color={eggs.common >= recycleAmount && !isRecycling ? "#000" : GameColors.textTertiary} />
              <ThemedText style={[
                styles.actionButtonTextPremium,
                (eggs.common < recycleAmount || isRecycling) && { color: GameColors.textTertiary }
              ]}>
                {isRecycling ? "..." : `+${recycleAmount} Warmth`}
              </ThemedText>
            </Pressable>
          </View>
        </View>

        <View style={[styles.actionCardPremium, { marginTop: Spacing.md }]}>
          <View style={styles.actionCardHeader}>
            <View style={[styles.actionIconCircle, { backgroundColor: '#9D4EDD20' }]}>
              <Feather name="layers" size={18} color="#9D4EDD" />
            </View>
            <View style={styles.actionCardHeaderText}>
              <ThemedText style={styles.actionTitlePremium}>Fusion Lab</ThemedText>
              <ThemedText style={styles.actionSubtitle}>Combine eggs into higher rarities</ThemedText>
            </View>
          </View>
          
          <View style={styles.fusionTabsContainer}>
            {(['common', 'rare', 'epic'] as const).map((r) => {
              const isSelected = selectedFuseRarity === r;
              const targetR = FUSION_TARGETS[r];
              return (
                <Pressable
                  key={r}
                  style={[
                    styles.fusionTab,
                    isSelected && { 
                      backgroundColor: RARITY_COLORS[r] + "25",
                      borderColor: RARITY_COLORS[r],
                    }
                  ]}
                  onPress={() => {
                    setSelectedFuseRarity(r);
                    setFuseTimes(1);
                    setFuseResult(null);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <EggIcon rarity={r} size={20} />
                  <Feather name="arrow-right" size={12} color={isSelected ? RARITY_COLORS[targetR] : GameColors.textTertiary} />
                  <EggIcon rarity={targetR} size={20} />
                </Pressable>
              );
            })}
          </View>
          
          <View style={styles.fusionInfoBox}>
            <View style={styles.fusionInfoRow}>
              <ThemedText style={styles.fusionInfoLabel}>Cost:</ThemedText>
              <ThemedText style={[styles.fusionInfoValue, { color: RARITY_COLORS[selectedFuseRarity] }]}>
                {fusionCost} {selectedFuseRarity.charAt(0).toUpperCase() + selectedFuseRarity.slice(1)}
              </ThemedText>
            </View>
            <View style={styles.fusionInfoRow}>
              <ThemedText style={styles.fusionInfoLabel}>Result:</ThemedText>
              <ThemedText style={[styles.fusionInfoValue, { color: RARITY_COLORS[targetRarity] }]}>
                1 {targetRarity.charAt(0).toUpperCase() + targetRarity.slice(1)}
              </ThemedText>
            </View>
            <View style={styles.fusionInfoRow}>
              <ThemedText style={styles.fusionInfoLabel}>Success:</ThemedText>
              <View style={styles.chanceBar}>
                <View style={[styles.chanceFill, { width: `${fusionChance}%`, backgroundColor: fusionChance === 100 ? '#22C55E' : fusionChance >= 15 ? '#F59E0B' : '#EF4444' }]} />
              </View>
              <ThemedText style={[styles.fusionChanceText, { color: fusionChance === 100 ? '#22C55E' : fusionChance >= 15 ? '#F59E0B' : '#EF4444' }]}>
                {fusionChance}%
              </ThemedText>
            </View>
          </View>

          {(selectedFuseRarity === 'rare' || selectedFuseRarity === 'epic') && (
            <View style={styles.fuseWarningPremium}>
              <Feather name="alert-triangle" size={14} color="#F59E0B" />
              <ThemedText style={styles.fuseWarningTextPremium}>
                Eggs are consumed even on failure
              </ThemedText>
            </View>
          )}
          
          <View style={styles.actionControlRow}>
            <View style={styles.amountControlsPremium}>
              <Pressable 
                style={[styles.amountBtnPremium, fuseTimes <= 1 && styles.amountBtnDisabled]}
                onPress={() => setFuseTimes(Math.max(1, fuseTimes - 1))}
              >
                <Feather name="minus" size={18} color={fuseTimes <= 1 ? GameColors.textTertiary : GameColors.textPrimary} />
              </Pressable>
              <View style={styles.amountDisplay}>
                <ThemedText style={styles.amountValuePremium}>{fuseTimes}x</ThemedText>
                <ThemedText style={styles.amountLabelPremium}>fusions</ThemedText>
              </View>
              <Pressable 
                style={[styles.amountBtnPremium, fuseTimes >= getFuseMaxTimes(selectedFuseRarity) && styles.amountBtnDisabled]}
                onPress={() => setFuseTimes(Math.min(Math.max(1, getFuseMaxTimes(selectedFuseRarity)), fuseTimes + 1))}
              >
                <Feather name="plus" size={18} color={fuseTimes >= getFuseMaxTimes(selectedFuseRarity) ? GameColors.textTertiary : GameColors.textPrimary} />
              </Pressable>
            </View>
            
            <Pressable 
              style={[
                styles.fusionButtonPremium,
                { backgroundColor: RARITY_COLORS[targetRarity] },
                (eggs[selectedFuseRarity] < fuseTimes * fusionCost || isFusing) && styles.fusionButtonDisabled
              ]}
              onPress={handleFuse}
              disabled={eggs[selectedFuseRarity] < fuseTimes * fusionCost || isFusing}
            >
              <Feather name="zap" size={16} color={eggs[selectedFuseRarity] >= fuseTimes * fusionCost && !isFusing ? "#000" : GameColors.textTertiary} />
              <ThemedText style={[
                styles.fusionButtonText,
                (eggs[selectedFuseRarity] < fuseTimes * fusionCost || isFusing) && { color: GameColors.textTertiary }
              ]}>
                {isFusing ? "Fusing..." : `Fuse ${fuseTimes * fusionCost} → ${fuseTimes}`}
              </ThemedText>
            </Pressable>
          </View>
          
          {fuseResult && (
            <View style={[
              styles.fuseResultPremium, 
              fuseResult.successCount > 0 ? styles.fuseResultSuccessPremium : styles.fuseResultFailPremium
            ]}>
              <View style={styles.fuseResultIconCircle}>
                <Feather 
                  name={fuseResult.successCount > 0 ? "check" : "x"} 
                  size={20} 
                  color={fuseResult.successCount > 0 ? "#10B981" : "#EF4444"} 
                />
              </View>
              <View style={styles.fuseResultContent}>
                <ThemedText style={styles.fuseResultTitle}>
                  {fuseResult.successCount > 0 ? "Fusion Complete!" : "Fusion Failed"}
                </ThemedText>
                <ThemedText style={styles.fuseResultDetails}>
                  {fuseResult.successCount > 0 
                    ? `+${fuseResult.successCount} ${targetRarity}${fuseResult.failCount > 0 ? ` (${fuseResult.failCount} failed)` : ''}`
                    : `${fuseResult.failCount} attempt${fuseResult.failCount > 1 ? 's' : ''} consumed`}
                </ThemedText>
              </View>
            </View>
          )}
        </View>

        <ThemedText style={styles.eggHintPremium}>
          Hunt nodes on the map to collect mystery eggs
        </ThemedText>
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: headerHeight }]}>
      {locationError ? (
        <View style={styles.errorBanner}>
          <Feather name="alert-circle" size={16} color="#F59E0B" />
          <ThemedText style={styles.errorText}>{locationError}</ThemedText>
        </View>
      ) : null}

      {/* Server/Auth error banner */}
      {spawnsServerStatus.error && (
        <View style={styles.serverErrorBanner}>
          <Feather name="wifi-off" size={16} color="#EF4444" />
          <ThemedText style={styles.serverErrorText}>
            {getServerErrorMessage(spawnsServerStatus)}
          </ThemedText>
        </View>
      )}

      {renderEconomyPanel()}

      {/* Contextual tip banner */}
      {tipMessage && (
        <View style={styles.tipBanner}>
          <Feather name="info" size={14} color={GameColors.primary} />
          <ThemedText style={styles.tipText}>{tipMessage}</ThemedText>
        </View>
      )}

      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeTab === "map" && styles.activeTab]}
          onPress={() => setActiveTab("map")}
        >
          <Feather
            name="map"
            size={20}
            color={activeTab === "map" ? GameColors.primary : GameColors.textSecondary}
          />
          <ThemedText
            style={[
              styles.tabText,
              activeTab === "map" && styles.activeTabText,
            ]}
          >
            Hunt
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "eggs" && styles.activeTab]}
          onPress={() => setActiveTab("eggs")}
        >
          <Feather
            name="package"
            size={20}
            color={activeTab === "eggs" ? GameColors.primary : GameColors.textSecondary}
          />
          <ThemedText
            style={[
              styles.tabText,
              activeTab === "eggs" && styles.activeTabText,
            ]}
          >
            Eggs
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "collection" && styles.activeTab]}
          onPress={() => setActiveTab("collection")}
        >
          <Feather
            name="grid"
            size={20}
            color={
              activeTab === "collection" ? GameColors.primary : GameColors.textSecondary
            }
          />
          <ThemedText
            style={[
              styles.tabText,
              activeTab === "collection" && styles.activeTabText,
            ]}
          >
            Collection
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "leaderboard" && styles.activeTab]}
          onPress={() => setActiveTab("leaderboard")}
        >
          <Feather
            name="award"
            size={20}
            color={activeTab === "leaderboard" ? GameColors.primary : GameColors.textSecondary}
          />
          <ThemedText
            style={[
              styles.tabText,
              activeTab === "leaderboard" && styles.activeTabText,
            ]}
          >
            Ranks
          </ThemedText>
        </Pressable>
      </View>

      {activeTab === "map" && renderMapView()}
      {activeTab === "collection" && renderCollection()}
      {activeTab === "eggs" && renderEggs()}
      {activeTab === "leaderboard" && (
        <View style={styles.comingSoonContainer}>
          <Feather name="award" size={64} color={GameColors.textSecondary} />
          <ThemedText style={styles.comingSoonTitle}>Ranks Coming Soon</ThemedText>
          <ThemedText style={styles.comingSoonSubtitle}>
            Seasonal rankings and rewards will be available in Phase II
          </ThemedText>
        </View>
      )}

      {/* Dev spawn button removed - POST /api/hunt/spawn now requires admin key */}
      {/* Spawns are created automatically via drip system in GET /api/hunt/spawns */}

      <Modal
        visible={showCameraEncounter && selectedSpawn !== null}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        {selectedSpawn ? (
          <CameraEncounter
            spawn={selectedSpawn}
            onStartCatch={handleStartCatch}
            onCancel={handleCancelEncounter}
            onMiss={handleMissEncounter}
            isCollecting={isCollecting}
          />
        ) : null}
      </Modal>

      <Modal
        visible={showCatchGame && selectedSpawn !== null}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        {selectedSpawn ? (
          <CatchMiniGame
            creature={{
              id: selectedSpawn.id,
              name: selectedSpawn.name,
              rarity: selectedSpawn.rarity || 'common',
              templateId: selectedSpawn.templateId,
              creatureClass: selectedSpawn.creatureClass,
              containedTemplateId: selectedSpawn.containedTemplateId,
            }}
            onCatch={handleCatchResult}
            onEggCollected={handleEggCollected}
            onEscape={handleEscape}
          />
        ) : null}
      </Modal>

      <Modal
        visible={caughtCreature !== null && catchQuality !== null}
        animationType="fade"
        presentationStyle="fullScreen"
      >
        {caughtCreature && catchQuality ? (
          <EggReveal
            creature={caughtCreature}
            catchQuality={catchQuality}
            onComplete={handleRevealComplete}
          />
        ) : null}
      </Modal>

      <Modal
        visible={selectedRaid !== null}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        {selectedRaid ? (
          <RaidBattleMiniGame
            raid={selectedRaid}
            onAttack={(power) => attackRaid(selectedRaid.id, power)}
            onComplete={handleRaidComplete}
            onCancel={() => setSelectedRaid(null)}
          />
        ) : null}
      </Modal>

      <EggCollectedModal
        visible={collectedEggInfo !== null}
        eggRarity={collectedEggInfo?.rarity || "common"}
        xpAwarded={collectedEggInfo?.xpAwarded || 0}
        pointsAwarded={collectedEggInfo?.pointsAwarded || 0}
        quality={collectedEggInfo?.quality || "good"}
        pity={collectedEggInfo?.pity || { rareIn: 20, epicIn: 60, legendaryIn: 200 }}
        onContinue={() => {
          console.log("[EggCollectedModal] onContinue - clearing egg info");
          setCollectedEggInfo(null);
          refreshSpawns();
        }}
        onGoToEggs={() => {
          console.log("[EggCollectedModal] onGoToEggs - switching tab");
          setCollectedEggInfo(null);
          setActiveTab("eggs");
        }}
      />

      {fusionAnimation && (
        <FusionAnimationModal
          visible={fusionAnimation.visible}
          inputRarity={fusionAnimation.inputRarity}
          outputRarity={fusionAnimation.outputRarity}
          inputCount={fusionAnimation.inputCount}
          successCount={fusionAnimation.successCount}
          failCount={fusionAnimation.failCount}
          onComplete={() => {
            setFusionAnimation(null);
            setIsFusing(false);
          }}
        />
      )}

      <LevelProgressSheet
        visible={showLevelSheet}
        onClose={() => setShowLevelSheet(false)}
        level={phaseIStats?.level ?? phaseIStats?.hunterLevel ?? 1}
        xp={phaseIStats?.xp ?? phaseIStats?.hunterXp ?? 0}
        xpThisLevel={phaseIStats?.xpThisLevel ?? 0}
        xpToNextLevel={phaseIStats?.xpToNextLevel ?? 500}
        dailyCap={phaseIStats?.dailyCap ?? 25}
        dailyCapBase={phaseIStats?.dailyCapBase ?? 25}
        dailyCapStreakBonus={phaseIStats?.dailyCapStreakBonus ?? 0}
        warmth={phaseIStats?.warmth ?? 0}
        warmthCap={phaseIStats?.warmthCap ?? 10}
        streak={phaseIStats?.streakCount ?? 0}
        pity={phaseIStats?.pity ?? { rareIn: 20, epicIn: 60, legendaryIn: 250 }}
        unlockedFeatures={phaseIStats?.unlockedFeatures ?? { trackerPing: false, secondAttempt: false, heatMode: false }}
        nextUnlock={phaseIStats?.nextUnlock ?? null}
        heatModeActive={phaseIStats?.heatModeActive ?? false}
        heatModeUntil={phaseIStats?.heatModeUntil ?? null}
        warmthShopCosts={phaseIStats?.warmthShopCosts ?? { trackerPing: 3, secondAttempt: 5, heatMode: 10 }}
      />

      <NodeDetailsBottomSheet
        visible={showNodeSheet}
        node={selectedNode}
        playerLat={playerLocation?.latitude ?? null}
        playerLng={playerLocation?.longitude ?? null}
        isReserving={reserveNodeMutation.isPending}
        onClose={handleCloseNodeSheet}
        onReserve={handleReserveNode}
        onNavigate={handleNavigateToNode}
      />

      <SpawnReserveSheet
        visible={showSpawnReserveSheet}
        spawn={selectedSpawn}
        playerDistance={selectedSpawn?.distance ?? null}
        isReserving={isReservingSpawn}
        reservedUntil={selectedSpawn ? spawnReservations[selectedSpawn.id] ?? null : null}
        onClose={() => setShowSpawnReserveSheet(false)}
        onReserve={handleReserveSpawn}
        onNavigate={handleSpawnNavigate}
      />

      {reserveToast ? (
        <View style={styles.toastContainer} pointerEvents="none">
          <View style={styles.toast}>
            <ThemedText style={styles.toastText}>{reserveToast}</ThemedText>
          </View>
        </View>
      ) : null}

      {/* Debug overlay hidden - uncomment to debug spawn taps
      <View style={styles.debugOverlay}>
        <ThemedText style={styles.buildTag}>BUILD: {debug.build}</ThemedText>
        <ThemedText style={styles.debugText}>nodes: {debug.nodes} | taps: {debug.tapCount}</ThemedText>
        <ThemedText style={styles.debugText}>lastTap: {debug.lastTap || "—"}</ThemedText>
        <ThemedText style={styles.debugText}>nodeId: {debug.nodeId ? debug.nodeId.slice(0, 8) : "—"}</ThemedText>
        <ThemedText style={styles.debugText}>reserve: {debug.reserve || "—"}</ThemedText>
        <ThemedText style={styles.debugText}>ts: {debug.ts ? debug.ts.slice(11, 19) : "—"}</ThemedText>
        <Pressable 
          style={styles.debugButton} 
          onPress={() => dbg({ lastTap: "DEBUG_TEST_BUTTON" })}
        >
          <ThemedText style={styles.debugButtonText}>TEST TAP</ThemedText>
        </Pressable>
      </View>
      */}

      <Animated.View style={[StyleSheet.absoluteFill, loadingOverlayStyle]}>
        <HuntLoadingOverlay
          gpsReady={gpsReady}
          dataReady={dataReady}
          mapReady={mapReady}
          gpsAccuracy={gpsAccuracy}
          permissionDenied={permissionDenied}
          onRequestPermission={handleRequestPermission}
        />
      </Animated.View>

      {/* Guide modals */}
      <HuntCoachmarks
        visible={showCoachmarks}
        onClose={() => {
          setShowCoachmarks(false);
          setOnboardingCompleted(true);
        }}
        onComplete={() => {
          setShowCoachmarks(false);
          setOnboardingCompleted(true);
        }}
      />
      <WhatNextSheet
        visible={showHelpSheet}
        onClose={() => setShowHelpSheet(false)}
        title="What Next?"
      >
        <WhatNextContent />
      </WhatNextSheet>
      <WhatNextSheet
        visible={showFaq}
        onClose={() => setShowFaq(false)}
        title="FAQ"
      >
        <FaqContent />
      </WhatNextSheet>

      {/* Dev debug overlay - long-press GPS badge to toggle in TestFlight */}
      <HuntDebugOverlay
        gpsAgeMs={lastRawGpsTs ? Date.now() - lastRawGpsTs : null}
        gpsAccuracy={gpsAccuracy}
        spawnsStatus={spawnsServerStatus.status}
        spawnsAgeMs={spawnsServerStatus.ts ? Date.now() - spawnsServerStatus.ts : null}
        spawnsCount={spawns.length}
        questSpawnsCount={questSpawns.length}
        playerLat={playerLocation?.latitude ?? null}
        playerLng={playerLocation?.longitude ?? null}
        serverError={spawnsServerStatus.error}
        forceShow={showDebugOverlay}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
    paddingHorizontal: Spacing.md,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    color: "#F59E0B",
    fontSize: 12,
  },
  serverErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: "#EF4444",
  },
  serverErrorText: {
    color: "#EF4444",
    fontSize: 12,
    flex: 1,
  },
  hintToast: {
    position: "absolute",
    top: 44,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "rgba(20, 12, 8, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.2)",
    zIndex: 49,
  },
  hintToastText: {
    flex: 1,
    fontSize: 11,
    color: "rgba(244, 214, 176, 0.9)",
  },
  tipBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "rgba(212, 175, 55, 0.15)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: GameColors.primary,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: GameColors.textPrimary,
    lineHeight: 18,
  },
  economyCard: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  economyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  levelBadge: {
    backgroundColor: GameColors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  levelText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#fff",
  },
  economyGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  economyStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  economyValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: GameColors.textPrimary,
  },
  economyLabel: {
    fontSize: 10,
    color: GameColors.textSecondary,
  },
  pityContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: GameColors.surfaceLight,
  },
  pityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  pityLabel: {
    fontSize: 12,
    color: GameColors.textSecondary,
  },
  pityValue: {
    fontWeight: "bold",
  },
  recentDropsContainer: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: GameColors.surfaceLight,
  },
  recentDropsLabel: {
    fontSize: 11,
    color: GameColors.textSecondary,
    marginBottom: Spacing.xs,
  },
  recentDropsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  recentDropDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    padding: Spacing.xs,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  activeTab: {
    backgroundColor: GameColors.surfaceLight,
  },
  tabText: {
    fontSize: 12,
    color: GameColors.textSecondary,
  },
  activeTabText: {
    color: GameColors.primary,
    fontWeight: "600",
  },
  mapContainer: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: GameColors.surface,
    position: "relative",
  },
  mapGrid: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    flexWrap: "wrap",
    zIndex: 1,
  },
  mapCell: {
    width: "25%",
    height: "25%",
    borderWidth: 0.5,
    borderColor: GameColors.surfaceLight,
  },
  playerMarker: {
    position: "absolute",
    left: "50%",
    top: "50%",
    marginLeft: -30,
    marginTop: -30,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  playerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: GameColors.primary,
    borderWidth: 3,
    borderColor: "#fff",
  },
  playerRange: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: GameColors.primary,
    opacity: 0.3,
  },
  spawnMarker: {
    position: "absolute",
    alignItems: "center",
    zIndex: 100,
    padding: 4,
  },
  spawnDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: "#fff",
    marginBottom: 2,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  spawnName: {
    fontSize: 10,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  spawnDistance: {
    fontSize: 8,
    color: GameColors.textSecondary,
  },
  raidMarker: {
    position: "absolute",
    alignItems: "center",
    zIndex: 6,
  },
  raidIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
    elevation: 4,
  },
  raidName: {
    fontSize: 10,
    fontWeight: "600",
    color: GameColors.textPrimary,
    marginTop: 2,
  },
  refreshButton: {
    position: "absolute",
    bottom: Spacing.md,
    right: Spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GameColors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  collectionContainer: {
    flex: 1,
  },
  collectionContent: {
    paddingBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  emptyCard: {
    alignItems: "center",
    padding: Spacing.xl * 2,
  },
  emptyText: {
    marginTop: Spacing.md,
    color: GameColors.textSecondary,
    textAlign: "center",
  },
  collectionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  creatureCard: {
    width: "48%",
    alignItems: "center",
    padding: Spacing.md,
  },
  creatureAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  creatureName: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  creatureStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  creatureLevel: {
    fontSize: 12,
    color: GameColors.textSecondary,
  },
  rarityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  eggsContainer: {
    flex: 1,
  },
  eggsContent: {
    paddingBottom: Spacing.xl,
  },
  eggGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  eggGridCard: {
    width: "48%",
    alignItems: "center",
    padding: Spacing.md,
  },
  eggGridIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  eggGridCount: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 2,
  },
  eggGridLabel: {
    fontSize: 12,
    color: GameColors.textSecondary,
    textTransform: "capitalize",
  },
  actionCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  actionTitle: {
    marginBottom: Spacing.xs,
  },
  actionDesc: {
    fontSize: 12,
    color: GameColors.textSecondary,
    marginBottom: Spacing.md,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  amountControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  amountBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: GameColors.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  amountText: {
    fontSize: 16,
    fontWeight: "bold",
    minWidth: 30,
    textAlign: "center",
  },
  actionButton: {
    backgroundColor: GameColors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  fuseRarityRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  fuseRarityBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    backgroundColor: GameColors.surfaceLight,
  },
  fuseWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: "#F59E0B20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  fuseWarningText: {
    color: "#F59E0B",
    fontSize: 12,
  },
  fuseResultBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
  },
  fuseResultSuccess: {
    backgroundColor: "#10B98120",
  },
  fuseResultFail: {
    backgroundColor: "#EF444420",
  },
  fuseResultText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: GameColors.textPrimary,
  },
  eggCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  eggInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  eggIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  eggDetails: {
    flex: 1,
  },
  eggRarity: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  eggProgress: {
    gap: Spacing.xs,
  },
  progressBar: {
    height: 6,
    backgroundColor: GameColors.surfaceLight,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 10,
    color: GameColors.textSecondary,
  },
  eggHint: {
    fontSize: 12,
    color: GameColors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  incubatingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    borderRadius: BorderRadius.sm,
  },
  incubatingText: {
    fontSize: 12,
    color: "#22C55E",
  },
  incubateButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: GameColors.primary,
    borderRadius: BorderRadius.sm,
  },
  incubateButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000",
  },
  map: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  webMapFallback: {
    flex: 1,
    backgroundColor: GameColors.surface,
    position: "relative",
  },
  webMapText: {
    position: "absolute",
    bottom: Spacing.xl,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 12,
    color: GameColors.textSecondary,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingVertical: Spacing.xs,
  },
  mapControls: {
    position: "absolute",
    right: Spacing.md,
    bottom: Spacing.md,
    gap: Spacing.sm,
  },
  mapControlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GameColors.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  locationInfo: {
    position: "absolute",
    bottom: Spacing.md,
    left: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  locationText: {
    fontSize: 10,
    color: GameColors.textSecondary,
  },
  mapMarkerContainer: {
    alignItems: "center",
  },
  mapMarkerOuter: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  mapMarkerInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  mapMarkerLabel: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    marginTop: 4,
  },
  mapMarkerName: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  mapMarkerDistance: {
    fontSize: 8,
    color: GameColors.textSecondary,
  },
  raidMapMarker: {
    alignItems: "center",
  },
  raidMapIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  raidMapName: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    marginTop: 4,
  },
  eggModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  eggModalContent: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
  },
  eggIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  eggModalTitle: {
    color: GameColors.textPrimary,
    marginBottom: Spacing.sm,
  },
  eggModalRarity: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: Spacing.md,
  },
  eggModalCount: {
    fontSize: 16,
    color: GameColors.textPrimary,
    marginBottom: Spacing.sm,
  },
  eggModalHint: {
    fontSize: 14,
    color: GameColors.textSecondary,
    textAlign: "center",
  },
  devSpawnButton: {
    position: "absolute",
    bottom: 120,
    left: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: "#22C55E",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    zIndex: 50,
  },
  devSpawnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  premiumStatsCard: {
    backgroundColor: GameColors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: GameColors.gold + "30",
    overflow: "hidden",
  },
  statsGlassOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 215, 0, 0.03)",
  },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  statsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  heatModeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EF4444",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  heatModeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  xpMultBadge: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: BorderRadius.sm,
  },
  xpMultText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  levelBadgePremium: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: GameColors.gold + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: GameColors.gold + "40",
  },
  levelTextPremium: {
    fontSize: 12,
    fontWeight: "700",
    color: GameColors.gold,
  },
  statsMainRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  statBlock: {
    alignItems: "center",
    flex: 1,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: GameColors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  statValuePremium: {
    fontSize: 18,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  statLabelPremium: {
    fontSize: 11,
    color: GameColors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: GameColors.surfaceLight,
  },
  pityRowPremium: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  pityPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: GameColors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  pityPillLabel: {
    fontSize: 10,
    color: GameColors.textTertiary,
  },
  pityPillValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  eggsContentPremium: {
    paddingBottom: Spacing.xl * 2,
  },
  inventoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  inventoryTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  totalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: GameColors.gold + "15",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  totalCount: {
    fontSize: 14,
    fontWeight: "700",
    color: GameColors.gold,
  },
  eggGridPremium: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  eggGridRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  eggCardPremium: {
    flex: 1,
    backgroundColor: GameColors.surfaceElevated,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  eggCardInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  eggCardInfo: {
    flex: 1,
  },
  eggCardCount: {
    fontSize: 28,
    fontWeight: "800",
  },
  eggCardLabel: {
    fontSize: 12,
    color: GameColors.textSecondary,
    fontWeight: "500",
  },
  sectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: GameColors.surfaceLight,
  },
  dividerText: {
    fontSize: 12,
    color: GameColors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  actionCardPremium: {
    backgroundColor: GameColors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: GameColors.surfaceLight,
  },
  actionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  actionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F9731620",
    justifyContent: "center",
    alignItems: "center",
  },
  actionCardHeaderText: {
    flex: 1,
  },
  actionTitlePremium: {
    fontSize: 16,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  actionSubtitle: {
    fontSize: 12,
    color: GameColors.textTertiary,
    marginTop: 2,
  },
  actionControlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  amountControlsPremium: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.md,
    padding: 4,
  },
  amountBtnPremium: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: GameColors.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  amountBtnDisabled: {
    opacity: 0.4,
  },
  amountDisplay: {
    alignItems: "center",
    minWidth: 50,
  },
  amountValuePremium: {
    fontSize: 18,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  amountLabelPremium: {
    fontSize: 10,
    color: GameColors.textTertiary,
  },
  actionButtonPremium: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: GameColors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  actionButtonPremiumDisabled: {
    backgroundColor: GameColors.surfaceLight,
  },
  actionButtonTextPremium: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
  },
  fusionTabsContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  fusionTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: GameColors.surface,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  fusionInfoBox: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  fusionInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  fusionInfoLabel: {
    fontSize: 12,
    color: GameColors.textTertiary,
    width: 60,
  },
  fusionInfoValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  chanceBar: {
    flex: 1,
    height: 8,
    backgroundColor: GameColors.surfaceLight,
    borderRadius: 4,
    overflow: "hidden",
  },
  chanceFill: {
    height: "100%",
    borderRadius: 4,
  },
  fusionChanceText: {
    fontSize: 14,
    fontWeight: "700",
    minWidth: 40,
    textAlign: "right",
  },
  fuseWarningPremium: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "#F59E0B15",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: "#F59E0B30",
  },
  fuseWarningTextPremium: {
    fontSize: 12,
    color: "#F59E0B",
    flex: 1,
  },
  fusionButtonPremium: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  fusionButtonDisabled: {
    backgroundColor: GameColors.surfaceLight,
  },
  fusionButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
  },
  fuseResultPremium: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  fuseResultSuccessPremium: {
    backgroundColor: "#10B98115",
    borderWidth: 1,
    borderColor: "#10B98130",
  },
  fuseResultFailPremium: {
    backgroundColor: "#EF444415",
    borderWidth: 1,
    borderColor: "#EF444430",
  },
  fuseResultIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  fuseResultContent: {
    flex: 1,
  },
  fuseResultTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  fuseResultDetails: {
    fontSize: 12,
    color: GameColors.textSecondary,
    marginTop: 2,
  },
  eggHintPremium: {
    fontSize: 13,
    color: GameColors.textTertiary,
    textAlign: "center",
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  toastContainer: {
    position: "absolute",
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 999,
  },
  toast: {
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  toastText: {
    fontSize: 14,
    color: "#fff",
  },
  debugOverlay: {
    position: "absolute",
    top: 100,
    right: Spacing.md,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    zIndex: 900,
  },
  debugText: {
    fontSize: 10,
    color: "#22C55E",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  buildTag: {
    fontSize: 11,
    color: "#FFD700",
    fontWeight: "bold",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginBottom: 4,
  },
  debugButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginTop: 6,
    alignItems: "center" as const,
  },
  debugButtonText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "bold" as const,
  },
  areaClearedBanner: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: GameColors.primary + "40",
  },
  areaClearedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  areaClearedTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: GameColors.primary,
  },
  countdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  countdownText: {
    fontSize: 13,
    color: GameColors.textSecondary,
  },
  hotdropRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
    backgroundColor: GameColors.gold + "15",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  hotdropText: {
    fontSize: 13,
    color: GameColors.gold,
    fontWeight: "600",
  },
  radarResultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
    backgroundColor: GameColors.primary + "15",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  radarResultText: {
    fontSize: 13,
    color: GameColors.primary,
    fontWeight: "600",
  },
  radarButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    backgroundColor: GameColors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
  },
  radarButtonDisabled: {
    backgroundColor: GameColors.surfaceLight,
    opacity: 0.7,
  },
  radarButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  questTrackerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    backgroundColor: GameColors.primary + "15",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  questText: {
    fontSize: 13,
    color: GameColors.textPrimary,
    fontWeight: "600",
  },
  questProgress: {
    fontSize: 12,
    color: GameColors.textSecondary,
    marginTop: 2,
  },
  questHint: {
    fontSize: 11,
    color: GameColors.textTertiary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  claimBeaconButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: GameColors.gold,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  claimBeaconButtonDisabled: {
    opacity: 0.7,
    backgroundColor: GameColors.surfaceLight,
  },
  claimBeaconText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  questOffersContainer: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: GameColors.surfaceLight,
  },
  questOffersTitle: {
    fontSize: 12,
    color: GameColors.textSecondary,
    marginBottom: Spacing.sm,
  },
  questOffersRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  questOfferButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    backgroundColor: GameColors.surface,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: GameColors.primary + "40",
  },
  questOfferButtonHotdrop: {
    borderColor: "#FF6B35" + "40",
  },
  questOfferButtonBeacon: {
    borderColor: GameColors.gold + "40",
  },
  questOfferButtonDisabled: {
    backgroundColor: GameColors.surfaceLight,
    borderColor: GameColors.surfaceLight,
    opacity: 0.6,
  },
  questOfferText: {
    fontSize: 12,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  questOfferTextDisabled: {
    color: GameColors.textTertiary,
  },
  questOffersRowInline: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  questOfferButtonSmall: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    backgroundColor: GameColors.surface,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: GameColors.primary + "40",
  },
  questOfferTextSmall: {
    fontSize: 11,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  activatingText: {
    fontSize: 11,
    color: GameColors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.sm,
    fontStyle: "italic",
  },
  comingSoonContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: GameColors.textPrimary,
    textAlign: "center",
  },
  comingSoonSubtitle: {
    fontSize: 14,
    color: GameColors.textSecondary,
    textAlign: "center",
    maxWidth: 280,
  },
});
