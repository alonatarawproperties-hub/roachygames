import React from "react";
import { View, StyleSheet, Pressable, Linking } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import Svg, { Defs, LinearGradient, Stop, Path } from "react-native-svg";

interface SolanaTrustBadgeProps {
  variant?: "minimal" | "full";
}

function SolanaLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 397.7 311.7">
      <Defs>
        <LinearGradient id="solanaGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#00FFA3" />
          <Stop offset="100%" stopColor="#DC1FFF" />
        </LinearGradient>
        <LinearGradient id="solanaGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#00FFA3" />
          <Stop offset="100%" stopColor="#DC1FFF" />
        </LinearGradient>
        <LinearGradient id="solanaGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#00FFA3" />
          <Stop offset="100%" stopColor="#DC1FFF" />
        </LinearGradient>
      </Defs>
      <Path
        fill="url(#solanaGradient1)"
        d="M64.6,237.9c2.4-2.4,5.7-3.8,9.2-3.8h317.4c5.8,0,8.7,7,4.6,11.1l-62.7,62.7c-2.4,2.4-5.7,3.8-9.2,3.8H6.5c-5.8,0-8.7-7-4.6-11.1L64.6,237.9z"
      />
      <Path
        fill="url(#solanaGradient2)"
        d="M64.6,3.8C67.1,1.4,70.4,0,73.8,0h317.4c5.8,0,8.7,7,4.6,11.1l-62.7,62.7c-2.4,2.4-5.7,3.8-9.2,3.8H6.5c-5.8,0-8.7-7-4.6-11.1L64.6,3.8z"
      />
      <Path
        fill="url(#solanaGradient3)"
        d="M333.1,120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8,0-8.7,7-4.6,11.1l62.7,62.7c2.4,2.4,5.7,3.8,9.2,3.8h317.4c5.8,0,8.7-7,4.6-11.1L333.1,120.1z"
      />
    </Svg>
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
          <SolanaLogo size={18} />
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
    gap: 6,
    opacity: 0.8,
  },
  logoWrapper: {
    width: 24,
    height: 24,
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
    width: 40,
    height: 40,
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
