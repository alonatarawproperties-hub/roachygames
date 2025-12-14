import React, { useEffect, useCallback, useState } from "react";
import { View, StyleSheet, Platform, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { FlappyGame, RoachySkin, FLAPPY_SKINS } from "@/games/flappy/FlappyGame";
import * as ScreenOrientation from "expo-screen-orientation";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { useQueryClient } from "@tanstack/react-query";
import { ThemedText } from "@/components/ThemedText";
import { GameColors } from "@/constants/theme";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function FlappyRoachScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSkin, setSelectedSkin] = useState<RoachySkin>("default");
  const [showSkinSelector, setShowSkinSelector] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let isMounted = true;
    
    async function lockOrientation() {
      if (Platform.OS !== "web") {
        try {
          await ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.PORTRAIT_UP
          );
        } catch (e) {
          // Orientation lock not supported
        }
      }
    }
    
    lockOrientation();
    
    return () => {
      isMounted = false;
      if (Platform.OS !== "web") {
        ScreenOrientation.unlockAsync().catch(() => {});
      }
    };
  }, []);

  const handleExit = () => {
    if (Platform.OS !== "web") {
      ScreenOrientation.unlockAsync().catch(() => {});
    }
    navigation.goBack();
  };

  const handleScoreSubmit = useCallback(async (score: number, isRanked: boolean, rankedPeriod?: 'daily' | 'weekly' | null) => {
    if (!user?.id) {
      console.log("Guest score (not saved):", score);
      return;
    }
    
    try {
      await apiRequest("POST", "/api/flappy/score", {
        userId: user.id,
        score,
        coinsCollected: 0,
        isRanked,
        rankedPeriod: isRanked ? rankedPeriod : null,
        diamondEntryFee: isRanked ? (rankedPeriod === 'weekly' ? 3 : 1) : 0,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/flappy/leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/flappy/leaderboard", user.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/flappy/ranked/status"] });
      
      console.log(`Score ${score} submitted (ranked: ${isRanked}, period: ${rankedPeriod})`);
    } catch (error) {
      console.error("Failed to submit score:", error);
    }
  }, [user?.id, queryClient]);

  const handleStartGame = () => {
    setShowSkinSelector(false);
  };

  const handleGameExit = () => {
    setShowSkinSelector(true);
    handleExit();
  };

  if (showSkinSelector) {
    return (
      <View style={[styles.selectorContainer, { paddingTop: insets.top + 20 }]}>
        <Pressable style={styles.backButton} onPress={handleExit}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </Pressable>
        
        <ThemedText style={styles.title}>Choose Your Skin</ThemedText>
        <ThemedText style={styles.subtitle}>Select a Roachy to play with</ThemedText>
        
        <View style={styles.skinsRow}>
          {(Object.keys(FLAPPY_SKINS) as RoachySkin[]).map((skinId) => {
            const skin = FLAPPY_SKINS[skinId];
            const isSelected = selectedSkin === skinId;
            
            return (
              <Pressable
                key={skinId}
                style={[
                  styles.skinCard,
                  isSelected && styles.skinCardSelected,
                ]}
                onPress={() => setSelectedSkin(skinId)}
              >
                <Image
                  source={skin.frames[1]}
                  style={styles.skinPreview}
                  contentFit="contain"
                />
                <ThemedText style={styles.skinName}>{skin.name}</ThemedText>
                {skin.isNFT ? (
                  <View style={styles.nftBadge}>
                    <ThemedText style={styles.nftBadgeText}>NFT</ThemedText>
                  </View>
                ) : null}
                {isSelected ? (
                  <View style={styles.checkmark}>
                    <Feather name="check" size={16} color="#fff" />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        
        <Pressable style={styles.playButton} onPress={handleStartGame}>
          <ThemedText style={styles.playButtonText}>Play</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlappyGame 
        onExit={handleGameExit} 
        onScoreSubmit={handleScoreSubmit} 
        userId={user?.id}
        skin={selectedSkin}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  selectorContainer: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: GameColors.gold,
    marginTop: 60,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: GameColors.textSecondary,
    marginBottom: 40,
  },
  skinsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    flexWrap: "wrap",
  },
  skinCard: {
    width: 140,
    height: 180,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
    padding: 12,
  },
  skinCardSelected: {
    borderColor: GameColors.gold,
    backgroundColor: "rgba(212,175,55,0.15)",
  },
  skinPreview: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  skinName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
  },
  nftBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  nftBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#fff",
  },
  checkmark: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: GameColors.gold,
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    marginTop: 40,
    backgroundColor: GameColors.gold,
    paddingHorizontal: 60,
    paddingVertical: 16,
    borderRadius: 30,
  },
  playButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
});
