import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";

interface GameEvent {
  id: string;
  title: string;
  description: string;
  type: "raid" | "drop" | "tournament" | "community" | "special";
  startTime: Date;
  endTime?: Date;
  rewards?: string;
  isLive?: boolean;
  participants?: number;
}

interface EventsCalendarProps {
  events?: GameEvent[];
  onEventPress?: (event: GameEvent) => void;
}

const PLACEHOLDER_EVENTS: GameEvent[] = [
  {
    id: "1",
    title: "Mega Raid Boss",
    description: "Defeat the Trash Titan for epic rewards",
    type: "raid",
    startTime: new Date(Date.now() + 1000 * 60 * 30),
    rewards: "500 RCH + Epic Egg",
    participants: 847,
    isLive: true,
  },
  {
    id: "2",
    title: "Legendary Egg Drop",
    description: "Increased legendary spawn rates",
    type: "drop",
    startTime: new Date(Date.now() + 1000 * 60 * 60 * 2),
    endTime: new Date(Date.now() + 1000 * 60 * 60 * 4),
    rewards: "2x Legendary Chance",
  },
  {
    id: "3",
    title: "Weekly Tournament",
    description: "Top hunters compete for prizes",
    type: "tournament",
    startTime: new Date(Date.now() + 1000 * 60 * 60 * 24),
    rewards: "10,000 RCH Prize Pool",
    participants: 2341,
  },
  {
    id: "4",
    title: "Community Hunt",
    description: "Hunt together for bonus rewards",
    type: "community",
    startTime: new Date(Date.now() + 1000 * 60 * 60 * 48),
    rewards: "Community Milestone Rewards",
  },
  {
    id: "5",
    title: "Holiday Special",
    description: "Limited edition holiday Roachies",
    type: "special",
    startTime: new Date(Date.now() + 1000 * 60 * 60 * 72),
    rewards: "Exclusive Holiday NFTs",
  },
];

const EVENT_CONFIG: Record<string, { icon: keyof typeof Feather.glyphMap; color: string }> = {
  raid: { icon: "target", color: "#EF4444" },
  drop: { icon: "gift", color: "#F59E0B" },
  tournament: { icon: "award", color: "#8B5CF6" },
  community: { icon: "users", color: "#22C55E" },
  special: { icon: "star", color: "#06B6D4" },
};

const formatEventTime = (date: Date): string => {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) return "Live Now";
  if (diffMins < 60) return `In ${diffMins}m`;
  if (diffHours < 24) return `In ${diffHours}h`;
  return `In ${diffDays}d`;
};

const formatFullTime = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export function EventsCalendar({ events = PLACEHOLDER_EVENTS, onEventPress }: EventsCalendarProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const filters = ["all", "raid", "drop", "tournament", "community", "special"];

  const filteredEvents =
    selectedFilter === "all" ? events : events.filter((e) => e.type === selectedFilter);

  const sortedEvents = [...filteredEvents].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  );

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Feather name="calendar" size={18} color={GameColors.gold} />
          <ThemedText style={styles.title}>Upcoming Events</ThemedText>
        </View>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <ThemedText style={styles.liveText}>
            {events.filter((e) => e.isLive).length} Live
          </ThemedText>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {filters.map((filter) => {
          const config = filter !== "all" ? EVENT_CONFIG[filter] : null;
          return (
            <Pressable
              key={filter}
              style={[
                styles.filterChip,
                selectedFilter === filter && styles.filterChipActive,
                config && selectedFilter === filter && { borderColor: config.color },
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              {config ? <Feather name={config.icon} size={12} color={config.color} /> : null}
              <ThemedText
                style={[
                  styles.filterText,
                  selectedFilter === filter && styles.filterTextActive,
                  config && selectedFilter === filter && { color: config.color },
                ]}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.eventsList}>
        {sortedEvents.map((event) => {
          const config = EVENT_CONFIG[event.type];
          return (
            <Pressable
              key={event.id}
              style={styles.eventCard}
              onPress={() => onEventPress?.(event)}
            >
              <View style={[styles.eventIconContainer, { backgroundColor: config.color + "20" }]}>
                <Feather name={config.icon} size={20} color={config.color} />
              </View>

              <View style={styles.eventContent}>
                <View style={styles.eventHeader}>
                  <ThemedText style={styles.eventTitle}>{event.title}</ThemedText>
                  {event.isLive ? (
                    <View style={styles.liveBadge}>
                      <View style={styles.liveBadgeDot} />
                      <ThemedText style={styles.liveBadgeText}>LIVE</ThemedText>
                    </View>
                  ) : (
                    <ThemedText style={[styles.eventTime, { color: config.color }]}>
                      {formatEventTime(event.startTime)}
                    </ThemedText>
                  )}
                </View>

                <ThemedText style={styles.eventDescription} numberOfLines={1}>
                  {event.description}
                </ThemedText>

                <View style={styles.eventMeta}>
                  {event.rewards ? (
                    <View style={styles.rewardBadge}>
                      <Feather name="gift" size={10} color={GameColors.gold} />
                      <ThemedText style={styles.rewardText}>{event.rewards}</ThemedText>
                    </View>
                  ) : null}
                  {event.participants ? (
                    <View style={styles.participantsBadge}>
                      <Feather name="users" size={10} color={GameColors.textSecondary} />
                      <ThemedText style={styles.participantsText}>
                        {event.participants.toLocaleString()}
                      </ThemedText>
                    </View>
                  ) : null}
                </View>

                <ThemedText style={styles.fullTime}>{formatFullTime(event.startTime)}</ThemedText>
              </View>

              <Feather name="chevron-right" size={16} color={GameColors.textSecondary} />
            </Pressable>
          );
        })}
      </View>

      {sortedEvents.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="calendar" size={32} color={GameColors.textSecondary} />
          <ThemedText style={styles.emptyText}>No upcoming events</ThemedText>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  liveText: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "600",
  },
  filterScroll: {
    marginBottom: Spacing.md,
  },
  filterContainer: {
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: GameColors.surface,
    backgroundColor: GameColors.surface + "40",
  },
  filterChipActive: {
    backgroundColor: GameColors.gold + "20",
    borderColor: GameColors.gold,
  },
  filterText: {
    fontSize: 12,
    color: GameColors.textSecondary,
  },
  filterTextActive: {
    color: GameColors.gold,
    fontWeight: "600",
  },
  eventsList: {
    gap: Spacing.md,
  },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: GameColors.surface + "40",
    borderRadius: BorderRadius.md,
  },
  eventIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  eventContent: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  eventTime: {
    fontSize: 12,
    fontWeight: "600",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EF4444" + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  liveBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EF4444",
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#EF4444",
  },
  eventDescription: {
    fontSize: 12,
    color: GameColors.textSecondary,
    marginTop: 2,
  },
  eventMeta: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  rewardBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rewardText: {
    fontSize: 10,
    color: GameColors.gold,
  },
  participantsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  participantsText: {
    fontSize: 10,
    color: GameColors.textSecondary,
  },
  fullTime: {
    fontSize: 10,
    color: GameColors.textSecondary,
    marginTop: 4,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: GameColors.textSecondary,
  },
});
