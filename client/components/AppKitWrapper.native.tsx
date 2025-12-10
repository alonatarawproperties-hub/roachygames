import '@walletconnect/react-native-compat';
import React, { ReactNode, useEffect, useState } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { AppKitProvider, AppKit, useAppKit, useAccount } from '@reown/appkit-react-native';
import { initializeAppKit, projectId } from '@/lib/appKitConfig';

interface AppKitWrapperProps {
  children: ReactNode;
}

export function AppKitWrapper({ children }: AppKitWrapperProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [appKit, setAppKit] = useState<ReturnType<typeof initializeAppKit>>(null);

  useEffect(() => {
    const kit = initializeAppKit();
    setAppKit(kit);
    setIsInitialized(true);
  }, []);

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        {children}
      </View>
    );
  }

  if (!appKit || !projectId) {
    console.warn('[AppKitWrapper] AppKit not available - Project ID missing');
    return (
      <View style={styles.container}>
        {children}
      </View>
    );
  }

  return (
    <AppKitProvider instance={appKit}>
      <View style={styles.container}>
        {children}
      </View>
      <AppKit />
    </AppKitProvider>
  );
}

export function useAppKitWallet() {
  try {
    const { open } = useAppKit();
    const { address, isConnected } = useAccount();
    
    return {
      address: address || null,
      isConnected: isConnected || false,
      isLoading: false,
      openModal: () => {
        try {
          open();
        } catch (error) {
          console.error('[AppKit] Failed to open modal:', error);
        }
      },
    };
  } catch (error) {
    return {
      address: null,
      isConnected: false,
      isLoading: false,
      openModal: () => {
        console.warn('[AppKit] AppKit hooks not available outside provider');
      },
    };
  }
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
