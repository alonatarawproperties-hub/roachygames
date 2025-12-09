import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Safely import AppKit hooks - they may throw if not initialized
let useAccount: any;
let useAppKit: any;
let useAppKitState: any;
let appKitHooksAvailable = false;

try {
  const appKit = require('@reown/appkit-react-native');
  useAccount = appKit.useAccount;
  useAppKit = appKit.useAppKit;
  useAppKitState = appKit.useAppKitState;
  appKitHooksAvailable = true;
} catch (error) {
  console.warn('[WalletContext] AppKit hooks not available:', error);
}

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

const projectId = process.env.EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID || process.env.WALLETCONNECT_PROJECT_ID || '';

// Inner component that uses AppKit hooks (only rendered when AppKit is ready)
function WalletProviderWithAppKit({ children }: { children: ReactNode }) {
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

// Fallback provider when AppKit is not available or project ID is missing
function WalletProviderFallback({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    console.log('[WalletProvider] Running in fallback mode - AppKit not available');
    setIsLoading(false);
  }, []);

  const fallbackWallet: WalletState = {
    connected: false,
    address: null,
    provider: null,
    isConnecting: false,
  };

  const noOpConnect = useCallback(async () => {
    console.warn('[Wallet] AppKit not available in this build');
    return false;
  }, []);

  const noOpDisconnect = useCallback(async () => {
    console.warn('[Wallet] AppKit not available in this build');
  }, []);

  const noOpOpenModal = useCallback(() => {
    console.warn('[Wallet] AppKit not available in this build');
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

// Main WalletProvider that chooses the right implementation
export function WalletProvider({ children }: { children: ReactNode }) {
  // Use fallback if AppKit hooks aren't available or project ID is missing
  if (!appKitHooksAvailable || !projectId) {
    console.log('[WalletProvider] Using fallback - hooks available:', appKitHooksAvailable, 'projectId:', !!projectId);
    return <WalletProviderFallback>{children}</WalletProviderFallback>;
  }
  
  return <WalletProviderWithAppKit>{children}</WalletProviderWithAppKit>;
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
