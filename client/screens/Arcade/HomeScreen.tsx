import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { WalletSelectModal } from "@/components/WalletSelectModal";
import {
  ArcadeHeader,
  FeaturedGameHero,
  GameListItem,
  ArcadeTabBar,
} from "@/components/arcade";
import { GAMES_CATALOG } from "@/constants/gamesCatalog";
import { GameColors, Spacing } from "@/constants/theme";
import { useWallet } from "@/context/WalletContext";

export function ArcadeHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [activeTab, setActiveTab] = useState("Games");
  const [searchQuery, setSearchQuery] = useState("");
  const [showWalletModal, setShowWalletModal] = useState(false);
  const { wallet, disconnectWallet } = useWallet();

  const featuredGame = GAMES_CATALOG[0];
  const gamesList = GAMES_CATALOG;

  const filteredGames = searchQuery
    ? gamesList.filter((game) =>
        game.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : gamesList;

  const handleGamePress = (routeName: string) => {
    navigation.navigate(routeName);
  };

  const handleWalletPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (wallet.connected) {
      Alert.alert(
        "Wallet Connected",
        `Connected to ${wallet.address?.substring(0, 6)}...${wallet.address?.substring(wallet.address.length - 4)}`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Disconnect", style: "destructive", onPress: disconnectWallet },
        ]
      );
    } else {
      setShowWalletModal(true);
    }
  };

  const handleNotificationPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Notifications", "Coming soon!");
  };

  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={[GameColors.background, "#1A0F08", "#2D1810", "#1A0F08", GameColors.background]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <ArcadeHeader
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onWalletPress={handleWalletPress}
        onNotificationPress={handleNotificationPress}
        walletConnected={wallet.connected}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <FeaturedGameHero
          game={featuredGame}
          onPress={() => handleGamePress(featuredGame.routeName)}
          viewerCount="12.3k"
        />

        <View style={styles.gamesList}>
          {filteredGames.map((game, index) => (
            <GameListItem
              key={game.id}
              game={game}
              onPress={() => handleGamePress(game.routeName)}
              playTime={index === 0 ? "20:30" : index === 1 ? "00:15" : index === 2 ? "22:00" : "18:00"}
            />
          ))}
        </View>

        {filteredGames.length === 0 && (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyText}>
              No games found for &quot;{searchQuery}&quot;
            </ThemedText>
          </View>
        )}

        <View style={styles.moreSection}>
          <ThemedText style={styles.moreText}>More</ThemedText>
          <View style={styles.moreDots}>
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>
      </ScrollView>

      <ArcadeTabBar activeTab={activeTab} onTabPress={setActiveTab} />

      <WalletSelectModal
        visible={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />
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
    paddingBottom: Spacing.xl,
  },
  gamesList: {
    marginTop: Spacing.sm,
  },
  emptyState: {
    paddingVertical: Spacing["3xl"],
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: GameColors.textSecondary,
  },
  moreSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  moreText: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.textSecondary,
  },
  moreDots: {
    flexDirection: "row",
    gap: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: GameColors.textTertiary,
  },
});
