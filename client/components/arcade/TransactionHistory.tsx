import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";

interface Transaction {
  id: string;
  type: "earned" | "spent" | "bonus";
  amount: string;
  token: string;
  timestamp: Date;
  description: string;
  status: "confirmed" | "pending";
}

interface TransactionHistoryProps {
  transactions?: Transaction[];
  maxItems?: number;
  onViewAll?: () => void;
}

const PLACEHOLDER_TRANSACTIONS: Transaction[] = [
  {
    id: "1",
    type: "bonus",
    amount: "+25",
    token: "CHY",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    description: "Daily Bonus",
    status: "confirmed",
  },
  {
    id: "2",
    type: "earned",
    amount: "+100",
    token: "CHY",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    description: "Catch Reward",
    status: "confirmed",
  },
  {
    id: "3",
    type: "earned",
    amount: "+50",
    token: "CHY",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    description: "Egg Hatched",
    status: "confirmed",
  },
  {
    id: "4",
    type: "bonus",
    amount: "+500",
    token: "CHY",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
    description: "Weekly Bonus",
    status: "confirmed",
  },
  {
    id: "5",
    type: "earned",
    amount: "+10",
    token: "CHY",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72),
    description: "Play Bonus",
    status: "pending",
  },
];

const getTypeIcon = (type: Transaction["type"]): keyof typeof Feather.glyphMap => {
  switch (type) {
    case "earned":
      return "arrow-down-left";
    case "spent":
      return "arrow-up-right";
    case "bonus":
      return "gift";
    default:
      return "circle";
  }
};

const getTypeColor = (type: Transaction["type"]): string => {
  switch (type) {
    case "earned":
      return GameColors.success;
    case "spent":
      return "#EF4444";
    case "bonus":
      return GameColors.gold;
    default:
      return GameColors.textSecondary;
  }
};

const formatTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

export function TransactionHistory({
  transactions = PLACEHOLDER_TRANSACTIONS,
  maxItems = 5,
  onViewAll,
}: TransactionHistoryProps) {
  const displayTransactions = transactions.slice(0, maxItems);

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Feather name="list" size={18} color={GameColors.gold} />
          <ThemedText style={styles.title}>Reward History</ThemedText>
        </View>
        {onViewAll ? (
          <Pressable onPress={onViewAll} style={styles.viewAllButton}>
            <ThemedText style={styles.viewAllText}>View All</ThemedText>
            <Feather name="chevron-right" size={14} color={GameColors.gold} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.transactionsList}>
        {displayTransactions.map((tx) => (
          <View key={tx.id} style={styles.transactionItem}>
            <View style={[styles.iconContainer, { backgroundColor: getTypeColor(tx.type) + "20" }]}>
              <Feather name={getTypeIcon(tx.type)} size={16} color={getTypeColor(tx.type)} />
            </View>

            <View style={styles.transactionDetails}>
              <View style={styles.transactionMain}>
                <ThemedText style={styles.transactionType}>
                  {tx.description}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.transactionAmount,
                    tx.type !== "spent" && styles.positiveAmount,
                  ]}
                >
                  {tx.amount} {tx.token}
                </ThemedText>
              </View>
              <View style={styles.transactionMeta}>
                <ThemedText style={styles.timestamp}>{formatTime(tx.timestamp)}</ThemedText>
              </View>
            </View>

            {tx.status === "pending" ? (
              <View style={styles.pendingBadge}>
                <ThemedText style={styles.pendingText}>Pending</ThemedText>
              </View>
            ) : null}
          </View>
        ))}
      </View>

      <View style={styles.infoNote}>
        <Feather name="info" size={12} color={GameColors.textSecondary} />
        <ThemedText style={styles.noteText}>Earn Chy Coins by playing games and completing challenges</ThemedText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewAllText: {
    fontSize: 12,
    color: GameColors.gold,
  },
  transactionsList: {
    gap: Spacing.sm,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: GameColors.surface + "40",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  transactionDetails: {
    flex: 1,
  },
  transactionMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  transactionType: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  positiveAmount: {
    color: GameColors.success,
  },
  transactionMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  timestamp: {
    fontSize: 11,
    color: GameColors.textSecondary,
  },
  pendingBadge: {
    backgroundColor: GameColors.gold + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  pendingText: {
    fontSize: 10,
    color: GameColors.gold,
    fontWeight: "600",
  },
  infoNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: GameColors.surface + "40",
  },
  noteText: {
    fontSize: 11,
    color: GameColors.textSecondary,
  },
});
