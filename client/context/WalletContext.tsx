import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { Platform, Alert } from 'react-native';
import nacl from 'tweetnacl';
import { decodeBase64 } from 'tweetnacl-util';
import bs58 from 'bs58';
import Constants from 'expo-constants';

const WALLET_STORAGE_KEY = 'roachy_solana_wallet';
const WALLET_PROVIDER_KEY = 'roachy_wallet_provider';
const SESSION_STORAGE_KEY = 'roachy_wallet_session';

export type WalletProviderType = 'phantom' | 'solflare' | 'backpack';

interface WalletProviderInfo {
  id: WalletProviderType;
  name: string;
  iconName: string;
  deepLinkScheme: string;
  universalLink: string;
  appStoreUrl: string;
}

export const WALLET_PROVIDERS: WalletProviderInfo[] = [
  {
    id: 'phantom',
    name: 'Phantom',
    iconName: 'smartphone',
    deepLinkScheme: 'phantom://',
    universalLink: 'https://phantom.app/ul/',
    appStoreUrl: 'https://phantom.app/download',
  },
  {
    id: 'solflare',
    name: 'Solflare',
    iconName: 'sun',
    deepLinkScheme: 'solflare://',
    universalLink: 'https://solflare.com/ul/',
    appStoreUrl: 'https://solflare.com/download',
  },
  {
    id: 'backpack',
    name: 'Backpack',
    iconName: 'package',
    deepLinkScheme: 'backpack://',
    universalLink: 'https://backpack.app/',
    appStoreUrl: 'https://backpack.app/',
  },
];

interface WalletSession {
  dappSecretKey: string;
  dappPublicKey: string;
  sharedSecret: string | null;
  session: string | null;
  providerId: WalletProviderType;
}

interface WalletState {
  connected: boolean;
  address: string | null;
  provider: WalletProviderType | null;
  isConnecting: boolean;
}

interface WalletContextType {
  wallet: WalletState;
  connectWallet: (provider: WalletProviderType) => Promise<boolean>;
  disconnectWallet: () => Promise<void>;
  isLoading: boolean;
  providers: WalletProviderInfo[];
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const isExpoGo = (): boolean => {
  if (Platform.OS === 'web') return true;
  try {
    const executionEnvironment = Constants.executionEnvironment;
    // EAS builds use 'storeClient', classic builds use 'standalone', bare workflow uses 'bare'
    // Only 'storeClient' when distributed via TestFlight/App Store
    const validEnvironments = ['standalone', 'bare', 'storeClient'];
    const result = !validEnvironments.includes(executionEnvironment as string);
    console.log('Execution environment:', executionEnvironment, 'isExpoGo:', result);
    return result;
  } catch {
    return false;
  }
};

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    address: null,
    provider: null,
    isConnecting: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const sessionRef = useRef<WalletSession | null>(null);
  const dappKeyPairRef = useRef<nacl.BoxKeyPair | null>(null);

  useEffect(() => {
    loadStoredWallet();
    const cleanup = setupDeepLinkHandler();
    return cleanup;
  }, []);

  const loadStoredWallet = async () => {
    try {
      const storedAddress = await AsyncStorage.getItem(WALLET_STORAGE_KEY);
      const storedProvider = await AsyncStorage.getItem(WALLET_PROVIDER_KEY) as WalletProviderType | null;
      const storedSession = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
      
      if (storedAddress && storedProvider) {
        setWallet({
          connected: true,
          address: storedAddress,
          provider: storedProvider,
          isConnecting: false,
        });
      }
      
      if (storedSession) {
        try {
          const parsed = JSON.parse(storedSession);
          sessionRef.current = parsed;
        } catch (e) {
          console.log('Failed to parse stored session');
        }
      }
    } catch (error) {
      console.error('Error loading stored wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const decryptPayload = (
    data: string,
    nonce: string,
    sharedSecretBytes: Uint8Array
  ): any => {
    try {
      const decryptedData = nacl.box.open.after(
        decodeBase64(data),
        decodeBase64(nonce),
        sharedSecretBytes
      );
      if (!decryptedData) {
        throw new Error('Unable to decrypt data');
      }
      return JSON.parse(new TextDecoder().decode(decryptedData));
    } catch (error) {
      console.error('Decryption error:', error);
      throw error;
    }
  };

  const setupDeepLinkHandler = () => {
    const handleDeepLink = async (event: { url: string }) => {
      const { url } = event;
      console.log('Received deep link:', url);
      
      try {
        const urlObj = new URL(url);
        const params = urlObj.searchParams;
        
        if (url.includes('errorCode') || url.includes('errorMessage')) {
          const errorCode = params.get('errorCode');
          const errorMessage = params.get('errorMessage');
          console.log('Wallet connection rejected:', errorCode, errorMessage);
          setWallet(prev => ({ ...prev, isConnecting: false }));
          Alert.alert('Connection Failed', errorMessage || 'Wallet connection was rejected');
          return;
        }

        if (url.includes('onConnect') || url.includes('phantom_encryption_public_key')) {
          const phantomEncryptionPubKey = params.get('phantom_encryption_public_key');
          const data = params.get('data');
          const nonce = params.get('nonce');

          if (phantomEncryptionPubKey && data && nonce && dappKeyPairRef.current && sessionRef.current) {
            const phantomPubKeyBytes = bs58.decode(phantomEncryptionPubKey);
            const sharedSecretBytes = nacl.box.before(phantomPubKeyBytes, dappKeyPairRef.current.secretKey);
            
            const decrypted = decryptPayload(data, nonce, sharedSecretBytes);
            console.log('Decrypted response keys:', Object.keys(decrypted));
            
            if (decrypted.public_key) {
              const walletAddress = decrypted.public_key;
              const sessionToken = decrypted.session;
              
              await AsyncStorage.setItem(WALLET_STORAGE_KEY, walletAddress);
              await AsyncStorage.setItem(WALLET_PROVIDER_KEY, sessionRef.current.providerId);
              
              sessionRef.current = {
                ...sessionRef.current,
                sharedSecret: bs58.encode(sharedSecretBytes),
                session: sessionToken,
              };
              await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionRef.current));
              
              setWallet({
                connected: true,
                address: walletAddress,
                provider: sessionRef.current.providerId,
                isConnecting: false,
              });
              
              dappKeyPairRef.current = null;
              
              console.log('Wallet connected successfully:', walletAddress.substring(0, 8) + '...');
              Alert.alert('Connected!', `Wallet ${walletAddress.substring(0, 8)}...${walletAddress.substring(walletAddress.length - 4)} connected successfully!`);
            }
          }
        }
      } catch (error) {
        console.error('Error handling deep link:', error);
        setWallet(prev => ({ ...prev, isConnecting: false }));
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => subscription.remove();
  };

  const connectWallet = useCallback(async (providerId: WalletProviderType): Promise<boolean> => {
    const provider = WALLET_PROVIDERS.find(p => p.id === providerId);
    if (!provider) return false;

    if (Platform.OS === 'web') {
      Alert.alert(
        'Mobile App Required',
        'Wallet connections require the Roachy Games mobile app. Please download the app from TestFlight to connect your Solana wallet.',
        [{ text: 'OK' }]
      );
      return false;
    }

    if (isExpoGo()) {
      Alert.alert(
        'TestFlight Required',
        `To connect your ${provider.name} wallet, please use the Roachy Games app from TestFlight.\n\nExpo Go cannot handle the secure wallet redirect flow. Your game progress is saved and can be linked to your wallet once you upgrade to the full app.`,
        [{ text: 'Got it!' }]
      );
      return false;
    }

    setWallet(prev => ({ ...prev, isConnecting: true }));

    try {
      const dappKeyPair = nacl.box.keyPair();
      dappKeyPairRef.current = dappKeyPair;
      
      const dappPublicKeyBase58 = bs58.encode(dappKeyPair.publicKey);

      sessionRef.current = {
        dappSecretKey: bs58.encode(dappKeyPair.secretKey),
        dappPublicKey: dappPublicKeyBase58,
        sharedSecret: null,
        session: null,
        providerId,
      };

      const redirectLink = 'roachy-games://onConnect';
      const appUrl = 'https://roachygames.app';
      const cluster = 'mainnet-beta';
      
      let connectUrl: string;
      
      switch (providerId) {
        case 'phantom':
          connectUrl = `https://phantom.app/ul/v1/connect?` +
            `app_url=${encodeURIComponent(appUrl)}` +
            `&dapp_encryption_public_key=${dappPublicKeyBase58}` +
            `&redirect_link=${encodeURIComponent(redirectLink)}` +
            `&cluster=${cluster}`;
          break;
          
        case 'solflare':
          connectUrl = `https://solflare.com/ul/v1/connect?` +
            `app_url=${encodeURIComponent(appUrl)}` +
            `&dapp_encryption_public_key=${dappPublicKeyBase58}` +
            `&redirect_link=${encodeURIComponent(redirectLink)}` +
            `&cluster=${cluster}`;
          break;
          
        case 'backpack':
          connectUrl = `https://backpack.app/ul/v1/connect?` +
            `app_url=${encodeURIComponent(appUrl)}` +
            `&dapp_encryption_public_key=${dappPublicKeyBase58}` +
            `&redirect_link=${encodeURIComponent(redirectLink)}` +
            `&cluster=${cluster}`;
          break;
          
        default:
          setWallet(prev => ({ ...prev, isConnecting: false }));
          return false;
      }
      
      console.log('Opening wallet with URL:', connectUrl.substring(0, 80) + '...');
      
      await Linking.openURL(connectUrl);
      
      return true;
    } catch (error) {
      console.error('Wallet connection error:', error);
      setWallet(prev => ({ ...prev, isConnecting: false }));
      Alert.alert('Error', 'Failed to connect wallet. Please try again.');
      return false;
    }
  }, []);

  const disconnectWallet = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(WALLET_STORAGE_KEY);
      await AsyncStorage.removeItem(WALLET_PROVIDER_KEY);
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
      sessionRef.current = null;
      dappKeyPairRef.current = null;
      
      setWallet({
        connected: false,
        address: null,
        provider: null,
        isConnecting: false,
      });
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  }, []);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        connectWallet,
        disconnectWallet,
        isLoading,
        providers: WALLET_PROVIDERS,
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
