import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Platform,
  Pressable,
  Image,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { useGame } from "@/context/GameContext";
import { getCreatureDefinition, getRarityColor, CREATURE_IMAGES } from "@/constants/creatures";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { CreatureCard } from "@/components/CreatureCard";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { state, updateLocation, spawnCreatures } = useGame();
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const pulseScale = useSharedValue(1);
  const fabScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(1.3, { duration: 1500 }),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: 2 - pulseScale.value,
  }));

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;
    
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === "granted");

      if (status === "granted") {
        try {
          if (Platform.OS === "android") {
            try {
              await Location.enableNetworkProviderAsync();
            } catch {}
          }

          let bestLocation: Location.LocationObject | null = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.BestForNavigation,
            });
            const locAccuracy = location.coords.accuracy ?? 100;
            const bestAccuracy = bestLocation?.coords.accuracy ?? 100;
            if (!bestLocation || locAccuracy < bestAccuracy) {
              bestLocation = location;
            }
            if (locAccuracy <= 10) break;
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
          if (bestLocation) {
            updateLocation(bestLocation.coords.latitude, bestLocation.coords.longitude);
          }

          locationSubscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.BestForNavigation,
              timeInterval: 3000,
              distanceInterval: 5,
            },
            (newLocation) => {
              const accuracy = newLocation.coords.accuracy ?? 100;
              if (accuracy <= 20) {
                updateLocation(newLocation.coords.latitude, newLocation.coords.longitude);
              }
            }
          );
        } catch {
          // Don't set fallback location - wait for real GPS
        }
      } else {
        // Don't set fallback location - wait for real GPS
      }
      setLoading(false);
    })();
    
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (state.playerLocation && state.nearbyCreatures.length === 0) {
      spawnCreatures();
    }
  }, [state.playerLocation]);

  const handleRescan = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    spawnCreatures();
  }, [spawnCreatures]);

  const handleCatchPress = useCallback(() => {
    const nearestCreature = state.nearbyCreatures[0];
    if (nearestCreature && nearestCreature.distance < 100) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      navigation.navigate("Catch", { creature: nearestCreature });
    }
  }, [state.nearbyCreatures, navigation]);

  const handleFabPressIn = () => {
    fabScale.value = withSpring(0.92);
  };

  const handleFabPressOut = () => {
    fabScale.value = withSpring(1);
  };

  const nearestCreature = state.nearbyCreatures[0];
  const canCatch = nearestCreature && nearestCreature.distance < 100;

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={GameColors.primary} />
        <ThemedText style={styles.loadingText}>
          Finding your location...
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapPlaceholder}>
        <View style={styles.mapBackground}>
          <View style={styles.gridLines} />
          
          <View style={styles.playerMarkerContainer}>
            <Animated.View style={[styles.playerPulse, pulseStyle]} />
            <View style={styles.playerDot} />
          </View>

          {state.nearbyCreatures.map((creature, index) => {
            const def = getCreatureDefinition(creature.id);
            if (!def) return null;
            const rarityColor = getRarityColor(def.rarity);
            const angle = (index * 72) * (Math.PI / 180);
            const distance = 80 + (creature.distance / 10);
            
            return (
              <Pressable
                key={creature.uniqueId}
                style={[
                  styles.creatureMarker,
                  {
                    transform: [
                      { translateX: Math.cos(angle) * distance },
                      { translateY: Math.sin(angle) * distance },
                    ],
                  },
                ]}
                onPress={() => {
                  if (creature.distance < 100) {
                    navigation.navigate("Catch", { creature });
                  }
                }}
              >
                <View style={[styles.markerGlow, { backgroundColor: rarityColor }]} />
                <Image
                  source={CREATURE_IMAGES[creature.id]}
                  style={styles.markerImage}
                />
                <View style={styles.distanceBadge}>
                  <ThemedText style={styles.distanceText}>
                    {creature.distance}m
                  </ThemedText>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Feather name="target" size={16} color={GameColors.textSecondary} />
            <ThemedText style={styles.statText}>
              {state.nearbyCreatures.length} nearby
            </ThemedText>
          </View>
          <View style={styles.statItem}>
            <Feather name="disc" size={16} color={GameColors.primary} />
            <ThemedText style={styles.statText}>
              {state.eggCount} eggs
            </ThemedText>
          </View>
        </View>
        
        <Pressable style={styles.scanButton} onPress={handleRescan}>
          <Feather name="refresh-cw" size={20} color={GameColors.textPrimary} />
        </Pressable>
      </View>

      <View style={[styles.bottomSheet, { paddingBottom: tabBarHeight + Spacing.lg }]}>
        <View style={styles.sheetHandle} />
        <ThemedText type="h4" style={styles.sheetTitle}>
          Nearby Creatures
        </ThemedText>
        
        {state.nearbyCreatures.length === 0 ? (
          <ThemedText style={styles.emptyText}>
            No creatures nearby. Try moving around!
          </ThemedText>
        ) : (
          <View style={styles.creatureList}>
            {state.nearbyCreatures.slice(0, 3).map(creature => {
              const def = getCreatureDefinition(creature.id);
              if (!def) return null;
              return (
                <CreatureCard
                  key={creature.uniqueId}
                  creature={def}
                  distance={creature.distance}
                  onPress={() => {
                    if (creature.distance < 100) {
                      navigation.navigate("Catch", { creature });
                    }
                  }}
                  compact
                />
              );
            })}
          </View>
        )}
      </View>

      <Animated.View
        style={[
          styles.fab,
          fabAnimatedStyle,
          { bottom: tabBarHeight + 140 },
          canCatch ? styles.fabActive : styles.fabInactive,
        ]}
      >
        <Pressable
          onPress={handleCatchPress}
          onPressIn={handleFabPressIn}
          onPressOut={handleFabPressOut}
          disabled={!canCatch}
          style={styles.fabInner}
        >
          <View style={[styles.catchEgg, canCatch && styles.catchEggActive]}>
            <View style={styles.eggTop} />
            <View style={styles.eggLine} />
            <View style={styles.eggCenter}>
              <View style={styles.eggButton} />
            </View>
            <View style={styles.eggBottom} />
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: Spacing.lg,
    color: GameColors.textSecondary,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: GameColors.surface,
  },
  mapBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0D1B2A",
  },
  gridLines: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
    borderWidth: 1,
    borderColor: GameColors.secondary,
  },
  playerMarkerContainer: {
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  playerPulse: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: GameColors.secondary,
    opacity: 0.3,
  },
  playerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: GameColors.secondary,
    borderWidth: 3,
    borderColor: "#fff",
  },
  creatureMarker: {
    position: "absolute",
    alignItems: "center",
  },
  markerGlow: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.3,
  },
  markerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  distanceBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.xs,
  },
  distanceText: {
    fontSize: 10,
    color: GameColors.textSecondary,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  statsBar: {
    flexDirection: "row",
    backgroundColor: GameColors.surface + "E6",
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.lg,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  statText: {
    fontSize: 14,
    color: GameColors.textPrimary,
  },
  scanButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GameColors.surface + "E6",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: GameColors.surface,
    borderTopLeftRadius: BorderRadius["2xl"],
    borderTopRightRadius: BorderRadius["2xl"],
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 180,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: GameColors.textSecondary,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: Spacing.md,
    opacity: 0.3,
  },
  sheetTitle: {
    marginBottom: Spacing.md,
  },
  emptyText: {
    color: GameColors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.lg,
  },
  creatureList: {
    gap: Spacing.sm,
  },
  fab: {
    position: "absolute",
    right: Spacing.xl,
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabActive: {
    backgroundColor: GameColors.primary,
  },
  fabInactive: {
    backgroundColor: GameColors.surfaceLight,
    opacity: 0.7,
  },
  fabInner: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  catchEgg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#333",
  },
  catchEggActive: {
    borderColor: "#fff",
  },
  eggTop: {
    flex: 1,
    backgroundColor: GameColors.primary,
  },
  eggLine: {
    height: 4,
    backgroundColor: "#333",
  },
  eggCenter: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -10,
    marginLeft: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  eggButton: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#fff",
  },
  eggBottom: {
    flex: 1,
    backgroundColor: "#F5E6D3",
  },
});
