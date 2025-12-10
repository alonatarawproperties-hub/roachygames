import React, { ReactNode } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { useWallet } from '@/context/WalletContext';

interface AppKitWrapperProps {
  children: ReactNode;
}

export function AppKitWrapper({ children }: AppKitWrapperProps) {
  return <View style={styles.container}>{children}</View>;
}

export function useAppKitWallet() {
  const { wallet, connectWallet, isLoading } = useWallet();
  
  return {
    address: wallet.address,
    isConnected: wallet.connected,
    isLoading: isLoading || wallet.isConnecting,
    openModal: () => {
      connectWallet();
    },
  };
}

export function AppKitButton() {
  const { isConnected, address, openModal, isLoading } = useAppKitWallet();
  
  const displayAddress = address 
    ? `${address.slice(0, 4)}...${address.slice(-4)}`
    : null;
  
  return (
    <Pressable 
      style={[styles.button, isConnected && styles.buttonConnected]}
      onPress={openModal}
      disabled={isLoading}
    >
      <Text style={styles.buttonText}>
        {isLoading 
          ? 'Connecting...' 
          : isConnected 
            ? displayAddress 
            : 'Connect Wallet'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  button: {
    backgroundColor: '#F59E0B',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonConnected: {
    backgroundColor: '#22C55E',
  },
  buttonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
});
