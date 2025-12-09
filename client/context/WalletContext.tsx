import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WalletState {
  connected: boolean;
  address: string | null;
  provider: string | null;
  isConnecting: boolean;
}

interface WalletContextType {
  wallet: WalletState;
  connectWallet: () => Promise<boolean>;
  disconnectWallet: () => Promise<void>;
  isLoading: boolean;
  openWalletModal: () => void;
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
    if (Platform.OS === 'web') {
      console.log('[Wallet] Web wallet connection coming soon');
      return;
    }
    console.log('[Wallet] Native wallet requires TestFlight build with AppKit');
  };

  const connectWallet = async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      console.log('[Wallet] Web wallet connection coming soon');
      return false;
    }
    
    console.log('[Wallet] Native wallet requires TestFlight build with AppKit');
    return false;
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

  return (
    <WalletContext.Provider
      value={{
        wallet,
        connectWallet,
        disconnectWallet,
        isLoading,
        openWalletModal,
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

export const WALLET_PROVIDERS = [
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    iconName: 'link',
  },
];
