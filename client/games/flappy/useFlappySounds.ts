import { useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import { useAudioPlayer, AudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';

type SoundType = 'jump' | 'coin' | 'hit' | 'die' | 'powerup';

const SOUNDS = {
  jump: require('@assets/audio/flappy-tap.wav'),
  coin: require('@assets/audio/flappy-coin.wav'),
  hit: require('@assets/audio/flappy-die.wav'),
  die: require('@assets/audio/flappy-die.wav'),
  powerup: require('@assets/audio/flappy-powerup.wav'),
};

export function useFlappySounds(soundEnabled: boolean = true) {
  const jumpPlayer = useAudioPlayer(SOUNDS.jump);
  const coinPlayer = useAudioPlayer(SOUNDS.coin);
  const hitPlayer = useAudioPlayer(SOUNDS.hit);
  const diePlayer = useAudioPlayer(SOUNDS.die);
  const powerupPlayer = useAudioPlayer(SOUNDS.powerup);
  
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
    
    if (jumpPlayer) {
      jumpPlayer.volume = 0.5;
    }
    if (coinPlayer) {
      coinPlayer.volume = 0.7;
    }
    if (diePlayer) {
      diePlayer.volume = 0.8;
    }
    if (powerupPlayer) {
      powerupPlayer.volume = 0.7;
    }
  }, [jumpPlayer, coinPlayer, diePlayer, powerupPlayer]);

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
