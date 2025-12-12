import { ReactNode } from 'react';

export interface WalletState {
  connected: boolean;
  address: string | null;
  provider: string | null;
  isConnecting: boolean;
}

export interface WalletContextType {
  wallet: WalletState;
  connectWallet: (provider?: string) => Promise<string | null>;
  disconnectWallet: () => Promise<void>;
  signMessage: (message: string) => Promise<string | null>;
  isLoading: boolean;
  openWalletModal: () => void;
  isAppKitReady: boolean;
}

export interface WalletProviderInfo {
  id: 'phantom' | 'solflare' | 'backpack';
  name: string;
  iconName: string;
}

export function WalletProvider({ children }: { children: ReactNode }): JSX.Element;
export function useWallet(): WalletContextType;
export const WALLET_PROVIDERS: WalletProviderInfo[];
