import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Dimensions,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GameColors } from "@/constants/theme";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface WhatNextSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function WhatNextSheet({ visible, onClose, title, children }: WhatNextSheetProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      console.log("[HuntUI] WhatNextSheet mounted", { visible });
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouchable} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              transform: [{ translateY: slideAnim }],
              maxHeight: SCREEN_HEIGHT * 0.7,
              paddingBottom: insets.bottom + 12,
            },
          ]}
        >
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>{title}</ThemedText>
            <Pressable style={styles.closeButton} onPress={onClose} hitSlop={12}>
              <Feather name="x" size={20} color={GameColors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

export function WhatNextContent() {
  return (
    <View style={styles.content}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="target" size={16} color={GameColors.primary} />
          <ThemedText style={styles.sectionTitle}>Catch Eggs</ThemedText>
        </View>
        <ThemedText style={styles.sectionText}>
          Tap nearby egg markers on the map to catch.
        </ThemedText>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="zap" size={16} color="#FF6B35" />
          <ThemedText style={styles.sectionTitle}>Micro / Hot Drop</ThemedText>
        </View>
        <ThemedText style={styles.sectionText}>
          Use Micro for quick nearby spawns.{"\n"}
          Use Hot Drop for a bigger radius, limited time.
        </ThemedText>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="map-pin" size={16} color={GameColors.gold} />
          <ThemedText style={styles.sectionTitle}>Quests</ThemedText>
        </View>
        <ThemedText style={styles.sectionText}>
          Follow the quest marker. Eggs inside the quest radius count.
        </ThemedText>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="wifi-off" size={16} color="#D4A017" />
          <ThemedText style={styles.sectionTitle}>Weak GPS?</ThemedText>
        </View>
        <ThemedText style={styles.sectionText}>
          Step outside, wait a few seconds, then try again.
        </ThemedText>
      </View>
    </View>
  );
}

export function FaqContent() {
  return (
    <View style={styles.content}>
      <View style={styles.faqItem}>
        <ThemedText style={styles.faqQuestion}>Why "Weak GPS"?</ThemedText>
        <ThemedText style={styles.faqAnswer}>Indoor/low accuracy. Move outside.</ThemedText>
      </View>

      <View style={styles.faqItem}>
        <ThemedText style={styles.faqQuestion}>Why no spawns?</ThemedText>
        <ThemedText style={styles.faqAnswer}>
          Area cleared. Wait for Home drop timer or start Micro/Hot Drop.
        </ThemedText>
      </View>

      <View style={styles.faqItem}>
        <ThemedText style={styles.faqQuestion}>Why can't I catch?</ThemedText>
        <ThemedText style={styles.faqAnswer}>
          You must be within radius and have a valid spawn.
        </ThemedText>
      </View>

      <View style={styles.faqItem}>
        <ThemedText style={styles.faqQuestion}>What is Home Drop?</ThemedText>
        <ThemedText style={styles.faqAnswer}>
          Spawns that appear near your location every few minutes.
        </ThemedText>
      </View>

      <View style={styles.faqItem}>
        <ThemedText style={styles.faqQuestion}>What is a Quest?</ThemedText>
        <ThemedText style={styles.faqAnswer}>
          A timed event with eggs at a specific location. Walk there to catch them.
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  backdropTouchable: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: GameColors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 153, 51, 0.1)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  content: {
    gap: 16,
  },
  section: {
    gap: 6,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  sectionText: {
    fontSize: 13,
    color: GameColors.textSecondary,
    lineHeight: 18,
    paddingLeft: 24,
  },
  faqItem: {
    gap: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 153, 51, 0.08)",
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.primary,
  },
  faqAnswer: {
    fontSize: 13,
    color: GameColors.textSecondary,
    lineHeight: 18,
  },
});
