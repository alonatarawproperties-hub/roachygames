import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Platform,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { ViroARSceneNavigator } from "@viro-community/react-viro";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { AREggScene } from "@/components/ar/AREggScene";
import { ARCreatureScene } from "@/components/ar/ARCreatureScene";
import { ARCatchGame } from "@/components/ar/ARCatchGame";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { useHunt } from "@/context/HuntContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type ARPhase = "loading" | "egg" | "creature" | "catch" | "success" | "escape";

type HuntARRouteProp = RouteProp<RootStackParamList, "HuntAR">;
type HuntARNavigationProp = NativeStackNavigationProp<RootStackParamList, "HuntAR">;

export function HuntARScreen() {
  const route = useRoute<HuntARRouteProp>();
  const navigation = useNavigation<HuntARNavigationProp>();
  const spawn = route.params?.spawn;
  
  const { catchCreature, collectEgg } = useHunt();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<ARPhase>("loading");
  const [arSupported, setArSupported] = useState<boolean | null>(null);
  const [planeDetected, setPlaneDetected] = useState(false);

  const isValidSpawn = spawn && spawn.id && spawn.name;
  const isEggSpawn = spawn?.templateId === "mystery_egg";

  useEffect(() => {
    if (!isValidSpawn) return;
    
    const checkARSupport = async () => {
      if (Platform.OS === "web") {
        setArSupported(false);
        return;
      }
      setArSupported(true);
    };
    
    checkARSupport();
    const timer = setTimeout(() => {
      setPhase(isEggSpawn ? "egg" : "creature");
    }, 1500);
    return () => clearTimeout(timer);
  }, [isEggSpawn, isValidSpawn]);

  const handleEggTapped = useCallback(async () => {
    if (!spawn) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await collectEgg(spawn.id);
    navigation.goBack();
  }, [spawn, collectEgg, navigation]);

  const handlePlaneDetected = useCallback(() => {
    setPlaneDetected(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleCreatureTapped = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleCatchStarted = useCallback(() => {
    setPhase("catch");
  }, []);

  const handleCatchSuccess = useCallback(async (quality: "perfect" | "great" | "good") => {
    if (!spawn) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPhase("success");

    setTimeout(async () => {
      await catchCreature(spawn.id, quality);
      navigation.goBack();
    }, 1500);
  }, [spawn, catchCreature, navigation]);

  const handleCatchFail = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, []);

  const handleEscapeCallback = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setPhase("escape");
    setTimeout(() => {
      navigation.goBack();
    }, 1500);
  }, [navigation]);

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  if (!isValidSpawn) {
    return (
      <View style={styles.container}>
        <View style={styles.webFallbackContainer}>
          <Feather name="alert-circle" size={64} color={GameColors.error} />
          <ThemedText style={styles.webFallbackTitle}>
            Invalid Spawn Data
          </ThemedText>
          <ThemedText style={styles.webFallbackText}>
            Unable to load AR experience. Please try again.
          </ThemedText>
          <Pressable style={styles.webFallbackButton} onPress={() => navigation.goBack()}>
            <ThemedText style={styles.webFallbackButtonText}>
              Return to Map
            </ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  const renderARScene = () => {
    switch (phase) {
      case "egg":
        return {
          scene: () => (
            <AREggScene
              rarity={spawn.rarity}
              onEggTapped={handleEggTapped}
              onPlaneDetected={handlePlaneDetected}
            />
          ),
        };
      case "creature":
        return {
          scene: () => (
            <ARCreatureScene
              creatureName={spawn.name}
              rarity={spawn.rarity}
              creatureClass={spawn.creatureClass}
              onCreatureTapped={handleCreatureTapped}
              onCatchStarted={handleCatchStarted}
            />
          ),
        };
      case "catch":
        return {
          scene: () => (
            <ARCatchGame
              creatureName={spawn.name}
              rarity={spawn.rarity}
              creatureClass={spawn.creatureClass}
              onCatchSuccess={handleCatchSuccess}
              onCatchFail={handleCatchFail}
              onEscape={handleEscapeCallback}
            />
          ),
        };
      default:
        return {
          scene: () => (
            <AREggScene
              rarity="common"
              onEggTapped={handleEggTapped}
              onPlaneDetected={handlePlaneDetected}
            />
          ),
        };
    }
  };

  const renderLoadingView = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={GameColors.gold} />
      <ThemedText style={styles.loadingText}>
        Initializing AR Experience...
      </ThemedText>
      <ThemedText style={styles.loadingSubtext}>
        Point your camera at a flat surface
      </ThemedText>
    </View>
  );

  const renderSuccessView = () => (
    <View style={styles.overlayContainer}>
      <View style={styles.successBanner}>
        <Feather name="check-circle" size={48} color={GameColors.success} />
        <ThemedText style={styles.successText}>Gotcha!</ThemedText>
        <ThemedText style={styles.successSubtext}>
          {spawn.name} was caught!
        </ThemedText>
      </View>
    </View>
  );

  const renderEscapeView = () => (
    <View style={styles.overlayContainer}>
      <View style={styles.escapeBanner}>
        <Feather name="alert-circle" size={48} color={GameColors.error} />
        <ThemedText style={styles.escapeText}>Oh no!</ThemedText>
        <ThemedText style={styles.escapeSubtext}>
          {spawn.name} escaped!
        </ThemedText>
      </View>
    </View>
  );

  const renderWebFallback = () => (
    <View style={styles.webFallbackContainer}>
      <Feather name="camera-off" size={64} color={GameColors.textSecondary} />
      <ThemedText style={styles.webFallbackTitle}>
        AR Not Available
      </ThemedText>
      <ThemedText style={styles.webFallbackText}>
        AR mode requires a native iOS or Android device with ARKit/ARCore support.
      </ThemedText>
      <Pressable style={styles.webFallbackButton} onPress={handleCancel}>
        <ThemedText style={styles.webFallbackButtonText}>
          Return to Map
        </ThemedText>
      </Pressable>
    </View>
  );

  const renderPhaseIndicator = () => {
    let text = "";
    let icon: keyof typeof Feather.glyphMap = "target";
    
    switch (phase) {
      case "loading":
        text = "Initializing...";
        icon = "loader";
        break;
      case "egg":
        text = planeDetected ? "Tap the egg!" : "Find a flat surface...";
        icon = planeDetected ? "gift" : "search";
        break;
      case "creature":
        text = "Tap to catch!";
        icon = "crosshair";
        break;
      case "catch":
        text = "Time your throw!";
        icon = "target";
        break;
      default:
        break;
    }
    
    if (!text) return null;
    
    return (
      <View style={[styles.phaseIndicator, { top: insets.top + Spacing.md }]}>
        <Feather name={icon} size={16} color={GameColors.gold} />
        <ThemedText style={styles.phaseText}>{text}</ThemedText>
      </View>
    );
  };

  if (arSupported === false) {
    return (
      <View style={styles.container}>
        {renderWebFallback()}
      </View>
    );
  }

  if (arSupported === null || phase === "loading") {
    return (
      <View style={styles.container}>
        {renderLoadingView()}
        <Pressable
          style={[styles.cancelButton, { top: insets.top + Spacing.md }]}
          onPress={handleCancel}
        >
          <Feather name="x" size={24} color={GameColors.textPrimary} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ViroARSceneNavigator
        autofocus={true}
        initialScene={renderARScene()}
        style={styles.arView}
      />
      
      {phase === "success" && renderSuccessView()}
      {phase === "escape" && renderEscapeView()}
      
      {phase !== "success" && phase !== "escape" && (
        <>
          <Pressable
            style={[styles.cancelButton, { top: insets.top + Spacing.md }]}
            onPress={handleCancel}
          >
            <Feather name="x" size={24} color={GameColors.textPrimary} />
          </Pressable>
          
          {renderPhaseIndicator()}
          
          <View style={[styles.creatureInfo, { bottom: insets.bottom + Spacing.xl }]}>
            <View style={styles.creatureInfoContent}>
              <ThemedText style={styles.creatureName}>{spawn.name}</ThemedText>
              <View style={styles.creatureDetails}>
                <View style={[styles.rarityBadge, { backgroundColor: getRarityColor(spawn.rarity) }]}>
                  <ThemedText style={styles.rarityText}>{spawn.rarity}</ThemedText>
                </View>
                <ThemedText style={styles.classText}>{spawn.creatureClass}</ThemedText>
              </View>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

function getRarityColor(rarity: string): string {
  switch (rarity) {
    case "legendary": return "#FFD700";
    case "epic": return "#A855F7";
    case "rare": return "#3B82F6";
    case "uncommon": return "#22C55E";
    default: return "#9CA3AF";
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
  },
  arView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: "600",
    color: GameColors.textPrimary,
    marginTop: Spacing.lg,
  },
  loadingSubtext: {
    fontSize: 14,
    color: GameColors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  cancelButton: {
    position: "absolute",
    left: Spacing.md,
    width: 44,
    height: 44,
    borderRadius: BorderRadius.round,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  phaseIndicator: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: BorderRadius.lg,
  },
  phaseText: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  creatureInfo: {
    position: "absolute",
    left: Spacing.md,
    right: Spacing.md,
    alignItems: "center",
  },
  creatureInfoContent: {
    backgroundColor: "rgba(0,0,0,0.8)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: "center",
    minWidth: 200,
  },
  creatureName: {
    fontSize: 20,
    fontWeight: "bold",
    color: GameColors.textPrimary,
  },
  creatureDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  rarityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  rarityText: {
    fontSize: 12,
    fontWeight: "600",
    color: GameColors.textPrimary,
    textTransform: "capitalize",
  },
  classText: {
    fontSize: 12,
    color: GameColors.textSecondary,
    textTransform: "capitalize",
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  successBanner: {
    backgroundColor: "rgba(34,197,94,0.2)",
    borderWidth: 2,
    borderColor: GameColors.success,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
  },
  successText: {
    fontSize: 28,
    fontWeight: "bold",
    color: GameColors.success,
  },
  successSubtext: {
    fontSize: 16,
    color: GameColors.textPrimary,
  },
  escapeBanner: {
    backgroundColor: "rgba(239,68,68,0.2)",
    borderWidth: 2,
    borderColor: GameColors.error,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
  },
  escapeText: {
    fontSize: 28,
    fontWeight: "bold",
    color: GameColors.error,
  },
  escapeSubtext: {
    fontSize: 16,
    color: GameColors.textPrimary,
  },
  webFallbackContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  webFallbackTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: GameColors.textPrimary,
    marginTop: Spacing.lg,
  },
  webFallbackText: {
    fontSize: 14,
    color: GameColors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.sm,
    maxWidth: 280,
  },
  webFallbackButton: {
    marginTop: Spacing.xl,
    backgroundColor: GameColors.gold,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  webFallbackButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.background,
  },
});
