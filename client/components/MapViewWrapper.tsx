import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
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

const RARITY_COLORS: Record<string, string> = {
  common: "#9CA3AF",
  uncommon: "#22C55E",
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

interface MapViewWrapperProps {
  playerLocation: PlayerLocation | null;
  spawns: Spawn[];
  raids: Raid[];
  gpsAccuracy?: number | null;
  onSpawnTap: (spawn: Spawn) => void;
  onRaidTap: (raid: Raid) => void;
  onRefresh: () => void;
  onMapReady?: () => void;
}

export interface MapViewWrapperRef {
  centerOnPlayer: () => void;
}

let MapViewComponent: any = null;
let MarkerComponent: any = null;
let CircleComponent: any = null;
let PROVIDER_DEFAULT_VALUE: any = undefined;
let mapsAvailable = false;

try {
  const maps = require("react-native-maps");
  MapViewComponent = maps.default;
  MarkerComponent = maps.Marker;
  CircleComponent = maps.Circle;
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

function getGpsStatusInfo(accuracy: number | null | undefined): { label: string; color: string } {
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

export const MapViewWrapper = forwardRef<MapViewWrapperRef, MapViewWrapperProps>(
  ({ playerLocation, spawns, raids, gpsAccuracy, onSpawnTap, onRaidTap, onRefresh, onMapReady }, ref) => {
    const nativeMapRef = useRef<any>(null);
    const leafletMapRef = useRef<LeafletMapViewRef>(null);
    const [nativeMapFailed, setNativeMapFailed] = useState(false);
    const mapReadyCalledRef = useRef(false);
    const insets = useSafeAreaInsets();

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
    }));

    const hasLocation = playerLocation && playerLocation.latitude && playerLocation.longitude;
    const gpsStatus = getGpsStatusInfo(gpsAccuracy);
    
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
          initialRegion={{
            latitude: playerLocation.latitude,
            longitude: playerLocation.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
        >
          {/* 100m catch radius circle */}
          {hasLocation && CircleComponent ? (
            <CircleComponent
              center={{
                latitude: playerLocation.latitude,
                longitude: playerLocation.longitude,
              }}
              radius={100}
              strokeColor="rgba(255, 149, 0, 0.4)"
              fillColor="rgba(255, 149, 0, 0.08)"
              strokeWidth={1.5}
            />
          ) : null}

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
                  coordinate={{
                    latitude: spawnLat,
                    longitude: spawnLng,
                  }}
                  onPress={() => onSpawnTap(spawn)}
                  anchor={{ x: 0.5, y: 0.5 }}
                  tracksViewChanges={true}
                >
                  <View style={styles.eggMarkerContainer}>
                    <View style={styles.eggMarkerGlow} />
                    <View style={styles.eggMarkerBody}>
                      <Feather name="gift" size={14} color="#8B4513" />
                    </View>
                  </View>
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
        </MapViewComponent>

        {/* GPS Signal Indicator - Top Left below status bar area */}
        <View style={styles.gpsIndicator}>
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

        {/* Map Controls - Bottom Right inside map container */}
        <View style={styles.mapControlsContainer}>
          <AnimatedControlButton 
            iconName="navigation" 
            onPress={centerOnPlayerMap}
          />
          <AnimatedControlButton 
            iconName="refresh-cw" 
            onPress={handleRefresh}
          />
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
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
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
    gap: 10,
    zIndex: 50,
    elevation: 50,
  },
  controlButton: {
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    alignItems: "center",
    justifyContent: "center",
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
});

export default MapViewWrapper;
