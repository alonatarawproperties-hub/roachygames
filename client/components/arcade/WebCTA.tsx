import React from "react";
import { View, StyleSheet, Pressable, Linking } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";

interface WebCTAProps {
  variant?: "swap" | "stake" | "marketplace" | "full";
  customUrl?: string;
  customTitle?: string;
  customSubtitle?: string;
}

const CTA_CONFIGS = {
  swap: {
    title: "Swap Tokens",
    subtitle: "Exchange RCH on roachy.games",
    icon: "repeat" as keyof typeof Feather.glyphMap,
    url: "https://roachy.games/swap",
    gradient: ["#8B5CF6", "#6366F1"],
  },
  stake: {
    title: "Stake RCH",
    subtitle: "Earn rewards on roachy.games",
    icon: "trending-up" as keyof typeof Feather.glyphMap,
    url: "https://roachy.games/stake",
    gradient: ["#22C55E", "#16A34A"],
  },
  marketplace: {
    title: "NFT Marketplace",
    subtitle: "Trade Roachies on roachy.games",
    icon: "shopping-bag" as keyof typeof Feather.glyphMap,
    url: "https://roachy.games/marketplace",
    gradient: ["#F59E0B", "#D97706"],
  },
  full: {
    title: "Open Web App",
    subtitle: "Full experience at roachy.games",
    icon: "globe" as keyof typeof Feather.glyphMap,
    url: "https://roachy.games",
    gradient: ["#06B6D4", "#0891B2"],
  },
};

export function WebCTA({ variant = "swap", customUrl, customTitle, customSubtitle }: WebCTAProps) {
  const config = CTA_CONFIGS[variant];

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const url = customUrl || config.url;
    Linking.openURL(url);
  };

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <LinearGradient
        colors={config.gradient as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <View style={styles.iconContainer}>
          <Feather name={config.icon} size={24} color="#FFFFFF" />
        </View>

        <View style={styles.textContainer}>
          <ThemedText style={styles.title}>{customTitle || config.title}</ThemedText>
          <ThemedText style={styles.subtitle}>{customSubtitle || config.subtitle}</ThemedText>
        </View>

        <View style={styles.arrowContainer}>
          <Feather name="arrow-right" size={20} color="#FFFFFF" />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

interface WebCTACompactProps {
  variant?: "swap" | "stake" | "marketplace";
  onPress?: () => void;
}

export function WebCTACompact({ variant = "swap", onPress }: WebCTACompactProps) {
  const config = CTA_CONFIGS[variant];

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPress) {
      onPress();
    } else {
      Linking.openURL(config.url);
    }
  };

  return (
    <Pressable style={styles.compactContainer} onPress={handlePress}>
      <LinearGradient
        colors={config.gradient as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.compactGradient}
      >
        <Feather name={config.icon} size={16} color="#FFFFFF" />
        <ThemedText style={styles.compactText}>{config.title}</ThemedText>
        <Feather name="external-link" size={12} color="#FFFFFF" />
      </LinearGradient>
    </Pressable>
  );
}

interface WebCTABannerProps {
  onDismiss?: () => void;
}

export function WebCTABanner({ onDismiss }: WebCTABannerProps) {
  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL("https://roachy.games");
  };

  return (
    <View style={styles.bannerContainer}>
      <LinearGradient
        colors={[GameColors.gold + "20", GameColors.gold + "10"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.bannerGradient}
      >
        <View style={styles.bannerContent}>
          <View style={styles.bannerIconContainer}>
            <Feather name="monitor" size={20} color={GameColors.gold} />
          </View>
          <View style={styles.bannerTextContainer}>
            <ThemedText style={styles.bannerTitle}>Trade on Web</ThemedText>
            <ThemedText style={styles.bannerSubtitle}>Swap, stake, and trade NFTs</ThemedText>
          </View>
          <Pressable style={styles.bannerButton} onPress={handlePress}>
            <ThemedText style={styles.bannerButtonText}>Open</ThemedText>
            <Feather name="external-link" size={12} color={GameColors.background} />
          </Pressable>
        </View>

        {onDismiss ? (
          <Pressable style={styles.dismissButton} onPress={onDismiss}>
            <Feather name="x" size={16} color={GameColors.textSecondary} />
          </Pressable>
        ) : null}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  compactContainer: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  compactGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  compactText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  bannerContainer: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: GameColors.gold + "30",
  },
  bannerGradient: {
    position: "relative",
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  bannerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: GameColors.gold + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  bannerSubtitle: {
    fontSize: 11,
    color: GameColors.textSecondary,
    marginTop: 2,
  },
  bannerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: GameColors.gold,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  bannerButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: GameColors.background,
  },
  dismissButton: {
    position: "absolute",
    top: Spacing.xs,
    right: Spacing.xs,
    padding: 4,
  },
});
