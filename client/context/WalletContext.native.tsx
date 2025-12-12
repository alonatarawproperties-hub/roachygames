import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import * as Linking from 'expo-linking';
import { 
  connectWallet as connectToWallet, 
  disconnectWallet as disconnectFromWallet, 
  handleWalletRedirect, 
  handleSignRedirect,
  signMessage as walletSignMessage,
  restoreSession, 
  isConnected as checkIsConnected,
  getCurrentWalletAddress,
  getProviderName,
  getAvailableWallets,
  WalletProvider as WalletProviderType,
} from '@/lib/walletDeeplink';

interface WalletState {
  connected: boolean;
  address: string | null;
  provider: string | null;
  isConnecting: boolean;
}

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

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    address: null,
    provider: null,
    isConnecting: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSavedSession();
    
    const subscription = Linking.addEventListener('url', handleUrl);
    
    Linking.getInitialURL().then((url) => {
      if (url && (url.includes('wallet-connect') || url.includes('encryption_public_key'))) {
        handleUrl({ url });
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, []);

  const loadSavedSession = async () => {
    try {
      const { address, provider } = await restoreSession();
      if (address && checkIsConnected()) {
        const providerName = getProviderName() || provider || 'Wallet';
        setWallet({
          connected: true,
          address,
          provider: providerName,
          isConnecting: false,
        });
        console.log(`[Wallet] Restored ${providerName} session:`, address);
      }
    } catch (error) {
      console.warn('[Wallet] Failed to restore session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrl = async ({ url }: { url: string }) => {
    console.log('[Wallet] Received URL:', url);
    
    if (url.includes('wallet-sign')) {
      await handleSignRedirect(url);
    } else if (url.includes('wallet-connect') || url.includes('encryption_public_key')) {
      const address = await handleWalletRedirect(url);
      if (address) {
        const providerName = getProviderName() || 'Wallet';
        setWallet({
          connected: true,
          address,
          provider: providerName,
          isConnecting: false,
        });
      } else {
        setWallet(prev => ({ ...prev, isConnecting: false }));
      }
    }
  };

  const signMessage = useCallback(async (message: string): Promise<string | null> => {
    if (!wallet.connected) {
      console.error('[Wallet] Cannot sign - wallet not connected');
      return null;
    }
    return walletSignMessage(message);
  }, [wallet.connected]);

  const connectWallet = useCallback(async (provider: WalletProviderType = 'phantom'): Promise<string | null> => {
    try {
      setWallet(prev => ({ ...prev, isConnecting: true }));
      const address = await connectToWallet(provider);
      
      if (address) {
        const providerName = getProviderName() || 'Wallet';
        setWallet({
          connected: true,
          address,
          provider: providerName,
          isConnecting: false,
        });
        return address;
      }
      
      return null;
    } catch (error) {
      console.error('[Wallet] Connect error:', error);
      setWallet(prev => ({ ...prev, isConnecting: false }));
      return null;
    }
  }, []);

  const disconnectWallet = useCallback(async () => {
    try {
      setIsLoading(true);
      await disconnectFromWallet();
      setWallet({
        connected: false,
        address: null,
        provider: null,
        isConnecting: false,
      });
    } catch (error) {
      console.error('[Wallet] Disconnect error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openWalletModal = useCallback(() => {
    connectWallet('phantom');
  }, [connectWallet]);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        connectWallet,
        disconnectWallet,
        signMessage,
        isLoading,
        openWalletModal,
        isAppKitReady: true,
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

export const WALLET_PROVIDERS = getAvailableWallets();
