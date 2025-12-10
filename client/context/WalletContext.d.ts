import { ReactNode } from 'react';

export interface WalletState {
  connected: boolean;
  address: string | null;
  provider: string | null;
  isConnecting: boolean;
}

export interface WalletContextType {
  wallet: WalletState;
  connectWallet: (provider?: string) => Promise<boolean>;
  disconnectWallet: () => Promise<void>;
  isLoading: boolean;
  openWalletModal: () => void;
  isAppKitReady: boolean;
}

export function WalletProvider({ children }: { children: ReactNode }): JSX.Element;
export function useWallet(): WalletContextType;
