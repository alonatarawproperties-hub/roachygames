import React, { useState, useEffect, useCallback, useRef } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
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
import { useHunt, Spawn, CaughtCreature, Egg, Raid } from "@/context/HuntContext";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { useGamePresence } from "@/context/PresenceContext";

const RARITY_COLORS: Record<string, string> = {
  common: "#9CA3AF",
  rare: "#3B82F6",
  epic: "#A855F7",
  legendary: "#F59E0B",
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
    economy,
    phaseIStats,
    economyReady,
    collection,
    eggs,
    raids,
    isLoading,
    collectedEggs,
    updateLocation,
    spawnCreatures,
    catchCreature,
    collectEgg,
    walkEgg,
    joinRaid,
    attackRaid,
    refreshSpawns,
    refreshPhaseIStats,
    claimNode,
  } = useHunt();
  
  useGamePresence("roachy-hunt");

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
  const mapRef = useRef<MapViewWrapperRef>(null);
  const loadingFadeAnim = useSharedValue(1);
  const hasAutoSpawned = useRef(false);
  const activeSpawnRef = useRef<Spawn | null>(null);
  const playerLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);

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
  const [retryCount, setRetryCount] = useState(0);

  const bestAccuracyRef = useRef<number>(Infinity);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const isMountedRef = useRef(true);

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
          
          hasInitialLocation = true;
          bestAccuracyRef.current = accuracy;
          setGpsAccuracy(accuracy);
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
          timeInterval: 1000,
          distanceInterval: 2,
        },
        (newLocation) => {
          if (!isMountedRef.current) return;
          const accuracy = newLocation.coords.accuracy ?? 100;
          
          setGpsAccuracy(accuracy);
          
          const shouldUpdate = !hasInitialLocation || 
            accuracy <= bestAccuracyRef.current || 
            accuracy <= 50;
          
          if (shouldUpdate) {
            if (accuracy < bestAccuracyRef.current) {
              bestAccuracyRef.current = accuracy;
            }
            
            hasInitialLocation = true;
            const heading = newLocation.coords.heading;
            updateLocation(
              newLocation.coords.latitude, 
              newLocation.coords.longitude,
              heading !== null && heading >= 0 ? heading : undefined
            );
          }
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

  useEffect(() => {
    console.log("Auto-spawn check:", { 
      hasLocation: !!playerLocation, 
      spawnsLength: spawns.length, 
      isLoading,
      hasAutoSpawned: hasAutoSpawned.current
    });
    // Auto-spawn eggs when player location is first detected and no spawns nearby
    if (playerLocation && spawns.length === 0 && !isLoading && !hasAutoSpawned.current) {
      console.log("Triggering auto-spawn for new player!");
      hasAutoSpawned.current = true;
      spawnCreatures();
    }
  }, [playerLocation, spawns.length, isLoading, spawnCreatures]);

  const handleSpawnTap = (spawn: Spawn) => {
    if ((spawn.distance || 0) > 100) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    // CRITICAL: Store player location NOW before camera encounter pauses location updates
    if (playerLocation) {
      playerLocationRef.current = {
        latitude: playerLocation.latitude,
        longitude: playerLocation.longitude,
      };
      console.log("[handleSpawnTap] Stored location:", playerLocationRef.current);
    } else {
      console.log("[handleSpawnTap] WARNING: No playerLocation available!");
    }
    setSelectedSpawn(spawn);
    activeSpawnRef.current = spawn;
    setShowCameraEncounter(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const [isCollecting, setIsCollecting] = useState(false);

  const handleStartCatch = async () => {
    console.log("[handleStartCatch] v8 CALLED!");
    
    // Use ref first, fallback to state
    let spawn = activeSpawnRef.current || selectedSpawn;
    console.log("[handleStartCatch] spawn from ref:", !!activeSpawnRef.current, "from state:", !!selectedSpawn);
    
    // Guard: No spawn = can't proceed (this is the ONLY early exit)
    if (!spawn) {
      console.log("[handleStartCatch] ERROR: No spawn available - this should never happen");
      setShowCameraEncounter(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    
    // LOCATION: Always use spawn coordinates as the guaranteed fallback
    // Player MUST be within 100m of spawn to see it, so spawn coords are always valid
    const spawnLat = parseFloat(spawn.latitude);
    const spawnLon = parseFloat(spawn.longitude);
    
    let loc = { latitude: spawnLat, longitude: spawnLon }; // DEFAULT to spawn coords
    
    // Try to use player's exact location if available (but spawn coords work fine)
    if (playerLocationRef.current) {
      loc = playerLocationRef.current;
      console.log("[handleStartCatch] Using playerLocationRef");
    } else if (playerLocation) {
      loc = { latitude: playerLocation.latitude, longitude: playerLocation.longitude };
      console.log("[handleStartCatch] Using playerLocation state");
    } else {
      console.log("[handleStartCatch] Using spawn coords as location (this is fine)");
    }
    
    console.log("[handleStartCatch] spawn:", spawn.id, "name:", spawn.name, "class:", spawn.creatureClass);
    console.log("[handleStartCatch] loc:", loc.latitude, loc.longitude);
    
    // Phase I detection: check name OR creatureClass OR FORCE Phase I mode
    // In Phase I, ALL spawns are mystery eggs - use multiple detection methods
    const PHASE1_FORCED = true; // Phase I: treat ALL spawns as mystery eggs
    const isMysteryEgg = PHASE1_FORCED || spawn.name?.toLowerCase().includes("mystery egg") || spawn.creatureClass === "egg";
    console.log("[handleStartCatch] PHASE1_FORCED:", PHASE1_FORCED, "isMysteryEgg:", isMysteryEgg, "name:", spawn.name, "class:", spawn.creatureClass);
    
    // Phase I: Mystery eggs go directly to API call, no mini-game
    if (isMysteryEgg) {
      console.log("[Phase1] Direct collect - calling API for spawn:", spawn.id);
      // CRITICAL: Show loading state FIRST, keep modal open during API call
      setIsCollecting(true);
      
      try {
        const result = await claimNode(
          spawn.id,
          loc.latitude,
          loc.longitude,
          "perfect"
        );
        
        console.log("[Phase1] API result:", JSON.stringify(result));
        
        if (result && result.success) {
          const normalizedRarity = (result.eggRarity === "uncommon" ? "common" : result.eggRarity) as "common" | "rare" | "epic" | "legendary";
          console.log("[Phase1] SUCCESS! Rarity:", normalizedRarity);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          // Close camera AFTER API success, BEFORE showing egg modal
          setShowCameraEncounter(false);
          setIsCollecting(false);
          setCollectedEggInfo({
            rarity: normalizedRarity,
            xpAwarded: result.xpAwarded || 0,
            pointsAwarded: result.pointsAwarded || 0,
            quality: "perfect",
            pity: result.pity || { rareIn: 20, epicIn: 60, legendaryIn: 200 },
          });
          refreshPhaseIStats();
          // Clear spawn refs on success
          setSelectedSpawn(null);
          activeSpawnRef.current = null;
        } else {
          // On failure, close camera and show error
          console.log("[Phase1] Failed:", result?.error);
          setShowCameraEncounter(false);
          setIsCollecting(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setSelectedSpawn(null);
          activeSpawnRef.current = null;
        }
      } catch (error) {
        // On error, close camera and show error
        console.error("[Phase1] API error:", error);
        setShowCameraEncounter(false);
        setIsCollecting(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setSelectedSpawn(null);
        activeSpawnRef.current = null;
      }
      return;
    }
    
    // Non-mystery eggs: use regular catch mini-game
    setShowCameraEncounter(false);
    setShowCatchGame(true);
  };

  const handleCancelEncounter = () => {
    setShowCameraEncounter(false);
    setSelectedSpawn(null);
    activeSpawnRef.current = null;
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
    const rareIn = stats?.pity?.rareIn ?? Math.max(0, 20 - (economy?.catchesSinceRare ?? 0));
    const epicIn = stats?.pity?.epicIn ?? Math.max(0, 60 - (economy?.catchesSinceEpic ?? 0));
    const legendaryIn = stats?.pity?.legendaryIn ?? 200;
    const hunterLevel = stats?.hunterLevel ?? 1;
    const warmth = stats?.warmth ?? 0;

    return (
      <Card style={styles.economyCard}>
        <View style={styles.economyHeader}>
          <ThemedText type="h4">Hunter Stats</ThemedText>
          <View style={styles.levelBadge}>
            <ThemedText style={styles.levelText}>Lv.{hunterLevel}</ThemedText>
          </View>
        </View>
        <View style={styles.economyGrid}>
          <View style={styles.economyStat}>
            <Feather name="target" size={18} color="#3B82F6" />
            <View>
              <ThemedText style={styles.economyValue}>
                {huntsToday}/{dailyCap}
              </ThemedText>
              <ThemedText style={styles.economyLabel}>Today</ThemedText>
            </View>
          </View>
          <View style={styles.economyStat}>
            <Feather name="activity" size={18} color="#22C55E" />
            <View>
              <ThemedText style={styles.economyValue}>
                {streakCount}
              </ThemedText>
              <ThemedText style={styles.economyLabel}>Streak</ThemedText>
            </View>
          </View>
          <View style={styles.economyStat}>
            <Feather name="sun" size={18} color="#F97316" />
            <View>
              <ThemedText style={styles.economyValue}>
                {warmth}
              </ThemedText>
              <ThemedText style={styles.economyLabel}>Warmth</ThemedText>
            </View>
          </View>
        </View>
        <View style={styles.pityContainer}>
          <View style={styles.pityRow}>
            <ThemedText style={styles.pityLabel}>Rare in</ThemedText>
            <ThemedText style={[styles.pityValue, { color: RARITY_COLORS.rare }]}>
              {rareIn}
            </ThemedText>
          </View>
          <View style={styles.pityRow}>
            <ThemedText style={styles.pityLabel}>Epic in</ThemedText>
            <ThemedText style={[styles.pityValue, { color: RARITY_COLORS.epic }]}>
              {epicIn}
            </ThemedText>
          </View>
          <View style={styles.pityRow}>
            <ThemedText style={styles.pityLabel}>Legendary in</ThemedText>
            <ThemedText style={[styles.pityValue, { color: RARITY_COLORS.legendary }]}>
              {legendaryIn}
            </ThemedText>
          </View>
        </View>
        {stats?.recentDrops && stats.recentDrops.length > 0 ? (
          <View style={styles.recentDropsContainer}>
            <ThemedText style={styles.recentDropsLabel}>Recent Drops</ThemedText>
            <View style={styles.recentDropsRow}>
              {stats.recentDrops.slice(0, 5).map((rarity, index) => (
                <View 
                  key={index}
                  style={[
                    styles.recentDropDot, 
                    { backgroundColor: RARITY_COLORS[rarity] || RARITY_COLORS.common }
                  ]} 
                />
              ))}
            </View>
          </View>
        ) : null}
      </Card>
    );
  };

  const centerOnPlayer = () => {
    if (mapRef.current) {
      mapRef.current.centerOnPlayer();
    }
  };

  const renderMapView = () => {
    return (
      <MapViewWrapper
        ref={mapRef}
        playerLocation={playerLocation}
        spawns={spawns}
        raids={raids}
        gpsAccuracy={gpsAccuracy}
        onSpawnTap={handleSpawnTap}
        onRaidTap={(raid) => setSelectedRaid(raid)}
        onRefresh={() => {
          spawnCreatures();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        onMapReady={() => setMapReady(true)}
      />
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

  const { recycleEggs, fuseEggs } = useHunt();

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
    const eggCount = phaseIStats?.eggs[selectedFuseRarity] || 0;
    const required = fuseTimes * 5;
    if (eggCount < required) return;
    setIsFusing(true);
    try {
      await fuseEggs(selectedFuseRarity, fuseTimes);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refreshPhaseIStats();
    } catch (error) {
      console.error("Fuse error:", error);
    }
    setIsFusing(false);
  };

  const renderEggs = () => {
    const eggs = phaseIStats?.eggs || { common: 0, rare: 0, epic: 0, legendary: 0 };
    const totalEggs = eggs.common + eggs.rare + eggs.epic + eggs.legendary;

    return (
      <ScrollView
        style={styles.eggsContainer}
        contentContainerStyle={styles.eggsContent}
      >
        <ThemedText type="h4" style={styles.sectionTitle}>
          Egg Inventory ({totalEggs})
        </ThemedText>
        
        <View style={styles.eggGrid}>
          {(['common', 'rare', 'epic', 'legendary'] as const).map((rarity) => (
            <Card key={rarity} style={styles.eggGridCard}>
              <View style={[styles.eggGridIcon, { backgroundColor: RARITY_COLORS[rarity] + "20" }]}>
                <Feather name="gift" size={28} color={RARITY_COLORS[rarity]} />
              </View>
              <ThemedText style={[styles.eggGridCount, { color: RARITY_COLORS[rarity] }]}>
                {eggs[rarity]}
              </ThemedText>
              <ThemedText style={styles.eggGridLabel}>{rarity}</ThemedText>
            </Card>
          ))}
        </View>

        <Card style={styles.actionCard}>
          <ThemedText type="h4" style={styles.actionTitle}>Recycle Commons</ThemedText>
          <ThemedText style={styles.actionDesc}>Convert common eggs to warmth (1:1)</ThemedText>
          <View style={styles.actionRow}>
            <View style={styles.amountControls}>
              <Pressable 
                style={styles.amountBtn}
                onPress={() => setRecycleAmount(Math.max(1, recycleAmount - 1))}
              >
                <Feather name="minus" size={16} color={GameColors.textPrimary} />
              </Pressable>
              <ThemedText style={styles.amountText}>{recycleAmount}</ThemedText>
              <Pressable 
                style={styles.amountBtn}
                onPress={() => setRecycleAmount(Math.min(eggs.common, recycleAmount + 1))}
              >
                <Feather name="plus" size={16} color={GameColors.textPrimary} />
              </Pressable>
            </View>
            <Pressable 
              style={[
                styles.actionButton,
                (eggs.common < recycleAmount || isRecycling) && styles.actionButtonDisabled
              ]}
              onPress={handleRecycle}
              disabled={eggs.common < recycleAmount || isRecycling}
            >
              <ThemedText style={styles.actionButtonText}>
                {isRecycling ? "..." : `Recycle +${recycleAmount} warmth`}
              </ThemedText>
            </Pressable>
          </View>
        </Card>

        <Card style={styles.actionCard}>
          <ThemedText type="h4" style={styles.actionTitle}>Fuse Eggs</ThemedText>
          <ThemedText style={styles.actionDesc}>Combine 5 eggs into 1 of higher tier</ThemedText>
          <View style={styles.fuseRarityRow}>
            {(['common', 'rare', 'epic'] as const).map((r) => (
              <Pressable
                key={r}
                style={[
                  styles.fuseRarityBtn,
                  selectedFuseRarity === r && { backgroundColor: RARITY_COLORS[r] + "30" }
                ]}
                onPress={() => setSelectedFuseRarity(r)}
              >
                <ThemedText style={{ color: RARITY_COLORS[r], fontWeight: selectedFuseRarity === r ? "bold" : "normal" }}>
                  {r}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          <View style={styles.actionRow}>
            <View style={styles.amountControls}>
              <Pressable 
                style={styles.amountBtn}
                onPress={() => setFuseTimes(Math.max(1, fuseTimes - 1))}
              >
                <Feather name="minus" size={16} color={GameColors.textPrimary} />
              </Pressable>
              <ThemedText style={styles.amountText}>{fuseTimes}x</ThemedText>
              <Pressable 
                style={styles.amountBtn}
                onPress={() => setFuseTimes(Math.min(Math.floor(eggs[selectedFuseRarity] / 5), fuseTimes + 1))}
              >
                <Feather name="plus" size={16} color={GameColors.textPrimary} />
              </Pressable>
            </View>
            <Pressable 
              style={[
                styles.actionButton,
                (eggs[selectedFuseRarity] < fuseTimes * 5 || isFusing) && styles.actionButtonDisabled
              ]}
              onPress={handleFuse}
              disabled={eggs[selectedFuseRarity] < fuseTimes * 5 || isFusing}
            >
              <ThemedText style={styles.actionButtonText}>
                {isFusing ? "..." : `Fuse ${fuseTimes * 5} → ${fuseTimes}`}
              </ThemedText>
            </Pressable>
          </View>
        </Card>

        <ThemedText style={styles.eggHint}>
          Hunt nodes to collect eggs. Recycle commons for warmth or fuse 5 eggs into a higher tier.
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

      {renderEconomyPanel()}

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
      {activeTab === "leaderboard" && <HuntLeaderboard />}

      {__DEV__ && activeTab === "map" && playerLocation ? (
        <Pressable 
          style={styles.devSpawnButton}
          onPress={() => {
            spawnCreatures();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          }}
        >
          <Feather name="plus-circle" size={16} color="#fff" />
          <ThemedText style={styles.devSpawnText}>Spawn Here</ThemedText>
        </Pressable>
      ) : null}

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
              rarity: selectedSpawn.rarity,
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
          setCollectedEggInfo(null);
          refreshSpawns();
        }}
        onGoToEggs={() => {
          setCollectedEggInfo(null);
          setActiveTab("eggs");
        }}
      />

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
});
