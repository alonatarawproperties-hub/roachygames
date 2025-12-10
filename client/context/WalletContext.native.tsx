import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
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
  isAppKitReady: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const WALLET_STORAGE_KEY = '@wallet_connection';

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    console.log('[WalletProvider] Running in stub mode - AppKit packages removed for build testing');
    setIsLoading(false);
  }, []);

  const fallbackWallet: WalletState = {
    connected: false,
    address: null,
    provider: null,
    isConnecting: false,
  };

  const noOpConnect = useCallback(async () => {
    console.warn('[Wallet] Wallet connect temporarily disabled for build testing');
    return false;
  }, []);

  const noOpDisconnect = useCallback(async () => {
    console.warn('[Wallet] Wallet disconnect temporarily disabled for build testing');
  }, []);

  const noOpOpenModal = useCallback(() => {
    console.warn('[Wallet] Wallet modal temporarily disabled for build testing');
  }, []);

  return (
    <WalletContext.Provider
      value={{
        wallet: fallbackWallet,
        connectWallet: noOpConnect,
        disconnectWallet: noOpDisconnect,
        isLoading,
        openWalletModal: noOpOpenModal,
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

export const WALLET_PROVIDERS = [
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    iconName: 'link',
  },
];
