import React, { useState, useEffect } from "react";
import { View, StyleSheet, Text, ScrollView, Pressable } from "react-native";
import { subscribeApiDebug, clearApiDebug, ApiDebugEntry } from "@/lib/api-debug";

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

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

function shortPath(path?: string): string {
  if (!path) return "-";
  if (path.length <= 30) return path;
  return "..." + path.slice(-27);
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

  const [entries, setEntries] = useState<ApiDebugEntry[]>([]);

  useEffect(() => {
    const unsub = subscribeApiDebug(setEntries);
    return unsub;
  }, []);

  const gpsAgeSec = gpsAgeMs !== null ? Math.round(gpsAgeMs / 1000) : null;
  const spawnsAgeSec = spawnsAgeMs !== null ? Math.round(spawnsAgeMs / 1000) : null;
  const latStr = playerLat !== null ? playerLat.toFixed(4) : "—";
  const lngStr = playerLng !== null ? playerLng.toFixed(4) : "—";

  return (
    <View style={styles.container} pointerEvents="box-none">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionHeader}>GPS / Spawns</Text>
        <Text style={styles.text}>GPS: {gpsAgeSec !== null ? `${gpsAgeSec}s` : "—"} | acc: {gpsAccuracy !== null ? `${Math.round(gpsAccuracy)}m` : "—"}</Text>
        <Text style={styles.text}>Spawns: {spawnsStatus ?? "—"} | {spawnsAgeSec !== null ? `${spawnsAgeSec}s ago` : "—"}</Text>
        <Text style={styles.text}>Count: {spawnsCount} + {questSpawnsCount}q</Text>
        <Text style={styles.text}>Loc: {latStr}, {lngStr}</Text>
        {serverError && <Text style={[styles.text, styles.error]}>{serverError}</Text>}

        <View style={styles.historyHeader}>
          <Text style={styles.sectionHeader}>API History ({entries.length})</Text>
          <Pressable onPress={clearApiDebug} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </Pressable>
        </View>

        {entries.map((e) => (
          <View key={e.id} style={styles.entryRow}>
            <Text style={styles.entryTime}>{formatTime(e.ts)}</Text>
            {e.kind === "http" ? (
              <>
                <Text style={styles.entryMethod}>{e.method}</Text>
                <Text style={styles.entryPath} numberOfLines={1}>{shortPath(e.path)}</Text>
                <Text style={e.error ? styles.entryStatusErr : styles.entryStatus}>
                  {e.status ?? "ERR"} {e.durationMs}ms
                </Text>
                <Text style={styles.entryToken}>
                  T:{e.tokenExists ? "Y" : "N"} H:{e.headerSet ? "Y" : "N"}
                </Text>
                {e.requestId && <Text style={styles.entryReqId}>rid:{e.requestId}</Text>}
                {e.error && <Text style={styles.entryError} numberOfLines={1}>Err: {e.error}</Text>}
                {e.responsePreview && (
                  <Text style={styles.entryPreview} numberOfLines={2}>
                    {e.responsePreview}
                  </Text>
                )}
              </>
            ) : (
              <Text style={styles.entryEvent} numberOfLines={2}>EVENT: {e.extra}</Text>
            )}
          </View>
        ))}

        {entries.length === 0 && (
          <Text style={styles.textSmall}>No API calls yet</Text>
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
    maxHeight: 320,
    maxWidth: 300,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
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
    color: "#888",
    fontSize: 8,
    fontFamily: "monospace",
    lineHeight: 12,
  },
  error: {
    color: "#f66",
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  clearBtn: {
    backgroundColor: "#333",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  clearBtnText: {
    color: "#fff",
    fontSize: 8,
    fontFamily: "monospace",
  },
  entryRow: {
    borderTopWidth: 1,
    borderTopColor: "#333",
    paddingTop: 3,
    marginTop: 3,
  },
  entryTime: {
    color: "#888",
    fontSize: 8,
    fontFamily: "monospace",
  },
  entryMethod: {
    color: "#ff0",
    fontSize: 9,
    fontFamily: "monospace",
    fontWeight: "bold",
  },
  entryPath: {
    color: "#0f0",
    fontSize: 8,
    fontFamily: "monospace",
  },
  entryStatus: {
    color: "#0f0",
    fontSize: 8,
    fontFamily: "monospace",
  },
  entryStatusErr: {
    color: "#f66",
    fontSize: 8,
    fontFamily: "monospace",
  },
  entryToken: {
    color: "#888",
    fontSize: 7,
    fontFamily: "monospace",
  },
  entryReqId: {
    color: "#a0a",
    fontSize: 7,
    fontFamily: "monospace",
  },
  entryError: {
    color: "#f66",
    fontSize: 8,
    fontFamily: "monospace",
  },
  entryPreview: {
    color: "#6cf",
    fontSize: 7,
    fontFamily: "monospace",
  },
  entryEvent: {
    color: "#f0f",
    fontSize: 8,
    fontFamily: "monospace",
  },
});
