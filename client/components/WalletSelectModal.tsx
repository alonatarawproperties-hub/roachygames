import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { WalletSwitchWarning } from '@/components/WalletSwitchWarning';
import { GameColors, Spacing, BorderRadius } from '@/constants/theme';
import { useWallet, WALLET_PROVIDERS } from '@/context/WalletContext';
import { useAuth } from '@/context/AuthContext';

type WalletProviderType = 'phantom' | 'solflare' | 'backpack';

interface WalletProviderInfo {
  id: WalletProviderType;
  name: string;
  iconName: string;
}

interface WalletSelectModalProps {
  visible: boolean;
  onClose: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function WalletSelectModal({ visible, onClose }: WalletSelectModalProps) {
  const { connectWallet, wallet, signMessage } = useWallet();
  const { user, linkWallet } = useAuth();
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [showSwitchWarning, setShowSwitchWarning] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<{
    providerId: string;
    newAddress: string;
  } | null>(null);
  const [pendingLink, setPendingLink] = useState<string | null>(null);
  const prevWalletAddressRef = useRef<string | null>(null);

  useEffect(() => {
    const processWalletLink = async (newAddress: string) => {
      if (user?.walletAddress && user.walletAddress !== newAddress) {
        setPendingConnection({ providerId: wallet.provider || 'phantom', newAddress });
        setShowSwitchWarning(true);
        setConnectingProvider(null);
        setPendingLink(null);
        return;
      }
      
      if (user) {
        const result = await linkWallet(newAddress, signMessage);
        if (!result.success) {
          Alert.alert('Wallet Link Failed', result.error || 'Could not link wallet to your account');
        } else if (result.pendingSwitch) {
          Alert.alert(
            'Wallet Switch Initiated',
            `Your wallet switch is pending. It will complete after the 24-hour security cooldown.`
          );
        }
      }
      
      setConnectingProvider(null);
      setPendingLink(null);
      onClose();
    };

    if (wallet.connected && wallet.address && pendingLink && wallet.address !== prevWalletAddressRef.current) {
      prevWalletAddressRef.current = wallet.address;
      processWalletLink(wallet.address);
    }
  }, [wallet.connected, wallet.address, wallet.provider, pendingLink, user, linkWallet, signMessage, onClose]);

  const handleConnectWallet = async (providerId: string) => {
    setConnectingProvider(providerId);
    setPendingLink(providerId);
    prevWalletAddressRef.current = wallet.address;
    
    try {
      const newAddress = await connectWallet(providerId as 'phantom' | 'solflare' | 'backpack');
      
      if (newAddress) {
        if (user?.walletAddress && user.walletAddress !== newAddress) {
          setPendingConnection({ providerId, newAddress });
          setShowSwitchWarning(true);
          setConnectingProvider(null);
          setPendingLink(null);
          return;
        }
        
        if (user) {
          const result = await linkWallet(newAddress, signMessage);
          if (!result.success) {
            Alert.alert('Wallet Link Failed', result.error || 'Could not link wallet to your account');
          } else if (result.pendingSwitch) {
            Alert.alert(
              'Wallet Switch Initiated',
              `Your wallet switch is pending. It will complete after the 24-hour security cooldown.`
            );
          }
        }
        
        setConnectingProvider(null);
        setPendingLink(null);
        onClose();
      }
    } catch (error) {
      console.error('[WalletSelectModal] Connect error:', error);
      setConnectingProvider(null);
    }
  };

  const handleConfirmSwitch = async () => {
    if (!pendingConnection || !user) return;
    
    setShowSwitchWarning(false);
    
    const result = await linkWallet(pendingConnection.newAddress, signMessage);
    if (result.success && !result.pendingSwitch) {
      onClose();
    } else if (result.pendingSwitch) {
      Alert.alert(
        'Wallet Switch Initiated', 
        `Your wallet switch is pending. It will complete after the 24-hour security cooldown.`
      );
      onClose();
    } else {
      Alert.alert('Wallet Switch Failed', result.error || 'Could not switch wallets');
    }
    
    setPendingConnection(null);
  };

  const handleCancelSwitch = () => {
    setShowSwitchWarning(false);
    setPendingConnection(null);
  };

  const handleClose = () => {
    setConnectingProvider(null);
    setPendingLink(null);
    onClose();
  };

  const getIconColor = (providerId: string) => {
    switch (providerId) {
      case 'phantom':
        return '#AB9FF2';
      case 'solflare':
        return '#FC9936';
      case 'backpack':
        return '#E33E3F';
      default:
        return GameColors.primary;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Animated.View 
          entering={FadeInDown.springify()}
          style={styles.content}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <ThemedText type="h4" style={styles.title}>
                Connect Wallet
              </ThemedText>
              <Pressable onPress={handleClose} style={styles.closeButton}>
                <Feather name="x" size={24} color={GameColors.textSecondary} />
              </Pressable>
            </View>

            <ThemedText style={styles.subtitle}>
              Choose your Solana wallet to connect
            </ThemedText>

            <View style={styles.walletList}>
              {(WALLET_PROVIDERS as WalletProviderInfo[]).map((provider: WalletProviderInfo, index: number) => (
                <AnimatedPressable
                  key={provider.id}
                  entering={FadeInDown.delay(index * 50).springify()}
                  style={[
                    styles.walletOption,
                    connectingProvider === provider.id && styles.walletOptionActive
                  ]}
                  onPress={() => handleConnectWallet(provider.id)}
                  disabled={wallet.isConnecting}
                >
                  <View style={[
                    styles.walletIconContainer,
                    { backgroundColor: getIconColor(provider.id) + '20' }
                  ]}>
                    <Feather 
                      name={provider.iconName as any} 
                      size={28} 
                      color={getIconColor(provider.id)} 
                    />
                  </View>
                  <View style={styles.walletInfo}>
                    <ThemedText style={styles.walletName}>
                      {provider.name}
                    </ThemedText>
                    <ThemedText style={styles.walletDescription}>
                      {getWalletDescription(provider.id)}
                    </ThemedText>
                  </View>
                  {connectingProvider === provider.id ? (
                    <ActivityIndicator size="small" color={getIconColor(provider.id)} />
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

      {pendingConnection && user?.walletAddress ? (
        <WalletSwitchWarning
          visible={showSwitchWarning}
          onClose={handleCancelSwitch}
          onConfirm={handleConfirmSwitch}
          currentWallet={user.walletAddress}
          newWallet={pendingConnection.newAddress}
          cooldownHours={24}
          isLoading={false}
        />
      ) : null}
    </Modal>
  );
}

function getWalletDescription(providerId: string): string {
  switch (providerId) {
    case 'phantom':
      return 'Most popular Solana wallet';
    case 'solflare':
      return 'Full-featured Solana wallet';
    case 'backpack':
      return 'Multi-chain crypto wallet';
    default:
      return 'Connect your wallet';
  }
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
  walletOptionActive: {
    borderColor: GameColors.primary,
  },
  walletIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
