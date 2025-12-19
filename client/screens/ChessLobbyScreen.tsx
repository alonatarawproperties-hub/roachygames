import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, Pressable, Text, ScrollView, Alert, Platform, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useQuery, useMutation } from "@tanstack/react-query";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from "react-native-reanimated";
import { GameColors, Spacing } from "@/constants/theme";
import { getApiUrl, apiRequest, queryClient } from "@/lib/query-client";
import { useAuth } from "@/context/AuthContext";
import { useWebappBalances } from "@/hooks/useWebappBalances";

const ChyCoinIcon = require("@/assets/chy-coin-icon.png");
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type TimeControl = 'bullet' | 'blitz' | 'rapid' | 'classical';

const TIME_CONTROL_INFO: Record<TimeControl, { label: string; time: string; seconds: number }> = {
  bullet: { label: 'Bullet', time: '1 min', seconds: 60 },
  blitz: { label: 'Blitz', time: '5 min', seconds: 300 },
  rapid: { label: 'Rapid', time: '10 min', seconds: 600 },
  classical: { label: 'Classical', time: '30 min', seconds: 1800 },
};

export function ChessLobbyScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const guestWalletRef = useRef<string | null>(null);
  if (!guestWalletRef.current) {
    guestWalletRef.current = 'guest_' + Date.now();
  }
  const walletAddress = user?.walletAddress || user?.id || guestWalletRef.current;
  
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControl>('rapid');
  
  const { chy, isLoading: balanceLoading, isFetching: balanceFetching, refetch: refetchBalances } = useWebappBalances();
  
  const spinValue = useSharedValue(0);
  
  useEffect(() => {
    if (balanceFetching) {
      spinValue.value = withRepeat(
        withTiming(1, { duration: 800, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      spinValue.value = 0;
    }
  }, [balanceFetching]);
  
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinValue.value * 360}deg` }],
  }));
  
  const { data: ratingData } = useQuery({
    queryKey: ['/api/chess/rating', walletAddress],
    queryFn: () => fetch(new URL(`/api/chess/rating/${walletAddress}`, getApiUrl()).toString()).then(r => r.json()),
  });
  
  const rating = ratingData?.rating?.rating || 1200;
  const gamesPlayed = ratingData?.rating?.gamesPlayed || 0;
  
  const createDemoMatchMutation = useMutation({
    mutationFn: async () => {
      console.log('[ChessLobby] Creating demo match...', { walletAddress, gameMode: 'casual', timeControl: selectedTimeControl });
      const res = await apiRequest('POST', '/api/chess/demo-match', {
        walletAddress,
        gameMode: 'casual',
        timeControl: selectedTimeControl,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      console.log('[ChessLobby] Demo match response:', data);
      if (data.success && data.match) {
        navigation.navigate('ChessGame', {
          matchId: data.match.id,
          walletAddress,
        });
      } else {
        const msg = data.message || 'Failed to create match';
        if (Platform.OS === 'web') {
          alert(msg);
        } else {
          Alert.alert('Error', msg);
        }
      }
    },
    onError: (error: any) => {
      console.error('[ChessLobby] Demo match error:', error);
      const msg = error?.message || 'Failed to create match';
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    },
  });
  
  const handlePlayBot = () => {
    createDemoMatchMutation.mutate();
  };
  
  const handleLockedMode = (modeName: string) => {
    const msg = `${modeName} mode coming soon! Currently only Play vs Bot is available in this demo.`;
    if (Platform.OS === 'web') {
      alert(msg);
    } else {
      Alert.alert('Coming Soon', msg);
    }
  };
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.navigate('ArcadeHome')} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={GameColors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Roachy Mate</Text>
        <View style={styles.ratingBadge}>
          <Feather name="award" size={14} color={GameColors.primary} />
          <Text style={styles.ratingText}>{rating}</Text>
        </View>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Your Balance</Text>
            <Pressable style={styles.refreshButton} onPress={() => refetchBalances()} disabled={balanceFetching}>
              <Animated.View style={spinStyle}>
                <Feather name="refresh-cw" size={16} color={GameColors.background} />
              </Animated.View>
            </Pressable>
          </View>
          <View style={styles.balanceRow}>
            <Image source={ChyCoinIcon} style={styles.chyCoinIcon} contentFit="contain" />
            {balanceLoading || balanceFetching ? (
              <ActivityIndicator size="small" color={GameColors.gold} />
            ) : (
              <Text style={styles.balanceValue}>{chy} CHY</Text>
            )}
          </View>
        </View>
        
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Your Stats</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{rating}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{gamesPlayed}</Text>
              <Text style={styles.statLabel}>Games</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{ratingData?.rating?.winStreak || 0}</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.demoBanner}>
          <Feather name="cpu" size={20} color={GameColors.primary} />
          <View style={styles.demoBannerText}>
            <Text style={styles.demoBannerTitle}>Demo Mode - Play vs Bot</Text>
            <Text style={styles.demoBannerSubtitle}>Challenge our Magnus-level AI opponent</Text>
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time Control</Text>
          <View style={styles.timeButtons}>
            {(Object.keys(TIME_CONTROL_INFO) as TimeControl[]).map((tc) => {
              const info = TIME_CONTROL_INFO[tc];
              const isSelected = selectedTimeControl === tc;
              return (
                <Pressable
                  key={tc}
                  style={[styles.timeButton, isSelected && styles.timeButtonSelected]}
                  onPress={() => setSelectedTimeControl(tc)}
                >
                  <Text style={[styles.timeButtonLabel, isSelected && styles.timeButtonLabelSelected]}>
                    {info.label}
                  </Text>
                  <Text style={[styles.timeButtonTime, isSelected && styles.timeButtonTimeSelected]}>
                    {info.time}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        
        <View style={styles.playButtons}>
          <Pressable 
            style={[styles.playButton, styles.playButtonPrimary]}
            onPress={handlePlayBot}
            disabled={createDemoMatchMutation.isPending}
          >
            <Feather name="cpu" size={24} color={GameColors.background} />
            <Text style={styles.playButtonText}>
              {createDemoMatchMutation.isPending ? 'Starting...' : 'Play vs Bot'}
            </Text>
          </Pressable>
          
          <Pressable 
            style={[styles.playButton, styles.playButtonLocked]}
            onPress={() => handleLockedMode('Find Match')}
          >
            <Feather name="lock" size={20} color={GameColors.textSecondary} />
            <Feather name="users" size={24} color={GameColors.textSecondary} />
            <Text style={styles.playButtonTextLocked}>Find Match</Text>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Coming Soon</Text>
            </View>
          </Pressable>
          
          <Pressable 
            style={[styles.playButton, styles.playButtonSecondary]}
            onPress={() => navigation.navigate('TournamentList')}
          >
            <Feather name="award" size={24} color={GameColors.gold} />
            <Text style={styles.playButtonTextSecondary}>Tournaments</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
  },
  balanceCard: {
    backgroundColor: GameColors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: GameColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: GameColors.gold,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: GameColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chyCoinIcon: {
    width: 28,
    height: 28,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: GameColors.surface,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GameColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: GameColors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  ratingText: {
    color: GameColors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.xl,
    paddingBottom: 40,
  },
  statsCard: {
    backgroundColor: GameColors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: GameColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: GameColors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: GameColors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: GameColors.surfaceElevated,
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: GameColors.textPrimary,
  },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(240, 200, 80, 0.15)',
    borderWidth: 1,
    borderColor: GameColors.primary,
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  demoBannerText: {
    flex: 1,
  },
  demoBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: GameColors.primary,
  },
  demoBannerSubtitle: {
    fontSize: 12,
    color: GameColors.textSecondary,
    marginTop: 2,
  },
  timeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  timeButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: GameColors.surface,
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 4,
  },
  timeButtonSelected: {
    backgroundColor: GameColors.primary,
    borderColor: GameColors.primary,
  },
  timeButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: GameColors.textPrimary,
  },
  timeButtonLabelSelected: {
    color: GameColors.background,
  },
  timeButtonTime: {
    fontSize: 12,
    color: GameColors.textSecondary,
  },
  timeButtonTimeSelected: {
    color: GameColors.background,
    opacity: 0.8,
  },
  playButtons: {
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: 16,
    gap: Spacing.md,
  },
  playButtonPrimary: {
    backgroundColor: GameColors.primary,
  },
  playButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: GameColors.primary,
  },
  playButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: GameColors.background,
  },
  playButtonTextSecondary: {
    fontSize: 18,
    fontWeight: '700',
    color: GameColors.primary,
  },
  playButtonTournament: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  playButtonTextTournament: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f59e0b',
  },
  playButtonLocked: {
    backgroundColor: GameColors.surface,
    borderWidth: 1,
    borderColor: GameColors.surfaceElevated,
    opacity: 0.7,
  },
  playButtonTextLocked: {
    fontSize: 16,
    fontWeight: '600',
    color: GameColors.textSecondary,
    flex: 1,
  },
  comingSoonBadge: {
    backgroundColor: GameColors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: '600',
    color: GameColors.textSecondary,
    textTransform: 'uppercase',
  },
});

export default ChessLobbyScreen;
