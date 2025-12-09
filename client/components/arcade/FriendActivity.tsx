import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";

interface Friend {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
  lastActivity?: {
    type: "hunting" | "raiding" | "trading" | "staking" | "idle";
    details?: string;
    timestamp: Date;
  };
  stats?: {
    catches: number;
    rchEarned: number;
  };
}

interface FriendActivityProps {
  friends?: Friend[];
  onFriendPress?: (friend: Friend) => void;
  onAddFriend?: () => void;
  isConnected?: boolean;
}

const PLACEHOLDER_FRIENDS: Friend[] = [
  {
    id: "1",
    name: "CryptoHunter",
    isOnline: true,
    lastActivity: {
      type: "hunting",
      details: "Central Park",
      timestamp: new Date(),
    },
    stats: { catches: 156, rchEarned: 2450 },
  },
  {
    id: "2",
    name: "RoachMaster",
    isOnline: true,
    lastActivity: {
      type: "raiding",
      details: "Trash Titan Boss",
      timestamp: new Date(),
    },
    stats: { catches: 342, rchEarned: 5120 },
  },
  {
    id: "3",
    name: "NFTCollector",
    isOnline: true,
    lastActivity: {
      type: "trading",
      details: "Listed 2 NFTs",
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
    },
    stats: { catches: 89, rchEarned: 1800 },
  },
  {
    id: "4",
    name: "SolanaFan",
    isOnline: false,
    lastActivity: {
      type: "staking",
      details: "500 RCH staked",
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
    },
    stats: { catches: 234, rchEarned: 3200 },
  },
  {
    id: "5",
    name: "BugCatcher99",
    isOnline: false,
    lastActivity: {
      type: "idle",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    },
    stats: { catches: 67, rchEarned: 890 },
  },
];

const ACTIVITY_CONFIG: Record<string, { icon: keyof typeof Feather.glyphMap; color: string; label: string }> = {
  hunting: { icon: "map-pin", color: "#22C55E", label: "Hunting" },
  raiding: { icon: "target", color: "#EF4444", label: "Raiding" },
  trading: { icon: "repeat", color: "#8B5CF6", label: "Trading" },
  staking: { icon: "lock", color: "#06B6D4", label: "Staking" },
  idle: { icon: "clock", color: GameColors.textSecondary, label: "Idle" },
};

const formatTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return "1d+ ago";
};

const getInitials = (name: string): string => {
  return name.slice(0, 2).toUpperCase();
};

export function FriendActivity({
  friends = PLACEHOLDER_FRIENDS,
  onFriendPress,
  onAddFriend,
  isConnected = true,
}: FriendActivityProps) {
  const onlineFriends = friends.filter((f) => f.isOnline);
  const offlineFriends = friends.filter((f) => !f.isOnline);

  if (!isConnected) {
    return (
      <Card style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Feather name="users" size={18} color={GameColors.gold} />
            <ThemedText style={styles.title}>Friends</ThemedText>
          </View>
        </View>
        <View style={styles.emptyState}>
          <Feather name="user-plus" size={32} color={GameColors.textSecondary} />
          <ThemedText style={styles.emptyText}>Connect wallet to see friends</ThemedText>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Feather name="users" size={18} color={GameColors.gold} />
          <ThemedText style={styles.title}>Friends</ThemedText>
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <ThemedText style={styles.onlineText}>{onlineFriends.length} online</ThemedText>
          </View>
        </View>
        {onAddFriend ? (
          <Pressable style={styles.addButton} onPress={onAddFriend}>
            <Feather name="user-plus" size={16} color={GameColors.gold} />
          </Pressable>
        ) : null}
      </View>

      {onlineFriends.length > 0 ? (
        <>
          <ThemedText style={styles.sectionLabel}>Online Now</ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.onlineScroll}
            contentContainerStyle={styles.onlineContainer}
          >
            {onlineFriends.map((friend) => {
              const activity = friend.lastActivity;
              const config = activity ? ACTIVITY_CONFIG[activity.type] : ACTIVITY_CONFIG.idle;

              return (
                <Pressable
                  key={friend.id}
                  style={styles.onlineCard}
                  onPress={() => onFriendPress?.(friend)}
                >
                  <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                      <ThemedText style={styles.avatarText}>{getInitials(friend.name)}</ThemedText>
                    </View>
                    <View style={styles.statusDot} />
                  </View>
                  <ThemedText style={styles.friendName} numberOfLines={1}>
                    {friend.name}
                  </ThemedText>
                  <View style={styles.activityRow}>
                    <Feather name={config.icon} size={10} color={config.color} />
                    <ThemedText style={[styles.activityLabel, { color: config.color }]}>
                      {config.label}
                    </ThemedText>
                  </View>
                  {activity?.details ? (
                    <ThemedText style={styles.activityDetails} numberOfLines={1}>
                      {activity.details}
                    </ThemedText>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      ) : null}

      {offlineFriends.length > 0 ? (
        <>
          <ThemedText style={styles.sectionLabel}>Recently Active</ThemedText>
          <View style={styles.offlineList}>
            {offlineFriends.slice(0, 3).map((friend) => {
              const activity = friend.lastActivity;
              const config = activity ? ACTIVITY_CONFIG[activity.type] : ACTIVITY_CONFIG.idle;

              return (
                <Pressable
                  key={friend.id}
                  style={styles.offlineItem}
                  onPress={() => onFriendPress?.(friend)}
                >
                  <View style={styles.offlineAvatar}>
                    <ThemedText style={styles.offlineAvatarText}>
                      {getInitials(friend.name)}
                    </ThemedText>
                  </View>
                  <View style={styles.offlineInfo}>
                    <ThemedText style={styles.offlineName}>{friend.name}</ThemedText>
                    <View style={styles.offlineActivityRow}>
                      <Feather name={config.icon} size={10} color={GameColors.textSecondary} />
                      <ThemedText style={styles.offlineActivity}>
                        {activity?.details || config.label}
                      </ThemedText>
                      <ThemedText style={styles.offlineTime}>
                        {activity ? formatTime(activity.timestamp) : ""}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.friendStats}>
                    <ThemedText style={styles.statValue}>{friend.stats?.catches || 0}</ThemedText>
                    <ThemedText style={styles.statLabel}>catches</ThemedText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      {friends.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="users" size={32} color={GameColors.textSecondary} />
          <ThemedText style={styles.emptyText}>No friends yet</ThemedText>
          {onAddFriend ? (
            <Pressable style={styles.addFriendButton} onPress={onAddFriend}>
              <Feather name="user-plus" size={14} color={GameColors.background} />
              <ThemedText style={styles.addFriendText}>Add Friends</ThemedText>
            </Pressable>
          ) : null}
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
  onlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: GameColors.success + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GameColors.success,
  },
  onlineText: {
    fontSize: 10,
    color: GameColors.success,
    fontWeight: "600",
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: GameColors.gold + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: GameColors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  onlineScroll: {
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  onlineContainer: {
    gap: Spacing.md,
    paddingRight: Spacing.lg,
  },
  onlineCard: {
    width: 100,
    alignItems: "center",
    padding: Spacing.md,
    backgroundColor: GameColors.surface + "60",
    borderRadius: BorderRadius.md,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: Spacing.xs,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GameColors.gold + "30",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: GameColors.gold,
  },
  statusDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: GameColors.success,
    borderWidth: 2,
    borderColor: GameColors.surface,
  },
  friendName: {
    fontSize: 12,
    fontWeight: "600",
    color: GameColors.textPrimary,
    textAlign: "center",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  activityLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  activityDetails: {
    fontSize: 9,
    color: GameColors.textSecondary,
    marginTop: 2,
    textAlign: "center",
  },
  offlineList: {
    gap: Spacing.sm,
  },
  offlineItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: GameColors.surface + "30",
    borderRadius: BorderRadius.md,
  },
  offlineAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: GameColors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  offlineAvatarText: {
    fontSize: 12,
    fontWeight: "600",
    color: GameColors.textSecondary,
  },
  offlineInfo: {
    flex: 1,
  },
  offlineName: {
    fontSize: 13,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  offlineActivityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  offlineActivity: {
    fontSize: 11,
    color: GameColors.textSecondary,
    flex: 1,
  },
  offlineTime: {
    fontSize: 10,
    color: GameColors.textSecondary,
  },
  friendStats: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: GameColors.gold,
  },
  statLabel: {
    fontSize: 9,
    color: GameColors.textSecondary,
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
  addFriendButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: GameColors.gold,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  addFriendText: {
    fontSize: 13,
    fontWeight: "700",
    color: GameColors.background,
  },
});
