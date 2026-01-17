import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, Text, Animated } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { GameColors, Spacing } from "@/constants/theme";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import { useAuth } from "@/context/AuthContext";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type RouteParams = {
  BattleMatchmaking: {
    team: string[]; // Array of 3 roachyIds
  };
};

const BOT_WARNING_THRESHOLD = 30; // Show bot warning after 30 seconds
const BOT_MATCH_TIMEOUT = 40; // Server creates bot match after 40 seconds

interface QueueCheckResponse {
  inQueue: boolean;
  matchFound: boolean;
  matchId?: string;
  secondsUntilBot?: number;
  notInQueue?: boolean;
}

export function BattleMatchmakingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<RouteParams, "BattleMatchmaking">>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { team } = route.params;
  const playerId = user?.id || user?.googleId || "";

  const [waitTime, setWaitTime] = useState(0);
  const [searching, setSearching] = useState(true);
  const [showBotWarning, setShowBotWarning] = useState(false);
  const [secondsUntilBot, setSecondsUntilBot] = useState<number | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const warningFadeAnim = useRef(new Animated.Value(0)).current;

  // Join queue on mount
  useEffect(() => {
    const joinQueue = async () => {
      try {
        await apiRequest("POST", "/api/battles/queue/join", {
          playerId,
          team,
        });
      } catch (error) {
        console.error("[BattleMatchmaking] Error joining queue:", error);
        setSearching(false);
        navigation.goBack();
      }
    };

    if (playerId && team && team.length === 3) {
      joinQueue();
    }

    return () => {
      // Cleanup: leave queue on unmount if still searching
      if (searching && playerId) {
        leaveQueue(playerId).catch(console.error);
      }
    };
  }, [playerId, team, navigation]);

  // Setup animations
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  }, [pulseAnim, rotateAnim]);

  // Queue time counter
  useEffect(() => {
    if (!searching) return;

    const timer = setInterval(() => {
      setWaitTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [searching]);

  // Bot warning after 20 seconds
  useEffect(() => {
    if (!searching) return;

    if (waitTime >= BOT_WARNING_THRESHOLD && !showBotWarning) {
      setShowBotWarning(true);
      // Animate warning fade in
      Animated.timing(warningFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }

    if (showBotWarning) {
      const botCountdown = BOT_MATCH_TIMEOUT - waitTime;
      if (botCountdown > 0) {
        setSecondsUntilBot(botCountdown);
      } else {
        setSecondsUntilBot(0);
      }
    }
  }, [waitTime, searching, showBotWarning, warningFadeAnim]);

  // Poll queue status every 2 seconds
  useEffect(() => {
    if (!searching || !playerId) return;

    const checkMatch = async () => {
      try {
        const url = new URL(
          `/api/battles/queue/check/${playerId}`,
          getApiUrl()
        );
        const response = await fetch(url.toString());
        const data = (await response.json()) as QueueCheckResponse;

        if (data.matchFound && data.matchId) {
          setSearching(false);

          // Submit team to match
          try {
            await apiRequest("POST", "/api/battles/match/submit-team", {
              matchId: data.matchId,
              team,
              playerId,
            });
          } catch (submitError) {
            console.error(
              "[BattleMatchmaking] Error submitting team:",
              submitError
            );
          }

          // Navigate to battle
          navigation.replace("BattleMatch", {
            matchId: data.matchId,
            team,
          });
        } else if (data.notInQueue) {
          setSearching(false);
          navigation.goBack();
        }
      } catch (error) {
        console.error("[BattleMatchmaking] Error checking queue:", error);
      }
    };

    const interval = setInterval(checkMatch, 2000);
    return () => clearInterval(interval);
  }, [searching, playerId, team, navigation]);

  const leaveQueue = async (address: string) => {
    try {
      await apiRequest("POST", "/api/battles/queue/leave", {
        playerId: address,
      });
    } catch (error) {
      console.error("[BattleMatchmaking] Error leaving queue:", error);
    }
  };

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await leaveQueue(playerId);
    },
    onSuccess: () => {
      setSearching(false);
      navigation.goBack();
    },
  });

  const handleCancel = () => {
    setSearching(false);
    cancelMutation.mutate();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Finding Opponent</Text>
      </View>

      <View style={styles.content}>
        {/* Animated spinner */}
        <Animated.View
          style={[styles.searchingIcon, { transform: [{ scale: pulseAnim }] }]}
        >
          <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
            <Feather name="loader" size={64} color={GameColors.primary} />
          </Animated.View>
        </Animated.View>

        {/* Status text */}
        <Text style={styles.searchingText}>Finding Opponent...</Text>

        {/* Queue time counter */}
        <Text style={styles.waitTimeText}>{formatTime(waitTime)}</Text>

        {/* Team info */}
        <View style={styles.teamInfo}>
          <View style={styles.infoRow}>
            <Feather name="users" size={18} color={GameColors.textSecondary} />
            <Text style={styles.infoText}>Team of 3 Roachies Ready</Text>
          </View>
          <View style={styles.infoRow}>
            <Feather
              name="target"
              size={18}
              color={GameColors.textSecondary}
            />
            <Text style={styles.infoText}>PvP Battle Mode</Text>
          </View>
        </View>

        {/* Bot warning (appears after 20 seconds) */}
        {showBotWarning && (
          <Animated.View
            style={[
              styles.botWarning,
              { opacity: warningFadeAnim },
            ]}
          >
            <View style={styles.botWarningContent}>
              <Feather
                name="alert-circle"
                size={20}
                color={GameColors.warning}
              />
              <View style={styles.botWarningText}>
                <Text style={styles.botWarningTitle}>
                  Bot Match Starting Soon
                </Text>
                {secondsUntilBot !== null && (
                  <Text style={styles.botWarningSubtitle}>
                    in {secondsUntilBot} {secondsUntilBot === 1 ? "second" : "seconds"}
                  </Text>
                )}
              </View>
            </View>
          </Animated.View>
        )}

        {/* Hint text */}
        <Text style={styles.hintText}>
          If no opponent is found within 30 seconds, you'll play against a bot.
        </Text>
      </View>

      {/* Cancel button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Pressable
          style={styles.cancelButton}
          onPress={handleCancel}
          disabled={cancelMutation.isPending}
        >
          <Feather name="x" size={24} color={GameColors.error} />
          <Text style={styles.cancelButtonText}>
            {cancelMutation.isPending ? "Cancelling..." : "Cancel Search"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
  },
  header: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: GameColors.surface,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  searchingIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: GameColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  searchingText: {
    fontSize: 18,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  waitTimeText: {
    fontSize: 48,
    fontWeight: "700",
    color: GameColors.primary,
    fontVariant: ["tabular-nums"],
  },
  teamInfo: {
    backgroundColor: GameColors.surface,
    padding: Spacing.lg,
    borderRadius: 12,
    gap: Spacing.sm,
    width: "100%",
    maxWidth: 300,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  infoText: {
    fontSize: 16,
    color: GameColors.textPrimary,
  },
  botWarning: {
    backgroundColor: GameColors.surfaceElevated,
    borderWidth: 2,
    borderColor: GameColors.warning,
    padding: Spacing.lg,
    borderRadius: 12,
    width: "100%",
    maxWidth: 300,
  },
  botWarningContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  botWarningText: {
    flex: 1,
    gap: Spacing.xs,
  },
  botWarningTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.warning,
  },
  botWarningSubtitle: {
    fontSize: 14,
    color: GameColors.textSecondary,
  },
  hintText: {
    fontSize: 14,
    color: GameColors.textSecondary,
    textAlign: "center",
    maxWidth: 280,
  },
  footer: {
    padding: Spacing.lg,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: 16,
    backgroundColor: GameColors.surface,
    borderWidth: 2,
    borderColor: GameColors.error,
    gap: Spacing.md,
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: GameColors.error,
  },
});

export default BattleMatchmakingScreen;
