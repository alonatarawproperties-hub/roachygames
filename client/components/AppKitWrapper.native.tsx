import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { 
  createAppKit,
  AppKit, 
  AppKitButton,
  useAccount,
  useAppKitState,
  useAppKit,
  solana,
  type Storage,
} from '@reown/appkit-react-native';
import { SolanaAdapter } from '@reown/appkit-solana-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const projectId = process.env.EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID || process.env.WALLETCONNECT_PROJECT_ID || '';

const appKitStorage: Storage = {
  async getKeys(): Promise<string[]> {
    const keys = await AsyncStorage.getAllKeys();
    return keys.filter(k => k.startsWith('@appkit/') || k.startsWith('WALLETCONNECT'));
  },
  async getEntries<T = any>(): Promise<[string, T][]> {
    const keys = await this.getKeys();
    const entries: [string, T][] = [];
    for (const key of keys) {
      const value = await this.getItem<T>(key);
      if (value !== undefined) {
        entries.push([key, value]);
      }
    }
    return entries;
  },
  async getItem<T = any>(key: string): Promise<T | undefined> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : undefined;
    } catch {
      return undefined;
    }
  },
  async setItem<T = any>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },
  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },
};

const solanaAdapter = new SolanaAdapter();

const metadata = {
  name: 'Roachy Games',
  description: 'P2E Arcade Platform on Solana',
  url: 'https://roachygames.com',
  icons: ['https://roachygames.com/icon.png'],
  redirect: {
    native: 'roachy-games://',
    universal: 'https://roachygames.com',
  },
};

let appKitInitialized = false;

function initializeAppKit() {
  if (appKitInitialized || !projectId) {
    console.log('[AppKit] Already initialized or missing projectId');
    return;
  }
  
  try {
    createAppKit({
      projectId,
      adapters: [solanaAdapter],
      networks: [solana],
      metadata,
      storage: appKitStorage,
    });
    appKitInitialized = true;
    console.log('[AppKit] Initialized successfully');
  } catch (error) {
    console.error('[AppKit] Initialization error:', error);
  }
}

interface AppKitWrapperProps {
  children: ReactNode;
}

export function AppKitWrapper({ children }: AppKitWrapperProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initializeAppKit();
    setIsReady(true);
  }, []);

  if (!isReady) {
    return <View style={styles.container}>{children}</View>;
  }

  return (
    <View style={styles.container}>
      {children}
      <AppKit />
    </View>
  );
}

export function useAppKitWallet() {
  const { address, isConnected } = useAccount();
  const { open } = useAppKit();
  const { isOpen } = useAppKitState();

  const openModal = useCallback(() => {
    try {
      open();
    } catch (error) {
      console.error('[AppKit] Error opening modal:', error);
    }
  }, [open]);

  return {
    address: address || null,
    isConnected,
    isLoading: isOpen,
    openModal,
  };
}

export { AppKitButton };

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
