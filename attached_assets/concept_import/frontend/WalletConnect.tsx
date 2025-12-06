import { useState, useEffect, useRef } from 'react';
import { X, Smartphone } from 'lucide-react';

interface WalletProvider {
  id: string;
  name: string;
  icon: string;
  downloadUrl: string;
  checkInstalled: () => boolean;
  connect: () => Promise<string>;
  isWalletConnect?: boolean;
}

// WalletConnect state management
let walletConnectAdapter: any = null;
let walletConnectProjectId: string | null = null;

async function initWalletConnect(): Promise<boolean> {
  if (walletConnectAdapter) return true;
  
  try {
    // Fetch project ID from server
    const res = await fetch('/api/walletconnect/project-id');
    if (!res.ok) return false;
    const { projectId } = await res.json();
    walletConnectProjectId = projectId;
    
    // Dynamically import WalletConnect
    const { WalletConnectWalletAdapter } = await import('@walletconnect/solana-adapter');
    
    walletConnectAdapter = new WalletConnectWalletAdapter({
      network: 'mainnet-beta' as any,
      options: {
        projectId,
        metadata: {
          name: 'Roachy Games',
          description: 'Play. Earn. Win.',
          url: window.location.origin,
          icons: [`${window.location.origin}/roachy-logo.png`]
        }
      }
    });
    
    return true;
  } catch (err) {
    console.error('Failed to init WalletConnect:', err);
    return false;
  }
}

const walletProviders: WalletProvider[] = [
  {
    id: 'phantom',
    name: 'Phantom',
    icon: '👻',
    downloadUrl: 'https://phantom.app/',
    checkInstalled: () => {
      const w = window as any;
      return !!(w.phantom?.solana?.isPhantom);
    },
    connect: async () => {
      const provider = (window as any).phantom?.solana;
      const response = await provider.connect();
      return response.publicKey.toString();
    }
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    icon: '📱',
    downloadUrl: 'https://walletconnect.com/',
    isWalletConnect: true,
    checkInstalled: () => true,
    connect: async () => {
      const initialized = await initWalletConnect();
      if (!initialized || !walletConnectAdapter) {
        throw new Error('WalletConnect not available');
      }
      await walletConnectAdapter.connect();
      if (!walletConnectAdapter.publicKey) {
        throw new Error('Connection cancelled');
      }
      return walletConnectAdapter.publicKey.toString();
    }
  }
];

export function WalletConnect({ hideButton = false, onConnect }: { hideButton?: boolean; onConnect?: () => void } = {}) {
  const [wallet, setWallet] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showWalletOptions, setShowWalletOptions] = useState(hideButton);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);

  useEffect(() => {
    const storedWallet = localStorage.getItem('roachy_wallet');
    if (storedWallet) {
      setWallet(storedWallet);
      loadBalance(storedWallet);
    }
    
    // Preload WalletConnect in background for faster QR popup
    initWalletConnect().catch(() => {});
  }, []);

  const loadBalance = async (address: string) => {
    try {
      const response = await fetch(`/api/wallet/${address}`);
      if (response.ok) {
        const { wallet: walletData } = await response.json();
        setBalance(parseFloat(walletData.balance));
        localStorage.setItem('roachy_balance', walletData.balance);
      }
    } catch (error) {
      console.error('Error loading balance:', error);
    }
  };

  const connectWithProvider = async (provider: WalletProvider) => {
    setConnectingProvider(provider.id);
    
    // Check if wallet is installed
    if (!provider.checkInstalled()) {
      // Open download page in new tab
      window.open(provider.downloadUrl, '_blank');
      setConnectingProvider(null);
      return;
    }

    setIsConnecting(true);
    try {
      const address = await provider.connect();

      // Call backend to connect wallet
      const res = await fetch('/api/wallet/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      if (res.ok) {
        const { wallet: walletData } = await res.json();
        setWallet(address);
        setBalance(parseFloat(walletData.balance));
        localStorage.setItem('roachy_wallet', address);
        localStorage.setItem('roachy_balance', walletData.balance);
        localStorage.setItem('roachy_wallet_provider', provider.id);
        setShowWalletOptions(false);
        window.dispatchEvent(new Event('walletConnected'));
        if (onConnect) onConnect();
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
    } finally {
      setIsConnecting(false);
      setConnectingProvider(null);
    }
  };

  const disconnectWallet = () => {
    setWallet(null);
    localStorage.removeItem('roachy_wallet');
    localStorage.removeItem('roachy_wallet_provider');
    setShowWalletOptions(false);
    window.dispatchEvent(new Event('walletDisconnected'));
  };

  return (
    <div className="w-full relative">
      {wallet ? (
        <div className="flex items-center gap-2 w-full">
          <div 
            className="flex-1 px-4 py-3 rounded-lg font-bold text-sm flex items-center justify-between"
            style={{
              background: 'linear-gradient(145deg, #e8c9a0 0%, #d4a574 100%)',
              border: '2px solid #3b2418',
              color: '#3b2418',
              fontFamily: "'Rubik', sans-serif"
            }}
          >
            <span>{wallet.slice(0, 8)}...</span>
          </div>
          <button
            onClick={disconnectWallet}
            className="p-2.5 rounded-lg transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(145deg, #c4955e 0%, #8b5a3c 100%)',
              border: '2px solid #3b2418',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)'
            }}
            data-testid="button-disconnect-wallet"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>
      ) : (
        <div className={hideButton ? "w-full" : "relative"}>
          {!hideButton && (
            <button
              onClick={() => setShowWalletOptions(!showWalletOptions)}
              disabled={isConnecting}
              className="w-full py-3 px-4 rounded-lg font-bold text-sm transition-all hover:scale-105 disabled:opacity-50"
              style={{
                background: 'linear-gradient(145deg, #f0c850 0%, #daa520 50%, #c4950e 100%)',
                border: '2px solid #8b5a3c',
                color: '#2a1810',
                fontFamily: "'Rubik', sans-serif",
                boxShadow: '0 4px 12px rgba(218, 165, 32, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
              }}
              data-testid="button-connect-wallet"
            >
              {isConnecting ? 'CONNECTING...' : 'CONNECT WALLET'}
            </button>
          )}

          {showWalletOptions && !isConnecting && (
            <div
              className={hideButton ? "w-full rounded-lg overflow-hidden shadow-xl z-50" : "absolute top-full mt-2 w-full rounded-lg overflow-hidden shadow-xl z-50"}
              style={{ background: '#3b2418', border: '2px solid #5c3d2e' }}
            >
              {walletProviders.map((provider) => {
                const isInstalled = provider.checkInstalled();
                const isLoading = connectingProvider === provider.id;
                
                return (
                  <button
                    key={provider.id}
                    onClick={() => connectWithProvider(provider)}
                    disabled={isLoading}
                    className="w-full px-4 py-3 text-left text-sm font-semibold transition-all border-b border-[#5c3d2e] last:border-b-0 flex items-center justify-between gap-2 disabled:opacity-50"
                    style={{
                      fontFamily: "'Rubik', sans-serif",
                      color: '#e8c9a0',
                      background: 'rgba(92, 61, 46, 0.5)',
                    }}
                    data-testid={`button-connect-${provider.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{provider.icon}</span>
                      <span>{provider.name}</span>
                    </div>
                    {provider.isWalletConnect ? (
                      <span 
                        className="text-xs px-2 py-1 rounded"
                        style={{ 
                          background: 'rgba(80, 200, 120, 0.3)',
                          color: '#50c878'
                        }}
                      >
                        QR Code
                      </span>
                    ) : !isInstalled ? (
                      <span 
                        className="text-xs px-2 py-1 rounded"
                        style={{ 
                          background: 'rgba(218, 165, 32, 0.3)',
                          color: '#f0c850'
                        }}
                      >
                        Install
                      </span>
                    ) : null}
                    {isLoading && (
                      <span className="text-xs animate-pulse">...</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function useWallet() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    const storedWallet = localStorage.getItem('roachy_wallet');
    if (storedWallet) {
      setWallet(storedWallet);
    }
    const storedBalance = localStorage.getItem('roachy_balance');
    if (storedBalance) {
      setBalance(parseFloat(storedBalance));
    }

    const handleWalletConnected = () => {
      const newWallet = localStorage.getItem('roachy_wallet');
      if (newWallet) {
        setWallet(newWallet);
      }
    };

    const handleWalletDisconnected = () => {
      setWallet(null);
    };

    window.addEventListener('walletConnected', handleWalletConnected);
    window.addEventListener('walletDisconnected', handleWalletDisconnected);

    return () => {
      window.removeEventListener('walletConnected', handleWalletConnected);
      window.removeEventListener('walletDisconnected', handleWalletDisconnected);
    };
  }, []);

  const disconnect = () => {
    localStorage.removeItem('roachy_wallet');
    localStorage.removeItem('roachy_balance');
    setWallet(null);
    setBalance(0);
    window.dispatchEvent(new Event('walletDisconnected'));
  };

  return { wallet, balance, disconnect };
}
