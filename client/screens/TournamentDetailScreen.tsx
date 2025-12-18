import React, { useMemo, useRef } from "react";
import { View, StyleSheet, Pressable, Text, ScrollView, RefreshControl, Alert, Platform, ActivityIndicator } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { GameColors, Spacing } from "@/constants/theme";
import { getApiUrl, apiRequest, queryClient } from "@/lib/query-client";
import { useAuth } from "@/context/AuthContext";
import { useWebappBalances } from "@/hooks/useWebappBalances";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type RouteParams = {
  TournamentDetail: {
    tournamentId: string;
  };
};

interface TournamentMatch {
  id: string;
  roundNumber: number;
  matchNumber: number;
  player1Wallet: string | null;
  player2Wallet: string | null;
  winnerWallet: string | null;
  status: string;
}

interface Participant {
  id: string;
  walletAddress: string;
  seed: number | null;
  wins: number;
  losses: number;
  isEliminated: boolean;
  finalPlacement: number | null;
  prizesWon: number;
}

interface Tournament {
  id: string;
  name: string;
  tournamentType: string;
  timeControl: string;
  entryFee: number;
  prizePool: number;
  rakeAmount: number;
  maxPlayers: number;
  minPlayers: number;
  currentPlayers: number;
  currentRound: number;
  totalRounds: number;
  status: string;
  scheduledStartAt: string | null;
  winnerWallet: string | null;
}

function formatWalletAddress(address: string | null): string {
  if (!address) return 'TBD';
  if (address === 'bot') return 'Roachy Bot';
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function TournamentDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<RouteParams, 'TournamentDetail'>>();
  const insets = useSafeAreaInsets();
  const { tournamentId } = route.params;
  const { user } = useAuth();
  const { diamonds, isLoading: balanceLoading, refetch: refetchBalances } = useWebappBalances();
  
  const guestWalletRef = useRef<string | null>(null);
  if (!guestWalletRef.current) {
    guestWalletRef.current = 'guest_' + Date.now();
  }
  const walletAddress = user?.walletAddress || user?.id || guestWalletRef.current;
  
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['/api/tournaments', tournamentId],
    queryFn: () => fetch(new URL(`/api/tournaments/${tournamentId}`, getApiUrl()).toString()).then(r => r.json()),
    refetchInterval: 10000,
  });
  
  const tournament: Tournament | null = data?.tournament || null;
  const participants: Participant[] = data?.participants || [];
  const matches: TournamentMatch[] = data?.matches || [];
  
  const isRegistered = useMemo(() => 
    participants.some(p => p.walletAddress === walletAddress),
    [participants, walletAddress]
  );
  
  const canJoin = tournament?.status === 'registering' || tournament?.status === 'scheduled';
  const isFull = tournament ? tournament.currentPlayers >= tournament.maxPlayers : false;
  
  const joinMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/tournaments/${tournamentId}/join`, {
        walletAddress,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments', tournamentId] });
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to join tournament';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
    },
  });
  
  const leaveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/tournaments/${tournamentId}/leave`, {
        walletAddress,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments', tournamentId] });
    },
  });
  
  const matchesByRound = useMemo(() => {
    const grouped: Record<number, TournamentMatch[]> = {};
    matches.forEach(m => {
      if (!grouped[m.roundNumber]) grouped[m.roundNumber] = [];
      grouped[m.roundNumber].push(m);
    });
    return grouped;
  }, [matches]);
  
  const handleJoin = () => {
    joinMutation.mutate();
  };
  
  const handleLeave = () => {
    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to leave the tournament?')) {
        leaveMutation.mutate();
      }
    } else {
      Alert.alert(
        'Leave Tournament',
        'Are you sure you want to leave?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: () => leaveMutation.mutate() },
        ]
      );
    }
  };
  
  const getRoundName = (round: number, total: number): string => {
    if (round === total) return 'Final';
    if (round === total - 1) return 'Semi-Final';
    if (round === total - 2) return 'Quarter-Final';
    return `Round ${round}`;
  };
  
  const renderMatchCard = (match: TournamentMatch) => {
    const isCompleted = match.status === 'completed';
    const isActive = match.status === 'active';
    const player1Won = match.winnerWallet === match.player1Wallet;
    const player2Won = match.winnerWallet === match.player2Wallet;
    
    return (
      <View key={match.id} style={styles.matchCard}>
        <View style={styles.matchHeader}>
          <Text style={styles.matchNumber}>Match {match.matchNumber}</Text>
          {isActive ? (
            <View style={styles.liveBadge}>
              <View style={styles.liveIndicator} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          ) : null}
        </View>
        
        <View style={styles.matchPlayers}>
          <View style={[
            styles.playerRow,
            player1Won && styles.playerWon,
          ]}>
            <Text style={[
              styles.playerName,
              player1Won && styles.playerNameWon,
            ]}>
              {formatWalletAddress(match.player1Wallet)}
            </Text>
            {player1Won ? (
              <Feather name="check-circle" size={16} color="#22c55e" />
            ) : null}
          </View>
          
          <View style={styles.vsContainer}>
            <Text style={styles.vsText}>vs</Text>
          </View>
          
          <View style={[
            styles.playerRow,
            player2Won && styles.playerWon,
          ]}>
            <Text style={[
              styles.playerName,
              player2Won && styles.playerNameWon,
            ]}>
              {formatWalletAddress(match.player2Wallet)}
            </Text>
            {player2Won ? (
              <Feather name="check-circle" size={16} color="#22c55e" />
            ) : null}
          </View>
        </View>
      </View>
    );
  };
  
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Feather name="loader" size={32} color={GameColors.textSecondary} />
        <Text style={styles.loadingText}>Loading tournament...</Text>
      </View>
    );
  }
  
  if (!tournament) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Feather name="alert-circle" size={48} color={GameColors.error} />
        <Text style={styles.errorTitle}>Tournament Not Found</Text>
        <Pressable style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={GameColors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{tournament.name}</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={GameColors.primary}
          />
        }
      >
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Prize Pool</Text>
              <View style={styles.prizeValue}>
                <Feather name="hexagon" size={18} color={GameColors.primary} />
                <Text style={styles.infoValueLarge}>{tournament.prizePool}</Text>
              </View>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Entry Fee</Text>
              <Text style={styles.infoValue}>
                {tournament.entryFee === 0 ? 'Free' : `${tournament.entryFee} diamonds`}
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Players</Text>
              <Text style={styles.infoValue}>
                {tournament.currentPlayers}/{tournament.maxPlayers}
              </Text>
            </View>
          </View>
          
          <View style={styles.infoDivider} />
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Time Control</Text>
              <Text style={styles.infoValue}>{tournament.timeControl}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Format</Text>
              <Text style={styles.infoValue}>Single Elimination</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={[styles.infoValue, styles.statusText]}>
                {tournament.status === 'active' ? 'In Progress' : 
                 tournament.status === 'registering' ? 'Open' :
                 tournament.status === 'completed' ? 'Completed' :
                 tournament.status}
              </Text>
            </View>
          </View>
        </View>
        
        {canJoin ? (
          <View style={styles.actionCard}>
            {tournament.entryFee > 0 && !isRegistered ? (
              <View style={styles.balanceRow}>
                <View style={styles.balanceInfo}>
                  <Feather name="database" size={16} color={GameColors.primary} />
                  <Text style={styles.balanceLabel}>Your Balance:</Text>
                  {balanceLoading ? (
                    <ActivityIndicator size="small" color={GameColors.primary} />
                  ) : (
                    <Text style={[
                      styles.balanceValue,
                      diamonds < tournament.entryFee && styles.balanceInsufficient
                    ]}>
                      {diamonds} diamonds
                    </Text>
                  )}
                </View>
                <Pressable style={styles.refreshButton} onPress={() => refetchBalances()}>
                  <Feather name="refresh-cw" size={16} color={GameColors.textSecondary} />
                </Pressable>
              </View>
            ) : null}
            {isRegistered ? (
              <>
                <View style={styles.registeredBadge}>
                  <Feather name="check-circle" size={20} color="#22c55e" />
                  <Text style={styles.registeredText}>You're registered!</Text>
                </View>
                <Pressable style={styles.leaveButton} onPress={handleLeave}>
                  <Text style={styles.leaveButtonText}>Leave Tournament</Text>
                </Pressable>
              </>
            ) : isFull ? (
              <View style={styles.fullMessage}>
                <Feather name="users" size={24} color={GameColors.textSecondary} />
                <Text style={styles.fullMessageText}>Tournament is full</Text>
              </View>
            ) : diamonds < (tournament.entryFee || 0) && tournament.entryFee > 0 ? (
              <View style={styles.insufficientFunds}>
                <Feather name="alert-circle" size={20} color={GameColors.error} />
                <Text style={styles.insufficientText}>
                  Need {tournament.entryFee - diamonds} more diamonds to join
                </Text>
              </View>
            ) : (
              <Pressable onPress={handleJoin} disabled={joinMutation.isPending}>
                <LinearGradient
                  colors={[GameColors.primary, GameColors.gold]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.joinButton}
                >
                  <Feather name="user-plus" size={20} color={GameColors.background} />
                  <Text style={styles.joinButtonText}>
                    {joinMutation.isPending ? 'Joining...' : 
                     tournament.entryFee > 0 ? `Join (${tournament.entryFee} diamonds)` : 'Join Free'}
                  </Text>
                </LinearGradient>
              </Pressable>
            )}
          </View>
        ) : null}
        
        {tournament.status === 'completed' && tournament.winnerWallet ? (
          <View style={styles.winnerCard}>
            <LinearGradient
              colors={['#fef3c7', '#fcd34d', '#f59e0b']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.winnerGradient}
            >
              <Feather name="award" size={32} color="#78350f" />
              <Text style={styles.winnerLabel}>Champion</Text>
              <Text style={styles.winnerName}>
                {formatWalletAddress(tournament.winnerWallet)}
              </Text>
            </LinearGradient>
          </View>
        ) : null}
        
        {participants.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Participants ({participants.length})</Text>
            <View style={styles.participantsList}>
              {participants.slice(0, 8).map((p, index) => (
                <View key={p.id} style={styles.participantItem}>
                  <View style={styles.participantRank}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.participantName}>
                    {formatWalletAddress(p.walletAddress)}
                  </Text>
                  {p.isEliminated ? (
                    <Feather name="x-circle" size={16} color={GameColors.error} />
                  ) : p.finalPlacement === 1 ? (
                    <Feather name="award" size={16} color={GameColors.primary} />
                  ) : null}
                </View>
              ))}
              {participants.length > 8 ? (
                <Text style={styles.moreParticipants}>
                  +{participants.length - 8} more
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}
        
        {Object.keys(matchesByRound).length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bracket</Text>
            {Object.keys(matchesByRound).sort((a, b) => Number(a) - Number(b)).map((round) => (
              <View key={round} style={styles.roundContainer}>
                <Text style={styles.roundTitle}>
                  {getRoundName(Number(round), tournament.totalRounds)}
                </Text>
                {matchesByRound[Number(round)].map(renderMatchCard)}
              </View>
            ))}
          </View>
        ) : tournament.status === 'registering' || tournament.status === 'scheduled' ? (
          <View style={styles.waitingCard}>
            <Feather name="clock" size={32} color={GameColors.textSecondary} />
            <Text style={styles.waitingTitle}>Waiting for Players</Text>
            <Text style={styles.waitingText}>
              {tournament.minPlayers - tournament.currentPlayers > 0 
                ? `Need ${tournament.minPlayers - tournament.currentPlayers} more to start`
                : 'Tournament will begin soon'}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
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
    fontSize: 18,
    fontWeight: "700",
    color: GameColors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GameColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: {
    width: 40,
  },
  loadingText: {
    fontSize: 14,
    color: GameColors.textSecondary,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: GameColors.textPrimary,
  },
  backLink: {
    marginTop: Spacing.md,
  },
  backLinkText: {
    fontSize: 14,
    color: GameColors.primary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: 40,
  },
  infoCard: {
    backgroundColor: GameColors.surface,
    borderRadius: 16,
    padding: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  infoLabel: {
    fontSize: 11,
    color: GameColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: GameColors.textPrimary,
  },
  infoValueLarge: {
    fontSize: 20,
    fontWeight: '700',
    color: GameColors.primary,
  },
  prizeValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoDivider: {
    height: 1,
    backgroundColor: GameColors.surfaceElevated,
    marginVertical: Spacing.md,
  },
  statusText: {
    color: GameColors.primary,
  },
  actionCard: {
    backgroundColor: GameColors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  registeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  registeredText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22c55e',
  },
  leaveButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  leaveButtonText: {
    fontSize: 14,
    color: GameColors.error,
    fontWeight: '500',
  },
  fullMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  fullMessageText: {
    fontSize: 16,
    color: GameColors.textSecondary,
    fontWeight: '500',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: 12,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: GameColors.background,
  },
  winnerCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  winnerGradient: {
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  winnerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78350f',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  winnerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#78350f',
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: GameColors.textPrimary,
    marginBottom: Spacing.xs,
  },
  participantsList: {
    backgroundColor: GameColors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: GameColors.surfaceElevated,
    gap: Spacing.sm,
  },
  participantRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: GameColors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '600',
    color: GameColors.textSecondary,
  },
  participantName: {
    flex: 1,
    fontSize: 14,
    color: GameColors.textPrimary,
  },
  moreParticipants: {
    textAlign: 'center',
    padding: Spacing.sm,
    fontSize: 13,
    color: GameColors.textSecondary,
  },
  roundContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  roundTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: GameColors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  matchCard: {
    backgroundColor: GameColors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchNumber: {
    fontSize: 12,
    color: GameColors.textSecondary,
    fontWeight: '500',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ef4444',
  },
  matchPlayers: {
    gap: 4,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: 8,
    backgroundColor: GameColors.surfaceElevated,
  },
  playerWon: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  playerName: {
    fontSize: 14,
    color: GameColors.textPrimary,
    fontWeight: '500',
  },
  playerNameWon: {
    color: '#22c55e',
    fontWeight: '600',
  },
  vsContainer: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  vsText: {
    fontSize: 10,
    color: GameColors.textSecondary,
    fontWeight: '500',
  },
  waitingCard: {
    backgroundColor: GameColors.surface,
    borderRadius: 16,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  waitingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: GameColors.textPrimary,
  },
  waitingText: {
    fontSize: 14,
    color: GameColors.textSecondary,
    textAlign: 'center',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: GameColors.surface,
    borderRadius: 10,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  balanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  balanceLabel: {
    fontSize: 14,
    color: GameColors.textSecondary,
  },
  balanceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: GameColors.primary,
  },
  balanceInsufficient: {
    color: GameColors.error,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: GameColors.surfaceElevated,
  },
  insufficientFunds: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: Spacing.md,
    borderRadius: 12,
  },
  insufficientText: {
    fontSize: 14,
    color: GameColors.error,
    flex: 1,
  },
});

export default TournamentDetailScreen;
