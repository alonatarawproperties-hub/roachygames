import React from "react";
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { formatSeconds } from "@/lib/huntGuides";

export interface HelpSheetData {
  spawnsCount: number;
  homeNextTopUpInSec: number | null;
  questActive: boolean;
  questType?: string;
  distanceM?: number;
  direction?: string;
  expiresInSec?: number;
}

interface HuntHelpSheetProps {
  visible: boolean;
  onClose: () => void;
  data: HelpSheetData;
}

export function HuntHelpSheet({ visible, onClose, data }: HuntHelpSheetProps) {
  const insets = useSafeAreaInsets();

  const getStatusText = () => {
    if (data.spawnsCount >= 2) {
      return `${data.spawnsCount} eggs available in your radius`;
    }
    if (data.homeNextTopUpInSec && data.homeNextTopUpInSec > 0) {
      return `Area cleared. Next Home Drop in ${formatSeconds(data.homeNextTopUpInSec)}`;
    }
    return "Area cleared. Walk to find Explore spawns.";
  };

  const getQuestText = () => {
    if (!data.questActive) return null;
    const parts = [`Quest active: ${data.questType || "Unknown"}`];
    if (data.distanceM !== undefined) {
      parts.push(`${Math.round(data.distanceM)}m ${data.direction || ""}`);
    }
    if (data.expiresInSec !== undefined) {
      parts.push(`${formatSeconds(data.expiresInSec)} left`);
    }
    return parts.join(" • ");
  };

  const getRecommendation = () => {
    if (data.questActive) {
      return "Head toward the quest marker on the map for bonus spawns.";
    }
    if (data.spawnsCount >= 2) {
      return "Catch eggs in your radius before they expire!";
    }
    if (data.homeNextTopUpInSec && data.homeNextTopUpInSec > 0) {
      return "Wait for Home Drop timer or walk 200-500m to find Explore spawns.";
    }
    return "Walk around to discover new spawn areas.";
  };

  const questText = getQuestText();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View />
      </Pressable>
      <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <ThemedText style={styles.title}>What Next?</ThemedText>
          <Pressable onPress={onClose} hitSlop={12}>
            <Feather name="x" size={24} color="#999" />
          </Pressable>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>Current Status</ThemedText>
            <ThemedText style={styles.statusText}>{getStatusText()}</ThemedText>
            {questText && (
              <ThemedText style={styles.questText}>{questText}</ThemedText>
            )}
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>Recommendation</ThemedText>
            <View style={styles.recBox}>
              <Feather name="compass" size={20} color={GameColors.accent} />
              <ThemedText style={styles.recText}>{getRecommendation()}</ThemedText>
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>Quick Tips</ThemedText>
            <ThemedText style={styles.tipText}>• Pity guarantees rare eggs after enough catches</ThemedText>
            <ThemedText style={styles.tipText}>• Walking unlocks Explore spawns in new areas</ThemedText>
            <ThemedText style={styles.tipText}>• Quests provide bonus spawns at marked locations</ThemedText>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: GameColors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    maxHeight: "60%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignSelf: "center",
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFF",
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    marginBottom: Spacing.xs,
  },
  statusText: {
    fontSize: 16,
    color: "#E0E0E0",
    lineHeight: 22,
  },
  questText: {
    fontSize: 14,
    color: GameColors.accent,
    marginTop: Spacing.xs,
  },
  recBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    backgroundColor: "rgba(212,175,55,0.1)",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: GameColors.accent,
  },
  recText: {
    flex: 1,
    fontSize: 15,
    color: "#FFF",
    lineHeight: 22,
  },
  tipText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 22,
  },
});
