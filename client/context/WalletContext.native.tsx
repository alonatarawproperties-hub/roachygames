import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAccount, useAppKit, useAppKitState } from '@reown/appkit-react-native';

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
  const { address, isConnected } = useAccount();
  const { open, disconnect } = useAppKit();
  const { isOpen } = useAppKitState();
  
  const [isLoading, setIsLoading] = useState(true);
  const [localWallet, setLocalWallet] = useState<WalletState>({
    connected: false,
    address: null,
    provider: null,
    isConnecting: false,
  });

  const projectId = process.env.WALLETCONNECT_PROJECT_ID;
  const isAppKitReady = Boolean(projectId);

  useEffect(() => {
    if (isConnected && address) {
      setLocalWallet({
        connected: true,
        address: address,
        provider: 'walletconnect',
        isConnecting: false,
      });
      AsyncStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify({
        address: address,
        provider: 'walletconnect',
      }));
    } else if (!isConnected) {
      setLocalWallet({
        connected: false,
        address: null,
        provider: null,
        isConnecting: isOpen,
      });
      AsyncStorage.removeItem(WALLET_STORAGE_KEY);
    }
    setIsLoading(false);
  }, [isConnected, address, isOpen]);

  const openWalletModal = useCallback(() => {
    if (!isAppKitReady) {
      console.warn('[Wallet] AppKit not ready - missing WALLETCONNECT_PROJECT_ID');
      return;
    }
    console.log('[Wallet] Opening AppKit modal');
    try {
      open();
    } catch (error) {
      console.error('[Wallet] Error opening modal:', error);
    }
  }, [open, isAppKitReady]);

  const connectWallet = useCallback(async (): Promise<boolean> => {
    if (!isAppKitReady) {
      console.warn('[Wallet] AppKit not ready - missing WALLETCONNECT_PROJECT_ID');
      return false;
    }
    console.log('[Wallet] Opening AppKit modal for connection');
    try {
      open();
      return true;
    } catch (error) {
      console.error('[Wallet] Error connecting:', error);
      return false;
    }
  }, [open, isAppKitReady]);

  const disconnectWallet = useCallback(async () => {
    console.log('[Wallet] Disconnecting wallet...');
    try {
      await disconnect();
      console.log('[Wallet] AppKit disconnect called');
    } catch (error) {
      console.error('[Wallet] Error disconnecting from AppKit:', error);
    }
    setLocalWallet({
      connected: false,
      address: null,
      provider: null,
      isConnecting: false,
    });
    await AsyncStorage.removeItem(WALLET_STORAGE_KEY);
    console.log('[Wallet] Disconnected successfully');
  }, [disconnect]);

  return (
    <WalletContext.Provider
      value={{
        wallet: localWallet,
        connectWallet,
        disconnectWallet,
        isLoading,
        openWalletModal,
        isAppKitReady,
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
