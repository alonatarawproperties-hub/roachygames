import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export type ReplayItem = {
  key: string;
  label: string;
  side: "left" | "right";
  tone?: "planned" | "event";
};

type Props = {
  items: ReplayItem[];
};

export default function TurnReplayStrip({ items }: Props) {
  if (!items?.length) return null;

  const last = items.slice(-8);
  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {last.map((it, idx) => {
          const isOld = idx < Math.max(0, last.length - 5);
          const isPlanned = it.tone === "planned";
          return (
            <View
              key={it.key}
              style={[
                styles.chip,
                it.side === "left" ? styles.leftChip : styles.rightChip,
                isOld ? styles.old : null,
                isPlanned ? styles.planned : null,
              ]}
            >
              <Text style={[styles.text, isPlanned ? styles.plannedText : null]} numberOfLines={1}>
                {it.label}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
    marginBottom: 10,
  },
  row: {
    gap: 8,
    paddingHorizontal: 10,
  },
  chip: {
    maxWidth: 260,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
  },
  leftChip: {
    borderColor: "rgba(185,140,255,0.35)",
  },
  rightChip: {
    borderColor: "rgba(64,196,255,0.35)",
  },
  text: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 12,
    fontWeight: "700",
  },
  old: {
    opacity: 0.65,
  },
  planned: {
    backgroundColor: "rgba(255,255,255,0.035)",
    borderStyle: "dashed",
  },
  plannedText: {
    opacity: 0.9,
  },
});
