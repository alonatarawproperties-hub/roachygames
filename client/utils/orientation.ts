import * as ScreenOrientation from 'expo-screen-orientation';
import { Platform } from 'react-native';

export async function lockLandscape(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
  } catch (error) {
    console.warn('[Orientation] Failed to lock landscape:', error);
  }
}

export async function lockPortrait(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  } catch (error) {
    console.warn('[Orientation] Failed to lock portrait:', error);
  }
}

export async function unlockOrientation(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await ScreenOrientation.unlockAsync();
  } catch (error) {
    console.warn('[Orientation] Failed to unlock:', error);
  }
}
