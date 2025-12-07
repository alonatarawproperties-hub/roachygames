import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
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

export interface PlayerLocation {
  latitude: number;
  longitude: number;
  heading?: number;
}

interface MapViewWrapperProps {
  playerLocation: PlayerLocation | null;
  spawns: Spawn[];
  raids: Raid[];
  onSpawnTap: (spawn: Spawn) => void;
  onRaidTap: (raid: Raid) => void;
  onRefresh: () => void;
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
        <Animated.View style={[styles.playerMarker, pulseStyle]}>
          <View style={styles.playerDot} />
          <View style={styles.playerRange} />
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
  ({ playerLocation, spawns, raids, onSpawnTap, onRaidTap, onRefresh }, ref) => {
    const nativeMapRef = useRef<any>(null);
    const leafletMapRef = useRef<LeafletMapViewRef>(null);
    const [nativeMapFailed, setNativeMapFailed] = useState(false);

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
          onSpawnTap={onSpawnTap}
          onRaidTap={onRaidTap}
          onRefresh={onRefresh}
        />
      );
    }

    const handleMapError = () => {
      setNativeMapFailed(true);
    };

    return (
      <View style={styles.mapContainer}>
        <MapViewComponent
          ref={nativeMapRef}
          style={styles.map}
          provider={PROVIDER_DEFAULT_VALUE}
          showsUserLocation={true}
          showsMyLocationButton={false}
          followsUserLocation={true}
          showsCompass={true}
          rotateEnabled={true}
          pitchEnabled={false}
          mapType="standard"
          userInterfaceStyle="dark"
          onError={handleMapError}
          initialRegion={{
            latitude: hasLocation ? playerLocation.latitude : 37.7749,
            longitude: hasLocation ? playerLocation.longitude : -122.4194,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
        >
          {hasLocation && CircleComponent ? (
            <CircleComponent
              center={{
                latitude: playerLocation.latitude,
                longitude: playerLocation.longitude,
              }}
              radius={100}
              strokeColor="rgba(255, 149, 0, 0.5)"
              fillColor="rgba(255, 149, 0, 0.1)"
              strokeWidth={2}
            />
          ) : null}

          {spawns && spawns.length > 0 && MarkerComponent ? spawns.map((spawn) => {
            const spawnLat = parseFloat(String(spawn.latitude));
            const spawnLng = parseFloat(String(spawn.longitude));
            if (isNaN(spawnLat) || isNaN(spawnLng)) return null;
            
            return (
              <MarkerComponent
                key={spawn.id}
                coordinate={{
                  latitude: spawnLat,
                  longitude: spawnLng,
                }}
                onPress={() => onSpawnTap(spawn)}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.mapMarkerContainer}>
                  <View style={styles.mysteryMarkerOuter}>
                    <View style={styles.mysteryMarkerInner}>
                      <Feather name="help-circle" size={16} color="#fff" />
                    </View>
                  </View>
                  <View style={styles.mapMarkerLabel}>
                    <ThemedText style={styles.mapMarkerName}>???</ThemedText>
                    <ThemedText style={styles.mapMarkerDistance}>
                      {spawn.distance ? `${spawn.distance}m` : "nearby"}
                    </ThemedText>
                  </View>
                </View>
              </MarkerComponent>
            );
          }) : null}

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

        <View style={styles.mapControls}>
          <Pressable style={styles.mapControlButton} onPress={() => {
            if (nativeMapRef.current && playerLocation) {
              nativeMapRef.current.animateToRegion({
                latitude: playerLocation.latitude,
                longitude: playerLocation.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }, 500);
            }
          }}>
            <Feather name="navigation" size={20} color="#fff" />
          </Pressable>
          <Pressable style={styles.mapControlButton} onPress={onRefresh}>
            <Feather name="refresh-cw" size={20} color="#fff" />
          </Pressable>
        </View>

        {hasLocation ? (
          <View style={styles.locationInfo}>
            <Feather name="map-pin" size={12} color={GameColors.primary} />
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
  playerMarker: {
    position: "absolute",
    top: "45%",
    left: "45%",
    alignItems: "center",
    justifyContent: "center",
  },
  playerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: GameColors.primary,
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  playerRange: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "rgba(245, 158, 11, 0.4)",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
  },
  spawnMarker: {
    position: "absolute",
    alignItems: "center",
    padding: Spacing.xs,
  },
  spawnDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#fff",
    marginBottom: 2,
  },
  mysteryDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: GameColors.primary,
    borderWidth: 2,
    borderColor: "#fff",
    marginBottom: 4,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: GameColors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
  mysteryPulse: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: GameColors.primary,
    opacity: 0.5,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  mapControls: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    gap: Spacing.sm,
  },
  mapControlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  locationInfo: {
    position: "absolute",
    bottom: Spacing.md,
    left: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  locationText: {
    fontSize: 11,
    color: GameColors.textSecondary,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  mapMarkerContainer: {
    alignItems: "center",
  },
  mapMarkerOuter: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  mapMarkerInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  mysteryMarkerOuter: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: GameColors.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    shadowColor: GameColors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  mysteryMarkerInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: GameColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  mapMarkerLabel: {
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    alignItems: "center",
  },
  mapMarkerName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
  mapMarkerDistance: {
    fontSize: 9,
    color: "rgba(255, 255, 255, 0.7)",
  },
  raidMapMarker: {
    alignItems: "center",
  },
  raidMapIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  raidMapName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
});

export default MapViewWrapper;
