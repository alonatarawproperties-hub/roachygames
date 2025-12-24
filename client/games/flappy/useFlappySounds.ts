import { useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import { useAudioPlayer, AudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';

type SoundType = 'jump' | 'coin' | 'hit' | 'die' | 'powerup';

const SOUND_URLS = {
  jump: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  coin: 'https://assets.mixkit.co/active_storage/sfx/888/888-preview.mp3',
  hit: 'https://assets.mixkit.co/active_storage/sfx/2658/2658-preview.mp3',
  die: 'https://assets.mixkit.co/active_storage/sfx/470/470-preview.mp3',
  powerup: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
};

export function useFlappySounds(soundEnabled: boolean = true) {
  const jumpPlayer = useAudioPlayer(SOUND_URLS.jump);
  const coinPlayer = useAudioPlayer(SOUND_URLS.coin);
  const hitPlayer = useAudioPlayer(SOUND_URLS.hit);
  const diePlayer = useAudioPlayer(SOUND_URLS.die);
  const powerupPlayer = useAudioPlayer(SOUND_URLS.powerup);
  
  const lastPlayTime = useRef<Record<SoundType, number>>({
    jump: 0,
    coin: 0,
    hit: 0,
    die: 0,
    powerup: 0,
  });

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
    }).catch(() => {});
    
    // Set volume levels - lower the jump/wind sound
    if (jumpPlayer) {
      jumpPlayer.volume = 0.3;
    }
    if (diePlayer) {
      diePlayer.volume = 0.8;
    }
  }, [jumpPlayer, diePlayer]);

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
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'die':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case 'powerup':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
      }
    }

    if (!soundEnabled) return;

    try {
      let player: AudioPlayer | null = null;
      switch (type) {
        case 'jump':
          player = jumpPlayer;
          break;
        case 'coin':
          player = coinPlayer;
          break;
        case 'hit':
          player = hitPlayer;
          break;
        case 'die':
          player = diePlayer;
          break;
        case 'powerup':
          player = powerupPlayer;
          break;
      }
      
      if (player) {
        player.seekTo(0);
        player.play();
      }
    } catch (error) {
    }
  }, [soundEnabled, jumpPlayer, coinPlayer, hitPlayer, diePlayer, powerupPlayer]);

  return { playSound };
}
