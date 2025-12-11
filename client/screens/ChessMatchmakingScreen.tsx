import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, Text, Animated } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { GameColors, Spacing } from "@/constants/theme";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type RouteParams = {
  ChessMatchmaking: {
    walletAddress: string;
    gameMode: string;
    timeControl: string;
  };
};

const TIME_CONTROL_LABELS: Record<string, string> = {
  bullet: 'Bullet (1 min)',
  blitz: 'Blitz (5 min)',
  rapid: 'Rapid (10 min)',
  classical: 'Classical (30 min)',
};

export function ChessMatchmakingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<RouteParams, 'ChessMatchmaking'>>();
  const insets = useSafeAreaInsets();
  
  const { walletAddress, gameMode, timeControl } = route.params;
  
  const [waitTime, setWaitTime] = useState(0);
  const [searching, setSearching] = useState(true);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
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
  }, []);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setWaitTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  useEffect(() => {
    if (!searching) return;
    
    const checkMatch = async () => {
      try {
        const url = new URL(`/api/chess/matchmaking/check/${walletAddress}`, getApiUrl());
        const response = await fetch(url.toString());
        const data = await response.json();
        
        if (data.matchFound && data.match) {
          setSearching(false);
          navigation.replace('ChessGame', {
            matchId: data.match.id,
            walletAddress,
          });
        } else if (data.notInQueue) {
          navigation.goBack();
        }
      } catch (error) {
        console.error('Error checking matchmaking:', error);
      }
    };
    
    const interval = setInterval(checkMatch, 2000);
    return () => clearInterval(interval);
  }, [searching, walletAddress, navigation]);
  
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/chess/matchmaking/leave', { walletAddress });
      return res.json();
    },
    onSuccess: () => {
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
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Finding Match</Text>
      </View>
      
      <View style={styles.content}>
        <Animated.View style={[styles.searchingIcon, { transform: [{ scale: pulseAnim }] }]}>
          <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
            <Feather name="loader" size={64} color={GameColors.primary} />
          </Animated.View>
        </Animated.View>
        
        <Text style={styles.searchingText}>Searching for opponent...</Text>
        
        <Text style={styles.waitTimeText}>{formatTime(waitTime)}</Text>
        
        <View style={styles.gameInfo}>
          <View style={styles.infoRow}>
            <Feather name="play-circle" size={18} color={GameColors.textSecondary} />
            <Text style={styles.infoText}>
              {gameMode.charAt(0).toUpperCase() + gameMode.slice(1)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="clock" size={18} color={GameColors.textSecondary} />
            <Text style={styles.infoText}>
              {TIME_CONTROL_LABELS[timeControl] || timeControl}
            </Text>
          </View>
        </View>
        
        <Text style={styles.hintText}>
          If no opponent is found within 30 seconds, you'll play against a bot.
        </Text>
      </View>
      
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Pressable 
          style={styles.cancelButton}
          onPress={handleCancel}
          disabled={cancelMutation.isPending}
        >
          <Feather name="x" size={24} color={GameColors.error} />
          <Text style={styles.cancelButtonText}>
            {cancelMutation.isPending ? 'Cancelling...' : 'Cancel'}
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  searchingIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: GameColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchingText: {
    fontSize: 18,
    fontWeight: '600',
    color: GameColors.textPrimary,
  },
  waitTimeText: {
    fontSize: 48,
    fontWeight: '700',
    color: GameColors.primary,
    fontVariant: ['tabular-nums'],
  },
  gameInfo: {
    backgroundColor: GameColors.surface,
    padding: Spacing.lg,
    borderRadius: 12,
    gap: Spacing.sm,
    width: '100%',
    maxWidth: 300,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  infoText: {
    fontSize: 16,
    color: GameColors.textPrimary,
  },
  hintText: {
    fontSize: 14,
    color: GameColors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  footer: {
    padding: Spacing.lg,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: 16,
    backgroundColor: GameColors.surface,
    borderWidth: 2,
    borderColor: GameColors.error,
    gap: Spacing.md,
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: GameColors.error,
  },
});

export default ChessMatchmakingScreen;
