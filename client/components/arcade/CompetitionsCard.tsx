import React from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { useActiveCompetitions, Competition } from "@/hooks/useCompetitions";
import Animated, { FadeIn } from "react-native-reanimated";

interface CompetitionsCardProps {
  onCompetitionPress: (competition: Competition) => void;
}

function formatTimeRemaining(endsAt: string): string {
  const now = new Date();
  const end = new Date(endsAt);
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return "Ended";
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m`;
}

function formatPrize(prizePool: number): string {
  if (prizePool >= 1000000) {
    return `${(prizePool / 1000000).toFixed(1)}M CHY`;
  }
  if (prizePool >= 1000) {
    return `${(prizePool / 1000).toFixed(1)}K CHY`;
  }
  return `${prizePool} CHY`;
}

function CompetitionItem({ competition, onPress }: { competition: Competition; onPress: () => void }) {
  const isActive = competition.status === "active";
  
  return (
    <Pressable onPress={onPress} style={styles.competitionItem}>
      <LinearGradient
        colors={isActive ? ["#2A2A1A", "#1E1E14"] : ["#252520", "#1A1A16"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.competitionGradient}
      >
        <View style={styles.competitionHeader}>
          <View style={styles.competitionTitleRow}>
            <Feather name="award" size={16} color={GameColors.gold} />
            <ThemedText style={styles.competitionName} numberOfLines={1}>
              {competition.name}
            </ThemedText>
          </View>
          {isActive ? (
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <ThemedText style={styles.liveText}>LIVE</ThemedText>
            </View>
          ) : (
            <ThemedText style={styles.statusText}>
              {competition.status === "scheduled" ? "Soon" : competition.status}
            </ThemedText>
          )}
        </View>
        
        <View style={styles.competitionDetails}>
          <View style={styles.detailItem}>
            <Feather name="clock" size={12} color="#888" />
            <ThemedText style={styles.detailText}>
              {formatTimeRemaining(competition.endsAt)}
            </ThemedText>
          </View>
          <View style={styles.detailItem}>
            <Feather name="gift" size={12} color={GameColors.gold} />
            <ThemedText style={[styles.detailText, styles.prizeText]}>
              {formatPrize(competition.prizePool)}
            </ThemedText>
          </View>
          {competition.entryFee > 0 ? (
            <View style={styles.detailItem}>
              <Feather name="dollar-sign" size={12} color="#888" />
              <ThemedText style={styles.detailText}>
                {competition.entryFee} CHY
              </ThemedText>
            </View>
          ) : null}
        </View>
        
        <View style={styles.enterButton}>
          <ThemedText style={styles.enterButtonText}>
            {isActive ? "Play Now" : "View Details"}
          </ThemedText>
          <Feather name="chevron-right" size={14} color={GameColors.gold} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export function CompetitionsCard({ onCompetitionPress }: CompetitionsCardProps) {
  const { data: competitions, isLoading, error } = useActiveCompetitions();
  
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Feather name="award" size={18} color={GameColors.gold} />
          <ThemedText style={styles.title}>Competitions</ThemedText>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={GameColors.gold} />
        </View>
      </View>
    );
  }
  
  if (error || !competitions || competitions.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Feather name="award" size={18} color={GameColors.gold} />
          <ThemedText style={styles.title}>Competitions</ThemedText>
        </View>
        <View style={styles.emptyContainer}>
          <Feather name="calendar" size={24} color="#666" />
          <ThemedText style={styles.emptyText}>
            No active competitions right now
          </ThemedText>
          <ThemedText style={styles.emptySubtext}>
            Check back soon for prize events
          </ThemedText>
        </View>
      </View>
    );
  }
  
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      <View style={styles.header}>
        <Feather name="award" size={18} color={GameColors.gold} />
        <ThemedText style={styles.title}>Competitions</ThemedText>
        <View style={styles.badge}>
          <ThemedText style={styles.badgeText}>{competitions.length}</ThemedText>
        </View>
      </View>
      
      {competitions.map((competition) => (
        <CompetitionItem
          key={competition.id}
          competition={competition}
          onPress={() => onCompetitionPress(competition)}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  badge: {
    backgroundColor: GameColors.gold,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: "auto",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1A1A0F",
  },
  loadingContainer: {
    backgroundColor: "rgba(30, 30, 20, 0.8)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    backgroundColor: "rgba(30, 30, 20, 0.8)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    marginTop: Spacing.sm,
  },
  emptySubtext: {
    fontSize: 12,
    color: "#666",
  },
  competitionItem: {
    marginBottom: Spacing.sm,
  },
  competitionGradient: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(201, 148, 31, 0.2)",
  },
  competitionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  competitionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    flex: 1,
  },
  competitionName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    flex: 1,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 200, 83, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00C853",
  },
  liveText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#00C853",
  },
  statusText: {
    fontSize: 11,
    color: "#888",
    textTransform: "capitalize",
  },
  competitionDetails: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: "#888",
  },
  prizeText: {
    color: GameColors.gold,
    fontWeight: "600",
  },
  enterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "rgba(201, 148, 31, 0.15)",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
  },
  enterButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: GameColors.gold,
  },
});
