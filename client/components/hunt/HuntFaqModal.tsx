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

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "What are Mystery Eggs?",
    answer: "Mystery Eggs contain Roachy creatures. Collect eggs by tapping spawns on the map. Each egg has a rarity (Common, Rare, Epic, Legendary) that determines the creature inside.",
  },
  {
    question: "How do spawns work?",
    answer: "Home spawns appear near your home location and respawn on a timer. Explore spawns appear when you walk 200-500m from home. Quest spawns appear at special markers during active quests.",
  },
  {
    question: "What is the Pity Counter?",
    answer: "Pity guarantees rare drops after enough catches. After X catches without a Rare, you're guaranteed one. Same for Epic and Legendary at higher thresholds.",
  },
  {
    question: "What does Warmth do?",
    answer: "Warmth is earned by catching eggs and maintains your streak. Higher warmth increases your catch multiplier. Don't let it drop to zero or you'll lose your streak!",
  },
  {
    question: "What are Quests?",
    answer: "Quests are special spawn events: Micro Hotspots (nearby bonus eggs), Hot Drops (medium distance, higher rarity), and Legendary Beacons (rare, guaranteed legendary chance).",
  },
  {
    question: "Why does my location jump?",
    answer: "GPS accuracy varies by device and environment. Buildings, trees, and weather affect signal. The app uses your best available location but some drift is normal.",
  },
  {
    question: "How do I catch more eggs?",
    answer: "Walk around to trigger Explore spawns in new areas. Complete quests for bonus spawns. Maintain your streak for multiplier bonuses. Wait for Home Drop timers to respawn eggs.",
  },
];

interface HuntFaqModalProps {
  visible: boolean;
  onClose: () => void;
}

export function HuntFaqModal({ visible, onClose }: HuntFaqModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Hunt FAQ</ThemedText>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Feather name="x" size={24} color="#FFF" />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
          showsVerticalScrollIndicator={false}
        >
          {FAQ_ITEMS.map((item, index) => (
            <View key={index} style={styles.faqItem}>
              <View style={styles.questionRow}>
                <Feather name="help-circle" size={18} color={GameColors.accent} />
                <ThemedText style={styles.question}>{item.question}</ThemedText>
              </View>
              <ThemedText style={styles.answer}>{item.answer}</ThemedText>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFF",
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  faqItem: {
    marginBottom: Spacing.lg,
    backgroundColor: GameColors.cardDark,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  questionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  question: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
    lineHeight: 22,
  },
  answer: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 21,
    marginLeft: 26,
  },
});
