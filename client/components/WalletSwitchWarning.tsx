import React from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
} from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { ThemedText } from "./ThemedText";
import { Button } from "./Button";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";

interface WalletSwitchWarningProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentWallet: string;
  newWallet: string;
  cooldownHours: number;
  isLoading?: boolean;
}

export function WalletSwitchWarning({
  visible,
  onClose,
  onConfirm,
  currentWallet,
  newWallet,
  cooldownHours,
  isLoading = false,
}: WalletSwitchWarningProps) {
  const truncate = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onConfirm();
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={styles.overlay}
      >
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        
        <Animated.View
          entering={SlideInDown.springify().damping(15)}
          exiting={SlideOutDown.springify()}
          style={styles.container}
        >
          <View style={styles.iconContainer}>
            <View style={styles.warningIcon}>
              <Feather name="alert-triangle" size={32} color="#FFB800" />
            </View>
          </View>

          <ThemedText style={styles.title}>Switch Wallet?</ThemedText>
          
          <ThemedText style={styles.description}>
            You are about to switch to a different wallet. This is a security-sensitive action.
          </ThemedText>

          <View style={styles.walletCompare}>
            <View style={styles.walletBox}>
              <ThemedText style={styles.walletLabel}>Current Wallet</ThemedText>
              <View style={styles.walletAddress}>
                <Feather name="credit-card" size={16} color={GameColors.textSecondary} />
                <ThemedText style={styles.addressText}>{truncate(currentWallet)}</ThemedText>
              </View>
            </View>
            
            <View style={styles.arrowContainer}>
              <Feather name="arrow-down" size={24} color={GameColors.primary} />
            </View>
            
            <View style={[styles.walletBox, styles.newWalletBox]}>
              <ThemedText style={styles.walletLabel}>New Wallet</ThemedText>
              <View style={styles.walletAddress}>
                <Feather name="credit-card" size={16} color={GameColors.primary} />
                <ThemedText style={[styles.addressText, styles.newAddressText]}>{truncate(newWallet)}</ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.warningBox}>
            <Feather name="clock" size={20} color="#FFB800" />
            <View style={styles.warningContent}>
              <ThemedText style={styles.warningTitle}>
                {cooldownHours}-Hour Cooldown Period
              </ThemedText>
              <ThemedText style={styles.warningText}>
                After confirmation, you must wait {cooldownHours} hours before the switch takes effect. This protects your account from unauthorized changes.
              </ThemedText>
            </View>
          </View>

          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <Feather name="check-circle" size={16} color="#4ECDC4" />
              <ThemedText style={styles.infoText}>
                Your game progress and CHY balance are kept
              </ThemedText>
            </View>
            <View style={styles.infoItem}>
              <Feather name="check-circle" size={16} color="#4ECDC4" />
              <ThemedText style={styles.infoText}>
                Signature required to prove wallet ownership
              </ThemedText>
            </View>
            <View style={styles.infoItem}>
              <Feather name="x-circle" size={16} color="#FF6B6B" />
              <ThemedText style={styles.infoText}>
                On-chain rewards will go to the new wallet
              </ThemedText>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <Pressable style={styles.cancelButton} onPress={handleClose}>
              <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
            </Pressable>
            <Button
              onPress={handleConfirm}
              disabled={isLoading}
              style={styles.confirmButton}
            >
              {isLoading ? "Processing..." : "Continue with Switch"}
            </Button>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  container: {
    backgroundColor: GameColors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing.xl + 20,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  warningIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 184, 0, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: GameColors.textPrimary,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: 14,
    color: GameColors.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  walletCompare: {
    marginBottom: Spacing.lg,
  },
  walletBox: {
    backgroundColor: GameColors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  newWalletBox: {
    borderColor: GameColors.primary + "40",
    backgroundColor: GameColors.primary + "10",
  },
  walletLabel: {
    fontSize: 12,
    color: GameColors.textSecondary,
    marginBottom: Spacing.xs,
  },
  walletAddress: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  addressText: {
    fontSize: 16,
    fontFamily: "monospace",
    color: GameColors.textPrimary,
  },
  newAddressText: {
    color: GameColors.primary,
  },
  arrowContainer: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  warningBox: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 184, 0, 0.1)",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.2)",
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFB800",
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: GameColors.textSecondary,
    lineHeight: 18,
  },
  infoList: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  infoText: {
    fontSize: 13,
    color: GameColors.textSecondary,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: GameColors.surfaceLight,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.textSecondary,
  },
  confirmButton: {
    flex: 2,
  },
});
