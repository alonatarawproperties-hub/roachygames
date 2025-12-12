import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Alert, ActivityIndicator, Platform } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Application from "expo-application";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { GameColors } from "@/constants/theme";
import { apiRequest, getApiUrl } from "@/lib/query-client";

interface DailyBonusCardProps {
  walletAddress: string | null;
  isConnected: boolean;
  isGuest?: boolean;
  onConnectWallet: () => void;
}

interface DailyReward {
  day: number;
  diamonds: number;
  claimed: boolean;
  isToday: boolean;
}

interface DailyBonusData {
  currentStreak: number;
  longestStreak: number;
  canClaim: boolean;
  nextReward: number;
  nextStreakDay: number;
  weeklyRewards: DailyReward[];
  totalClaims: number;
  totalDiamondsFromBonus: number;
}

async function getDeviceFingerprint(): Promise<string | null> {
  try {
    if (Platform.OS === "ios") {
      return await Application.getIosIdForVendorAsync();
    } else if (Platform.OS === "android") {
      return Application.getAndroidId();
    } else {
      const webFingerprint = `web-${navigator.userAgent.slice(0, 50)}-${screen.width}x${screen.height}`;
      return webFingerprint;
    }
  } catch (error) {
    console.log("[DeviceFingerprint] Failed to get device ID:", error);
    return null;
  }
}

export function DailyBonusCard({ walletAddress, isConnected, isGuest = false, onConnectWallet }: DailyBonusCardProps) {
  const queryClient = useQueryClient();
  const [claimingDay, setClaimingDay] = useState<number | null>(null);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string | null>(null);
  
  const claimScale = useSharedValue(1);
  const celebrateOpacity = useSharedValue(0);
  
  useEffect(() => {
    getDeviceFingerprint().then(setDeviceFingerprint);
  }, []);
  
  const { data: bonusData, isLoading } = useQuery<DailyBonusData>({
    queryKey: ["/api/daily-bonus", walletAddress],
    enabled: !!walletAddress && isConnected,
  });
  
  const claimMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/daily-bonus/claim", { 
        walletAddress,
        deviceFingerprint,
      });
      return response.json();
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      claimScale.value = withSequence(
        withSpring(1.2, { damping: 5 }),
        withSpring(1, { damping: 10 })
      );
      
      celebrateOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0, { duration: 800 })
      );
      
      queryClient.invalidateQueries({ queryKey: ["/api/daily-bonus", walletAddress] });
      queryClient.invalidateQueries({ queryKey: ["/api/economy", walletAddress] });
      
      Alert.alert(
        "Bonus Claimed!",
        `You received ${data.diamondsAwarded} Diamond${data.diamondsAwarded > 1 ? 's' : ''}!\n\nStreak: ${data.newStreak} day${data.newStreak > 1 ? 's' : ''}\nTotal Diamonds: ${data.totalDiamonds}`,
        [{ text: "Awesome!", style: "default" }]
      );
      setClaimingDay(null);
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      if (error?.alreadyClaimed) {
        Alert.alert("Already Claimed", "You've already claimed today's bonus. Come back tomorrow!");
      } else if (error?.fraudBlocked) {
        Alert.alert("Limit Reached", "Daily bonus limit reached for this device. Try again tomorrow.");
      } else if (error?.newAccountCooldown) {
        Alert.alert("New Account", `Please wait ${error.hoursRemaining} hours before claiming your first bonus.`);
      } else if (error?.emailVerificationRequired) {
        Alert.alert("Verification Required", "Please verify your email to continue your streak beyond Day 3.");
      } else {
        Alert.alert("Error", "Failed to claim bonus. Please try again.");
      }
      setClaimingDay(null);
    },
  });

  const handleClaimPress = (day: number) => {
    if (!isConnected) {
      onConnectWallet();
      return;
    }
    
    if (isLoading) {
      return;
    }
    
    if (!bonusData?.canClaim) {
      Alert.alert("Already Claimed", "You've already claimed today's bonus. Come back tomorrow!");
      return;
    }
    
    setClaimingDay(day);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    claimMutation.mutate();
  };

  const claimAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: claimScale.value }],
  }));

  const celebrateStyle = useAnimatedStyle(() => ({
    opacity: celebrateOpacity.value,
  }));

  const defaultRewards: DailyReward[] = [
    { day: 1, diamonds: 1, claimed: false, isToday: true },
    { day: 2, diamonds: 1, claimed: false, isToday: false },
    { day: 3, diamonds: 1, claimed: false, isToday: false },
    { day: 4, diamonds: 2, claimed: false, isToday: false },
    { day: 5, diamonds: 2, claimed: false, isToday: false },
    { day: 6, diamonds: 2, claimed: false, isToday: false },
    { day: 7, diamonds: 3, claimed: false, isToday: false },
  ];

  const rewards = bonusData?.weeklyRewards || defaultRewards;
  const currentStreak = bonusData?.currentStreak || 0;
  const canClaim = bonusData?.canClaim ?? true;
  const weeklyTotal = rewards.reduce((sum, r) => sum + r.diamonds, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="calendar" size={20} color={GameColors.gold} />
          <ThemedText style={styles.title}>Daily Login Bonus</ThemedText>
        </View>
        <View style={styles.streakBadge}>
          <Feather name="zap" size={14} color={GameColors.gold} />
          <ThemedText style={styles.streakText}>
            {currentStreak} Day{currentStreak !== 1 ? 's' : ''} Streak
          </ThemedText>
        </View>
      </View>
      
      <View style={styles.rewardsGrid}>
        {rewards.map((reward) => {
          const isClaimed = reward.claimed;
          const isToday = reward.isToday && canClaim;
          const isLocked = !reward.claimed && !reward.isToday;
          const isDay7 = reward.day === 7;
          const isClaiming = claimingDay === reward.day;
          
          return (
            <Pressable
              key={reward.day}
              onPress={() => isToday ? handleClaimPress(reward.day) : null}
              disabled={!isToday || claimMutation.isPending || isLoading}
              style={[
                styles.rewardCard,
                isToday && styles.rewardCardToday,
                isClaimed && styles.rewardCardClaimed,
                isLocked && styles.rewardCardLocked,
                isDay7 && styles.rewardCardGrand,
              ]}
            >
              <ThemedText style={[
                styles.dayLabel,
                isToday && styles.dayLabelToday,
                isClaimed && styles.dayLabelClaimed,
              ]}>
                {isDay7 ? "Day 7" : `Day ${reward.day}`}
              </ThemedText>
              
              <Animated.View 
                style={[
                  styles.iconContainer,
                  isToday && styles.iconContainerToday,
                  isDay7 && styles.iconContainerGrand,
                  isToday && claimAnimatedStyle,
                ]}
              >
                {isClaiming ? (
                  <ActivityIndicator size="small" color={GameColors.gold} />
                ) : isClaimed ? (
                  <Feather name="check" size={24} color={GameColors.success} />
                ) : isDay7 ? (
                  <Feather name="star" size={28} color={GameColors.gold} />
                ) : (
                  <Feather 
                    name="gift" 
                    size={24} 
                    color={isToday ? GameColors.gold : GameColors.textSecondary} 
                  />
                )}
              </Animated.View>
              
              <View style={styles.diamondRow}>
                <Feather 
                  name="octagon" 
                  size={12} 
                  color={isToday ? "#60A5FA" : isDay7 ? "#60A5FA" : GameColors.textSecondary} 
                />
                <ThemedText style={[
                  styles.rewardAmount,
                  isToday && styles.rewardAmountToday,
                  isDay7 && styles.rewardAmountGrand,
                ]}>
                  {reward.diamonds}
                </ThemedText>
              </View>
              
              {isToday && (
                <View style={styles.claimBadge}>
                  <ThemedText style={styles.claimText}>CLAIM</ThemedText>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      
      <Animated.View style={[styles.celebrateOverlay, celebrateStyle]}>
        <Feather name="star" size={40} color={GameColors.gold} />
      </Animated.View>
      
      <View style={styles.footer}>
        <Feather name="info" size={14} color={GameColors.textSecondary} />
        <ThemedText style={styles.footerText}>
          {canClaim 
            ? "Tap today's reward to claim! Weekly total: " + weeklyTotal + " Diamonds"
            : "Come back tomorrow for your next bonus!"}
        </ThemedText>
      </View>
      
      {!isConnected && (
        <Pressable style={styles.connectOverlay} onPress={onConnectWallet}>
          <View style={styles.connectContent}>
            <Feather name="lock" size={24} color={GameColors.gold} />
            <ThemedText style={styles.connectText}>Connect Wallet to Claim</ThemedText>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: GameColors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
    marginBottom: 16,
    position: "relative",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streakText: {
    fontSize: 12,
    fontWeight: "600",
    color: GameColors.gold,
  },
  rewardsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  rewardCard: {
    flex: 1,
    alignItems: "center",
    padding: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    minHeight: 90,
  },
  rewardCardToday: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderColor: GameColors.gold,
    borderWidth: 2,
  },
  rewardCardClaimed: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  rewardCardLocked: {
    opacity: 0.5,
  },
  rewardCardGrand: {
    backgroundColor: "rgba(96, 165, 250, 0.1)",
    borderColor: "rgba(96, 165, 250, 0.3)",
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: GameColors.textSecondary,
    marginBottom: 4,
  },
  dayLabelToday: {
    color: GameColors.gold,
  },
  dayLabelClaimed: {
    color: GameColors.success,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  iconContainerToday: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
  },
  iconContainerGrand: {
    backgroundColor: "rgba(96, 165, 250, 0.2)",
  },
  diamondRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  rewardAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: GameColors.textSecondary,
  },
  rewardAmountToday: {
    color: GameColors.gold,
  },
  rewardAmountGrand: {
    color: "#60A5FA",
  },
  claimBadge: {
    position: "absolute",
    bottom: -6,
    backgroundColor: GameColors.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  claimText: {
    fontSize: 8,
    fontWeight: "800",
    color: GameColors.background,
  },
  celebrateOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -20,
    marginTop: -20,
    pointerEvents: "none",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  footerText: {
    fontSize: 11,
    color: GameColors.textSecondary,
    flex: 1,
  },
  connectOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  connectContent: {
    alignItems: "center",
    gap: 8,
  },
  connectText: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.gold,
  },
});
