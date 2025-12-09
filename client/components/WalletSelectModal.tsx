import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { GameColors, Spacing, BorderRadius } from '@/constants/theme';
import { useWallet } from '../context/WalletContext';

interface WalletSelectModalProps {
  visible: boolean;
  onClose: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function WalletSelectModal({ visible, onClose }: WalletSelectModalProps) {
  const { connectWallet, wallet } = useWallet();

  const handleConnectWallet = async () => {
    const success = await connectWallet();
    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View 
          entering={FadeInDown.springify()}
          style={styles.content}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <ThemedText type="h4" style={styles.title}>
                Connect Wallet
              </ThemedText>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Feather name="x" size={24} color={GameColors.textSecondary} />
              </Pressable>
            </View>

            <ThemedText style={styles.subtitle}>
              Connect your Solana wallet via WalletConnect
            </ThemedText>

            <View style={styles.walletList}>
              <AnimatedPressable
                entering={FadeInDown.springify()}
                style={styles.walletOption}
                onPress={handleConnectWallet}
                disabled={wallet.isConnecting}
              >
                <View style={styles.walletIconContainer}>
                  <Feather 
                    name="link" 
                    size={28} 
                    color={GameColors.primary} 
                  />
                </View>
                <View style={styles.walletInfo}>
                  <ThemedText style={styles.walletName}>
                    WalletConnect
                  </ThemedText>
                  <ThemedText style={styles.walletDescription}>
                    Connect with Phantom, Solflare, and more
                  </ThemedText>
                </View>
                {wallet.isConnecting ? (
                  <ActivityIndicator size="small" color={GameColors.primary} />
                ) : (
                  <Feather 
                    name="chevron-right" 
                    size={20} 
                    color={GameColors.textSecondary} 
                  />
                )}
              </AnimatedPressable>
            </View>

            <View style={styles.supportedWallets}>
              <ThemedText style={styles.supportedLabel}>Supported wallets:</ThemedText>
              <View style={styles.walletBadges}>
                <View style={styles.walletBadge}>
                  <ThemedText style={styles.walletBadgeText}>Phantom</ThemedText>
                </View>
                <View style={styles.walletBadge}>
                  <ThemedText style={styles.walletBadgeText}>Solflare</ThemedText>
                </View>
                <View style={styles.walletBadge}>
                  <ThemedText style={styles.walletBadgeText}>Backpack</ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.footer}>
              <Feather name="shield" size={16} color={GameColors.textSecondary} />
              <ThemedText style={styles.footerText}>
                Your keys stay in your wallet. We never have access to your funds.
              </ThemedText>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: GameColors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl + 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    color: GameColors.textPrimary,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  subtitle: {
    color: GameColors.textSecondary,
    marginBottom: Spacing.lg,
  },
  walletList: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  walletOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GameColors.surfaceLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  walletIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: GameColors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  walletInfo: {
    flex: 1,
  },
  walletName: {
    fontSize: 16,
    fontWeight: '600',
    color: GameColors.textPrimary,
    marginBottom: 2,
  },
  walletDescription: {
    fontSize: 13,
    color: GameColors.textSecondary,
  },
  supportedWallets: {
    marginBottom: Spacing.lg,
  },
  supportedLabel: {
    fontSize: 12,
    color: GameColors.textSecondary,
    marginBottom: Spacing.sm,
  },
  walletBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  walletBadge: {
    backgroundColor: GameColors.surfaceLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  walletBadgeText: {
    fontSize: 12,
    color: GameColors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: GameColors.surfaceLight,
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    color: GameColors.textSecondary,
    lineHeight: 16,
  },
});
