import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";

const RARITY_COLORS: Record<string, string> = {
  common: "#9CA3AF",
  uncommon: "#22C55E",
  rare: "#3B82F6",
  epic: "#A855F7",
  legendary: "#F59E0B",
};

interface Raid {
  id: string;
  bossName: string;
  bossClass: string;
  rarity: string;
  currentHp: number;
  maxHp: number;
  participantCount: number;
  expiresAt: string;
}

interface RaidBattleMiniGameProps {
  raid: Raid;
  onAttack: (attackPower: number) => Promise<any>;
  onComplete: (rewards: any) => void;
  onCancel: () => void;
}

export function RaidBattleMiniGame({
  raid,
  onAttack,
  onComplete,
  onCancel,
}: RaidBattleMiniGameProps) {
  const [currentHP, setCurrentHP] = useState(raid.currentHp);
  const [isJoined, setIsJoined] = useState(false);
  const [isAttacking, setIsAttacking] = useState(false);
  const [totalDamage, setTotalDamage] = useState(0);
  const [lastDamage, setLastDamage] = useState<number | null>(null);
  const [attackCooldown, setAttackCooldown] = useState(0);
  const [isDefeated, setIsDefeated] = useState(false);
  const [rewards, setRewards] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [hitZonePosition, setHitZonePosition] = useState(50);
  const [attackerPosition, setAttackerPosition] = useState(0);
  const [isTimingActive, setIsTimingActive] = useState(false);

  const bossScale = useSharedValue(1);
  const damageOpacity = useSharedValue(0);
  const damageY = useSharedValue(0);

  const rarityColor = RARITY_COLORS[raid.rarity] || RARITY_COLORS.rare;

  useEffect(() => {
    bossScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1
    );
  }, []);

  useEffect(() => {
    const updateTimer = () => {
      const endTime = new Date(raid.expiresAt).getTime();
      const now = Date.now();
      const remaining = endTime - now;

      if (remaining <= 0) {
        setTimeRemaining("Expired");
        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [raid.expiresAt]);

  useEffect(() => {
    if (attackCooldown > 0) {
      const timer = setTimeout(() => setAttackCooldown(attackCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [attackCooldown]);

  useEffect(() => {
    if (isTimingActive) {
      const interval = setInterval(() => {
        setAttackerPosition((prev) => {
          const newPos = prev + 3;
          if (newPos >= 100) {
            setIsTimingActive(false);
            handleAttackMiss();
            return 0;
          }
          return newPos;
        });
      }, 20);
      return () => clearInterval(interval);
    }
  }, [isTimingActive]);

  const handleJoinRaid = () => {
    setIsJoined(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const startAttackTiming = () => {
    if (attackCooldown > 0 || isTimingActive) return;
    setHitZonePosition(30 + Math.random() * 40);
    setAttackerPosition(0);
    setIsTimingActive(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAttackTap = async () => {
    if (!isTimingActive) {
      startAttackTiming();
      return;
    }

    setIsTimingActive(false);

    const hitZoneStart = hitZonePosition - 10;
    const hitZoneEnd = hitZonePosition + 10;
    const isCritical = attackerPosition >= hitZoneStart && attackerPosition <= hitZoneEnd;
    const isHit = attackerPosition >= hitZoneStart - 15 && attackerPosition <= hitZoneEnd + 15;

    const attackPower = isCritical ? 150 : isHit ? 75 : 30;

    await executeAttack(attackPower, isCritical ? "CRITICAL!" : isHit ? "HIT!" : "MISS");
  };

  const handleAttackMiss = async () => {
    await executeAttack(30, "MISS");
  };

  const executeAttack = async (attackPower: number, hitType: string) => {
    setIsAttacking(true);

    if (hitType === "CRITICAL!") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (hitType === "HIT!") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      const result = await onAttack(attackPower);

      if (result) {
        setCurrentHP(result.bossHP);
        setLastDamage(result.damage);
        setTotalDamage(result.yourTotalDamage);
        setAttackCooldown(2);

        damageOpacity.value = 1;
        damageY.value = 0;
        damageOpacity.value = withTiming(0, { duration: 1000 });
        damageY.value = withTiming(-30, { duration: 1000 });

        if (result.isDefeated) {
          setIsDefeated(true);
          setRewards(result.rewards);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setTimeout(() => onComplete(result.rewards), 3000);
        }
      }
    } catch (error) {
      console.error("Attack failed:", error);
    }

    setIsAttacking(false);
    setAttackerPosition(0);
  };

  const hpPercent = (currentHP / raid.maxHp) * 100;
  const hpColor = hpPercent > 50 ? "#22C55E" : hpPercent > 25 ? "#F59E0B" : "#EF4444";

  const bossAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bossScale.value }],
  }));

  const damageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: damageOpacity.value,
    transform: [{ translateY: damageY.value }],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View style={[styles.bossContainer, bossAnimatedStyle]}>
          <View style={[styles.bossIcon, { shadowColor: rarityColor }]}>
            <Feather name="alert-triangle" size={64} color={rarityColor} />
          </View>
          <Animated.View style={[styles.damagePopup, damageAnimatedStyle]}>
            <ThemedText style={styles.damageText}>-{lastDamage}</ThemedText>
          </Animated.View>
        </Animated.View>

        <ThemedText style={[styles.bossName, { color: rarityColor }]}>
          {raid.bossName}
        </ThemedText>
        <ThemedText style={styles.bossClass}>
          {raid.rarity.toUpperCase()} {raid.bossClass.toUpperCase()}
        </ThemedText>

        <View style={styles.hpContainer}>
          <View style={styles.hpLabelRow}>
            <View style={styles.hpLabel}>
              <Feather name="heart" size={14} color={hpColor} />
              <ThemedText style={styles.hpLabelText}>HP</ThemedText>
            </View>
            <ThemedText style={styles.hpValue}>
              {currentHP.toLocaleString()} / {raid.maxHp.toLocaleString()}
            </ThemedText>
          </View>
          <View style={styles.hpBar}>
            <View
              style={[
                styles.hpFill,
                {
                  width: `${hpPercent}%`,
                  backgroundColor: hpColor,
                  shadowColor: hpColor,
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Feather name="users" size={18} color="#3B82F6" />
            <ThemedText style={styles.statValue}>{raid.participantCount}</ThemedText>
            <ThemedText style={styles.statLabel}>Players</ThemedText>
          </View>
          <View style={styles.statItem}>
            <Feather name="target" size={18} color="#EF4444" />
            <ThemedText style={styles.statValue}>{totalDamage.toLocaleString()}</ThemedText>
            <ThemedText style={styles.statLabel}>Your Damage</ThemedText>
          </View>
          <View style={styles.statItem}>
            <Feather name="clock" size={18} color="#F59E0B" />
            <ThemedText style={styles.statValue}>{timeRemaining}</ThemedText>
            <ThemedText style={styles.statLabel}>Time Left</ThemedText>
          </View>
        </View>

        {isJoined && !isDefeated && (
          <View style={styles.attackSection}>
            <View style={styles.timingBar}>
              <View
                style={[
                  styles.hitZone,
                  {
                    left: `${hitZonePosition - 10}%`,
                    width: "20%",
                  },
                ]}
              >
                <ThemedText style={styles.hitZoneText}>HIT</ThemedText>
              </View>
              {isTimingActive && (
                <View
                  style={[
                    styles.attackerIndicator,
                    { left: `${attackerPosition}%` },
                  ]}
                />
              )}
              {!isTimingActive && attackCooldown === 0 && (
                <ThemedText style={styles.tapPrompt}>Tap to Attack!</ThemedText>
              )}
              {attackCooldown > 0 && (
                <ThemedText style={styles.cooldownText}>
                  Cooldown: {attackCooldown}s
                </ThemedText>
              )}
            </View>

            <Pressable
              style={[
                styles.attackButton,
                (attackCooldown > 0 || isAttacking) && styles.attackButtonDisabled,
                isTimingActive && styles.attackButtonActive,
              ]}
              onPress={handleAttackTap}
              disabled={attackCooldown > 0 || isAttacking}
            >
              <Feather name="zap" size={24} color={isTimingActive ? "#fff" : "#000"} />
              <ThemedText
                style={[
                  styles.attackButtonText,
                  isTimingActive && styles.attackButtonTextActive,
                ]}
              >
                {isTimingActive
                  ? "TAP NOW!"
                  : attackCooldown > 0
                  ? `Wait ${attackCooldown}s`
                  : "Start Attack"}
              </ThemedText>
            </Pressable>
          </View>
        )}

        {!isJoined && !isDefeated && (
          <Pressable style={styles.joinButton} onPress={handleJoinRaid}>
            <Feather name="users" size={24} color="#000" />
            <ThemedText style={styles.joinButtonText}>Join Raid</ThemedText>
          </Pressable>
        )}

        {isDefeated && rewards && (
          <View style={styles.victoryContainer}>
            <Feather name="award" size={48} color="#FFD700" />
            <ThemedText style={styles.victoryText}>VICTORY!</ThemedText>
            <View style={styles.rewardsGrid}>
              <View style={styles.rewardItem}>
                <ThemedText style={styles.rewardLabel}>Contribution</ThemedText>
                <ThemedText style={styles.rewardValue}>{rewards.contribution}%</ThemedText>
              </View>
              <View style={styles.rewardItem}>
                <ThemedText style={styles.rewardLabel}>CHY Earned</ThemedText>
                <ThemedText style={[styles.rewardValue, { color: "#F59E0B" }]}>
                  +{rewards.chyCoins}
                </ThemedText>
              </View>
              <View style={styles.rewardItem}>
                <ThemedText style={styles.rewardLabel}>XP Earned</ThemedText>
                <ThemedText style={[styles.rewardValue, { color: "#3B82F6" }]}>
                  +{rewards.xp}
                </ThemedText>
              </View>
            </View>
            {rewards.guaranteedEgg && (
              <View style={styles.bonusEgg}>
                <Feather name="gift" size={20} color="#A855F7" />
                <ThemedText style={styles.bonusEggText}>Bonus Egg Received!</ThemedText>
              </View>
            )}
          </View>
        )}

        {!isDefeated && (
          <Pressable style={styles.cancelButton} onPress={onCancel}>
            <ThemedText style={styles.cancelButtonText}>Leave Raid</ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    padding: Spacing.lg,
  },
  content: {
    alignItems: "center",
  },
  bossContainer: {
    marginBottom: Spacing.lg,
  },
  bossIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: GameColors.surface,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
  },
  damagePopup: {
    position: "absolute",
    top: -20,
    alignSelf: "center",
  },
  damageText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#EF4444",
  },
  bossName: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: Spacing.xs,
  },
  bossClass: {
    fontSize: 14,
    color: GameColors.textSecondary,
    marginBottom: Spacing.lg,
  },
  hpContainer: {
    width: "100%",
    marginBottom: Spacing.lg,
  },
  hpLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  hpLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  hpLabelText: {
    fontSize: 12,
    color: GameColors.textSecondary,
  },
  hpValue: {
    fontSize: 12,
    color: GameColors.textPrimary,
    fontFamily: "monospace",
  },
  hpBar: {
    height: 20,
    backgroundColor: GameColors.surfaceLight,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: GameColors.surface,
  },
  hpFill: {
    height: "100%",
    borderRadius: BorderRadius.xs,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: Spacing.xl,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: GameColors.textPrimary,
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: 10,
    color: GameColors.textSecondary,
  },
  attackSection: {
    width: "100%",
    marginBottom: Spacing.lg,
  },
  timingBar: {
    height: 48,
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    overflow: "hidden",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: GameColors.surfaceLight,
  },
  hitZone: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(34, 197, 94, 0.3)",
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: "#22C55E",
    justifyContent: "center",
    alignItems: "center",
  },
  hitZoneText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#22C55E",
  },
  attackerIndicator: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: GameColors.primary,
    shadowColor: GameColors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  tapPrompt: {
    textAlign: "center",
    color: GameColors.textSecondary,
    fontSize: 14,
  },
  cooldownText: {
    textAlign: "center",
    color: GameColors.textSecondary,
    fontSize: 14,
  },
  attackButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: GameColors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  attackButtonDisabled: {
    backgroundColor: GameColors.surfaceLight,
    opacity: 0.6,
  },
  attackButtonActive: {
    backgroundColor: "#EF4444",
  },
  attackButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  attackButtonTextActive: {
    color: "#fff",
  },
  joinButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: GameColors.primary,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl * 2,
    borderRadius: BorderRadius.md,
    width: "100%",
  },
  joinButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  victoryContainer: {
    alignItems: "center",
    padding: Spacing.xl,
  },
  victoryText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFD700",
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  rewardsGrid: {
    flexDirection: "row",
    gap: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  rewardItem: {
    alignItems: "center",
  },
  rewardLabel: {
    fontSize: 12,
    color: GameColors.textSecondary,
  },
  rewardValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: GameColors.textPrimary,
  },
  bonusEgg: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "rgba(168, 85, 247, 0.2)",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  bonusEggText: {
    color: "#A855F7",
    fontWeight: "bold",
  },
  cancelButton: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderWidth: 1,
    borderColor: GameColors.surfaceLight,
    borderRadius: BorderRadius.md,
  },
  cancelButtonText: {
    color: GameColors.textSecondary,
  },
});
