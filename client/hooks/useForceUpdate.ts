import { useState, useEffect, useCallback } from 'react';
import { Platform, Linking } from 'react-native';
import { getApiUrl } from '@/lib/query-client';

interface MobileConfig {
  iosLocked: boolean;
  androidLocked: boolean;
  iosStoreUrl?: string;
  androidStoreUrl?: string;
  message?: string;
}

interface ForceUpdateState {
  isUpdateRequired: boolean;
  isLoading: boolean;
  message: string;
  storeUrl: string | null;
}

const TESTFLIGHT_URL = 'https://testflight.apple.com/join/YOUR_CODE';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.cryptocreatures.app';

export function useForceUpdate(): ForceUpdateState & { checkForUpdate: () => Promise<void>; openStore: () => void } {
  const [state, setState] = useState<ForceUpdateState>({
    isUpdateRequired: false,
    isLoading: true,
    message: '',
    storeUrl: null,
  });

  const getStoreUrl = useCallback((): string => {
    if (Platform.OS === 'ios') {
      return TESTFLIGHT_URL;
    }
    return PLAY_STORE_URL;
  }, []);

  const checkForUpdate = useCallback(async () => {
    if (Platform.OS === 'web') {
      setState(prev => ({ ...prev, isLoading: false, isUpdateRequired: false }));
      return;
    }

    try {
      const baseUrl = getApiUrl();
      const response = await fetch(new URL('/api/mobile/config', baseUrl).toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.log('[ForceUpdate] Config endpoint not available, skipping update check');
        setState(prev => ({ ...prev, isLoading: false, isUpdateRequired: false }));
        return;
      }

      const config: MobileConfig = await response.json();
      
      const isLocked = Platform.OS === 'ios' ? config.iosLocked : config.androidLocked;
      
      console.log(`[ForceUpdate] Platform: ${Platform.OS}, Locked: ${isLocked}`);

      setState({
        isUpdateRequired: isLocked,
        isLoading: false,
        message: config.message || 'A new update is available. Please update to continue using Roachy Games.',
        storeUrl: Platform.OS === 'ios' 
          ? (config.iosStoreUrl || TESTFLIGHT_URL) 
          : (config.androidStoreUrl || PLAY_STORE_URL),
      });
    } catch (error) {
      console.log('[ForceUpdate] Error checking config:', error);
      setState(prev => ({ ...prev, isLoading: false, isUpdateRequired: false }));
    }
  }, []);

  const openStore = useCallback(() => {
    const url = state.storeUrl || getStoreUrl();
    Linking.openURL(url).catch(err => {
      console.error('[ForceUpdate] Failed to open store:', err);
    });
  }, [state.storeUrl, getStoreUrl]);

  useEffect(() => {
    checkForUpdate();
  }, [checkForUpdate]);

  return {
    ...state,
    checkForUpdate,
    openStore,
  };
}
