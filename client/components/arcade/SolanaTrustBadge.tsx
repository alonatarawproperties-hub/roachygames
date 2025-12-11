import React from "react";
import { View, StyleSheet, Pressable, Linking, Platform } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";

interface SolanaTrustBadgeProps {
  variant?: "minimal" | "full";
}

function SolanaLogo({ size = 20 }: { size?: number }) {
  const barHeight = size * 0.18;
  const barSpacing = size * 0.08;
  
  return (
    <View style={{ width: size, height: size, justifyContent: "center", alignItems: "center" }}>
      <LinearGradient
        colors={["#00FFA3", "#DC1FFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size * 0.9,
          height: barHeight,
          borderRadius: 2,
          marginBottom: barSpacing,
          transform: [{ skewX: "-15deg" }],
        }}
      />
      <LinearGradient
        colors={["#00FFA3", "#DC1FFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size * 0.9,
          height: barHeight,
          borderRadius: 2,
          marginBottom: barSpacing,
          transform: [{ skewX: "-15deg" }],
        }}
      />
      <LinearGradient
        colors={["#00FFA3", "#DC1FFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size * 0.9,
          height: barHeight,
          borderRadius: 2,
          transform: [{ skewX: "-15deg" }],
        }}
      />
    </View>
  );
}

export function SolanaTrustBadge({ variant = "minimal" }: SolanaTrustBadgeProps) {
  const handlePress = () => {
    Linking.openURL("https://solana.com");
  };

  if (variant === "minimal") {
    return (
      <Pressable style={styles.minimalContainer} onPress={handlePress}>
        <View style={styles.logoWrapper}>
          <SolanaLogo size={22} />
        </View>
        <ThemedText style={styles.minimalText}>Powered by</ThemedText>
        <ThemedText style={styles.solanaName}>Solana</ThemedText>
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.fullContainer} onPress={handlePress}>
      <View style={styles.content}>
        <View style={styles.logoWrapperFull}>
          <SolanaLogo size={28} />
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
    paddingVertical: Spacing.xl,
    gap: 8,
    opacity: 0.9,
  },
  logoWrapper: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  minimalText: {
    fontSize: 13,
    fontWeight: "500",
    color: GameColors.textSecondary,
  },
  solanaName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9945FF",
  },
  fullContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: GameColors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "#9945FF20",
    marginBottom: Spacing.lg,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  logoWrapperFull: {
    width: 44,
    height: 44,
    backgroundColor: GameColors.surfaceLight,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    gap: 2,
  },
  poweredBy: {
    fontSize: 11,
    color: GameColors.textSecondary,
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
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: GameColors.success + "40",
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: "600",
    color: GameColors.success,
  },
});
