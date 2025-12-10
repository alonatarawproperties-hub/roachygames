import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { useAppKit, useAccount } from '@reown/appkit-react-native';
import { projectId } from '@/lib/appKitConfig';

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

function WalletProviderInner({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  
  let appKitHooks: { open: () => void; disconnect: () => void } | null = null;
  let accountHooks: { address: string | undefined; isConnected: boolean } | null = null;
  
  try {
    appKitHooks = useAppKit();
    accountHooks = useAccount();
  } catch (error) {
    console.warn('[WalletProvider] AppKit hooks not available:', error);
  }
  
  const address = accountHooks?.address || null;
  const isConnected = accountHooks?.isConnected || false;

  const wallet: WalletState = {
    connected: isConnected,
    address: address,
    provider: isConnected ? 'WalletConnect' : null,
    isConnecting: isLoading,
  };

  const connectWallet = useCallback(async () => {
    if (!appKitHooks) {
      console.warn('[Wallet] AppKit not available');
      return false;
    }
    
    try {
      setIsLoading(true);
      appKitHooks.open();
      return true;
    } catch (error) {
      console.error('[Wallet] Failed to open wallet modal:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [appKitHooks]);

  const disconnectWallet = useCallback(async () => {
    if (!appKitHooks) {
      console.warn('[Wallet] AppKit not available');
      return;
    }
    
    try {
      setIsLoading(true);
      await appKitHooks.disconnect();
    } catch (error) {
      console.error('[Wallet] Failed to disconnect:', error);
    } finally {
      setIsLoading(false);
    }
  }, [appKitHooks]);

  const openWalletModal = useCallback(() => {
    if (!appKitHooks) {
      console.warn('[Wallet] AppKit not available');
      return;
    }
    appKitHooks.open();
  }, [appKitHooks]);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        connectWallet,
        disconnectWallet,
        isLoading,
        openWalletModal,
        isAppKitReady: !!projectId && !!appKitHooks,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function WalletProvider({ children }: { children: ReactNode }) {
  if (!projectId) {
    console.warn('[WalletProvider] WalletConnect Project ID not set - using fallback');
    return <WalletProviderFallback>{children}</WalletProviderFallback>;
  }
  
  return <WalletProviderInner>{children}</WalletProviderInner>;
}

function WalletProviderFallback({ children }: { children: ReactNode }) {
  const fallbackWallet: WalletState = {
    connected: false,
    address: null,
    provider: null,
    isConnecting: false,
  };

  const noOpConnect = useCallback(async () => {
    console.warn('[Wallet] WalletConnect Project ID not configured');
    return false;
  }, []);

  const noOpDisconnect = useCallback(async () => {
    console.warn('[Wallet] WalletConnect Project ID not configured');
  }, []);

  const noOpOpenModal = useCallback(() => {
    console.warn('[Wallet] WalletConnect Project ID not configured');
  }, []);

  return (
    <WalletContext.Provider
      value={{
        wallet: fallbackWallet,
        connectWallet: noOpConnect,
        disconnectWallet: noOpDisconnect,
        isLoading: false,
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
