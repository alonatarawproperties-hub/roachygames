import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Platform,
  Dimensions,
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
import { useHunt, Spawn, CaughtCreature, Egg, Raid } from "@/context/HuntContext";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";

const RARITY_COLORS: Record<string, string> = {
  common: "#9CA3AF",
  uncommon: "#22C55E",
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
    collection,
    eggs,
    raids,
    isLoading,
    updateLocation,
    spawnCreatures,
    catchCreature,
    walkEgg,
    joinRaid,
    attackRaid,
    refreshSpawns,
  } = useHunt();

  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedSpawn, setSelectedSpawn] = useState<Spawn | null>(null);
  const [showCameraEncounter, setShowCameraEncounter] = useState(false);
  const [showCatchGame, setShowCatchGame] = useState(false);
  const [caughtCreature, setCaughtCreature] = useState<CaughtCreature | null>(null);
  const [catchQuality, setCatchQuality] = useState<"perfect" | "great" | "good" | null>(null);
  const [selectedRaid, setSelectedRaid] = useState<Raid | null>(null);
  const [activeTab, setActiveTab] = useState<"map" | "collection" | "eggs">("map");
  const mapRef = useRef<MapViewWrapperRef>(null);

  const pulseAnim = useSharedValue(1);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1000, easing: Easing.ease }),
        withTiming(1, { duration: 1000, easing: Easing.ease })
      ),
      -1
    );
  }, []);

  useEffect(() => {
    updateLocation(37.7749, -122.4194);
    
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationError("Using default location");
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        updateLocation(location.coords.latitude, location.coords.longitude);
      } catch (error) {
        setLocationError("Could not get location. Using default.");
      }
    };

    getLocation();
    const interval = setInterval(getLocation, 30000);
    return () => clearInterval(interval);
  }, [updateLocation]);

  useEffect(() => {
    console.log("Auto-spawn check:", { 
      hasLocation: !!playerLocation, 
      spawnsLength: spawns.length, 
      isLoading 
    });
    if (playerLocation && spawns.length === 0 && !isLoading) {
      console.log("Triggering auto-spawn!");
      spawnCreatures();
    }
  }, [playerLocation, spawns.length, isLoading, spawnCreatures]);

  const handleSpawnTap = (spawn: Spawn) => {
    if ((spawn.distance || 0) > 100) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setSelectedSpawn(spawn);
    setShowCameraEncounter(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleStartCatch = () => {
    setShowCameraEncounter(false);
    setShowCatchGame(true);
  };

  const handleCancelEncounter = () => {
    setShowCameraEncounter(false);
    setSelectedSpawn(null);
  };

  const handleCatchResult = async (quality: "perfect" | "great" | "good" | "miss") => {
    if (!selectedSpawn || quality === "miss") {
      setShowCatchGame(false);
      setSelectedSpawn(null);
      return;
    }

    const caught = await catchCreature(selectedSpawn.id, quality);
    if (caught) {
      setCaughtCreature(caught);
      setCatchQuality(quality);
    }
    setShowCatchGame(false);
    setSelectedSpawn(null);
  };

  const handleEscape = () => {
    setShowCatchGame(false);
    setSelectedSpawn(null);
  };

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
    if (!economy) return null;

    return (
      <Card style={styles.economyCard}>
        <View style={styles.economyHeader}>
          <ThemedText type="h4">Hunter Stats</ThemedText>
        </View>
        <View style={styles.economyGrid}>
          <View style={styles.economyStat}>
            <Feather name="zap" size={18} color="#F59E0B" />
            <View>
              <ThemedText style={styles.economyValue}>
                {economy.energy}/{economy.maxEnergy}
              </ThemedText>
              <ThemedText style={styles.economyLabel}>Energy</ThemedText>
            </View>
          </View>
          <View style={styles.economyStat}>
            <Feather name="target" size={18} color="#3B82F6" />
            <View>
              <ThemedText style={styles.economyValue}>
                {economy.catchesToday}/{economy.maxCatchesPerDay}
              </ThemedText>
              <ThemedText style={styles.economyLabel}>Today</ThemedText>
            </View>
          </View>
          <View style={styles.economyStat}>
            <Feather name="activity" size={18} color="#22C55E" />
            <View>
              <ThemedText style={styles.economyValue}>
                {economy.currentStreak}
              </ThemedText>
              <ThemedText style={styles.economyLabel}>Streak</ThemedText>
            </View>
          </View>
        </View>
        <View style={styles.pityContainer}>
          <View style={styles.pityRow}>
            <ThemedText style={styles.pityLabel}>Rare in</ThemedText>
            <ThemedText style={[styles.pityValue, { color: RARITY_COLORS.rare }]}>
              {20 - economy.catchesSinceRare}
            </ThemedText>
          </View>
          <View style={styles.pityRow}>
            <ThemedText style={styles.pityLabel}>Epic in</ThemedText>
            <ThemedText style={[styles.pityValue, { color: RARITY_COLORS.epic }]}>
              {60 - economy.catchesSinceEpic}
            </ThemedText>
          </View>
        </View>
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
        onSpawnTap={handleSpawnTap}
        onRaidTap={(raid) => setSelectedRaid(raid)}
        onRefresh={() => {
          spawnCreatures();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      />
    );
  };

  const renderCollection = () => (
    <ScrollView
      style={styles.collectionContainer}
      contentContainerStyle={styles.collectionContent}
    >
      <ThemedText type="h4" style={styles.sectionTitle}>
        Your Collection ({collection.length})
      </ThemedText>
      {collection.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Feather name="inbox" size={48} color={GameColors.textSecondary} />
          <ThemedText style={styles.emptyText}>
            No creatures caught yet. Go hunting!
          </ThemedText>
        </Card>
      ) : (
        <View style={styles.collectionGrid}>
          {collection.map((creature) => (
            <Card key={creature.id} style={styles.creatureCard}>
              <View
                style={[
                  styles.creatureAvatar,
                  { backgroundColor: RARITY_COLORS[creature.rarity] + "30" },
                ]}
              >
                <Feather
                  name="target"
                  size={24}
                  color={RARITY_COLORS[creature.rarity]}
                />
              </View>
              <ThemedText style={styles.creatureName}>{creature.name}</ThemedText>
              <View style={styles.creatureStats}>
                <ThemedText style={styles.creatureLevel}>Lv.{creature.level}</ThemedText>
                {creature.isPerfect ? (
                  <Feather name="star" size={12} color="#FFD700" />
                ) : null}
              </View>
              <View
                style={[
                  styles.rarityBadge,
                  { backgroundColor: RARITY_COLORS[creature.rarity] + "30" },
                ]}
              >
                <ThemedText
                  style={[
                    styles.rarityText,
                    { color: RARITY_COLORS[creature.rarity] },
                  ]}
                >
                  {creature.rarity}
                </ThemedText>
              </View>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderEggs = () => (
    <ScrollView
      style={styles.eggsContainer}
      contentContainerStyle={styles.eggsContent}
    >
      <ThemedText type="h4" style={styles.sectionTitle}>
        Eggs ({eggs.length})
      </ThemedText>
      {eggs.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Feather name="gift" size={48} color={GameColors.textSecondary} />
          <ThemedText style={styles.emptyText}>
            No eggs yet. Catch creatures to earn eggs!
          </ThemedText>
        </Card>
      ) : (
        eggs.map((egg) => (
          <Card key={egg.id} style={styles.eggCard}>
            <View style={styles.eggInfo}>
              <View
                style={[
                  styles.eggIcon,
                  { backgroundColor: RARITY_COLORS[egg.rarity] + "30" },
                ]}
              >
                <Feather
                  name="package"
                  size={24}
                  color={RARITY_COLORS[egg.rarity]}
                />
              </View>
              <View style={styles.eggDetails}>
                <ThemedText style={styles.eggRarity}>
                  {egg.rarity.toUpperCase()} Egg
                </ThemedText>
                <View style={styles.eggProgress}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${(egg.walkedDistance / egg.requiredDistance) * 100}%`,
                          backgroundColor: RARITY_COLORS[egg.rarity],
                        },
                      ]}
                    />
                  </View>
                  <ThemedText style={styles.progressText}>
                    {egg.walkedDistance.toFixed(1)} / {egg.requiredDistance} km
                  </ThemedText>
                </View>
              </View>
            </View>
            {egg.isIncubating ? (
              <View style={styles.incubatingBadge}>
                <Feather name="loader" size={14} color="#22C55E" />
                <ThemedText style={styles.incubatingText}>Incubating</ThemedText>
              </View>
            ) : (
              <Pressable
                style={styles.incubateButton}
                onPress={() => {
                  walkEgg(egg.id, 0.1);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <ThemedText style={styles.incubateButtonText}>Walk +0.1km</ThemedText>
              </Pressable>
            )}
          </Card>
        ))
      )}
    </ScrollView>
  );

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
      </View>

      {activeTab === "map" && renderMapView()}
      {activeTab === "collection" && renderCollection()}
      {activeTab === "eggs" && renderEggs()}

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
            }}
            onCatch={handleCatchResult}
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
    marginBottom: Spacing.md,
  },
  economyHeader: {
    marginBottom: Spacing.sm,
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
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
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
});
