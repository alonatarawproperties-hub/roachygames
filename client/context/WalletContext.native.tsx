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
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const WALLET_STORAGE_KEY = '@wallet_connection';

export function WalletProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const { open } = useAppKit();
  const { isOpen } = useAppKitState();
  
  const [isLoading, setIsLoading] = useState(true);
  const [localWallet, setLocalWallet] = useState<WalletState>({
    connected: false,
    address: null,
    provider: null,
    isConnecting: false,
  });

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
    }
    setIsLoading(false);
  }, [isConnected, address, isOpen]);

  const openWalletModal = useCallback(() => {
    console.log('[Wallet] Opening AppKit modal');
    try {
      open();
    } catch (error) {
      console.error('[Wallet] Error opening modal:', error);
    }
  }, [open]);

  const connectWallet = useCallback(async (): Promise<boolean> => {
    console.log('[Wallet] Opening AppKit modal for connection');
    try {
      open();
      return true;
    } catch (error) {
      console.error('[Wallet] Error connecting:', error);
      return false;
    }
  }, [open]);

  const disconnectWallet = useCallback(async () => {
    setLocalWallet({
      connected: false,
      address: null,
      provider: null,
      isConnecting: false,
    });
    await AsyncStorage.removeItem(WALLET_STORAGE_KEY);
    console.log('[Wallet] Disconnected');
  }, []);

  return (
    <WalletContext.Provider
      value={{
        wallet: localWallet,
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
