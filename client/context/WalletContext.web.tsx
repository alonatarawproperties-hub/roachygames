import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WalletState {
  connected: boolean;
  address: string | null;
  provider: string | null;
  isConnecting: boolean;
}

type WalletProviderType = 'phantom' | 'solflare' | 'backpack';

interface WalletContextType {
  wallet: WalletState;
  connectWallet: (provider?: WalletProviderType) => Promise<string | null>;
  disconnectWallet: () => Promise<void>;
  signMessage: (message: string) => Promise<string | null>;
  isLoading: boolean;
  openWalletModal: () => void;
  isAppKitReady: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const WALLET_STORAGE_KEY = '@wallet_connection';

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    address: null,
    provider: null,
    isConnecting: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSavedWallet();
  }, []);

  const loadSavedWallet = async () => {
    try {
      const saved = await AsyncStorage.getItem(WALLET_STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        setWallet({
          connected: true,
          address: data.address,
          provider: data.provider || 'walletconnect',
          isConnecting: false,
        });
      }
    } catch (error) {
      console.log('[Wallet] Error loading saved wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openWalletModal = () => {
    console.log('[Wallet] Web wallet connection - use TestFlight app');
  };

  const connectWallet = async (_provider?: WalletProviderType): Promise<string | null> => {
    console.log('[Wallet] Web wallet connection - use TestFlight app');
    return null;
  };

  const disconnectWallet = async () => {
    setWallet({
      connected: false,
      address: null,
      provider: null,
      isConnecting: false,
    });
    await AsyncStorage.removeItem(WALLET_STORAGE_KEY);
    console.log('[Wallet] Disconnected');
  };

  const signMessage = async (_message: string): Promise<string | null> => {
    console.log('[Wallet] Web message signing - use TestFlight app');
    return null;
  };

  return (
    <WalletContext.Provider
      value={{
        wallet,
        connectWallet,
        disconnectWallet,
        signMessage,
        isLoading,
        openWalletModal,
        isAppKitReady: false,
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

export { WalletContext };

export const WALLET_PROVIDERS: Array<{ id: WalletProviderType; name: string; iconName: string }> = [
  {
    id: 'phantom',
    name: 'Phantom',
    iconName: 'credit-card',
  },
  {
    id: 'solflare',
    name: 'Solflare',
    iconName: 'sun',
  },
  {
    id: 'backpack',
    name: 'Backpack',
    iconName: 'package',
  },
];
