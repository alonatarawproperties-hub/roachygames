import 'react-native-get-random-values';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

const WALLET_SESSION_STORAGE_KEY = 'wallet_session';

export type WalletProvider = 'phantom' | 'solflare' | 'backpack';

interface WalletConfig {
  name: string;
  connectUrl: string;
  publicKeyParam: string;
  iconName: string;
}

const WALLET_CONFIGS: Record<WalletProvider, WalletConfig> = {
  phantom: {
    name: 'Phantom',
    connectUrl: 'https://phantom.app/ul/v1/connect',
    publicKeyParam: 'phantom_encryption_public_key',
    iconName: 'credit-card',
  },
  solflare: {
    name: 'Solflare',
    connectUrl: 'https://solflare.com/ul/v1/connect',
    publicKeyParam: 'solflare_encryption_public_key',
    iconName: 'sun',
  },
  backpack: {
    name: 'Backpack',
    connectUrl: 'https://backpack.app/ul/v1/connect',
    publicKeyParam: 'backpack_encryption_public_key',
    iconName: 'package',
  },
};

interface WalletSession {
  provider: WalletProvider;
  dappKeyPair: {
    publicKey: string;
    secretKey: string;
  };
  sharedSecret: string | null;
  session: string | null;
  publicKey: string | null;
}

interface ConnectResponse {
  public_key: string;
  session: string;
}

interface SignMessageResponse {
  signature: string;
}

let currentSession: WalletSession | null = null;
let pendingConnectResolve: ((address: string | null) => void) | null = null;
let pendingConnectTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingSignResolve: ((signature: string | null) => void) | null = null;
let pendingSignTimeout: ReturnType<typeof setTimeout> | null = null;

export async function initSession(): Promise<WalletSession | null> {
  try {
    const saved = await SecureStore.getItemAsync(WALLET_SESSION_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.dappKeyPair && parsed.publicKey && parsed.session && parsed.provider) {
        currentSession = parsed;
        return currentSession;
      }
    }
  } catch (e) {
    console.warn('[Wallet] Failed to load saved session:', e);
  }
  return null;
}

async function saveSession(): Promise<void> {
  if (currentSession) {
    try {
      await SecureStore.setItemAsync(WALLET_SESSION_STORAGE_KEY, JSON.stringify(currentSession));
    } catch (e) {
      console.warn('[Wallet] Failed to save session:', e);
    }
  }
}

export async function clearSession(): Promise<void> {
  currentSession = null;
  try {
    await SecureStore.deleteItemAsync(WALLET_SESSION_STORAGE_KEY);
  } catch (e) {
    console.warn('[Wallet] Failed to clear session:', e);
  }
}

function decryptPayload(dataBase58: string, nonceBase58: string, sharedSecret: Uint8Array): Record<string, unknown> | null {
  try {
    const dataBytes = bs58.decode(dataBase58);
    const nonceBytes = bs58.decode(nonceBase58);
    
    const decrypted = nacl.box.open.after(dataBytes, nonceBytes, sharedSecret);
    
    if (!decrypted) {
      console.error('[Wallet] Decryption failed - null result');
      return null;
    }
    
    const decoded = new TextDecoder().decode(decrypted);
    return JSON.parse(decoded);
  } catch (error) {
    console.error('[Wallet] Decryption error:', error);
    return null;
  }
}

function encryptPayload(payload: Record<string, unknown>, sharedSecret: Uint8Array): { nonce: string; data: string } {
  const nonce = nacl.randomBytes(24);
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const encrypted = nacl.box.after(payloadBytes, nonce, sharedSecret);
  return {
    nonce: bs58.encode(nonce),
    data: bs58.encode(encrypted),
  };
}

function getConnectUrl(provider: WalletProvider, dappPublicKey: string): string {
  const config = WALLET_CONFIGS[provider];
  const redirectUri = Linking.createURL('wallet-connect');
  
  const params = new URLSearchParams({
    dapp_encryption_public_key: dappPublicKey,
    cluster: 'mainnet-beta',
    app_url: 'https://roachy.games',
    redirect_link: redirectUri,
  });

  console.log(`[Wallet] ${config.name} connect URL:`, `${config.connectUrl}?${params.toString()}`);
  console.log(`[Wallet] Redirect URI:`, redirectUri);
  return `${config.connectUrl}?${params.toString()}`;
}

export async function connectWallet(provider: WalletProvider): Promise<string | null> {
  await initSession();
  
  if (currentSession?.publicKey && currentSession?.session && currentSession?.provider === provider) {
    console.log(`[Wallet] Already connected to ${WALLET_CONFIGS[provider].name}:`, currentSession.publicKey);
    return currentSession.publicKey;
  }
  
  const keypair = nacl.box.keyPair();
  currentSession = {
    provider,
    dappKeyPair: {
      publicKey: bs58.encode(keypair.publicKey),
      secretKey: bs58.encode(keypair.secretKey),
    },
    sharedSecret: null,
    session: null,
    publicKey: null,
  };
  
  const url = getConnectUrl(provider, currentSession.dappKeyPair.publicKey);
  
  return new Promise((resolve) => {
    pendingConnectResolve = resolve;
    
    if (pendingConnectTimeout) {
      clearTimeout(pendingConnectTimeout);
    }
    
    pendingConnectTimeout = setTimeout(() => {
      if (pendingConnectResolve === resolve) {
        console.log('[Wallet] Connect timeout');
        pendingConnectResolve = null;
        pendingConnectTimeout = null;
        resolve(null);
      }
    }, 120000);
    
    console.log(`[Wallet] Opening ${WALLET_CONFIGS[provider].name}:`, url);
    Linking.openURL(url).catch((error) => {
      console.error('[Wallet] Failed to open URL:', error);
      if (pendingConnectTimeout) {
        clearTimeout(pendingConnectTimeout);
        pendingConnectTimeout = null;
      }
      pendingConnectResolve = null;
      resolve(null);
    });
  });
}

export async function disconnectWallet(): Promise<void> {
  await clearSession();
}

function getSignMessageUrl(provider: WalletProvider): string {
  const baseUrls: Record<WalletProvider, string> = {
    phantom: 'https://phantom.app/ul/v1/signMessage',
    solflare: 'https://solflare.com/ul/v1/signMessage',
    backpack: 'https://backpack.app/ul/v1/signMessage',
  };
  return baseUrls[provider];
}

export async function signMessage(message: string): Promise<string | null> {
  if (!currentSession?.publicKey || !currentSession?.session || !currentSession?.sharedSecret) {
    console.error('[Wallet] No connected session for signing');
    return null;
  }

  const sharedSecret = bs58.decode(currentSession.sharedSecret);
  const messageBytes = new TextEncoder().encode(message);
  const messageBase58 = bs58.encode(messageBytes);

  const payload = {
    message: messageBase58,
    session: currentSession.session,
    display: 'utf8' as const,
  };

  const encrypted = encryptPayload(payload, sharedSecret);
  const redirectUri = Linking.createURL('wallet-sign');
  
  const params = new URLSearchParams({
    dapp_encryption_public_key: currentSession.dappKeyPair.publicKey,
    nonce: encrypted.nonce,
    payload: encrypted.data,
    redirect_link: redirectUri,
  });

  const signUrl = `${getSignMessageUrl(currentSession.provider)}?${params.toString()}`;

  return new Promise((resolve) => {
    pendingSignResolve = resolve;

    if (pendingSignTimeout) {
      clearTimeout(pendingSignTimeout);
    }

    pendingSignTimeout = setTimeout(() => {
      if (pendingSignResolve === resolve) {
        console.log('[Wallet] Sign message timeout');
        pendingSignResolve = null;
        pendingSignTimeout = null;
        resolve(null);
      }
    }, 120000);

    console.log('[Wallet] Opening wallet for signing');
    Linking.openURL(signUrl).catch((error) => {
      console.error('[Wallet] Failed to open sign URL:', error);
      if (pendingSignTimeout) {
        clearTimeout(pendingSignTimeout);
        pendingSignTimeout = null;
      }
      pendingSignResolve = null;
      resolve(null);
    });
  });
}

export async function handleSignRedirect(url: string): Promise<string | null> {
  try {
    console.log('[Wallet] Handling sign redirect URL:', url);
    
    const parsedUrl = new URL(url);
    const params = parsedUrl.searchParams;
    
    const errorCode = params.get('errorCode');
    if (errorCode) {
      console.error('[Wallet] Sign error from wallet:', errorCode, params.get('errorMessage'));
      if (pendingSignTimeout) {
        clearTimeout(pendingSignTimeout);
        pendingSignTimeout = null;
      }
      pendingSignResolve?.(null);
      pendingSignResolve = null;
      return null;
    }

    const data = params.get('data');
    const nonce = params.get('nonce');

    if (!data || !nonce || !currentSession?.sharedSecret) {
      console.error('[Wallet] Missing required sign params');
      return null;
    }

    const sharedSecret = bs58.decode(currentSession.sharedSecret);
    const decrypted = decryptPayload(data, nonce, sharedSecret);
    
    if (!decrypted) {
      console.error('[Wallet] Failed to decrypt sign response');
      return null;
    }

    console.log('[Wallet] Decrypted sign response:', decrypted);
    
    const response = decrypted as unknown as SignMessageResponse;
    const signature = response.signature;

    if (pendingSignTimeout) {
      clearTimeout(pendingSignTimeout);
      pendingSignTimeout = null;
    }

    if (pendingSignResolve) {
      pendingSignResolve(signature);
      pendingSignResolve = null;
    }

    return signature;
  } catch (error) {
    console.error('[Wallet] Handle sign redirect error:', error);
    if (pendingSignTimeout) {
      clearTimeout(pendingSignTimeout);
      pendingSignTimeout = null;
    }
    pendingSignResolve?.(null);
    pendingSignResolve = null;
    return null;
  }
}

function findWalletPublicKeyParam(params: URLSearchParams): { provider: WalletProvider; publicKey: string } | null {
  for (const [providerId, config] of Object.entries(WALLET_CONFIGS)) {
    const publicKey = params.get(config.publicKeyParam);
    if (publicKey) {
      return { provider: providerId as WalletProvider, publicKey };
    }
  }
  return null;
}

export async function handleWalletRedirect(url: string): Promise<string | null> {
  try {
    console.log('[Wallet] Handling redirect URL:', url);
    
    const parsedUrl = new URL(url);
    const params = parsedUrl.searchParams;
    
    const errorCode = params.get('errorCode');
    if (errorCode) {
      console.error('[Wallet] Error from wallet:', errorCode, params.get('errorMessage'));
      if (pendingConnectTimeout) {
        clearTimeout(pendingConnectTimeout);
        pendingConnectTimeout = null;
      }
      pendingConnectResolve?.(null);
      pendingConnectResolve = null;
      return null;
    }

    const walletInfo = findWalletPublicKeyParam(params);
    const data = params.get('data');
    const nonce = params.get('nonce');

    console.log('[Wallet] Response params:', { 
      walletInfo,
      hasData: !!data, 
      hasNonce: !!nonce,
      hasSession: !!currentSession
    });

    if (!walletInfo || !data || !nonce) {
      console.error('[Wallet] Missing required params');
      return null;
    }
    
    if (!currentSession) {
      console.error('[Wallet] No current session');
      return null;
    }

    const walletKeyBytes = bs58.decode(walletInfo.publicKey);
    const secretKeyBytes = bs58.decode(currentSession.dappKeyPair.secretKey);
    
    const sharedSecret = nacl.box.before(walletKeyBytes, secretKeyBytes);
    currentSession.sharedSecret = bs58.encode(sharedSecret);
    currentSession.provider = walletInfo.provider;

    const decrypted = decryptPayload(data, nonce, sharedSecret);
    if (!decrypted) {
      console.error('[Wallet] Failed to decrypt response');
      return null;
    }

    console.log('[Wallet] Decrypted response:', decrypted);
    
    const response = decrypted as unknown as ConnectResponse;
    currentSession.publicKey = response.public_key;
    currentSession.session = response.session;

    await saveSession();

    const walletName = WALLET_CONFIGS[currentSession.provider].name;
    console.log(`[Wallet] Connected to ${walletName}:`, currentSession.publicKey);
    
    if (pendingConnectTimeout) {
      clearTimeout(pendingConnectTimeout);
      pendingConnectTimeout = null;
    }
    
    if (pendingConnectResolve) {
      pendingConnectResolve(currentSession.publicKey);
      pendingConnectResolve = null;
    }
    
    return currentSession.publicKey;
  } catch (error) {
    console.error('[Wallet] Handle redirect error:', error);
    if (pendingConnectTimeout) {
      clearTimeout(pendingConnectTimeout);
      pendingConnectTimeout = null;
    }
    pendingConnectResolve?.(null);
    pendingConnectResolve = null;
    return null;
  }
}

export function getCurrentWalletAddress(): string | null {
  return currentSession?.publicKey || null;
}

export function getCurrentProvider(): WalletProvider | null {
  return currentSession?.provider || null;
}

export function getProviderName(): string | null {
  if (!currentSession?.provider) return null;
  return WALLET_CONFIGS[currentSession.provider].name;
}

export function isConnected(): boolean {
  return !!currentSession?.publicKey && !!currentSession?.session;
}

export async function restoreSession(): Promise<{ address: string | null; provider: WalletProvider | null }> {
  await initSession();
  if (currentSession?.publicKey && currentSession?.session) {
    return { address: currentSession.publicKey, provider: currentSession.provider };
  }
  return { address: null, provider: null };
}

export function getAvailableWallets(): Array<{ id: WalletProvider; name: string; iconName: string }> {
  return Object.entries(WALLET_CONFIGS).map(([id, config]) => ({
    id: id as WalletProvider,
    name: config.name,
    iconName: config.iconName,
  }));
}
