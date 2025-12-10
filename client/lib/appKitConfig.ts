import '@walletconnect/react-native-compat';
import { createAppKit, solana } from '@reown/appkit-react-native';
import { SolanaAdapter } from '@reown/appkit-solana-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const projectId = Constants.expoConfig?.extra?.walletConnectProjectId || process.env.EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

if (!projectId) {
  console.warn('[AppKit] WalletConnect Project ID is not set. Wallet connection will not work.');
}

const solanaAdapter = new SolanaAdapter();

const storage = {
  async getKeys(): Promise<string[]> {
    const keys = await AsyncStorage.getAllKeys();
    return keys.filter(key => key.startsWith('@appkit/'));
  },
  async getEntries<T = unknown>(): Promise<[string, T][]> {
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
  async getItem<T = unknown>(key: string): Promise<T | undefined> {
    const value = await AsyncStorage.getItem(key);
    if (value) {
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    }
    return undefined;
  },
  async setItem<T = unknown>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },
  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },
};

const metadata = {
  name: 'Roachy Games',
  description: 'Play-to-earn arcade games on Solana',
  url: 'https://roachygames.com',
  icons: ['https://roachygames.com/icon.png'],
  redirect: {
    native: 'roachy-games://',
    universal: 'https://roachygames.com',
  },
};

let appKitInstance: ReturnType<typeof createAppKit> | null = null;

export function initializeAppKit() {
  if (!projectId) {
    console.warn('[AppKit] Cannot initialize - Project ID missing');
    return null;
  }
  
  if (appKitInstance) {
    return appKitInstance;
  }

  try {
    appKitInstance = createAppKit({
      projectId,
      networks: [solana],
      defaultNetwork: solana,
      adapters: [solanaAdapter],
      storage,
      metadata,
    });

    console.log('[AppKit] Initialized successfully');
    return appKitInstance;
  } catch (error) {
    console.error('[AppKit] Failed to initialize:', error);
    return null;
  }
}

export function getAppKit() {
  return appKitInstance;
}

export { projectId };
