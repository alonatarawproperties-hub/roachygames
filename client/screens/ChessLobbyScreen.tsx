import React, { useState } from "react";
import { View, StyleSheet, Pressable, Text, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import { GameColors, Spacing } from "@/constants/theme";
import { getApiUrl, apiRequest, queryClient } from "@/lib/query-client";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type GameMode = 'casual' | 'ranked' | 'wager';
type TimeControl = 'bullet' | 'blitz' | 'rapid' | 'classical';

const TIME_CONTROL_INFO: Record<TimeControl, { label: string; time: string; seconds: number }> = {
  bullet: { label: 'Bullet', time: '1 min', seconds: 60 },
  blitz: { label: 'Blitz', time: '5 min', seconds: 300 },
  rapid: { label: 'Rapid', time: '10 min', seconds: 600 },
  classical: { label: 'Classical', time: '30 min', seconds: 1800 },
};

const GAME_MODE_INFO: Record<GameMode, { label: string; description: string; icon: keyof typeof Feather.glyphMap }> = {
  casual: { label: 'Casual', description: 'Play for fun, no rating changes', icon: 'coffee' },
  ranked: { label: 'Ranked', description: 'Compete for rating points', icon: 'trending-up' },
  wager: { label: 'Wager', description: 'Bet diamonds and win big', icon: 'zap' },
};

const MOCK_WALLET = 'demo_player_' + Math.random().toString(36).slice(2, 8);

export function ChessLobbyScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  
  const [selectedMode, setSelectedMode] = useState<GameMode>('casual');
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControl>('rapid');
  
  const { data: ratingData } = useQuery({
    queryKey: ['/api/chess/rating', MOCK_WALLET],
    queryFn: () => fetch(new URL(`/api/chess/rating/${MOCK_WALLET}`, getApiUrl()).toString()).then(r => r.json()),
  });
  
  const rating = ratingData?.rating?.rating || 1200;
  const gamesPlayed = ratingData?.rating?.gamesPlayed || 0;
  
  const createDemoMatchMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/chess/demo-match', {
        walletAddress: MOCK_WALLET,
        gameMode: selectedMode,
        timeControl: selectedTimeControl,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.success && data.match) {
        navigation.navigate('ChessGame', {
          matchId: data.match.id,
          walletAddress: MOCK_WALLET,
        });
      }
    },
  });
  
  const joinMatchmakingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/chess/matchmaking/join', {
        walletAddress: MOCK_WALLET,
        gameMode: selectedMode,
        timeControl: selectedTimeControl,
        wagerAmount: 0,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.matchFound && data.match) {
        navigation.navigate('ChessGame', {
          matchId: data.match.id,
          walletAddress: MOCK_WALLET,
        });
      } else {
        navigation.navigate('ChessMatchmaking', {
          walletAddress: MOCK_WALLET,
          gameMode: selectedMode,
          timeControl: selectedTimeControl,
        });
      }
    },
  });
  
  const handlePlayBot = () => {
    createDemoMatchMutation.mutate();
  };
  
  const handleFindMatch = () => {
    joinMatchmakingMutation.mutate();
  };
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
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
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Game Mode</Text>
          <View style={styles.modeButtons}>
            {(Object.keys(GAME_MODE_INFO) as GameMode[]).map((mode) => {
              const info = GAME_MODE_INFO[mode];
              const isSelected = selectedMode === mode;
              return (
                <Pressable
                  key={mode}
                  style={[styles.modeButton, isSelected && styles.modeButtonSelected]}
                  onPress={() => setSelectedMode(mode)}
                >
                  <Feather 
                    name={info.icon} 
                    size={20} 
                    color={isSelected ? GameColors.background : GameColors.textSecondary} 
                  />
                  <Text style={[styles.modeButtonText, isSelected && styles.modeButtonTextSelected]}>
                    {info.label}
                  </Text>
                  <Text style={[styles.modeDescription, isSelected && styles.modeDescriptionSelected]}>
                    {info.description}
                  </Text>
                </Pressable>
              );
            })}
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
            onPress={handleFindMatch}
            disabled={joinMatchmakingMutation.isPending}
          >
            <Feather name="users" size={24} color={GameColors.background} />
            <Text style={styles.playButtonText}>
              {joinMatchmakingMutation.isPending ? 'Finding...' : 'Find Match'}
            </Text>
          </Pressable>
          
          <Pressable 
            style={[styles.playButton, styles.playButtonSecondary]}
            onPress={handlePlayBot}
            disabled={createDemoMatchMutation.isPending}
          >
            <Feather name="cpu" size={24} color={GameColors.primary} />
            <Text style={styles.playButtonTextSecondary}>
              {createDemoMatchMutation.isPending ? 'Starting...' : 'Play vs Bot'}
            </Text>
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
  modeButtons: {
    gap: Spacing.sm,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GameColors.surface,
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: Spacing.md,
  },
  modeButtonSelected: {
    backgroundColor: GameColors.primary,
    borderColor: GameColors.primary,
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: GameColors.textPrimary,
    flex: 0,
    width: 80,
  },
  modeButtonTextSelected: {
    color: GameColors.background,
  },
  modeDescription: {
    fontSize: 12,
    color: GameColors.textSecondary,
    flex: 1,
  },
  modeDescriptionSelected: {
    color: GameColors.background,
    opacity: 0.8,
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
});

export default ChessLobbyScreen;
