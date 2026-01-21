import React from "react";
import { View, StyleSheet, Text, ScrollView } from "react-native";

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
  forceShow?: boolean;
}

interface ApiDebugInfo {
  tsIso?: string;
  method?: string;
  path?: string;
  fullUrl?: string;
  baseUrl?: string;
  hasAuthToken?: boolean;
  authHeaderSet?: boolean;
  authHeaderPreview?: string | null;
  status?: number | null;
  durationMs?: number | null;
  error?: string | null;
  responsePreview?: string | null;
}

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
  forceShow = false,
}: HuntDebugOverlayProps) {
  const isDev = __DEV__ || process.env.EXPO_PUBLIC_SHOW_HUNT_DEBUG === "1";
  if (!isDev && !forceShow) return null;

  const gpsAgeSec = gpsAgeMs !== null ? Math.round(gpsAgeMs / 1000) : null;
  const spawnsAgeSec = spawnsAgeMs !== null ? Math.round(spawnsAgeMs / 1000) : null;
  const latStr = playerLat !== null ? playerLat.toFixed(4) : "—";
  const lngStr = playerLng !== null ? playerLng.toFixed(4) : "—";

  const last: ApiDebugInfo = (globalThis as any).__lastApiDebug || {};

  return (
    <View style={styles.container} pointerEvents="box-none">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionHeader}>GPS / Spawns</Text>
        <Text style={styles.text}>GPS: {gpsAgeSec !== null ? `${gpsAgeSec}s` : "—"} | acc: {gpsAccuracy !== null ? `${Math.round(gpsAccuracy)}m` : "—"}</Text>
        <Text style={styles.text}>Spawns: {spawnsStatus ?? "—"} | {spawnsAgeSec !== null ? `${spawnsAgeSec}s ago` : "—"}</Text>
        <Text style={styles.text}>Count: {spawnsCount} + {questSpawnsCount}q</Text>
        <Text style={styles.text}>Loc: {latStr}, {lngStr}</Text>
        {serverError && <Text style={[styles.text, styles.error]}>{serverError}</Text>}

        <Text style={styles.sectionHeader}>Last API Call</Text>
        <Text style={styles.text}>Status: {last.status ?? "-"} | {last.durationMs ?? "-"}ms</Text>
        {last.error && <Text style={[styles.text, styles.error]}>Err: {last.error}</Text>}
        <Text style={styles.text}>Token: {last.hasAuthToken ? "YES" : "NO"} | Hdr: {last.authHeaderSet ? "YES" : "NO"}</Text>
        <Text style={styles.text}>{last.method || "-"} {last.path || "-"}</Text>
        {last.responsePreview && (
          <Text style={styles.textSmall} numberOfLines={3}>Resp: {last.responsePreview}</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 100,
    left: 8,
    maxHeight: 220,
    maxWidth: 280,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    padding: 6,
    borderRadius: 6,
    zIndex: 9999,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 4,
  },
  sectionHeader: {
    color: "#0ff",
    fontSize: 10,
    fontFamily: "monospace",
    fontWeight: "bold",
    marginTop: 4,
    marginBottom: 2,
  },
  text: {
    color: "#0f0",
    fontSize: 10,
    fontFamily: "monospace",
    lineHeight: 14,
  },
  textSmall: {
    color: "#0f0",
    fontSize: 8,
    fontFamily: "monospace",
    lineHeight: 12,
  },
  error: {
    color: "#f66",
  },
});
