import React from "react";
import { View, StyleSheet, Pressable, Linking } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";

interface Transaction {
  id: string;
  type: "send" | "receive" | "swap" | "mint" | "stake" | "unstake";
  amount: string;
  token: string;
  timestamp: Date;
  txHash: string;
  txHashDisplay: string;
  status: "confirmed" | "pending" | "failed";
}

interface TransactionHistoryProps {
  transactions?: Transaction[];
  maxItems?: number;
  onViewAll?: () => void;
}

const PLACEHOLDER_TRANSACTIONS: Transaction[] = [
  {
    id: "1",
    type: "receive",
    amount: "+25.00",
    token: "RCH",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    txHash: "5KQwVxRtP2mNjY7cKfL8bHqZ3wE9sD1aG4vC6uI0oX8jNmXa",
    txHashDisplay: "5KQwV...8jNmX",
    status: "confirmed",
  },
  {
    id: "2",
    type: "swap",
    amount: "100.00",
    token: "RCH → SOL",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    txHash: "3mPqRxStU5wNkY8dLgH7cIjV4zE2sF1bC0vD9uO6pX9vLwKb",
    txHashDisplay: "3mPqR...9vLwK",
    status: "confirmed",
  },
  {
    id: "3",
    type: "mint",
    amount: "1",
    token: "Roachy NFT",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    txHash: "7nXzYqWtS4uMkJ9eFgH6bIcV3aD1sC0zB8vE5pO2rX2bQpTc",
    txHashDisplay: "7nXzY...2bQpT",
    status: "confirmed",
  },
  {
    id: "4",
    type: "stake",
    amount: "500.00",
    token: "RCH",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
    txHash: "9kLmNoPqR1sTuV2wXyZ3aB4cD5eF6gH7iJ8kL9mN4cRsWde",
    txHashDisplay: "9kLmN...4cRsW",
    status: "confirmed",
  },
  {
    id: "5",
    type: "receive",
    amount: "+10.50",
    token: "RCH",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72),
    txHash: "2jHgFkLmN3oPqR4sTuV5wXyZ6aB7cD8eF9gH0iJ6dTuVfgh",
    txHashDisplay: "2jHgF...6dTuV",
    status: "pending",
  },
];

const getTypeIcon = (type: Transaction["type"]): keyof typeof Feather.glyphMap => {
  switch (type) {
    case "receive":
      return "arrow-down-left";
    case "send":
      return "arrow-up-right";
    case "swap":
      return "repeat";
    case "mint":
      return "plus-circle";
    case "stake":
      return "lock";
    case "unstake":
      return "unlock";
    default:
      return "circle";
  }
};

const getTypeColor = (type: Transaction["type"]): string => {
  switch (type) {
    case "receive":
      return GameColors.success;
    case "send":
      return "#EF4444";
    case "swap":
      return "#8B5CF6";
    case "mint":
      return GameColors.gold;
    case "stake":
      return "#06B6D4";
    case "unstake":
      return "#F97316";
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

const openExplorer = (txHash: string) => {
  if (txHash && txHash.length >= 44) {
    Linking.openURL(`https://solscan.io/tx/${txHash}`);
  }
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
          <ThemedText style={styles.title}>Transactions</ThemedText>
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
          <Pressable
            key={tx.id}
            style={styles.transactionItem}
            onPress={() => openExplorer(tx.txHash)}
          >
            <View style={[styles.iconContainer, { backgroundColor: getTypeColor(tx.type) + "20" }]}>
              <Feather name={getTypeIcon(tx.type)} size={16} color={getTypeColor(tx.type)} />
            </View>

            <View style={styles.transactionDetails}>
              <View style={styles.transactionMain}>
                <ThemedText style={styles.transactionType}>
                  {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.transactionAmount,
                    tx.type === "receive" && styles.positiveAmount,
                  ]}
                >
                  {tx.amount} {tx.token}
                </ThemedText>
              </View>
              <View style={styles.transactionMeta}>
                <ThemedText style={styles.timestamp}>{formatTime(tx.timestamp)}</ThemedText>
                <View style={styles.txHashContainer}>
                  <ThemedText style={styles.txHash}>{tx.txHashDisplay}</ThemedText>
                  <Feather name="external-link" size={10} color={GameColors.textSecondary} />
                </View>
              </View>
            </View>

            {tx.status === "pending" ? (
              <View style={styles.pendingBadge}>
                <ThemedText style={styles.pendingText}>Pending</ThemedText>
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>

      <View style={styles.explorerNote}>
        <Feather name="info" size={12} color={GameColors.textSecondary} />
        <ThemedText style={styles.noteText}>Tap any transaction to view on Solscan</ThemedText>
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
  txHashContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  txHash: {
    fontSize: 10,
    color: GameColors.textSecondary,
    fontFamily: "monospace",
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
  explorerNote: {
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
