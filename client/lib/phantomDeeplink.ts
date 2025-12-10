import 'react-native-get-random-values';
import * as Linking from 'expo-linking';
import nacl from 'tweetnacl';
import { decodeBase64, encodeBase64 } from 'tweetnacl-util';
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

function buildUrl(path: string, params: URLSearchParams): string {
  return `https://phantom.app/ul/v1/${path}?${params.toString()}`;
}

export async function initSession(): Promise<PhantomSession> {
  const saved = await AsyncStorage.getItem(PHANTOM_CONNECT_STORAGE_KEY);
  if (saved) {
    try {
      currentSession = JSON.parse(saved);
      if (currentSession) {
        return currentSession;
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

function decryptPayload(data: string, nonce: string, sharedSecret: Uint8Array): Record<string, unknown> | null {
  try {
    const decrypted = nacl.box.open.after(
      decodeBase64(data),
      decodeBase64(nonce),
      sharedSecret
    );
    
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

  const params = new URLSearchParams({
    dapp_encryption_public_key: currentSession.dappKeyPair.publicKey,
    cluster: 'mainnet-beta',
    app_url: 'https://roachygames.com',
    redirect_link: Linking.createURL('phantom-connect'),
  });

  return buildUrl('connect', params);
}

export function getDisconnectUrl(): string {
  if (!currentSession || !currentSession.session) {
    throw new Error('No active session');
  }

  const params = new URLSearchParams({
    dapp_encryption_public_key: currentSession.dappKeyPair.publicKey,
    redirect_link: Linking.createURL('phantom-disconnect'),
  });

  const payload = { session: currentSession.session };
  const secretKey = bs58.decode(currentSession.dappKeyPair.secretKey);
  const sharedSecretBytes = currentSession.sharedSecret 
    ? bs58.decode(currentSession.sharedSecret) 
    : null;
  
  if (sharedSecretBytes) {
    const nonce = nacl.randomBytes(24);
    const encrypted = nacl.box.after(
      new TextEncoder().encode(JSON.stringify(payload)),
      nonce,
      sharedSecretBytes
    );
    
    params.append('nonce', encodeBase64(nonce));
    params.append('payload', encodeBase64(encrypted));
  }

  return buildUrl('disconnect', params);
}

export async function connectPhantom(): Promise<string | null> {
  await initSession();
  const url = getConnectUrl();
  
  return new Promise((resolve) => {
    pendingConnectResolve = resolve;
    
    setTimeout(() => {
      if (pendingConnectResolve === resolve) {
        pendingConnectResolve = null;
        resolve(null);
      }
    }, 120000);
    
    Linking.openURL(url).catch((error) => {
      console.error('[Phantom] Failed to open URL:', error);
      pendingConnectResolve = null;
      resolve(null);
    });
  });
}

export async function disconnectPhantom(): Promise<void> {
  if (!currentSession?.session) {
    await clearSession();
    return;
  }

  try {
    const url = getDisconnectUrl();
    await Linking.openURL(url);
  } catch (error) {
    console.warn('[Phantom] Disconnect URL failed:', error);
  }
  
  await clearSession();
}

export async function handlePhantomRedirect(url: string): Promise<string | null> {
  try {
    const parsedUrl = new URL(url);
    const params = parsedUrl.searchParams;
    
    const errorCode = params.get('errorCode');
    if (errorCode) {
      console.error('[Phantom] Error from wallet:', errorCode, params.get('errorMessage'));
      pendingConnectResolve?.(null);
      pendingConnectResolve = null;
      return null;
    }

    const phantomPublicKey = params.get('phantom_encryption_public_key');
    const data = params.get('data');
    const nonce = params.get('nonce');

    if (!phantomPublicKey || !data || !nonce || !currentSession) {
      console.log('[Phantom] Missing params:', { phantomPublicKey: !!phantomPublicKey, data: !!data, nonce: !!nonce });
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

    const response = decrypted as unknown as ConnectResponse;
    currentSession.publicKey = response.public_key;
    currentSession.session = response.session;

    await saveSession();

    console.log('[Phantom] Connected successfully:', currentSession.publicKey);
    
    if (pendingConnectResolve) {
      pendingConnectResolve(currentSession.publicKey);
      pendingConnectResolve = null;
    }
    
    return currentSession.publicKey;
  } catch (error) {
    console.error('[Phantom] Handle redirect error:', error);
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
  return currentSession?.publicKey || null;
}
