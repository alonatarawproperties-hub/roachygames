import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

type SoundType = 'jump' | 'coin' | 'hit' | 'powerup';

const SOUND_URLS = {
  jump: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  coin: 'https://assets.mixkit.co/active_storage/sfx/888/888-preview.mp3',
  hit: 'https://assets.mixkit.co/active_storage/sfx/2658/2658-preview.mp3',
  powerup: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
};

export function useFlappySounds() {
  const jumpPlayer = useAudioPlayer(SOUND_URLS.jump);
  const coinPlayer = useAudioPlayer(SOUND_URLS.coin);
  const hitPlayer = useAudioPlayer(SOUND_URLS.hit);
  const powerupPlayer = useAudioPlayer(SOUND_URLS.powerup);
  
  const lastPlayTime = useRef<Record<SoundType, number>>({
    jump: 0,
    coin: 0,
    hit: 0,
    powerup: 0,
  });

  const playSound = useCallback((type: SoundType) => {
    const now = Date.now();
    const minInterval = type === 'jump' ? 100 : 200;
    
    if (now - lastPlayTime.current[type] < minInterval) {
      return;
    }
    lastPlayTime.current[type] = now;

    if (Platform.OS !== 'web') {
      switch (type) {
        case 'jump':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'coin':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'hit':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case 'powerup':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
      }
    }

    try {
      switch (type) {
        case 'jump':
          jumpPlayer.seekTo(0);
          jumpPlayer.play();
          break;
        case 'coin':
          coinPlayer.seekTo(0);
          coinPlayer.play();
          break;
        case 'hit':
          hitPlayer.seekTo(0);
          hitPlayer.play();
          break;
        case 'powerup':
          powerupPlayer.seekTo(0);
          powerupPlayer.play();
          break;
      }
    } catch (error) {
    }
  }, [jumpPlayer, coinPlayer, hitPlayer, powerupPlayer]);

  return { playSound };
}
