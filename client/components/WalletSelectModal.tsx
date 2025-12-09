import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { GameColors, Spacing, BorderRadius } from '@/constants/theme';
import { useWallet, WALLET_PROVIDERS, WalletProviderType } from '@/context/WalletContext';

interface WalletSelectModalProps {
  visible: boolean;
  onClose: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function WalletSelectModal({ visible, onClose }: WalletSelectModalProps) {
  const { connectWallet, wallet } = useWallet();

  const handleSelectWallet = async (providerId: WalletProviderType) => {
    const success = await connectWallet(providerId);
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
              Choose a Solana wallet to connect
            </ThemedText>

            <View style={styles.walletList}>
              {WALLET_PROVIDERS.map((provider, index) => (
                <AnimatedPressable
                  key={provider.id}
                  entering={FadeInDown.delay(index * 50).springify()}
                  style={styles.walletOption}
                  onPress={() => handleSelectWallet(provider.id)}
                  disabled={wallet.isConnecting}
                >
                  <View style={styles.walletIconContainer}>
                    <Feather 
                      name={provider.iconName as any} 
                      size={28} 
                      color={GameColors.primary} 
                    />
                  </View>
                  <View style={styles.walletInfo}>
                    <ThemedText style={styles.walletName}>
                      {provider.name}
                    </ThemedText>
                    <ThemedText style={styles.walletDescription}>
                      {provider.id === 'phantom' ? 'Most popular Solana wallet' :
                       provider.id === 'solflare' ? 'Feature-rich Solana wallet' :
                       'Multi-chain wallet'}
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
              ))}
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
