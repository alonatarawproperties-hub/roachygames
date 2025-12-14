import React, { useEffect, useCallback } from "react";
import { View, StyleSheet, Platform, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { FlappyGame } from "@/games/flappy/FlappyGame";
import * as ScreenOrientation from "expo-screen-orientation";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { useQueryClient } from "@tanstack/react-query";
import { useFlappySkin } from "@/context/FlappySkinContext";
import { GameColors } from "@/constants/theme";

export function FlappyRoachScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { equippedSkin, isLoading: skinLoading } = useFlappySkin();

  useEffect(() => {
    async function lockOrientation() {
      if (Platform.OS !== "web") {
        try {
          await ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.PORTRAIT_UP
          );
        } catch (e) {
        }
      }
    }
    
    lockOrientation();
    
    return () => {
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

  if (skinLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={GameColors.gold} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlappyGame 
        onExit={handleExit} 
        onScoreSubmit={handleScoreSubmit} 
        userId={user?.id}
        skin={equippedSkin}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
  },
});
