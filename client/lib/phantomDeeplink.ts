import 'react-native-get-random-values';
import * as Linking from 'expo-linking';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PHANTOM_CONNECT_STORAGE_KEY = '@phantom_session';

interface PhantomSession {
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

let currentSession: PhantomSession | null = null;
let pendingConnectResolve: ((address: string | null) => void) | null = null;
let pendingConnectTimeout: ReturnType<typeof setTimeout> | null = null;

function buildUrl(path: string, params: URLSearchParams): string {
  return `https://phantom.app/ul/v1/${path}?${params.toString()}`;
}

export async function initSession(): Promise<PhantomSession> {
  const saved = await AsyncStorage.getItem(PHANTOM_CONNECT_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.dappKeyPair && parsed.publicKey && parsed.session) {
        currentSession = parsed;
        return currentSession!;
      }
    } catch (e) {
      console.warn('[Phantom] Failed to parse saved session:', e);
    }
  }

  const keypair = nacl.box.keyPair();
  currentSession = {
    dappKeyPair: {
      publicKey: bs58.encode(keypair.publicKey),
      secretKey: bs58.encode(keypair.secretKey),
    },
    sharedSecret: null,
    session: null,
    publicKey: null,
  };

  return currentSession;
}

async function saveSession(): Promise<void> {
  if (currentSession) {
    await AsyncStorage.setItem(PHANTOM_CONNECT_STORAGE_KEY, JSON.stringify(currentSession));
  }
}

export async function clearSession(): Promise<void> {
  currentSession = null;
  await AsyncStorage.removeItem(PHANTOM_CONNECT_STORAGE_KEY);
}

function decryptPayload(dataBase58: string, nonceBase58: string, sharedSecret: Uint8Array): Record<string, unknown> | null {
  try {
    const dataBytes = bs58.decode(dataBase58);
    const nonceBytes = bs58.decode(nonceBase58);
    
    const decrypted = nacl.box.open.after(dataBytes, nonceBytes, sharedSecret);
    
    if (!decrypted) {
      console.error('[Phantom] Decryption failed - null result');
      return null;
    }
    
    const decoded = new TextDecoder().decode(decrypted);
    return JSON.parse(decoded);
  } catch (error) {
    console.error('[Phantom] Decryption error:', error);
    return null;
  }
}

export function getConnectUrl(): string {
  if (!currentSession) {
    throw new Error('Session not initialized');
  }

  const redirectUri = Linking.createURL('phantom-connect');
  
  const params = new URLSearchParams({
    dapp_encryption_public_key: currentSession.dappKeyPair.publicKey,
    cluster: 'mainnet-beta',
    app_url: encodeURIComponent('https://roachygames.com'),
    redirect_link: encodeURIComponent(redirectUri),
  });

  console.log('[Phantom] Connect URL redirect:', redirectUri);
  return buildUrl('connect', params);
}

export async function connectPhantom(): Promise<string | null> {
  await initSession();
  
  if (currentSession?.publicKey && currentSession?.session) {
    console.log('[Phantom] Already connected:', currentSession.publicKey);
    return currentSession.publicKey;
  }
  
  const keypair = nacl.box.keyPair();
  currentSession = {
    dappKeyPair: {
      publicKey: bs58.encode(keypair.publicKey),
      secretKey: bs58.encode(keypair.secretKey),
    },
    sharedSecret: null,
    session: null,
    publicKey: null,
  };
  
  const url = getConnectUrl();
  
  return new Promise((resolve) => {
    pendingConnectResolve = resolve;
    
    if (pendingConnectTimeout) {
      clearTimeout(pendingConnectTimeout);
    }
    
    pendingConnectTimeout = setTimeout(() => {
      if (pendingConnectResolve === resolve) {
        console.log('[Phantom] Connect timeout');
        pendingConnectResolve = null;
        pendingConnectTimeout = null;
        resolve(null);
      }
    }, 120000);
    
    console.log('[Phantom] Opening wallet:', url);
    Linking.openURL(url).catch((error) => {
      console.error('[Phantom] Failed to open URL:', error);
      if (pendingConnectTimeout) {
        clearTimeout(pendingConnectTimeout);
        pendingConnectTimeout = null;
      }
      pendingConnectResolve = null;
      resolve(null);
    });
  });
}

export async function disconnectPhantom(): Promise<void> {
  await clearSession();
}

export async function handlePhantomRedirect(url: string): Promise<string | null> {
  try {
    console.log('[Phantom] Handling redirect URL:', url);
    
    const parsedUrl = new URL(url);
    const params = parsedUrl.searchParams;
    
    const errorCode = params.get('errorCode');
    if (errorCode) {
      console.error('[Phantom] Error from wallet:', errorCode, params.get('errorMessage'));
      if (pendingConnectTimeout) {
        clearTimeout(pendingConnectTimeout);
        pendingConnectTimeout = null;
      }
      pendingConnectResolve?.(null);
      pendingConnectResolve = null;
      return null;
    }

    const phantomPublicKey = params.get('phantom_encryption_public_key');
    const data = params.get('data');
    const nonce = params.get('nonce');

    console.log('[Phantom] Response params:', { 
      hasPhantomKey: !!phantomPublicKey, 
      hasData: !!data, 
      hasNonce: !!nonce,
      hasSession: !!currentSession
    });

    if (!phantomPublicKey || !data || !nonce) {
      console.error('[Phantom] Missing required params');
      return null;
    }
    
    if (!currentSession) {
      console.error('[Phantom] No current session');
      return null;
    }

    const phantomKeyBytes = bs58.decode(phantomPublicKey);
    const secretKeyBytes = bs58.decode(currentSession.dappKeyPair.secretKey);
    
    const sharedSecret = nacl.box.before(phantomKeyBytes, secretKeyBytes);
    currentSession.sharedSecret = bs58.encode(sharedSecret);

    const decrypted = decryptPayload(data, nonce, sharedSecret);
    if (!decrypted) {
      console.error('[Phantom] Failed to decrypt response');
      return null;
    }

    console.log('[Phantom] Decrypted response:', decrypted);
    
    const response = decrypted as unknown as ConnectResponse;
    currentSession.publicKey = response.public_key;
    currentSession.session = response.session;

    await saveSession();

    console.log('[Phantom] Connected successfully:', currentSession.publicKey);
    
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
    console.error('[Phantom] Handle redirect error:', error);
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

export function isConnected(): boolean {
  return !!currentSession?.publicKey && !!currentSession?.session;
}

export async function restoreSession(): Promise<string | null> {
  await initSession();
  if (currentSession?.publicKey && currentSession?.session) {
    return currentSession.publicKey;
  }
  return null;
}
