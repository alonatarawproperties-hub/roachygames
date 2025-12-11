import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing } from "@/constants/theme";

const { width, height } = Dimensions.get("window");

interface HuntLoadingOverlayProps {
  gpsReady: boolean;
  dataReady: boolean;
  mapReady: boolean;
  gpsAccuracy?: number | null;
  permissionDenied?: boolean;
  onRequestPermission?: () => void;
}

const getGpsLabel = (accuracy: number | null | undefined, ready: boolean) => {
  const hasAccuracy = accuracy !== null && accuracy !== undefined;
  if (!ready) {
    if (hasAccuracy && accuracy <= 20) return "GPS locked (high precision)";
    if (hasAccuracy && accuracy <= 50) return "GPS signal acquired";
    return "Acquiring GPS signal...";
  }
  if (hasAccuracy && accuracy <= 10) return "GPS: Excellent";
  if (hasAccuracy && accuracy <= 20) return "GPS: Good";
  if (hasAccuracy && accuracy <= 50) return "GPS: Fair";
  return "GPS: Acquired";
};

const LOADING_MESSAGES = [
  { key: "gps", label: "Acquiring GPS signal" },
  { key: "data", label: "Loading hunt data" },
  { key: "map", label: "Preparing hunting grounds" },
];

export function HuntLoadingOverlay({
  gpsReady,
  dataReady,
  mapReady,
  gpsAccuracy,
  permissionDenied,
  onRequestPermission,
}: HuntLoadingOverlayProps) {
  const pulseAnim = useSharedValue(0);
  const rotateAnim = useSharedValue(0);
  const dotsAnim = useSharedValue(0);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.ease }),
        withTiming(0, { duration: 1200, easing: Easing.ease })
      ),
      -1
    );

    rotateAnim.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1
    );

    dotsAnim.value = withRepeat(
      withTiming(3, { duration: 1500, easing: Easing.linear }),
      -1
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulseAnim.value, [0, 1], [1, 1.15]) }],
    opacity: interpolate(pulseAnim.value, [0, 1], [0.6, 1]),
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateAnim.value}deg` }],
  }));

  const getCurrentMessage = () => {
    if (permissionDenied) return "Location permission required";
    if (!gpsReady) return "Acquiring GPS signal...";
    if (!dataReady) return "Loading hunt data...";
    if (!mapReady) return "Preparing hunting grounds...";
    return "Ready to hunt!";
  };

  const getProgress = () => {
    let completed = 0;
    if (gpsReady) completed++;
    if (dataReady) completed++;
    if (mapReady) completed++;
    return completed / 3;
  };

  const progress = getProgress();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1a1408", "#2d2010", "#1a1408"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, pulseStyle]}>
          <Animated.View style={[styles.glowRing, ringStyle]}>
            <LinearGradient
              colors={["transparent", GameColors.primary, "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ringGradient}
            />
          </Animated.View>

          <View style={styles.logoWrapper}>
            <Image
              source={require("@/assets/roachy-hunt-logo.png")}
              style={styles.logo}
              contentFit="contain"
            />
          </View>
        </Animated.View>

        <View style={styles.statusContainer}>
          <BlurView intensity={20} tint="dark" style={styles.statusBlur}>
            <ThemedText style={styles.statusText}>
              {getCurrentMessage()}
            </ThemedText>

            <View style={styles.progressBar}>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progress * 100}%` },
                  ]}
                />
              </View>
            </View>

            <View style={styles.checklistContainer}>
              {LOADING_MESSAGES.map((item) => {
                const isComplete =
                  (item.key === "gps" && gpsReady) ||
                  (item.key === "data" && dataReady) ||
                  (item.key === "map" && mapReady);

                const displayLabel = item.key === "gps" 
                  ? getGpsLabel(gpsAccuracy, gpsReady)
                  : item.label;

                return (
                  <View key={item.key} style={styles.checklistItem}>
                    <View
                      style={[
                        styles.checkIcon,
                        isComplete && styles.checkIconComplete,
                      ]}
                    >
                      {isComplete ? (
                        <Feather name="check" size={12} color="#fff" />
                      ) : (
                        <View style={styles.loadingDot} />
                      )}
                    </View>
                    <View style={styles.checklistLabelContainer}>
                      <ThemedText
                        style={[
                          styles.checklistLabel,
                          isComplete && styles.checklistLabelComplete,
                        ]}
                      >
                        {displayLabel}
                      </ThemedText>
                      {item.key === "gps" && gpsAccuracy ? (
                        <ThemedText style={styles.gpsAccuracyText}>
                          {Math.round(gpsAccuracy)}m accuracy
                        </ThemedText>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </BlurView>
        </View>

        {permissionDenied && onRequestPermission ? (
          <View style={styles.permissionContainer}>
            <ThemedText style={styles.permissionText}>
              Location access is required to find Roachies in your area
            </ThemedText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing["3xl"],
  },
  glowRing: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: GameColors.primary,
    opacity: 0.3,
  },
  ringGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 100,
  },
  logoWrapper: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(212, 175, 55, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  logo: {
    width: 140,
    height: 140,
  },
  statusContainer: {
    width: width * 0.85,
    maxWidth: 320,
    borderRadius: 16,
    overflow: "hidden",
  },
  statusBlur: {
    padding: Spacing.lg,
    backgroundColor: "rgba(45, 32, 16, 0.6)",
  },
  statusText: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.primary,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  progressBar: {
    marginBottom: Spacing.lg,
  },
  progressTrack: {
    height: 4,
    backgroundColor: "rgba(212, 175, 55, 0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: GameColors.primary,
    borderRadius: 2,
  },
  checklistContainer: {
    gap: Spacing.sm,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  checklistLabelContainer: {
    flex: 1,
  },
  gpsAccuracyText: {
    fontSize: 11,
    color: GameColors.primary,
    marginTop: 2,
  },
  checkIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(212, 175, 55, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  checkIconComplete: {
    backgroundColor: "#22C55E",
  },
  loadingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GameColors.primary,
    opacity: 0.5,
  },
  checklistLabel: {
    fontSize: 14,
    color: GameColors.textSecondary,
  },
  checklistLabelComplete: {
    color: GameColors.textPrimary,
  },
  permissionContainer: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  permissionText: {
    fontSize: 14,
    color: GameColors.textSecondary,
    textAlign: "center",
  },
});
