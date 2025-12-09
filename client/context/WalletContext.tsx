import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const WALLET_STORAGE_KEY = 'roachy_solana_wallet';
const WALLET_PROVIDER_KEY = 'roachy_wallet_provider';

export type WalletProviderType = 'phantom' | 'solflare' | 'backpack';

interface WalletProviderInfo {
  id: WalletProviderType;
  name: string;
  iconName: string;
  deepLinkScheme: string;
  appStoreUrl: string;
}

export const WALLET_PROVIDERS: WalletProviderInfo[] = [
  {
    id: 'phantom',
    name: 'Phantom',
    iconName: 'smartphone',
    deepLinkScheme: 'phantom://',
    appStoreUrl: 'https://phantom.app/download',
  },
  {
    id: 'solflare',
    name: 'Solflare',
    iconName: 'sun',
    deepLinkScheme: 'solflare://',
    appStoreUrl: 'https://solflare.com/download',
  },
  {
    id: 'backpack',
    name: 'Backpack',
    iconName: 'package',
    deepLinkScheme: 'backpack://',
    appStoreUrl: 'https://backpack.app/',
  },
];

interface WalletState {
  connected: boolean;
  address: string | null;
  provider: WalletProviderType | null;
  isConnecting: boolean;
}

interface WalletContextType {
  wallet: WalletState;
  connectWallet: (provider: WalletProviderType) => Promise<boolean>;
  disconnectWallet: () => Promise<void>;
  isLoading: boolean;
  providers: WalletProviderInfo[];
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    address: null,
    provider: null,
    isConnecting: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredWallet();
  }, []);

  const loadStoredWallet = async () => {
    try {
      const storedAddress = await AsyncStorage.getItem(WALLET_STORAGE_KEY);
      const storedProvider = await AsyncStorage.getItem(WALLET_PROVIDER_KEY) as WalletProviderType | null;
      
      if (storedAddress && storedProvider) {
        setWallet({
          connected: true,
          address: storedAddress,
          provider: storedProvider,
          isConnecting: false,
        });
      }
    } catch (error) {
      console.error('Error loading stored wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const connectWallet = useCallback(async (providerId: WalletProviderType): Promise<boolean> => {
    const provider = WALLET_PROVIDERS.find(p => p.id === providerId);
    if (!provider) return false;

    setWallet(prev => ({ ...prev, isConnecting: true }));

    try {
      Alert.alert(
        'Coming Soon',
        `${provider.name} wallet integration is coming in an upcoming update! Full Solana Mobile Wallet Adapter support with NFT minting will be available soon.\n\nFor now, enjoy the game in guest mode - your progress will be saved and can be linked to your wallet later.`,
        [{ text: 'Got it!', onPress: () => setWallet(prev => ({ ...prev, isConnecting: false })) }]
      );
      return false;
    } catch (error) {
      console.error('Wallet connection error:', error);
      setWallet(prev => ({ ...prev, isConnecting: false }));
      return false;
    }
  }, []);

  const disconnectWallet = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(WALLET_STORAGE_KEY);
      await AsyncStorage.removeItem(WALLET_PROVIDER_KEY);
      
      setWallet({
        connected: false,
        address: null,
        provider: null,
        isConnecting: false,
      });
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  }, []);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        connectWallet,
        disconnectWallet,
        isLoading,
        providers: WALLET_PROVIDERS,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
