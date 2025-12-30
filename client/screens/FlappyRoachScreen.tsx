import React, { useEffect, useCallback, useState, useRef } from "react";
import { View, StyleSheet, Platform, ActivityIndicator, Pressable, Modal, Text, Alert } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { FlappyGame, ScoreSubmitData } from "@/games/flappy/FlappyGame";
import * as ScreenOrientation from "expo-screen-orientation";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { useQueryClient } from "@tanstack/react-query";
import { useFlappySkin } from "@/context/FlappySkinContext";
import { useFlappyTrail } from "@/context/FlappyTrailContext";
import { usePerformanceSettings, PerformanceMode } from "@/hooks/usePerformanceSettings";
import { GameColors, Colors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useForceUpdate } from "@/hooks/useForceUpdate";
import { ForceUpdateScreen } from "@/components/ForceUpdateScreen";
import { useGamePresence } from "@/context/PresenceContext";

type FlappyRoachParams = {
  FlappyRoach: {
    competitionId?: string;
    competitionName?: string;
  };
};

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

export function FlappyRoachScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<FlappyRoachParams, 'FlappyRoach'>>();
  const { competitionId, competitionName } = route.params ?? {};
  const { user, isGuest } = useAuth();
  const queryClient = useQueryClient();
  const { equippedSkin, isLoading: skinLoading } = useFlappySkin();
  const { equippedTrail, isLoading: trailLoading } = useFlappyTrail();
  const { mode, setMode, settings, isLoading: perfLoading } = usePerformanceSettings();
  const [showSettings, setShowSettings] = useState(false);
  const insets = useSafeAreaInsets();
  const forceUpdate = useForceUpdate();
  
  useGamePresence("flappy-roach");

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
    (navigation as any).navigate('ArcadeHome');
  };

  const handleScoreSubmit = useCallback(async (data: ScoreSubmitData) => {
    const { score, isRanked, rankedPeriod, runId, isCompetition, competitionId: submittedCompetitionId } = data;
    
    console.log(`[ScoreSubmit] ====== SCORE SUBMISSION START ======`);
    console.log(`[ScoreSubmit] user.id=${user?.id}, score=${score}, isRanked=${isRanked}, period=${rankedPeriod}`);
    console.log(`[ScoreSubmit] isCompetition=${isCompetition}, competitionId=${submittedCompetitionId}, runId=${runId}`);
    console.log(`[ScoreSubmit] Timestamp: ${new Date().toISOString()}`);
    
    if (!user?.id || isGuest) {
      console.log("[ScoreSubmit] Guest user - score not saved (guests cannot save scores)");
      return;
    }
    
    // Retry logic with exponential backoff
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        console.log(`[ScoreSubmit] Attempt ${attempt + 1}/${MAX_RETRIES}`);
        
        if (isCompetition && submittedCompetitionId) {
          const response = await apiRequest("POST", "/api/competitions/submit-score", {
            competitionId: submittedCompetitionId,
            walletAddress: user.walletAddress || user.id,
            displayName: user.displayName || "Anonymous",
            score,
            runId,
          });
          
          const result = await response.json();
          console.log(`[ScoreSubmit] Competition response:`, JSON.stringify(result));
          
          if (result.success) {
            queryClient.invalidateQueries({
              queryKey: ["/api/competitions", submittedCompetitionId, "leaderboard"],
            });
            console.log(`[ScoreSubmit] SUCCESS - Competition score ${score} submitted`);
            return;
          } else {
            lastError = new Error(result.error || "Competition submission failed");
            console.error(`[ScoreSubmit] Competition error: ${result.error}`);
          }
        } else {
          const response = await apiRequest("POST", "/api/flappy/score", {
            userId: user.id,
            score,
            coinsCollected: 0,
            isRanked,
            rankedPeriod: isRanked ? rankedPeriod : null,
            chyEntryFee: isRanked ? (rankedPeriod === 'weekly' ? 3 : 1) : 0,
          });
          
          const result = await response.json();
          console.log(`[ScoreSubmit] Response:`, JSON.stringify(result));
          
          if (result.success) {
            queryClient.invalidateQueries({ predicate: (query) => {
              const key = query.queryKey[0];
              return typeof key === 'string' && (
                key.includes('/api/flappy/ranked/status') ||
                key.includes('/api/flappy/ranked/leaderboard')
              );
            }});
            queryClient.invalidateQueries({ queryKey: ["/api/flappy/inventory", user.id] });
            
            console.log(`[ScoreSubmit] SUCCESS - Score ${score} saved (ranked: ${isRanked})`);
            return;
          } else {
            lastError = new Error(result.error || "Unknown server error");
            console.error(`[ScoreSubmit] Server error: ${result.error}`);
          }
        }
      } catch (error: any) {
        lastError = error;
        const errorMsg = error?.message || String(error);
        console.error(`[ScoreSubmit] Attempt ${attempt + 1} failed: ${errorMsg}`);
        
        if (errorMsg.includes("401") || errorMsg.includes("403")) {
          console.error("[ScoreSubmit] AUTH ERROR - Session expired. User must re-login.");
          Alert.alert(
            "Session Expired",
            "Your login session has expired. Please log out and log back in to save your scores.",
            [{ text: "OK" }]
          );
          return;
        }
        
        if (errorMsg.includes("409")) {
          console.log("[ScoreSubmit] Duplicate submission detected (409) - score already saved");
          return;
        }
      }
      
      if (attempt < MAX_RETRIES - 1) {
        const delay = RETRY_DELAYS[attempt] || 4000;
        console.log(`[ScoreSubmit] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    console.error(`[ScoreSubmit] FAILED after ${MAX_RETRIES} attempts`);
    
    if (isRanked || isCompetition) {
      Alert.alert(
        "Score Save Failed",
        isCompetition 
          ? "We couldn't submit your competition score. Please check your internet connection."
          : "We couldn't save your ranked score. Please check your internet connection and try again.",
        [{ text: "OK" }]
      );
    }
  }, [user?.id, user?.walletAddress, user?.displayName, isGuest, queryClient]);

  const handleModeSelect = (newMode: PerformanceMode) => {
    setMode(newMode);
    setShowSettings(false);
  };

  if (forceUpdate.isLoading || skinLoading || trailLoading || perfLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={GameColors.gold} />
      </View>
    );
  }

  if (forceUpdate.isUpdateRequired) {
    return (
      <ForceUpdateScreen
        message={forceUpdate.message}
        onUpdate={forceUpdate.openStore}
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlappyGame 
        onExit={handleExit} 
        onScoreSubmit={handleScoreSubmit} 
        userId={user?.id}
        skin={equippedSkin}
        trail={equippedTrail}
        performanceSettings={settings}
        competitionId={competitionId}
        competitionName={competitionName}
      />
      
      <Pressable 
        style={[styles.settingsButton, { top: insets.top + 62 }]}
        onPress={() => setShowSettings(true)}
      >
        <Feather name="settings" size={20} color="#fff" />
      </Pressable>

      <Modal
        visible={showSettings}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettings(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowSettings(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Graphics Quality</Text>
            <Text style={styles.modalSubtitle}>Choose based on your device</Text>
            
            <Pressable 
              style={[styles.optionButton, mode === 'low' && styles.optionButtonActive]}
              onPress={() => handleModeSelect('low')}
            >
              <View style={styles.optionHeader}>
                <Text style={[styles.optionText, mode === 'low' && styles.optionTextActive]}>Low</Text>
                {mode === 'low' && <Feather name="check" size={18} color={GameColors.gold} />}
              </View>
              <Text style={styles.optionDesc}>Best for older/budget phones</Text>
            </Pressable>
            
            <Pressable 
              style={[styles.optionButton, mode === 'medium' && styles.optionButtonActive]}
              onPress={() => handleModeSelect('medium')}
            >
              <View style={styles.optionHeader}>
                <Text style={[styles.optionText, mode === 'medium' && styles.optionTextActive]}>Medium</Text>
                {mode === 'medium' && <Feather name="check" size={18} color={GameColors.gold} />}
              </View>
              <Text style={styles.optionDesc}>Balanced performance</Text>
            </Pressable>
            
            <Pressable 
              style={[styles.optionButton, mode === 'high' && styles.optionButtonActive]}
              onPress={() => handleModeSelect('high')}
            >
              <View style={styles.optionHeader}>
                <Text style={[styles.optionText, mode === 'high' && styles.optionTextActive]}>High</Text>
                {mode === 'high' && <Feather name="check" size={18} color={GameColors.gold} />}
              </View>
              <Text style={styles.optionDesc}>Full effects for flagship phones</Text>
            </Pressable>
            
            <Pressable 
              style={styles.closeButton}
              onPress={() => setShowSettings(false)}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
  settingsButton: {
    position: "absolute",
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: GameColors.gold + "40",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: GameColors.gold,
    textAlign: "center",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 20,
  },
  optionButton: {
    backgroundColor: "#252525",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  optionButtonActive: {
    borderColor: GameColors.gold,
    backgroundColor: GameColors.gold + "15",
  },
  optionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  optionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  optionTextActive: {
    color: GameColors.gold,
  },
  optionDesc: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
  closeButton: {
    backgroundColor: GameColors.gold,
    borderRadius: 8,
    padding: 14,
    marginTop: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
  },
});
