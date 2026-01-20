import React from "react";
import { View, StyleSheet, Text } from "react-native";

interface HuntDebugOverlayProps {
  gpsAgeMs: number | null;
  gpsAccuracy: number | null;
  spawnsStatus: number | null;
  spawnsAgeMs: number | null;
  spawnsCount: number;
  questSpawnsCount: number;
  playerLat: number | null;
  playerLng: number | null;
  serverError: string | null;
}

const isDev = __DEV__ || process.env.EXPO_PUBLIC_SHOW_HUNT_DEBUG === "1";

export function HuntDebugOverlay({
  gpsAgeMs,
  gpsAccuracy,
  spawnsStatus,
  spawnsAgeMs,
  spawnsCount,
  questSpawnsCount,
  playerLat,
  playerLng,
  serverError,
}: HuntDebugOverlayProps) {
  if (!isDev) return null;

  const gpsAgeSec = gpsAgeMs !== null ? Math.round(gpsAgeMs / 1000) : null;
  const spawnsAgeSec = spawnsAgeMs !== null ? Math.round(spawnsAgeMs / 1000) : null;
  const latStr = playerLat !== null ? playerLat.toFixed(4) : "—";
  const lngStr = playerLng !== null ? playerLng.toFixed(4) : "—";

  return (
    <View style={styles.container} pointerEvents="none">
      <Text style={styles.text}>GPS: {gpsAgeSec !== null ? `${gpsAgeSec}s` : "—"} | acc: {gpsAccuracy !== null ? `${Math.round(gpsAccuracy)}m` : "—"}</Text>
      <Text style={styles.text}>Spawns: {spawnsStatus ?? "—"} | {spawnsAgeSec !== null ? `${spawnsAgeSec}s ago` : "—"}</Text>
      <Text style={styles.text}>Count: {spawnsCount} + {questSpawnsCount}q</Text>
      <Text style={styles.text}>Loc: {latStr}, {lngStr}</Text>
      {serverError && <Text style={[styles.text, styles.error]}>{serverError}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 100,
    left: 8,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 6,
    borderRadius: 6,
    zIndex: 9999,
  },
  text: {
    color: "#0f0",
    fontSize: 10,
    fontFamily: "monospace",
    lineHeight: 14,
  },
  error: {
    color: "#f66",
  },
});
