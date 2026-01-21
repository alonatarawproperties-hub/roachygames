import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable, Platform, Image } from "react-native";

const spawnMarkerImage = require("@/assets/hunt/spawn-marker.png");
import { SPAWN_RESERVED_BY_YOU, SPAWN_RESERVED_BY_OTHER } from "@/assets/spawns";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { ThemedText } from "./ThemedText";
import { LeafletMapView, LeafletMapViewRef } from "./LeafletMapView";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import type { Spawn, Raid } from "@/context/HuntContext";
import type { MapNode, NodeQuality, NodeType } from "@/hooks/useMapNodes";
import { getQualityColor, getTypeLabel, getTypeBadgeColor } from "@/hooks/useMapNodes";

const RARITY_COLORS: Record<string, string> = {
  common: "#9CA3AF",
  rare: "#3B82F6",
  epic: "#A855F7",
  legendary: "#F59E0B",
};

// Player marker colors following Apple/Google Maps conventions
const PLAYER_DOT_COLOR = "#FF9500"; // Orange core
const PLAYER_STROKE_COLOR = "#FFFFFF";
const PLAYER_ACCURACY_COLOR = "rgba(255, 149, 0, 0.15)";

export interface PlayerLocation {
  latitude: number;
  longitude: number;
  heading?: number;
}

interface NearbyPlayer {
  lat: number;
  lng: number;
}

interface QuestMarker {
  id: string;
  lat: number;
  lng: number;
  type: 'HOT_DROP' | 'MICRO_HOTSPOT' | 'LEGENDARY_BEACON';
}

interface MapViewWrapperProps {
  playerLocation: PlayerLocation | null;
  spawns: Spawn[];
  questSpawns?: Spawn[];
  raids: Raid[];
  mapNodes?: MapNode[];
  nearbyPlayers?: NearbyPlayer[];
  questMarker?: QuestMarker | null;
  gpsAccuracy?: number | null;
  gpsNoSignal?: boolean;
  gpsWeak?: boolean;
  isVisible?: boolean;
  reservedByMe?: Record<string, true>;
  onToggleVisibility?: () => void;
  onSpawnTap: (spawn: Spawn) => void;
  onRaidTap: (raid: Raid) => void;
  onNodeTap?: (node: MapNode) => void;
  onQuestMarkerTap?: (marker: QuestMarker) => void;
  onMapPress?: () => void;
  onRefresh: () => void;
  onMapReady?: () => void;
  onHelpPress?: () => void;
  onFaqPress?: () => void;
  onToggleDebug?: () => void;
}

export interface MapViewWrapperRef {
  centerOnPlayer: () => void;
  triggerRadarPing: () => void;
}

let MapViewComponent: any = null;
let MarkerComponent: any = null;
let MapCircle: any = null;
let PROVIDER_DEFAULT_VALUE: any = undefined;
let mapsAvailable = false;

try {
  const maps = require("react-native-maps");
  MapViewComponent = maps.default;
  MarkerComponent = maps.Marker;
  MapCircle = maps.Circle;
  PROVIDER_DEFAULT_VALUE = maps.PROVIDER_DEFAULT;
  mapsAvailable = true;
} catch (e) {
  mapsAvailable = false;
}

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

function getGpsStatusInfo(
  accuracy: number | null | undefined,
  gpsNoSignal?: boolean,
  gpsWeak?: boolean
): { label: string; color: string } {
  if (gpsNoSignal) return { label: "No Signal", color: "#6B7280" };
  if (gpsWeak) return { label: "Weak", color: "#F59E0B" };
  if (!accuracy || accuracy > 100) return { label: "Poor", color: "#EF4444" };
  if (accuracy > 50) return { label: "Fair", color: "#F59E0B" };
  if (accuracy > 20) return { label: "Good", color: "#22C55E" };
  return { label: "Excellent", color: "#10B981" };
}

interface AnimatedControlButtonProps {
  iconName: keyof typeof Feather.glyphMap;
  onPress: () => void;
  size?: number;
}

function AnimatedControlButton({ iconName, onPress, size = 44 }: AnimatedControlButtonProps) {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[styles.controlButton, { width: size, height: size, borderRadius: size / 2 }, animatedStyle]}>
        <Feather name={iconName} size={size * 0.45} color="#fff" />
      </Animated.View>
    </Pressable>
  );
}

// Custom player marker with integrated heading wedge
function PlayerMarkerView({ heading }: { heading?: number }) {
  const hasHeading = heading !== undefined && heading >= 0;
  
  return (
    <View style={styles.playerMarkerContainer}>
      {/* Accuracy halo */}
      <View style={styles.playerAccuracyHalo} />
      
      {/* Heading wedge - rotates with heading */}
      {hasHeading ? (
        <View 
          style={[
            styles.playerHeadingWedge, 
            { transform: [{ rotate: `${heading}deg` }] }
          ]}
        >
          <View style={styles.headingWedgeShape} />
        </View>
      ) : null}
      
      {/* Player dot */}
      <View style={styles.playerDotOuter}>
        <View style={styles.playerDotInner} />
      </View>
    </View>
  );
}

function FallbackMapView({ 
  spawns, 
  onSpawnTap, 
  onRefresh,
  playerLocation 
}: { 
  spawns: Spawn[]; 
  onSpawnTap: (spawn: Spawn) => void; 
  onRefresh: () => void;
  playerLocation: PlayerLocation | null;
}) {
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

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  return (
    <View style={styles.mapContainer}>
      <View style={styles.webMapFallback}>
        <View style={styles.mapGrid}>
          {[...Array(16)].map((_, i) => (
            <View key={i} style={styles.mapCell} />
          ))}
        </View>
        <Animated.View style={[styles.fallbackPlayerMarker, pulseStyle]}>
          <View style={styles.fallbackPlayerDot} />
          <View style={styles.fallbackPlayerRange} />
        </Animated.View>
        {spawns && spawns.length > 0 ? spawns.map((spawn, index) => {
          const position = getSpawnPosition(spawn.id, index);
          return (
            <Pressable
              key={spawn.id}
              style={[styles.spawnMarker, { left: position.left, top: position.top }]}
              onPress={() => onSpawnTap(spawn)}
            >
              <View style={styles.mysteryDot}>
                <View style={styles.mysteryPulse} />
              </View>
              <ThemedText style={styles.spawnName}>???</ThemedText>
              <ThemedText style={styles.spawnDistance}>{spawn.distance ? `${spawn.distance}m` : "nearby"}</ThemedText>
            </Pressable>
          );
        }) : null}
        <View style={styles.fallbackMessage}>
          <Feather name="map" size={20} color={GameColors.textSecondary} />
          <ThemedText style={styles.webMapText}>
            {Platform.OS === "web" 
              ? "Real map available in Expo Go" 
              : "Maps require a development build"}
          </ThemedText>
          <ThemedText style={styles.webMapSubtext}>
            Tap creatures to catch them!
          </ThemedText>
        </View>
      </View>
      
      {playerLocation ? (
        <View style={styles.locationInfo}>
          <Feather name="map-pin" size={12} color={GameColors.primary} />
          <ThemedText style={styles.locationText}>
            {playerLocation.latitude.toFixed(4)}, {playerLocation.longitude.toFixed(4)}
          </ThemedText>
        </View>
      ) : null}
      
      <Pressable style={styles.refreshButton} onPress={onRefresh}>
        <Feather name="refresh-cw" size={20} color="#fff" />
      </Pressable>
    </View>
  );
}

const isActiveReserved = (n: MapNode) => {
  if (n.status !== "RESERVED" && n.status !== "ARRIVED") return false;
  if (!n.reservedUntil) return true;
  return new Date(n.reservedUntil).getTime() > Date.now();
};

export const MapViewWrapper = forwardRef<MapViewWrapperRef, MapViewWrapperProps>(
  ({ playerLocation, spawns, questSpawns, raids, mapNodes, nearbyPlayers, questMarker, gpsAccuracy, gpsNoSignal, gpsWeak, isVisible = true, reservedByMe = {}, onToggleVisibility, onSpawnTap, onRaidTap, onNodeTap, onQuestMarkerTap, onMapPress, onRefresh, onMapReady, onHelpPress, onFaqPress, onToggleDebug }, ref) => {
    const nativeMapRef = useRef<any>(null);
    const leafletMapRef = useRef<LeafletMapViewRef>(null);
    const [nativeMapFailed, setNativeMapFailed] = useState(false);
    const mapReadyCalledRef = useRef(false);
    const insets = useSafeAreaInsets();
    
    // Anti-freeze: tap lock refs to prevent double-tap and out-of-order handling
    const spawnTapLockRef = useRef(false);
    const lastSpawnTapRef = useRef<string | null>(null);
    const lastMarkerEventTsRef = useRef(0);
    const tapUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const SPAWN_DEBOUNCE_MS = 700;
    const SUPPRESS_MAP_PRESS_MS = 350;
    
    // Cleanup timer and release lock on unmount
    useEffect(() => {
      return () => {
        if (tapUnlockTimerRef.current) clearTimeout(tapUnlockTimerRef.current);
        spawnTapLockRef.current = false;
      };
    }, []);
    
    // Safe spawn tap wrapper v3 - ALWAYS releases lock even if onSpawnTap throws
    const safeOnSpawnTap = useCallback((spawn: Spawn, source: "marker" | "map") => {
      console.log(`[safeOnSpawnTap] v4 source=${source} spawn=${spawn?.id} locked=${spawnTapLockRef.current}`);

      if (spawnTapLockRef.current) {
        console.log("[safeOnSpawnTap] BLOCKED: tap lock active");
        return;
      }

      spawnTapLockRef.current = true;
      lastSpawnTapRef.current = spawn.id;
      lastMarkerEventTsRef.current = Date.now();

      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        spawnTapLockRef.current = false;
        if (tapUnlockTimerRef.current) {
          clearTimeout(tapUnlockTimerRef.current);
          tapUnlockTimerRef.current = null;
        }
        console.log("[safeOnSpawnTap] Lock released");
      };

      // IMPORTANT: schedule release BEFORE calling onSpawnTap so a throw cannot keep lock forever
      tapUnlockTimerRef.current = setTimeout(() => {
        console.log("[safeOnSpawnTap] Lock released after debounce");
        release();
      }, SPAWN_DEBOUNCE_MS);

      try {
        console.log("[safeOnSpawnTap] Lock acquired, calling onSpawnTap");
        onSpawnTap(spawn);
      } catch (err) {
        console.error("[safeOnSpawnTap] ERROR inside onSpawnTap:", err);
        release();
      }
    }, [onSpawnTap]);
    
    // Radar ping animation state - ALWAYS MOUNTED, controlled via opacity only
    const radarScale = useSharedValue(0);
    const radarOpacity = useSharedValue(0);
    
    const radarAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: radarScale.value }],
      opacity: radarOpacity.value,
    }));
    
    const triggerRadarAnimation = () => {
      // Use withSequence for proper animation chaining
      // First fade in quickly, then fade out slowly while expanding
      radarScale.value = withSequence(
        withTiming(0.5, { duration: 100 }), // Start at half size
        withTiming(4, { duration: 10000, easing: Easing.out(Easing.ease) }) // Expand over 10 seconds
      );
      radarOpacity.value = withSequence(
        withTiming(0.8, { duration: 100 }), // Fade in quickly
        withTiming(0, { duration: 10000, easing: Easing.linear }) // Fade out over 10 seconds
      );
    };

    useImperativeHandle(ref, () => ({
      centerOnPlayer: () => {
        if (nativeMapRef.current && playerLocation && mapsAvailable && !nativeMapFailed) {
          nativeMapRef.current.animateToRegion({
            latitude: playerLocation.latitude,
            longitude: playerLocation.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }, 500);
        } else if (leafletMapRef.current) {
          leafletMapRef.current.centerOnPlayer();
        }
      },
      triggerRadarPing: () => {
        triggerRadarAnimation();
      },
    }));

    // Canonical mapCenter with proper checks for Home Drop circle
    const mapCenter = playerLocation;
    const hasLocation = !!mapCenter && 
      Number.isFinite(mapCenter.latitude) && 
      Number.isFinite(mapCenter.longitude);
    const gpsStatus = getGpsStatusInfo(gpsAccuracy, gpsNoSignal, gpsWeak);
    
    // Web: use simple fallback (grid)
    if (Platform.OS === "web") {
      return (
        <FallbackMapView 
          spawns={spawns} 
          onSpawnTap={onSpawnTap} 
          onRefresh={onRefresh}
          playerLocation={playerLocation}
        />
      );
    }
    
    // Mobile without native maps: use Leaflet WebView map
    if (!mapsAvailable || nativeMapFailed) {
      return (
        <LeafletMapView
          ref={leafletMapRef}
          playerLocation={playerLocation}
          spawns={spawns}
          raids={raids}
          gpsAccuracy={gpsAccuracy}
          onSpawnTap={onSpawnTap}
          onRaidTap={onRaidTap}
          onRefresh={onRefresh}
          onMapReady={onMapReady}
        />
      );
    }

    const handleNativeMapReady = () => {
      if (!mapReadyCalledRef.current && onMapReady) {
        mapReadyCalledRef.current = true;
        onMapReady();
      }
    };

    const handleMapError = () => {
      setNativeMapFailed(true);
    };

    const centerOnPlayerMap = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (nativeMapRef.current && playerLocation) {
        nativeMapRef.current.animateToRegion({
          latitude: playerLocation.latitude,
          longitude: playerLocation.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 500);
      }
    };

    const handleRefresh = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onRefresh();
    };

    // Wait for location before showing native map
    if (!hasLocation) {
      return (
        <View style={[styles.mapContainer, { alignItems: 'center', justifyContent: 'center' }]}>
          <Feather name="navigation" size={32} color={GameColors.primary} />
          <ThemedText style={{ color: GameColors.textSecondary, marginTop: Spacing.md }}>
            Waiting for GPS...
          </ThemedText>
        </View>
      );
    }

    return (
      <View style={styles.mapContainer}>
        <MapViewComponent
          ref={nativeMapRef}
          style={styles.map}
          provider={PROVIDER_DEFAULT_VALUE}
          showsUserLocation={false}
          showsMyLocationButton={false}
          followsUserLocation={false}
          showsCompass={true}
          rotateEnabled={true}
          pitchEnabled={false}
          mapType="standard"
          userInterfaceStyle="dark"
          onError={handleMapError}
          onMapReady={handleNativeMapReady}
          onPress={(e: any) => {
            const coord = e?.nativeEvent?.coordinate;
            console.log("[MapView] onPress coord:", coord?.latitude, coord?.longitude);
            
            // Anti-freeze: Suppress map press if a marker was just tapped (prevents double-fire)
            if (Date.now() - lastMarkerEventTsRef.current < SUPPRESS_MAP_PRESS_MS) {
              console.log("[MapView] onPress SUPPRESSED: marker tap too recent");
              return;
            }
            
            const TAP_THRESHOLD_M = 50; // 50m tap radius for better touch detection
            
            // Check spawns first (egg markers)
            if (coord && spawns && spawns.length > 0) {
              let closestSpawn: Spawn | null = null;
              let closestDist = Infinity;
              for (const spawn of spawns) {
                const spawnLat = parseFloat(String(spawn.latitude));
                const spawnLng = parseFloat(String(spawn.longitude));
                if (isNaN(spawnLat) || isNaN(spawnLng)) continue;
                
                const dLat = (spawnLat - coord.latitude) * 111320;
                const dLng = (spawnLng - coord.longitude) * 111320 * Math.cos(coord.latitude * Math.PI / 180);
                const dist = Math.sqrt(dLat * dLat + dLng * dLng);
                if (dist < TAP_THRESHOLD_M && dist < closestDist) {
                  closestDist = dist;
                  closestSpawn = spawn;
                }
              }
              if (closestSpawn) {
                console.log("[MapView] Tap hit SPAWN:", closestSpawn.id, "dist:", closestDist.toFixed(1));
                safeOnSpawnTap(closestSpawn, "map");
                return;
              }
            }
            
            // Check nodes
            if (coord && mapNodes && mapNodes.length > 0 && onNodeTap) {
              let closestNode: MapNode | null = null;
              let closestDist = Infinity;
              for (const node of mapNodes) {
                const dLat = (node.lat - coord.latitude) * 111320;
                const dLng = (node.lng - coord.longitude) * 111320 * Math.cos(coord.latitude * Math.PI / 180);
                const dist = Math.sqrt(dLat * dLat + dLng * dLng);
                if (dist < TAP_THRESHOLD_M && dist < closestDist) {
                  closestDist = dist;
                  closestNode = node;
                }
              }
              if (closestNode) {
                console.log("[MapView] Tap hit NODE:", closestNode.nodeId, "dist:", closestDist.toFixed(1));
                onNodeTap(closestNode);
                return;
              }
            }
            
            onMapPress?.();
          }}
          initialRegion={{
            latitude: playerLocation.latitude,
            longitude: playerLocation.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
        >
          {/* HOME DROP: 500m radius circle - visible == catchable */}
          {hasLocation && (
            <MapCircle
              key={`home-circle-${mapCenter!.latitude.toFixed(5)}-${mapCenter!.longitude.toFixed(5)}`}
              center={{ latitude: mapCenter!.latitude, longitude: mapCenter!.longitude }}
              radius={500}
              strokeColor="rgba(255, 149, 0, 0.5)"
              fillColor="rgba(255, 149, 0, 0.08)"
              strokeWidth={2}
              zIndex={1}
            />
          )}

          {/* Custom player marker with heading wedge */}
          {hasLocation && MarkerComponent ? (
            <MarkerComponent
              coordinate={{
                latitude: playerLocation.latitude,
                longitude: playerLocation.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              flat={true}
              tracksViewChanges={true}
            >
              <PlayerMarkerView heading={playerLocation.heading} />
            </MarkerComponent>
          ) : null}

          {/* Spawn markers - Golden mystery eggs */}
          {spawns && spawns.length > 0 && MarkerComponent ? (() => {
            console.log(`[MapViewWrapper] Rendering ${spawns.length} spawn markers`);
            return spawns.map((spawn) => {
              const spawnLat = parseFloat(String(spawn.latitude));
              const spawnLng = parseFloat(String(spawn.longitude));
              if (isNaN(spawnLat) || isNaN(spawnLng)) {
                console.log(`[MapViewWrapper] Invalid spawn coordinates: ${spawn.latitude}, ${spawn.longitude}`);
                return null;
              }
              
              return (
                <MarkerComponent
                  key={spawn.id}
                  identifier={spawn.id}
                  coordinate={{
                    latitude: spawnLat,
                    longitude: spawnLng,
                  }}
                  onPress={() => {
                    console.log(`[MapViewWrapper] Spawn onPress: ${spawn.id}`);
                    safeOnSpawnTap(spawn, "marker");
                  }}
                  onSelect={() => {
                    console.log(`[MapViewWrapper] Spawn onSelect (iOS): ${spawn.id}`);
                    safeOnSpawnTap(spawn, "marker");
                  }}
                  anchor={{ x: 0.5, y: 0.5 }}
                  tracksViewChanges={false}
                  tappable={true}
                >
                  <Image 
                    source={spawnMarkerImage} 
                    style={styles.spawnMarkerImage} 
                    resizeMode="contain"
                  />
                </MarkerComponent>
              );
            });
          })() : null}

          {/* Quest Spawn markers (HOT_DROP / MICRO_HOTSPOT / LEGENDARY_BEACON) - use same egg marker */}
          {questSpawns && questSpawns.length > 0 && MarkerComponent ? (() => {
            console.log(`[MapViewWrapper] Rendering ${questSpawns.length} quest spawn markers`);
            return questSpawns.map((spawn) => {
              const spawnLat = parseFloat(String(spawn.latitude));
              const spawnLng = parseFloat(String(spawn.longitude));
              if (isNaN(spawnLat) || isNaN(spawnLng)) {
                console.log(`[MapViewWrapper] Invalid quest spawn coordinates: ${spawn.latitude}, ${spawn.longitude}`);
                return null;
              }

              return (
                <MarkerComponent
                  key={`quest-${spawn.id}`}
                  identifier={`quest-${spawn.id}`}
                  coordinate={{
                    latitude: spawnLat,
                    longitude: spawnLng,
                  }}
                  onPress={() => {
                    console.log(`[MapViewWrapper] Quest spawn onPress: ${spawn.id}`);
                    safeOnSpawnTap(spawn, "marker");
                  }}
                  onSelect={() => {
                    console.log(`[MapViewWrapper] Quest spawn onSelect (iOS): ${spawn.id}`);
                    safeOnSpawnTap(spawn, "marker");
                  }}
                  anchor={{ x: 0.5, y: 0.5 }}
                  tracksViewChanges={false}
                  tappable={true}
                >
                  <Image
                    source={spawnMarkerImage}
                    style={styles.spawnMarkerImage}
                    resizeMode="contain"
                  />
                </MarkerComponent>
              );
            });
          })() : null}

          {/* Raid markers */}
          {raids.map((raid) => {
            const raidLat = parseFloat(String(raid.latitude));
            const raidLng = parseFloat(String(raid.longitude));
            if (isNaN(raidLat) || isNaN(raidLng) || !MarkerComponent) return null;
            
            return (
              <MarkerComponent
                key={raid.id}
                coordinate={{
                  latitude: raidLat,
                  longitude: raidLng,
                }}
                onPress={() => onRaidTap(raid)}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.raidMapMarker}>
                  <View style={[styles.raidMapIcon, { backgroundColor: RARITY_COLORS[raid.rarity] || RARITY_COLORS.rare }]}>
                    <Feather name="alert-triangle" size={18} color="#fff" />
                  </View>
                  <ThemedText style={styles.raidMapName}>{raid.bossName}</ThemedText>
                </View>
              </MarkerComponent>
            );
          })}

          {/* Map Nodes - Personal, Hotspot, Event */}
          {(() => {
            console.log(`[MapViewWrapper] Rendering ${mapNodes?.length || 0} node markers`);
            return null;
          })()}
          {mapNodes && mapNodes.length > 0 && MarkerComponent && onNodeTap ? mapNodes.map((node) => {
            const nodeLat = node.lat;
            const nodeLng = node.lng;
            if (isNaN(nodeLat) || isNaN(nodeLng)) return null;
            
            const nodeIsActiveReserved = isActiveReserved(node);
            const isMine = reservedByMe[node.nodeId];
            
            const nodeMarkerIcon = nodeIsActiveReserved
              ? (isMine ? SPAWN_RESERVED_BY_YOU : SPAWN_RESERVED_BY_OTHER)
              : spawnMarkerImage;
            
            return (
              <MarkerComponent
                key={node.nodeId}
                identifier={node.nodeId}
                coordinate={{
                  latitude: nodeLat,
                  longitude: nodeLng,
                }}
                onPress={() => onNodeTap(node)}
                onSelect={() => onNodeTap(node)}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={false}
                tappable={true}
              >
                <Image 
                  source={nodeMarkerIcon} 
                  style={styles.spawnMarkerImage} 
                  resizeMode="contain"
                />
              </MarkerComponent>
            );
          }) : null}

          {/* Quest Marker (HOT_DROP, MICRO_HOTSPOT, LEGENDARY_BEACON) */}
          {questMarker && MarkerComponent && (
            <MarkerComponent
              key={`quest-${questMarker.id}`}
              identifier={`quest-${questMarker.id}`}
              coordinate={{
                latitude: questMarker.lat,
                longitude: questMarker.lng,
              }}
              onPress={() => onQuestMarkerTap?.(questMarker)}
              onSelect={() => onQuestMarkerTap?.(questMarker)}
              anchor={{ x: 0.5, y: 1 }}
              tracksViewChanges={false}
              tappable={true}
            >
              <View style={styles.questMarkerContainer}>
                <View style={[
                  styles.questMarkerPin,
                  questMarker.type === 'LEGENDARY_BEACON' ? styles.questMarkerBeacon :
                  questMarker.type === 'HOT_DROP' ? styles.questMarkerHotdrop :
                  styles.questMarkerMicro
                ]}>
                  <Feather 
                    name={questMarker.type === 'LEGENDARY_BEACON' ? 'star' : questMarker.type === 'HOT_DROP' ? 'zap' : 'map-pin'}
                    size={16} 
                    color="#fff" 
                  />
                </View>
                <View style={styles.questMarkerTail} />
              </View>
            </MarkerComponent>
          )}

          {/* Nearby Players - Anonymous dots */}
          {nearbyPlayers && nearbyPlayers.length > 0 && MarkerComponent ? nearbyPlayers.map((player, idx) => (
            <MarkerComponent
              key={`player-${idx}-${player.lat}-${player.lng}`}
              coordinate={{
                latitude: player.lat,
                longitude: player.lng,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
              tappable={false}
            >
              <View style={styles.nearbyPlayerDot} />
            </MarkerComponent>
          )) : null}
        </MapViewComponent>

        {/* GPS Signal Indicator - Top Left below status bar area */}
        <Pressable 
          style={styles.gpsIndicator}
          onLongPress={onToggleDebug}
          delayLongPress={500}
        >
          <View style={styles.gpsIndicatorRow}>
            <View style={[styles.gpsIndicatorDot, { backgroundColor: gpsStatus.color }]} />
            <ThemedText style={[styles.gpsIndicatorText, { color: gpsStatus.color }]}>
              {gpsStatus.label}
            </ThemedText>
            {gpsAccuracy ? (
              <ThemedText style={styles.gpsAccuracyText}>
                {Math.round(gpsAccuracy)}m
              </ThemedText>
            ) : null}
          </View>
          {gpsWeak && !gpsNoSignal ? (
            <ThemedText style={[styles.gpsWeakHint, { color: gpsStatus.color }]}>
              Weak GPS — step outside / avoid indoors
            </ThemedText>
          ) : null}
        </Pressable>

        {/* Map Controls - Bottom Right inside map container */}
        <View style={styles.mapControlsContainer} pointerEvents="box-none">
          <View style={styles.controlButtonsColumn} pointerEvents="box-none">
            <AnimatedControlButton 
              iconName="navigation" 
              onPress={centerOnPlayerMap}
            />
            <AnimatedControlButton 
              iconName="refresh-cw" 
              onPress={handleRefresh}
            />
            {onToggleVisibility ? (
              <Pressable 
                style={[styles.visibilityButton, !isVisible && styles.visibilityButtonOff]}
                onPress={onToggleVisibility}
              >
                <Feather 
                  name={isVisible ? "eye" : "eye-off"} 
                  size={20} 
                  color={isVisible ? "#22C55E" : GameColors.textSecondary} 
                />
              </Pressable>
            ) : null}
          </View>
          {(onHelpPress || onFaqPress) ? (
            <View style={styles.helpChipsRow} pointerEvents="box-none">
              {onHelpPress ? (
                <Pressable style={styles.helpChip} onPress={onHelpPress}>
                  <Feather name="help-circle" size={14} color={GameColors.primary} />
                  <ThemedText style={styles.helpChipText}>What next?</ThemedText>
                </Pressable>
              ) : null}
              {onFaqPress ? (
                <Pressable style={styles.faqChip} onPress={onFaqPress}>
                  <Feather name="book-open" size={20} color="#fff" />
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Coordinates display - Bottom Left inside map container */}
        {hasLocation ? (
          <View style={styles.locationInfo}>
            <Feather name="map-pin" size={10} color={GameColors.primary} />
            <ThemedText style={styles.locationText}>
              {playerLocation.latitude.toFixed(4)}, {playerLocation.longitude.toFixed(4)}
            </ThemedText>
          </View>
        ) : null}
        
        {/* Radar Ping Animation Overlay - Always mounted, visibility controlled by opacity */}
        <View style={styles.radarPingOverlay} pointerEvents="none">
          <Animated.View style={[styles.radarPingCircle, radarAnimatedStyle]} />
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    position: "relative",
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing.xl,
  },
  map: {
    flex: 1,
  },
  
  // Player marker with integrated heading
  playerMarkerContainer: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible", // CRITICAL: Allow heading wedge to render outside bounds
  },
  playerAccuracyHalo: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PLAYER_ACCURACY_COLOR,
  },
  playerHeadingWedge: {
    position: "absolute",
    width: 48,
    height: 48,
    alignItems: "center",
  },
  headingWedgeShape: {
    position: "absolute",
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 18,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: PLAYER_DOT_COLOR,
    opacity: 0.8,
  },
  playerDotOuter: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: PLAYER_STROKE_COLOR,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  playerDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PLAYER_DOT_COLOR,
  },

  // GPS Indicator - Top Left
  gpsIndicator: {
    position: "absolute",
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  gpsIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  gpsWeakHint: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 13,
    opacity: 0.85,
  },
  gpsIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  gpsIndicatorText: {
    fontSize: 11,
    fontWeight: "600",
  },
  gpsAccuracyText: {
    fontSize: 10,
    color: GameColors.textSecondary,
  },

  // Map Controls - Bottom Right corner inside map container
  mapControlsContainer: {
    position: "absolute",
    right: Spacing.md,
    bottom: Spacing.md,
    alignItems: "flex-end",
    gap: 8,
    zIndex: 50,
    elevation: 50,
  },
  controlButtonsColumn: {
    alignItems: "center",
    gap: 8,
  },
  controlButton: {
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  helpChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  helpChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(20, 12, 8, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(255, 153, 51, 0.25)",
  },
  helpChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: GameColors.primary,
  },
  faqChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },

  // Location info - Bottom Left inside map container
  locationInfo: {
    position: "absolute",
    left: Spacing.md,
    bottom: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  locationText: {
    fontSize: 9,
    color: GameColors.textSecondary,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },

  // Fallback map styles
  webMapFallback: {
    flex: 1,
    backgroundColor: GameColors.surface,
    position: "relative",
  },
  mapGrid: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  mapCell: {
    width: "25%",
    height: "25%",
    borderWidth: 0.5,
    borderColor: GameColors.textTertiary,
  },
  fallbackPlayerMarker: {
    position: "absolute",
    top: "45%",
    left: "45%",
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackPlayerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: PLAYER_DOT_COLOR,
    borderWidth: 2,
    borderColor: PLAYER_STROKE_COLOR,
  },
  fallbackPlayerRange: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: "rgba(255, 149, 0, 0.3)",
    backgroundColor: "rgba(255, 149, 0, 0.08)",
  },
  spawnMarker: {
    position: "absolute",
    alignItems: "center",
    padding: Spacing.xs,
  },
  mysteryDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: GameColors.primary,
    borderWidth: 2,
    borderColor: "#fff",
    marginBottom: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  mysteryPulse: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: GameColors.primary,
    opacity: 0.4,
  },
  spawnName: {
    fontSize: 10,
    fontWeight: "600",
    color: GameColors.textPrimary,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  spawnDistance: {
    fontSize: 9,
    color: GameColors.textSecondary,
  },
  fallbackMessage: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: "center",
    padding: Spacing.md,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  webMapText: {
    color: GameColors.textSecondary,
    fontSize: 14,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  webMapSubtext: {
    color: GameColors.primary,
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  refreshButton: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GameColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  
  // Map markers - Egg markers (golden egg style)
  eggMarkerContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 48,
  },
  spawnMarkerImage: {
    width: 80,
    height: 96,
  },
  nodeMarkerWrapper: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  reservedAura: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.6)",
  },
  eggMarkerGlow: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 215, 0, 0.4)",
  },
  eggMarkerBody: {
    width: 28,
    height: 34,
    borderRadius: 14,
    backgroundColor: "#FFD700",
    borderWidth: 2,
    borderColor: "#DAA520",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  mapMarkerContainer: {
    alignItems: "center",
  },
  mysteryMarkerOuter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: GameColors.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    shadowColor: GameColors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  mysteryMarkerInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: GameColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  mapMarkerLabel: {
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    marginTop: 3,
    alignItems: "center",
  },
  mapMarkerName: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  mapMarkerDistance: {
    fontSize: 8,
    color: "rgba(255, 255, 255, 0.7)",
  },
  raidMapMarker: {
    alignItems: "center",
  },
  raidMapIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  raidMapName: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    marginTop: 3,
  },
  nodeMarkerContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 52,
  },
  nodeMarkerGlow: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  nodeMarkerBody: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  nodeMarkerReserved: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    borderStyle: "dashed" as const,
  },
  nodeTypeBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 4,
  },
  nodeTypeBadgeText: {
    fontSize: 7,
    fontWeight: "700",
    color: "#fff",
  },
  nearbyPlayerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  visibilityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#22C55E",
  },
  visibilityButtonOff: {
    borderColor: GameColors.textSecondary,
  },
  radarPingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  radarPingCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: GameColors.primary,
    backgroundColor: "rgba(212, 175, 55, 0.15)",
  },
  questMarkerContainer: {
    alignItems: "center",
    width: 40,
    height: 50,
  },
  questMarkerPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  questMarkerBeacon: {
    backgroundColor: GameColors.gold,
  },
  questMarkerHotdrop: {
    backgroundColor: "#FF6B35",
  },
  questMarkerMicro: {
    backgroundColor: GameColors.primary,
  },
  questMarkerTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#fff",
    marginTop: -2,
  },
});

export default MapViewWrapper;
