import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { GameColors, Spacing } from "@/constants/theme";

export function HuntLeaderboard() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <ThemedText type="h4" style={styles.sectionTitle}>
        Weekly Leaderboard
      </ThemedText>
      <Card style={styles.emptyCard}>
        <Feather name="award" size={48} color={GameColors.gold} />
        <ThemedText style={[styles.emptyText, { color: GameColors.gold }]}>
          Rankings Coming Soon!
        </ThemedText>
        <ThemedText style={styles.emptySubtext}>
          Collect eggs now. Your rank will be calculated when Phase II launches.
        </ThemedText>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: GameColors.textPrimary,
    marginBottom: Spacing.md,
  },
  emptyCard: {
    alignItems: "center",
    padding: Spacing.xl * 2,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.textSecondary,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: GameColors.textTertiary,
    textAlign: "center",
  },
});
