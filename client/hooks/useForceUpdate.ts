import { useState, useEffect, useCallback } from 'react';
import { Platform, Linking } from 'react-native';
import * as Application from 'expo-application';
import { getApiUrl } from '@/lib/query-client';

interface VersionConfig {
  minRequiredVersion: string;
  iosStoreUrl?: string;
  androidStoreUrl?: string;
  message?: string;
}

interface ForceUpdateState {
  isUpdateRequired: boolean;
  isLoading: boolean;
  currentVersion: string;
  requiredVersion: string;
  message: string;
  storeUrl: string | null;
}

function compareVersions(current: string, required: string): number {
  const currentParts = current.split('.').map(Number);
  const requiredParts = required.split('.').map(Number);
  
  for (let i = 0; i < Math.max(currentParts.length, requiredParts.length); i++) {
    const currentPart = currentParts[i] || 0;
    const requiredPart = requiredParts[i] || 0;
    
    if (currentPart < requiredPart) return -1;
    if (currentPart > requiredPart) return 1;
  }
  
  return 0;
}

const TESTFLIGHT_URL = 'https://testflight.apple.com/join/YOUR_CODE';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.cryptocreatures.app';

export function useForceUpdate(): ForceUpdateState & { checkForUpdate: () => Promise<void>; openStore: () => void } {
  const [state, setState] = useState<ForceUpdateState>({
    isUpdateRequired: false,
    isLoading: true,
    currentVersion: '0.0.0',
    requiredVersion: '0.0.0',
    message: '',
    storeUrl: null,
  });

  const getCurrentVersion = useCallback((): string => {
    if (Platform.OS === 'web') {
      return '999.999.999';
    }
    return Application.nativeApplicationVersion || '0.0.0';
  }, []);

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
        console.log('[ForceUpdate] Config endpoint not available, skipping version check');
        setState(prev => ({ ...prev, isLoading: false, isUpdateRequired: false }));
        return;
      }

      const config: VersionConfig = await response.json();
      const currentVersion = getCurrentVersion();
      const requiredVersion = config.minRequiredVersion || '0.0.0';
      
      const comparison = compareVersions(currentVersion, requiredVersion);
      const isUpdateRequired = comparison < 0;

      console.log(`[ForceUpdate] Current: ${currentVersion}, Required: ${requiredVersion}, Update needed: ${isUpdateRequired}`);

      setState({
        isUpdateRequired,
        isLoading: false,
        currentVersion,
        requiredVersion,
        message: config.message || 'A new major update is available. Please update to continue using Roachy Games.',
        storeUrl: Platform.OS === 'ios' 
          ? (config.iosStoreUrl || TESTFLIGHT_URL) 
          : (config.androidStoreUrl || PLAY_STORE_URL),
      });
    } catch (error) {
      console.log('[ForceUpdate] Error checking version:', error);
      setState(prev => ({ ...prev, isLoading: false, isUpdateRequired: false }));
    }
  }, [getCurrentVersion]);

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
