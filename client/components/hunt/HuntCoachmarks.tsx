import React, { useState } from "react";
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  Dimensions,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface CoachmarkStep {
  id: string;
  title: string;
  body: string;
}

const STEPS: CoachmarkStep[] = [
  {
    id: "welcome",
    title: "Welcome to Roachy Hunt!",
    body: "Explore your surroundings to find and collect Mystery Eggs. Each egg contains a Roachy creature of varying rarity!",
  },
  {
    id: "radius",
    title: "Your Catch Radius",
    body: "The circle around you shows your catch radius. Only eggs inside this area can be caught. Walk around to find more spawns!",
  },
  {
    id: "eggs",
    title: "Tap to Catch",
    body: "Tap any egg marker on the map to start a catch attempt. Complete the mini-game to collect the egg!",
  },
  {
    id: "inventory",
    title: "Your Egg Collection",
    body: "Collected eggs stack in your inventory. View them in the Eggs tab to see what you've gathered.",
  },
  {
    id: "pity",
    title: "Pity Counter",
    body: "The pity system guarantees rare drops after enough catches. Check your progress in the stats panel!",
  },
  {
    id: "explore",
    title: "Home & Explore",
    body: "When your area is cleared, wait for the Home Drop timer to respawn eggs, or walk 200-500m to find Explore spawns in new areas.",
  },
];

interface HuntCoachmarksProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function HuntCoachmarks({ visible, onClose, onComplete }: HuntCoachmarksProps) {
  const insets = useSafeAreaInsets();
  const [stepIndex, setStepIndex] = useState(0);

  const currentStep = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { marginTop: insets.top + 60, marginBottom: insets.bottom + 20 }]}>
          <View style={styles.progressRow}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  i === stepIndex && styles.progressDotActive,
                  i < stepIndex && styles.progressDotCompleted,
                ]}
              />
            ))}
          </View>

          <ThemedText style={styles.title}>{currentStep.title}</ThemedText>
          <ThemedText style={styles.body}>{currentStep.body}</ThemedText>

          <View style={styles.buttonRow}>
            <Pressable onPress={handleSkip} style={styles.skipBtn}>
              <ThemedText style={styles.skipText}>Skip All</ThemedText>
            </Pressable>
            <Button
              title={isLast ? "Get Started" : "Next"}
              onPress={handleNext}
              style={styles.nextBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  card: {
    backgroundColor: GameColors.cardDark,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: width - Spacing.lg * 2,
    maxWidth: 400,
    borderWidth: 1,
    borderColor: GameColors.accent,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: Spacing.lg,
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  progressDotActive: {
    backgroundColor: GameColors.accent,
    width: 20,
  },
  progressDotCompleted: {
    backgroundColor: GameColors.accent,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: GameColors.accent,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  body: {
    fontSize: 16,
    color: "#E0E0E0",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  skipBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  skipText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
  },
  nextBtn: {
    minWidth: 120,
  },
});
