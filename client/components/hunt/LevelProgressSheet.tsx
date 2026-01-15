import React from "react";
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  Dimensions,
} from "react-native";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface LevelProgressSheetProps {
  visible: boolean;
  onClose: () => void;
  level: number;
  xp: number;
  xpThisLevel: number;
  xpToNextLevel: number;
  dailyCap: number;
  dailyCapBase: number;
  dailyCapStreakBonus: number;
  warmth: number;
  warmthCap: number;
  streak: number;
  pity: { rareIn: number; epicIn: number; legendaryIn: number };
  unlockedFeatures: { trackerPing: boolean; secondAttempt: boolean; heatMode: boolean };
  nextUnlock: string | null;
  heatModeActive: boolean;
  heatModeUntil: string | null;
  warmthShopCosts: { trackerPing: number; secondAttempt: number; heatMode: number };
}

const LEVEL_ROADMAP = [
  { level: 1, unlocks: ["Base 25 hunts/day", "10 warmth cap"] },
  { level: 2, unlocks: ["No new unlocks"] },
  { level: 3, unlocks: ["Tracker Ping unlocked", "30 hunts/day"] },
  { level: 4, unlocks: ["Second Attempt unlocked", "15 warmth cap"] },
  { level: 5, unlocks: ["Heat Mode unlocked", "35 hunts/day"] },
  { level: 6, unlocks: ["20 warmth cap"] },
  { level: 7, unlocks: ["40 hunts/day"] },
  { level: 8, unlocks: ["No new unlocks"] },
  { level: 9, unlocks: ["30 warmth cap"] },
  { level: 10, unlocks: ["50 hunts/day", "Max level benefits"] },
];

export function LevelProgressSheet({
  visible,
  onClose,
  level,
  xp,
  xpThisLevel,
  xpToNextLevel,
  dailyCap,
  dailyCapBase,
  dailyCapStreakBonus,
  warmth,
  warmthCap,
  streak,
  pity,
  unlockedFeatures,
  nextUnlock,
  heatModeActive,
  heatModeUntil,
  warmthShopCosts,
}: LevelProgressSheetProps) {
  const insets = useSafeAreaInsets();
  const xpProgress = xpToNextLevel > 0 ? (xpThisLevel / xpToNextLevel) * 100 : 100;

  const formatHeatModeTime = () => {
    if (!heatModeActive || !heatModeUntil) return null;
    const remaining = new Date(heatModeUntil).getTime() - Date.now();
    if (remaining <= 0) return null;
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        
        <Animated.View
          entering={SlideInDown.springify().damping(18)}
          style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.lg }]}
        >
          <LinearGradient
            colors={["#1a1510", "#12100d", "#0a0908"]}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>Level Progress</ThemedText>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={22} color={GameColors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.heroCard}>
              <LinearGradient
                colors={["rgba(255,170,50,0.15)", "rgba(255,170,50,0.05)", "transparent"]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.levelBadgeLarge}>
                <LinearGradient
                  colors={["#FFD700", "#FFA500", "#FF8C00"]}
                  style={styles.levelBadgeGradient}
                >
                  <ThemedText style={styles.levelNumber}>Lv.{level}</ThemedText>
                </LinearGradient>
              </View>

              <View style={styles.xpSection}>
                <View style={styles.xpBarContainer}>
                  <View style={[styles.xpBarFill, { width: `${Math.min(xpProgress, 100)}%` }]}>
                    <LinearGradient
                      colors={["#FFD700", "#FFA500"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </View>
                </View>
                <ThemedText style={styles.xpText}>
                  {xpThisLevel.toLocaleString()} / {xpToNextLevel.toLocaleString()} XP
                </ThemedText>
                {nextUnlock && (
                  <ThemedText style={styles.nextUnlockText}>
                    Next: {nextUnlock}
                  </ThemedText>
                )}
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Unlocked Benefits</ThemedText>
              <View style={styles.benefitsGrid}>
                <View style={styles.benefitChip}>
                  <Feather name="target" size={14} color={GameColors.gold} />
                  <ThemedText style={styles.benefitText}>
                    {dailyCapBase}/day cap
                    {dailyCapStreakBonus > 0 && (
                      <ThemedText style={styles.bonusText}> +{dailyCapStreakBonus}</ThemedText>
                    )}
                  </ThemedText>
                </View>
                <View style={styles.benefitChip}>
                  <Feather name="thermometer" size={14} color="#FF6B6B" />
                  <ThemedText style={styles.benefitText}>{warmthCap} warmth cap</ThemedText>
                </View>
                <View style={[styles.benefitChip, !unlockedFeatures.trackerPing && styles.lockedChip]}>
                  <Feather name="navigation" size={14} color={unlockedFeatures.trackerPing ? "#60A5FA" : GameColors.textTertiary} />
                  <ThemedText style={[styles.benefitText, !unlockedFeatures.trackerPing && styles.lockedText]}>
                    Tracker Ping ({warmthShopCosts.trackerPing}w)
                  </ThemedText>
                  {!unlockedFeatures.trackerPing && <ThemedText style={styles.lockLabel}>Lv.3</ThemedText>}
                </View>
                <View style={[styles.benefitChip, !unlockedFeatures.secondAttempt && styles.lockedChip]}>
                  <Feather name="rotate-ccw" size={14} color={unlockedFeatures.secondAttempt ? "#34D399" : GameColors.textTertiary} />
                  <ThemedText style={[styles.benefitText, !unlockedFeatures.secondAttempt && styles.lockedText]}>
                    Second Attempt ({warmthShopCosts.secondAttempt}w)
                  </ThemedText>
                  {!unlockedFeatures.secondAttempt && <ThemedText style={styles.lockLabel}>Lv.4</ThemedText>}
                </View>
                <View style={[styles.benefitChip, !unlockedFeatures.heatMode && styles.lockedChip]}>
                  <Feather name="zap" size={14} color={unlockedFeatures.heatMode ? "#FBBF24" : GameColors.textTertiary} />
                  <ThemedText style={[styles.benefitText, !unlockedFeatures.heatMode && styles.lockedText]}>
                    Heat Mode ({warmthShopCosts.heatMode}w)
                    {heatModeActive && (
                      <ThemedText style={styles.activeText}> Active: {formatHeatModeTime()}</ThemedText>
                    )}
                  </ThemedText>
                  {!unlockedFeatures.heatMode && <ThemedText style={styles.lockLabel}>Lv.5</ThemedText>}
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Your Progress</ThemedText>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Feather name="zap" size={18} color="#FBBF24" />
                  <ThemedText style={styles.statValue}>{streak}</ThemedText>
                  <ThemedText style={styles.statLabel}>day streak</ThemedText>
                </View>
                <View style={styles.statCard}>
                  <Feather name="thermometer" size={18} color="#FF6B6B" />
                  <ThemedText style={styles.statValue}>{warmth}/{warmthCap}</ThemedText>
                  <ThemedText style={styles.statLabel}>warmth</ThemedText>
                </View>
              </View>

              <View style={styles.pitySection}>
                <ThemedText style={styles.pityTitle}>Next Guaranteed Drop</ThemedText>
                <View style={styles.pityRow}>
                  <View style={styles.pityItem}>
                    <ThemedText style={[styles.pityCount, { color: "#60A5FA" }]}>{pity.rareIn}</ThemedText>
                    <ThemedText style={styles.pityLabel}>Rare</ThemedText>
                  </View>
                  <View style={[styles.pityDot, { backgroundColor: "#4B5563" }]} />
                  <View style={styles.pityItem}>
                    <ThemedText style={[styles.pityCount, { color: "#C084FC" }]}>{pity.epicIn}</ThemedText>
                    <ThemedText style={styles.pityLabel}>Epic</ThemedText>
                  </View>
                  <View style={[styles.pityDot, { backgroundColor: "#4B5563" }]} />
                  <View style={styles.pityItem}>
                    <ThemedText style={[styles.pityCount, { color: "#FBBF24" }]}>{pity.legendaryIn}</ThemedText>
                    <ThemedText style={styles.pityLabel}>Legendary</ThemedText>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>How to Earn XP</ThemedText>
              <View style={styles.xpInfoList}>
                <View style={styles.xpInfoRow}>
                  <ThemedText style={styles.xpInfoLabel}>Perfect catch</ThemedText>
                  <ThemedText style={[styles.xpInfoValue, { color: "#FBBF24" }]}>+150 XP</ThemedText>
                </View>
                <View style={styles.xpInfoRow}>
                  <ThemedText style={styles.xpInfoLabel}>Great catch</ThemedText>
                  <ThemedText style={[styles.xpInfoValue, { color: "#60A5FA" }]}>+75 XP</ThemedText>
                </View>
                <View style={styles.xpInfoRow}>
                  <ThemedText style={styles.xpInfoLabel}>Good catch</ThemedText>
                  <ThemedText style={[styles.xpInfoValue, { color: "#9CA3AF" }]}>+30 XP</ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Roadmap (Lv.1–10)</ThemedText>
              <View style={styles.roadmapList}>
                {LEVEL_ROADMAP.map((item) => (
                  <View
                    key={item.level}
                    style={[
                      styles.roadmapRow,
                      item.level === level && styles.roadmapRowCurrent,
                      item.level < level && styles.roadmapRowCompleted,
                    ]}
                  >
                    <View style={[
                      styles.roadmapLevel,
                      item.level === level && styles.roadmapLevelCurrent,
                      item.level < level && styles.roadmapLevelCompleted,
                    ]}>
                      <ThemedText style={[
                        styles.roadmapLevelText,
                        item.level <= level && styles.roadmapLevelTextActive,
                      ]}>
                        {item.level}
                      </ThemedText>
                    </View>
                    <View style={styles.roadmapContent}>
                      {item.unlocks.map((unlock, i) => (
                        <ThemedText
                          key={i}
                          style={[
                            styles.roadmapUnlock,
                            item.level <= level && styles.roadmapUnlockActive,
                          ]}
                        >
                          {unlock}
                        </ThemedText>
                      ))}
                    </View>
                    {item.level < level && (
                      <Feather name="check" size={16} color="#34D399" />
                    )}
                    {item.level === level && (
                      <View style={styles.currentBadge}>
                        <ThemedText style={styles.currentBadgeText}>NOW</ThemedText>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    maxHeight: SCREEN_HEIGHT * 0.85,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  closeBtn: {
    padding: Spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  heroCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(255,170,50,0.2)",
    overflow: "hidden",
    alignItems: "center",
  },
  levelBadgeLarge: {
    marginBottom: Spacing.md,
  },
  levelBadgeGradient: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  levelNumber: {
    fontSize: 28,
    fontWeight: "800",
    color: "#000",
    letterSpacing: 1,
  },
  xpSection: {
    width: "100%",
    alignItems: "center",
  },
  xpBarContainer: {
    width: "100%",
    height: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  xpBarFill: {
    height: "100%",
    borderRadius: 6,
    overflow: "hidden",
  },
  xpText: {
    fontSize: 14,
    color: GameColors.textSecondary,
    fontWeight: "600",
  },
  nextUnlockText: {
    fontSize: 12,
    color: GameColors.gold,
    marginTop: 4,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: GameColors.textSecondary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  benefitsGrid: {
    gap: Spacing.sm,
  },
  benefitChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  lockedChip: {
    opacity: 0.5,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  benefitText: {
    fontSize: 14,
    color: GameColors.textPrimary,
    flex: 1,
  },
  lockedText: {
    color: GameColors.textTertiary,
  },
  lockLabel: {
    fontSize: 10,
    color: GameColors.textTertiary,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bonusText: {
    color: "#34D399",
    fontWeight: "700",
  },
  activeText: {
    color: "#FBBF24",
    fontWeight: "700",
  },
  statsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: GameColors.textSecondary,
  },
  pitySection: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  pityTitle: {
    fontSize: 11,
    color: GameColors.textTertiary,
    textAlign: "center",
    marginBottom: Spacing.sm,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  pityRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  pityItem: {
    alignItems: "center",
  },
  pityCount: {
    fontSize: 20,
    fontWeight: "700",
  },
  pityLabel: {
    fontSize: 10,
    color: GameColors.textTertiary,
    textTransform: "uppercase",
    marginTop: 2,
  },
  pityDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  xpInfoList: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  xpInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  xpInfoLabel: {
    fontSize: 14,
    color: GameColors.textSecondary,
  },
  xpInfoValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  roadmapList: {
    gap: Spacing.sm,
  },
  roadmapRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  roadmapRowCurrent: {
    backgroundColor: "rgba(255,170,50,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,170,50,0.3)",
  },
  roadmapRowCompleted: {
    backgroundColor: "rgba(52,211,153,0.05)",
  },
  roadmapLevel: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  roadmapLevelCurrent: {
    backgroundColor: GameColors.gold,
  },
  roadmapLevelCompleted: {
    backgroundColor: "#34D399",
  },
  roadmapLevelText: {
    fontSize: 14,
    fontWeight: "700",
    color: GameColors.textTertiary,
  },
  roadmapLevelTextActive: {
    color: "#000",
  },
  roadmapContent: {
    flex: 1,
  },
  roadmapUnlock: {
    fontSize: 13,
    color: GameColors.textTertiary,
  },
  roadmapUnlockActive: {
    color: GameColors.textPrimary,
  },
  currentBadge: {
    backgroundColor: GameColors.gold,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#000",
  },
});
