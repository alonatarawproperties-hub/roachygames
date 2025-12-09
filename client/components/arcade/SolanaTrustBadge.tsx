import React from "react";
import { View, StyleSheet, Pressable, Linking } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";

interface SolanaTrustBadgeProps {
  variant?: "minimal" | "full";
}

export function SolanaTrustBadge({ variant = "minimal" }: SolanaTrustBadgeProps) {
  const handlePress = () => {
    Linking.openURL("https://solana.com");
  };

  if (variant === "minimal") {
    return (
      <Pressable style={styles.minimalContainer} onPress={handlePress}>
        <View style={styles.solanaLogo}>
          <ThemedText style={styles.solanaS}>S</ThemedText>
        </View>
        <ThemedText style={styles.minimalText}>Powered by Solana</ThemedText>
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.fullContainer} onPress={handlePress}>
      <View style={styles.content}>
        <View style={styles.solanaLogoFull}>
          <ThemedText style={styles.solanaSFull}>S</ThemedText>
        </View>
        <View style={styles.textContainer}>
          <ThemedText style={styles.poweredBy}>Powered by</ThemedText>
          <ThemedText style={styles.solanaText}>Solana</ThemedText>
        </View>
      </View>
      <View style={styles.verifiedBadge}>
        <ThemedText style={styles.verifiedText}>Verified</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  minimalContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  solanaLogo: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#9945FF",
    justifyContent: "center",
    alignItems: "center",
  },
  solanaS: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  minimalText: {
    fontSize: 12,
    fontWeight: "500",
    color: GameColors.textTertiary,
  },
  fullContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: GameColors.surfaceElevated,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "#9945FF30",
    marginBottom: Spacing.lg,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  solanaLogoFull: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#9945FF",
    justifyContent: "center",
    alignItems: "center",
  },
  solanaSFull: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  textContainer: {
    gap: 2,
  },
  poweredBy: {
    fontSize: 11,
    color: GameColors.textTertiary,
  },
  solanaText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#9945FF",
  },
  verifiedBadge: {
    backgroundColor: GameColors.success + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    borderColor: GameColors.success + "40",
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: "600",
    color: GameColors.success,
  },
});
