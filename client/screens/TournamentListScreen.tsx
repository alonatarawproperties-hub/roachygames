import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Text, ScrollView, RefreshControl } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  Easing,
  withSequence,
} from "react-native-reanimated";
import { GameColors, Spacing } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

function AnimatedLoader({ size = 32, color = GameColors.primary }: { size?: number; color?: string }) {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  
  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1200, easing: Easing.linear }),
      -1,
      false
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));
  
  return (
    <Animated.View style={[styles.loaderContainer, animatedStyle]}>
      <Feather name="loader" size={size} color={color} />
    </Animated.View>
  );
}

type TournamentType = 'sit_and_go' | 'daily' | 'weekly' | 'monthly';
type FilterType = 'all' | TournamentType;

const TOURNAMENT_TYPE_INFO: Record<TournamentType, { label: string; icon: keyof typeof Feather.glyphMap; color: string }> = {
  sit_and_go: { label: 'Sit & Go', icon: 'zap', color: '#f59e0b' },
  daily: { label: 'Daily', icon: 'sun', color: '#10b981' },
  weekly: { label: 'Weekly', icon: 'calendar', color: '#6366f1' },
  monthly: { label: 'Monthly', icon: 'award', color: '#ec4899' },
};

const TIME_CONTROL_LABELS: Record<string, string> = {
  bullet: 'Bullet',
  blitz: 'Blitz',
  rapid: 'Rapid',
  classical: 'Classical',
};

function formatTimeUntil(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  
  if (diff < 0) return 'Started';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

interface Tournament {
  id: string;
  name: string;
  tournamentType: TournamentType;
  timeControl: string;
  entryFee: number;
  prizePool: number;
  maxPlayers: number;
  currentPlayers: number;
  status: string;
  scheduledStartAt: string | null;
}

export function TournamentListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterType>('all');
  const [loadingTime, setLoadingTime] = useState(0);
  
  const { data, isLoading, refetch, isRefetching, isError, error } = useQuery({
    queryKey: ['/api/tournaments'],
    queryFn: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      try {
        const res = await fetch(new URL('/api/tournaments', getApiUrl()).toString(), {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error('Failed to fetch tournaments');
        return res.json();
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          throw new Error('Connection timed out - the server may be waking up');
        }
        throw err;
      }
    },
    refetchInterval: 30000,
    retry: 2,
    retryDelay: 3000,
  });
  
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      setLoadingTime(0);
      interval = setInterval(() => {
        setLoadingTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);
  
  const tournaments: Tournament[] = data?.tournaments || [];
  
  const filteredTournaments = filter === 'all' 
    ? tournaments 
    : tournaments.filter(t => t.tournamentType === filter);
  
  const handleTournamentPress = (tournament: Tournament) => {
    navigation.navigate('TournamentDetail', { tournamentId: tournament.id });
  };
  
  const renderTournamentCard = (tournament: Tournament) => {
    const typeInfo = TOURNAMENT_TYPE_INFO[tournament.tournamentType];
    const isFull = tournament.currentPlayers >= tournament.maxPlayers;
    const isActive = tournament.status === 'active';
    const isRegistering = tournament.status === 'registering' || tournament.status === 'scheduled';
    
    return (
      <Pressable 
        key={tournament.id}
        style={styles.tournamentCard}
        onPress={() => handleTournamentPress(tournament)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.typeBadge, { backgroundColor: typeInfo.color + '20' }]}>
            <Feather name={typeInfo.icon} size={14} color={typeInfo.color} />
            <Text style={[styles.typeBadgeText, { color: typeInfo.color }]}>
              {typeInfo.label}
            </Text>
          </View>
          
          <View style={[
            styles.statusBadge,
            isActive ? styles.statusActive : isRegistering ? styles.statusRegistering : styles.statusPending
          ]}>
            <Text style={styles.statusText}>
              {isActive ? 'Live' : isRegistering ? 'Open' : tournament.status}
            </Text>
          </View>
        </View>
        
        <Text style={styles.tournamentName}>{tournament.name}</Text>
        
        <View style={styles.cardDetails}>
          <View style={styles.detailItem}>
            <Feather name="clock" size={14} color={GameColors.textSecondary} />
            <Text style={styles.detailText}>
              {TIME_CONTROL_LABELS[tournament.timeControl] || tournament.timeControl}
            </Text>
          </View>
          
          <View style={styles.detailItem}>
            <Feather name="users" size={14} color={GameColors.textSecondary} />
            <Text style={styles.detailText}>
              {tournament.currentPlayers}/{tournament.maxPlayers}
            </Text>
          </View>
          
          {tournament.scheduledStartAt ? (
            <View style={styles.detailItem}>
              <Feather name="calendar" size={14} color={GameColors.textSecondary} />
              <Text style={styles.detailText}>
                {formatTimeUntil(new Date(tournament.scheduledStartAt))}
              </Text>
            </View>
          ) : null}
        </View>
        
        <View style={styles.cardFooter}>
          <View style={styles.prizeInfo}>
            <Text style={styles.prizeLabel}>Prize Pool</Text>
            <View style={styles.prizeValue}>
              <Feather name="award" size={16} color={GameColors.primary} />
              <Text style={styles.prizeAmount}>{tournament.prizePool}</Text>
            </View>
          </View>
          
          <View style={styles.entryInfo}>
            <Text style={styles.entryLabel}>Entry</Text>
            <Text style={styles.entryAmount}>
              {tournament.entryFee === 0 ? 'Free' : `${tournament.entryFee} CHY`}
            </Text>
          </View>
          
          {isRegistering && !isFull ? (
            <LinearGradient
              colors={[GameColors.primary, GameColors.gold]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.joinButton}
            >
              <Text style={styles.joinButtonText}>Join</Text>
            </LinearGradient>
          ) : isFull ? (
            <View style={styles.fullBadge}>
              <Text style={styles.fullBadgeText}>Full</Text>
            </View>
          ) : isActive ? (
            <View style={styles.watchButton}>
              <Feather name="eye" size={14} color={GameColors.primary} />
              <Text style={styles.watchButtonText}>Watch</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  };
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={GameColors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Tournaments</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
        style={styles.filterScroll}
      >
        <Pressable
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
        </Pressable>
        
        {(Object.keys(TOURNAMENT_TYPE_INFO) as TournamentType[]).map((type) => {
          const info = TOURNAMENT_TYPE_INFO[type];
          const isActive = filter === type;
          return (
            <Pressable
              key={type}
              style={[styles.filterButton, isActive && styles.filterButtonActive]}
              onPress={() => setFilter(type)}
            >
              <Feather 
                name={info.icon} 
                size={14} 
                color={isActive ? GameColors.background : GameColors.textSecondary} 
              />
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {info.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      
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
        {isError ? (
          <View style={styles.emptyState}>
            <Feather name="wifi-off" size={48} color={GameColors.error || '#ef4444'} />
            <Text style={styles.emptyTitle}>Connection Issue</Text>
            <Text style={styles.emptyText}>
              {error?.message?.includes('timed out') 
                ? 'The server is waking up. This can take a moment after being idle.'
                : 'Unable to load tournaments. Please check your connection.'}
            </Text>
            <Pressable 
              style={styles.retryButton}
              onPress={() => refetch()}
            >
              <Feather name="refresh-cw" size={16} color={GameColors.background} />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        ) : isLoading ? (
          <View style={styles.emptyState}>
            <AnimatedLoader size={40} color={GameColors.primary} />
            <Text style={styles.emptyTitle}>
              {loadingTime > 5 ? 'Still connecting...' : 'Loading tournaments...'}
            </Text>
            {loadingTime > 5 ? (
              <Text style={styles.emptyText}>
                The database is waking up. This only takes a moment.
              </Text>
            ) : null}
            {loadingTime > 10 ? (
              <Text style={[styles.emptyText, { marginTop: 8, color: GameColors.primary }]}>
                Almost there! First connection takes longest.
              </Text>
            ) : null}
            <View style={styles.loadingDots}>
              <Animated.View style={[styles.loadingDot, { opacity: 0.3 + (loadingTime % 3 === 0 ? 0.7 : 0) }]} />
              <Animated.View style={[styles.loadingDot, { opacity: 0.3 + (loadingTime % 3 === 1 ? 0.7 : 0) }]} />
              <Animated.View style={[styles.loadingDot, { opacity: 0.3 + (loadingTime % 3 === 2 ? 0.7 : 0) }]} />
            </View>
          </View>
        ) : filteredTournaments.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="calendar" size={48} color={GameColors.textSecondary} />
            <Text style={styles.emptyTitle}>No Tournaments</Text>
            <Text style={styles.emptyText}>
              {filter === 'all' 
                ? 'Tournaments are being created automatically. Pull to refresh!'
                : `No ${TOURNAMENT_TYPE_INFO[filter as TournamentType]?.label} tournaments available.`}
            </Text>
            <Pressable 
              style={styles.retryButton}
              onPress={() => refetch()}
            >
              <Feather name="refresh-cw" size={16} color={GameColors.background} />
              <Text style={styles.retryButtonText}>Refresh</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {filteredTournaments.map(renderTournamentCard)}
            
            <View style={styles.quickJoinSection}>
              <Text style={styles.quickJoinTitle}>Quick Join</Text>
              <Text style={styles.quickJoinDescription}>
                Start a Sit & Go tournament instantly with other players
              </Text>
              <Pressable 
                style={styles.quickJoinButton}
                onPress={() => navigation.navigate('TournamentDetail', { tournamentId: 'new-sit-and-go' })}
              >
                <Feather name="zap" size={20} color={GameColors.background} />
                <Text style={styles.quickJoinButtonText}>Quick Sit & Go (8 players)</Text>
              </Pressable>
            </View>
          </>
        )}
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
  headerSpacer: {
    width: 40,
  },
  filterScroll: {
    maxHeight: 50,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: GameColors.surface,
  },
  filterButtonActive: {
    backgroundColor: GameColors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: GameColors.textSecondary,
  },
  filterTextActive: {
    color: GameColors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: 40,
  },
  tournamentCard: {
    backgroundColor: GameColors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  statusRegistering: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  statusPending: {
    backgroundColor: 'rgba(156, 163, 175, 0.2)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: GameColors.textSecondary,
  },
  tournamentName: {
    fontSize: 18,
    fontWeight: '700',
    color: GameColors.textPrimary,
  },
  cardDetails: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    color: GameColors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: GameColors.surfaceElevated,
    gap: Spacing.md,
  },
  prizeInfo: {
    flex: 1,
  },
  prizeLabel: {
    fontSize: 11,
    color: GameColors.textSecondary,
    marginBottom: 2,
  },
  prizeValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  prizeAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: GameColors.primary,
  },
  entryInfo: {
    alignItems: 'flex-end',
  },
  entryLabel: {
    fontSize: 11,
    color: GameColors.textSecondary,
    marginBottom: 2,
  },
  entryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: GameColors.textPrimary,
  },
  joinButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: GameColors.background,
  },
  fullBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: GameColors.surfaceElevated,
  },
  fullBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: GameColors.textSecondary,
  },
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: GameColors.primary,
  },
  watchButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: GameColors.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: GameColors.textPrimary,
  },
  emptyText: {
    fontSize: 14,
    color: GameColors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  loaderContainer: {
    marginBottom: Spacing.sm,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.md,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GameColors.primary,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: GameColors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    marginTop: Spacing.md,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: GameColors.background,
  },
  quickJoinSection: {
    backgroundColor: GameColors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  quickJoinTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: GameColors.textPrimary,
  },
  quickJoinDescription: {
    fontSize: 13,
    color: GameColors.textSecondary,
  },
  quickJoinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: GameColors.primary,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    marginTop: Spacing.sm,
  },
  quickJoinButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: GameColors.background,
  },
});

export default TournamentListScreen;
