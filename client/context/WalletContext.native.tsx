import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import * as Linking from 'expo-linking';
import { 
  connectPhantom, 
  disconnectPhantom, 
  handlePhantomRedirect, 
  restoreSession, 
  isConnected as checkIsConnected,
  getCurrentWalletAddress
} from '@/lib/phantomDeeplink';

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
      if (url && url.includes('phantom')) {
        handleUrl({ url });
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, []);

  const loadSavedSession = async () => {
    try {
      const address = await restoreSession();
      if (address && checkIsConnected()) {
        setWallet({
          connected: true,
          address,
          provider: 'Phantom',
          isConnecting: false,
        });
        console.log('[Wallet] Restored session:', address);
      }
    } catch (error) {
      console.warn('[Wallet] Failed to restore session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrl = async ({ url }: { url: string }) => {
    console.log('[Wallet] Received URL:', url);
    
    if (url.includes('phantom-connect') || url.includes('phantom_encryption_public_key')) {
      const address = await handlePhantomRedirect(url);
      if (address) {
        setWallet({
          connected: true,
          address,
          provider: 'Phantom',
          isConnecting: false,
        });
      } else {
        setWallet(prev => ({ ...prev, isConnecting: false }));
      }
    } else if (url.includes('phantom-disconnect')) {
      setWallet({
        connected: false,
        address: null,
        provider: null,
        isConnecting: false,
      });
    }
  };

  const connectWallet = useCallback(async (): Promise<boolean> => {
    try {
      setWallet(prev => ({ ...prev, isConnecting: true }));
      const address = await connectPhantom();
      
      if (address) {
        setWallet({
          connected: true,
          address,
          provider: 'Phantom',
          isConnecting: false,
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[Wallet] Connect error:', error);
      setWallet(prev => ({ ...prev, isConnecting: false }));
      return false;
    }
  }, []);

  const disconnectWallet = useCallback(async () => {
    try {
      setIsLoading(true);
      await disconnectPhantom();
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
    connectWallet();
  }, [connectWallet]);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        connectWallet,
        disconnectWallet,
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

export const WALLET_PROVIDERS = [
  {
    id: 'phantom',
    name: 'Phantom',
    iconName: 'credit-card',
  },
];
