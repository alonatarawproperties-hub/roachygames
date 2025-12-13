import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { getMarketplaceUrl } from "@/lib/query-client";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Leaderboard, AchievementBadges, ActivityHistory, FriendActivity, EventsCalendar } from "@/components/arcade";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { useGame } from "@/context/GameContext";
import { useAuth } from "@/context/AuthContext";
import { getCreatureDefinition, getRarityColor, CREATURE_IMAGES } from "@/constants/creatures";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  color?: string;
  index: number;
}

function StatCard({ icon, label, value, color = GameColors.primary, index }: StatCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify()}
      style={[styles.statCard, animatedStyle]}
    >
      <View style={[styles.statIconContainer, { backgroundColor: color + "20" }]}>
        <Feather name={icon as any} size={24} color={color} />
      </View>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
    </Animated.View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { state, addEggs } = useGame();
  const { user, isGuest } = useAuth();

  const rarestCreature = state.playerStats.rarestCatch
    ? getCreatureDefinition(state.playerStats.rarestCatch)
    : null;

  const handleAddEggs = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addEggs(5);
  };

  const handleOpenMarketplace = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await WebBrowser.openBrowserAsync(getMarketplaceUrl());
  };

  const handleClaimRewards = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await WebBrowser.openBrowserAsync(getMarketplaceUrl() + "/rewards");
  };

  const getUserDisplayName = () => {
    // Don't show wallet addresses - check for wallet pattern
    if (user?.displayName && !user.displayName.toLowerCase().includes('wallet')) {
      return user.displayName;
    }
    if (user?.email) return user.email.split("@")[0];
    return isGuest ? "Guest Player" : "Roachy Trainer";
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.springify()} style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Feather name="user" size={40} color={GameColors.textPrimary} />
          </View>
          <View style={[styles.levelBadge, { backgroundColor: GameColors.primary }]}>
            <ThemedText style={styles.levelText}>
              {Math.floor(state.playerStats.totalCaught / 3) + 1}
            </ThemedText>
          </View>
        </View>
        <ThemedText type="h3" style={styles.username}>
          {getUserDisplayName()}
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Roachy Creature Hunter
        </ThemedText>
      </Animated.View>

      <View style={styles.statsGrid}>
        <StatCard
          icon="target"
          label="Caught"
          value={state.playerStats.totalCaught}
          color={GameColors.primary}
          index={0}
        />
        <StatCard
          icon="award"
          label="Chy Coins"
          value={user?.chyBalance || 0}
          color={GameColors.gold}
          index={1}
        />
        <StatCard
          icon="disc"
          label="Eggs"
          value={state.eggCount}
          color="#FFD93D"
          index={2}
        />
      </View>

      {rarestCreature ? (
        <Animated.View
          entering={FadeInDown.delay(300).springify()}
          style={styles.section}
        >
          <ThemedText type="h4" style={styles.sectionTitle}>
            Rarest Catch
          </ThemedText>
          <Pressable style={styles.rarestCard}>
            <View
              style={[
                styles.rarestGlow,
                { backgroundColor: getRarityColor(rarestCreature.rarity) },
              ]}
            />
            <Image
              source={CREATURE_IMAGES[rarestCreature.id]}
              style={styles.rarestImage}
            />
            <View style={styles.rarestInfo}>
              <ThemedText style={styles.rarestName}>
                {rarestCreature.name}
              </ThemedText>
              <View
                style={[
                  styles.rarestRarity,
                  { backgroundColor: getRarityColor(rarestCreature.rarity) },
                ]}
              >
                <ThemedText style={styles.rarestRarityText}>
                  {rarestCreature.rarity.toUpperCase()}
                </ThemedText>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      ) : null}

      <Animated.View
        entering={FadeInDown.delay(400).springify()}
        style={styles.section}
      >
        <ThemedText type="h4" style={styles.sectionTitle}>
          Rewards
        </ThemedText>
        <Pressable style={styles.walletCard} onPress={handleClaimRewards}>
          <View style={styles.rewardsContent}>
            <View style={styles.rewardsIcon}>
              <Feather name="gift" size={32} color={GameColors.gold} />
            </View>
            <View style={styles.rewardsInfo}>
              <ThemedText style={styles.rewardsTitle}>
                Claim Rewards on Web
              </ThemedText>
              <ThemedText style={styles.rewardsDescription}>
                Visit roachy.games to claim your rewards
              </ThemedText>
            </View>
            <Feather name="external-link" size={24} color={GameColors.gold} />
          </View>
        </Pressable>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(500).springify()}
        style={styles.section}
      >
        <ThemedText type="h4" style={styles.sectionTitle}>
          Resources
        </ThemedText>
        <Pressable style={styles.resourceCard} onPress={handleOpenMarketplace}>
          <View style={styles.resourceRow}>
            <View style={[styles.resourceIcon, { backgroundColor: GameColors.primary + "20" }]}>
              <Feather name="shopping-bag" size={24} color={GameColors.primary} />
            </View>
            <View style={styles.resourceInfo}>
              <ThemedText style={styles.resourceTitle}>
                Marketplace
              </ThemedText>
              <ThemedText style={styles.resourceDescription}>
                Trade Roachies, eggs, and items
              </ThemedText>
            </View>
            <Feather
              name="external-link"
              size={24}
              color={GameColors.textSecondary}
            />
          </View>
        </Pressable>
        <Pressable style={styles.resourceCard} onPress={handleAddEggs}>
          <View style={styles.resourceRow}>
            <View style={styles.resourceIcon}>
              <Feather name="plus-circle" size={24} color="#FFD93D" />
            </View>
            <View style={styles.resourceInfo}>
              <ThemedText style={styles.resourceTitle}>
                Get Eggs
              </ThemedText>
              <ThemedText style={styles.resourceDescription}>
                Tap to receive 5 free eggs
              </ThemedText>
            </View>
            <Feather
              name="chevron-right"
              size={24}
              color={GameColors.textSecondary}
            />
          </View>
        </Pressable>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(600).springify()}
        style={styles.section}
      >
        <ThemedText type="h4" style={styles.sectionTitle}>
          Leaderboard
        </ThemedText>
        <Leaderboard />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(700).springify()}
        style={styles.section}
      >
        <ThemedText type="h4" style={styles.sectionTitle}>
          Achievements
        </ThemedText>
        <AchievementBadges />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(800).springify()}
        style={styles.section}
      >
        <ThemedText type="h4" style={styles.sectionTitle}>
          Recent Activity
        </ThemedText>
        <ActivityHistory />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(900).springify()}
        style={styles.section}
      >
        <ThemedText type="h4" style={styles.sectionTitle}>
          Upcoming Events
        </ThemedText>
        <EventsCalendar />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(1000).springify()}
        style={styles.section}
      >
        <ThemedText type="h4" style={styles.sectionTitle}>
          Friends
        </ThemedText>
        <FriendActivity isConnected={!!user && !isGuest} />
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: GameColors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: GameColors.primary,
  },
  levelBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: GameColors.background,
  },
  levelText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  username: {
    color: GameColors.textPrimary,
  },
  subtitle: {
    color: GameColors.textSecondary,
    marginTop: Spacing.xs,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: "center",
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: GameColors.textSecondary,
    marginTop: 2,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    color: GameColors.textPrimary,
    marginBottom: Spacing.md,
  },
  rarestCard: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  rarestGlow: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  rarestImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: Spacing.md,
  },
  rarestInfo: {
    flex: 1,
  },
  rarestName: {
    fontSize: 18,
    fontWeight: "600",
    color: GameColors.textPrimary,
    marginBottom: Spacing.xs,
  },
  rarestRarity: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    alignSelf: "flex-start",
  },
  rarestRarityText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  walletCard: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  rewardsContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  rewardsIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: GameColors.gold + "20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  rewardsInfo: {
    flex: 1,
  },
  rewardsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.textPrimary,
    marginBottom: Spacing.xs,
  },
  rewardsDescription: {
    fontSize: 13,
    color: GameColors.textSecondary,
    lineHeight: 18,
  },
  resourceCard: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  resourceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  resourceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 217, 61, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  resourceDescription: {
    fontSize: 14,
    color: GameColors.textSecondary,
    marginTop: 2,
  },
});
