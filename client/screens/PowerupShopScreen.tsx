import React from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Image } from "expo-image";

import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius, GlowStyles } from "@/constants/theme";
import { getMarketplaceUrl } from "@/lib/query-client";

const ChyCoinIcon = require("@/assets/chy-coin-icon.png");

export default function PowerupShopScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const handleOpenShop = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await Linking.openURL(getMarketplaceUrl() + "/shop");
  };

  return (
    <View style={[styles.container, { paddingTop: headerHeight + Spacing.xl }]}>
      <LinearGradient
        colors={[GameColors.background, GameColors.surface]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View entering={FadeInDown.springify()} style={styles.content}>
        <View style={styles.iconContainer}>
          <Image source={ChyCoinIcon} style={styles.coinIcon} contentFit="contain" />
        </View>

        <ThemedText style={styles.title}>Shop on Web</ThemedText>
        <ThemedText style={styles.subtitle}>
          Purchase powerups, trade tokens, and manage your CHY balance on the Roachy Games website.
        </ThemedText>

        <Pressable style={styles.shopButton} onPress={handleOpenShop}>
          <Feather name="external-link" size={20} color={GameColors.textPrimary} />
          <ThemedText style={styles.shopButtonText}>Open Shop</ThemedText>
        </Pressable>

        <View style={styles.infoCard}>
          <Feather name="info" size={18} color={GameColors.gold} />
          <ThemedText style={styles.infoText}>
            All purchases and token transactions are handled securely on the Roachy Games website.
          </ThemedText>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: GameColors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
    ...GlowStyles.subtle,
  },
  coinIcon: {
    width: 80,
    height: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: GameColors.gold,
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: GameColors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: Spacing["2xl"],
  },
  shopButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing["2xl"],
    backgroundColor: GameColors.gold,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing["2xl"],
  },
  shopButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    backgroundColor: GameColors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: GameColors.gold,
    marginHorizontal: Spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: GameColors.textSecondary,
    lineHeight: 20,
  },
});
