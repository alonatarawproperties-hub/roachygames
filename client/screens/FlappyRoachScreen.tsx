import React, { useEffect, useCallback } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { FlappyGame } from "@/games/flappy/FlappyGame";
import * as ScreenOrientation from "expo-screen-orientation";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { useQueryClient } from "@tanstack/react-query";

export function FlappyRoachScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  return (
    <View style={styles.container}>
      <FlappyGame onExit={handleExit} onScoreSubmit={handleScoreSubmit} userId={user?.id} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
