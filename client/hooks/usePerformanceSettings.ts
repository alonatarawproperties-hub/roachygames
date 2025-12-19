import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type PerformanceMode = 'low' | 'medium' | 'high';

export interface PerformanceSettings {
  cloudsEnabled: boolean;
  trailsEnabled: boolean;
  renderThrottle: number;
  cloudSpawnInterval: number;
  maxTrailParticles: number;
}

const PERFORMANCE_PRESETS: Record<PerformanceMode, PerformanceSettings> = {
  low: {
    cloudsEnabled: false,
    trailsEnabled: false,
    renderThrottle: 3,
    cloudSpawnInterval: 5000,
    maxTrailParticles: 0,
  },
  medium: {
    cloudsEnabled: true,
    trailsEnabled: false,
    renderThrottle: 2,
    cloudSpawnInterval: 4000,
    maxTrailParticles: 4,
  },
  high: {
    cloudsEnabled: true,
    trailsEnabled: true,
    renderThrottle: 1,
    cloudSpawnInterval: 3000,
    maxTrailParticles: 12,
  },
};

const STORAGE_KEY = 'flappy_performance_mode';

const getDefaultMode = (): PerformanceMode => {
  return Platform.OS === 'android' ? 'low' : 'high';
};

export function usePerformanceSettings() {
  const [mode, setModeState] = useState<PerformanceMode>(getDefaultMode());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && (stored === 'low' || stored === 'medium' || stored === 'high')) {
          setModeState(stored as PerformanceMode);
        }
      } catch (error) {
        console.log('Failed to load performance settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const setMode = useCallback(async (newMode: PerformanceMode) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newMode);
      setModeState(newMode);
    } catch (error) {
      console.log('Failed to save performance settings:', error);
    }
  }, []);

  const settings = PERFORMANCE_PRESETS[mode];

  return {
    mode,
    setMode,
    settings,
    isLoading,
  };
}

export { PERFORMANCE_PRESETS };
