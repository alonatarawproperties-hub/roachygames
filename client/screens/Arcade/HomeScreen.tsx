import React from "react";
import { View, StyleSheet, ScrollView, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ArcadeHeader, GameTile } from "@/components/arcade";
import { GAMES_CATALOG, getAvailableGames } from "@/constants/gamesCatalog";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function ArcadeHomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const featuredGame = GAMES_CATALOG[0];
  const otherGames = GAMES_CATALOG.slice(1);

  const handleGamePress = (routeName: string) => {
    navigation.navigate(routeName);
  };

  const handleWalletPress = () => {
    console.log("Wallet press - TODO: implement wallet connection");
  };

  const handleSettingsPress = () => {
    console.log("Settings press - TODO: implement settings");
  };

  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={[GameColors.background, "#1a0f08", GameColors.background]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <ArcadeHeader
        onWalletPress={handleWalletPress}
        onSettingsPress={handleSettingsPress}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.welcomeSection}>
          <ThemedText style={styles.welcomeText}>Welcome, Hunter</ThemedText>
          <ThemedText style={styles.welcomeSubtext}>
            Choose your adventure
          </ThemedText>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Featured Game</ThemedText>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <ThemedText style={styles.liveText}>PLAYABLE NOW</ThemedText>
            </View>
          </View>

          <GameTile
            game={featuredGame}
            featured
            onPress={() => handleGamePress(featuredGame.routeName)}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Coming Soon</ThemedText>
            <Feather name="clock" size={16} color={GameColors.textSecondary} />
          </View>

          <View style={styles.gamesGrid}>
            {otherGames.map((game) => (
              <GameTile
                key={game.id}
                game={game}
                onPress={() => handleGamePress(game.routeName)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.infoCard}>
            <Feather name="info" size={20} color={GameColors.primary} />
            <View style={styles.infoContent}>
              <ThemedText style={styles.infoTitle}>
                More Games Coming Soon
              </ThemedText>
              <ThemedText style={styles.infoText}>
                We&apos;re building an entire arcade of P2E games. Stay tuned for
                PvP battles, puzzles, and epic quests!
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>Roachy Games</ThemedText>
          <ThemedText style={styles.footerVersion}>v1.0.0 Beta</ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  welcomeSection: {
    marginBottom: Spacing.lg,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "800",
    color: GameColors.textPrimary,
    letterSpacing: -0.5,
  },
  welcomeSubtext: {
    fontSize: 16,
    color: GameColors.textSecondary,
    marginTop: 4,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.success + "20",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GameColors.success,
    marginRight: 6,
  },
  liveText: {
    fontSize: 10,
    fontWeight: "700",
    color: GameColors.success,
    letterSpacing: 0.5,
  },
  gamesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  infoCard: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: GameColors.primary + "30",
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: GameColors.textPrimary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: GameColors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  footerText: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.textSecondary,
  },
  footerVersion: {
    fontSize: 12,
    color: GameColors.textTertiary,
    marginTop: 2,
  },
});
