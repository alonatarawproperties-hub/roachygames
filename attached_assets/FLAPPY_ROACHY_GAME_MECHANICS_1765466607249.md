# Flappy Roachy - Complete Game Mechanics

This document contains all the code needed to implement the Flappy Roachy game mechanics.

---

## 1. GAME CONSTANTS & PHYSICS

```typescript
// Base Game Constants (multiply by speed setting)
const BASE_GRAVITY = 0.17;
const BASE_JUMP_STRENGTH = -5;
const BASE_MAX_FALL_SPEED = 8;
const BASE_PIPE_SPEED = 1.5;
const BASE_PIPE_SPAWN_RATE = 3000; // ms
const GAP_SIZE = 180; // Gap between pipes
const BASE_COIN_SPAWN_RATE = 4000; // ms

// Powerup Timing
const POWERUP_SPAWN_RATE_MIN = 10000; // 10 seconds
const POWERUP_SPAWN_RATE_MAX = 60000; // 60 seconds
const DOUBLE_POINTS_DURATION = 10000; // 10 seconds

// Dimensions
const BIRD_X = 25;
const BIRD_WIDTH = 100;
const BIRD_HEIGHT = 100;
const POWERUP_WIDTH = 35;
const POWERUP_HEIGHT = 35;
const PIPE_WIDTH = 52;
const COIN_WIDTH = 30;
const COIN_HEIGHT = 30;
const GROUND_HEIGHT = 112;

// Speed multipliers
function getSpeedMultiplier(): number {
  const speed = localStorage.getItem('game_speed') || 'normal';
  switch (speed) {
    case 'slow': return 0.6;
    case 'fast': return 1.5;
    default: return 1.0;
  }
}
```

---

## 2. BIRD COMPONENT (Bird.tsx)

```tsx
import { memo, useMemo, useEffect, useState } from 'react';

interface BirdProps {
  y: number;
  velocity: number;
  godMode?: boolean;
  frameIndex?: number;
  skinName?: string;
}

const SKIN_EFFECTS: Record<string, { filter: string; glow: string; auraColor: string }> = {
  'Golden Roachy': {
    filter: 'sepia(100%) saturate(300%) brightness(1.1) hue-rotate(15deg)',
    glow: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.9)) drop-shadow(0 0 15px rgba(255, 180, 0, 0.6))',
    auraColor: 'rgba(255, 215, 0, 0.3)',
  },
  'Ruby Roachy': {
    filter: 'sepia(100%) saturate(400%) brightness(0.9) hue-rotate(-30deg)',
    glow: 'drop-shadow(0 0 8px rgba(255, 50, 50, 0.9)) drop-shadow(0 0 15px rgba(200, 0, 0, 0.6))',
    auraColor: 'rgba(255, 50, 50, 0.3)',
  },
  'Jade Roachy': {
    filter: 'sepia(100%) saturate(300%) brightness(1.0) hue-rotate(80deg)',
    glow: 'drop-shadow(0 0 8px rgba(0, 200, 100, 0.9)) drop-shadow(0 0 15px rgba(0, 150, 80, 0.6))',
    auraColor: 'rgba(0, 200, 100, 0.3)',
  },
  'Diamond Roachy': {
    filter: 'brightness(1.3) contrast(1.1) saturate(0.3)',
    glow: 'drop-shadow(0 0 10px rgba(200, 230, 255, 1)) drop-shadow(0 0 20px rgba(150, 200, 255, 0.8))',
    auraColor: 'rgba(200, 230, 255, 0.4)',
  },
  'Cyber Roachy': {
    filter: 'saturate(150%) brightness(1.1)',
    glow: 'drop-shadow(0 0 8px rgba(0, 255, 255, 0.9)) drop-shadow(0 0 15px rgba(255, 0, 255, 0.6))',
    auraColor: 'rgba(0, 255, 255, 0.3)',
  },
  'Celestial Roachy': {
    filter: 'brightness(1.2) saturate(120%)',
    glow: 'drop-shadow(0 0 12px rgba(200, 150, 255, 1)) drop-shadow(0 0 25px rgba(100, 50, 200, 0.7))',
    auraColor: 'rgba(200, 150, 255, 0.35)',
  },
};

export const Bird = memo(function Bird({ y, velocity, godMode = false, frameIndex = 0, skinName }: BirdProps) {
  const rotation = Math.min(Math.max(velocity * 3, -25), 90);
  const scale = godMode ? 1.4 : 1;
  const birdSize = godMode ? 140 : 100;
  const birdOffset = godMode ? 70 : 50;
  
  const skinEffect = skinName ? SKIN_EFFECTS[skinName] : null;
  
  const getFilter = () => {
    if (godMode) {
      return 'brightness(1.3) drop-shadow(0 0 15px rgba(255, 215, 0, 0.8))';
    }
    if (skinEffect) {
      return `${skinEffect.filter} ${skinEffect.glow}`;
    }
    return 'none';
  };
  
  return (
    <div 
      className="absolute z-20"
      style={{ 
        left: `${godMode ? 12.5 : 50}px`,
        top: `${y - birdOffset}px`,
        width: `${birdSize}px`,
        height: `${birdSize}px`,
        transform: `rotate(${rotation}deg) scale(${scale})`,
        filter: getFilter(),
      }}
    >
      {godMode && (
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255, 215, 0, 0.2) 0%, transparent 60%)',
            animation: 'godModeAura 1s ease-in-out infinite',
          }}
        />
      )}
      
      {skinEffect && !godMode && (
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${skinEffect.auraColor} 0%, transparent 70%)`,
            animation: 'skinAura 2s ease-in-out infinite',
          }}
        />
      )}
      
      <img
        src={`/bird-frame-${frameIndex % 4}.png`}
        alt="Roachy"
        className="w-full h-full object-contain"
      />
    </div>
  );
});
```

---

## 3. PIPE COMPONENT (Pipe.tsx)

```tsx
import { memo } from 'react';

interface PipeProps {
  x: number;
  topHeight: number;
  gap: number;
  passed: boolean;
}

export const Pipe = memo(function Pipe({ x, topHeight, gap, passed }: PipeProps) {
  return (
    <>
      {/* Top Pipe */}
      <div 
        className="absolute w-[52px] bg-green-500 border-4 border-black z-10"
        style={{ 
          left: `${x}px`, 
          top: 0, 
          height: `${topHeight}px`,
        }}
      >
        {/* Pipe Cap */}
        <div className="absolute bottom-0 left-[-4px] w-[60px] h-[24px] bg-green-500 border-4 border-black" />
        {/* Highlight */}
        <div className="absolute top-0 left-2 w-2 h-full bg-green-300/30" />
      </div>

      {/* Bottom Pipe */}
      <div 
        className="absolute w-[52px] bg-green-500 border-4 border-black z-10"
        style={{ 
          left: `${x}px`, 
          top: `${topHeight + gap}px`, 
          bottom: '112px', // Ground height
        }}
      >
        {/* Pipe Cap */}
        <div className="absolute top-0 left-[-4px] w-[60px] h-[24px] bg-green-500 border-4 border-black" />
        {/* Highlight */}
        <div className="absolute top-0 left-2 w-2 h-full bg-green-300/30" />
      </div>
    </>
  );
});
```

---

## 4. COIN COMPONENT (Coin.tsx)

```tsx
import { memo } from 'react';

interface CoinProps {
  x: number;
  y: number;
  value: number;
}

export const Coin = memo(function Coin({ x, y, value }: CoinProps) {
  return (
    <div 
      className="absolute w-[30px] h-[30px] z-15 flex items-center justify-center"
      style={{ 
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <div className="w-full h-full bg-yellow-400 rounded-full border-2 border-yellow-600 flex items-center justify-center font-bold text-[9px] text-yellow-900">
        {value}
      </div>
    </div>
  );
});
```

---

## 5. POWERUP COMPONENT (PowerUp.tsx)

```tsx
import { memo } from 'react';

interface PowerUpProps {
  x: number;
  y: number;
  type?: string;
}

const getIconAndColor = (powerUpType: string): { emoji: string; bgColor: string; borderColor: string } => {
  const typeLower = powerUpType.toLowerCase();
  
  if (typeLower.includes('nescafe') || typeLower.includes('boost')) {
    return { emoji: '☕', bgColor: '#8B4513', borderColor: '#5D2E0C' };
  }
  if (typeLower.includes('extended') && typeLower.includes('shield')) {
    return { emoji: '🛡️', bgColor: '#1E40AF', borderColor: '#1E3A8A' };
  }
  if (typeLower.includes('regeneration')) {
    return { emoji: '✨', bgColor: '#10B981', borderColor: '#047857' };
  }
  if (typeLower.includes('speed') || typeLower.includes('burst')) {
    return { emoji: '⚡', bgColor: '#FBBF24', borderColor: '#D97706' };
  }
  if (typeLower.includes('shield')) {
    return { emoji: '🛡️', bgColor: '#3B82F6', borderColor: '#1D4ED8' };
  }
  if (typeLower.includes('double') || typeLower.includes('points')) {
    return { emoji: '×2', bgColor: '#F59E0B', borderColor: '#B45309' };
  }
  if (typeLower.includes('magnet') || typeLower.includes('coin')) {
    return { emoji: '🧲', bgColor: '#EF4444', borderColor: '#B91C1C' };
  }
  return { emoji: '⭐', bgColor: '#9333EA', borderColor: '#7C3AED' };
};

export const PowerUp = memo(function PowerUp({ x, y, type = 'Shield' }: PowerUpProps) {
  const { emoji, bgColor, borderColor } = getIconAndColor(type);
  
  return (
    <div 
      className="absolute w-[32px] h-[32px] z-15 flex items-center justify-center rounded-full"
      style={{ 
        left: `${x - 16}px`,
        top: `${y - 16}px`,
        animation: 'powerUpBounce 0.8s ease-in-out infinite',
        backgroundColor: bgColor,
        border: `3px solid ${borderColor}`,
        boxShadow: `0 0 10px ${bgColor}, 0 2px 4px rgba(0,0,0,0.3)`
      }}
    >
      <span style={{ fontSize: emoji === '×2' ? '14px' : '16px', fontWeight: emoji === '×2' ? 'bold' : 'normal', color: emoji === '×2' ? '#fff' : undefined }}>
        {emoji}
      </span>
    </div>
  );
});
```

---

## 6. GROUND COMPONENT (Ground.tsx)

```tsx
export function Ground() {
  return (
    <div className="absolute bottom-0 w-full h-[112px] z-30 overflow-hidden border-t-4 border-black bg-[#ded895]">
      {/* Grass Top */}
      <div className="w-full h-[12px] bg-[#73bf2e] border-b-4 border-black" />
      
      {/* Scrolling Pattern */}
      <div 
        className="w-[200%] h-full absolute top-[12px] flex animate-scroll-ground"
        style={{ 
          backgroundImage: 'repeating-linear-gradient(-45deg, #ded895 0, #ded895 10px, #cbb968 10px, #cbb968 20px)'
        }}
      />
    </div>
  );
}
```

---

## 7. GLITTER TRAIL (GlitterTrail.tsx)

```tsx
import { memo } from 'react';

interface GlitterParticle {
  id: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  delay: number;
}

interface GlitterTrailProps {
  particles: GlitterParticle[];
  trailColor?: string;
  trailName?: string;
}

const RAINBOW_COLORS = [
  { color: 'rgba(255, 0, 0, 1)', shadow: 'rgba(255, 0, 0, 0.8)' },
  { color: 'rgba(255, 127, 0, 1)', shadow: 'rgba(255, 127, 0, 0.8)' },
  { color: 'rgba(255, 255, 0, 1)', shadow: 'rgba(255, 255, 0, 0.8)' },
  { color: 'rgba(0, 255, 0, 1)', shadow: 'rgba(0, 255, 0, 0.8)' },
  { color: 'rgba(0, 150, 255, 1)', shadow: 'rgba(0, 150, 255, 0.8)' },
  { color: 'rgba(75, 0, 130, 1)', shadow: 'rgba(75, 0, 130, 0.8)' },
  { color: 'rgba(200, 100, 255, 1)', shadow: 'rgba(200, 100, 255, 0.8)' },
];

export const GlitterTrail = memo(function GlitterTrail({ particles, trailColor, trailName }: GlitterTrailProps) {
  const getTrailStyle = (name?: string, particleIndex?: number) => {
    const lowerName = name?.toLowerCase() || '';
    
    if (lowerName.includes('rainbow')) {
      const colorIndex = (particleIndex || 0) % RAINBOW_COLORS.length;
      const rainbowColor = RAINBOW_COLORS[colorIndex];
      return {
        background: `radial-gradient(circle, ${rainbowColor.color} 0%, ${rainbowColor.shadow} 50%, transparent 100%)`,
        boxShadow: `0 0 10px ${rainbowColor.shadow}`,
      };
    }
    
    if (lowerName.includes('gold')) {
      return {
        background: 'radial-gradient(circle, rgba(255, 215, 0, 1) 0%, rgba(255, 180, 0, 0.9) 40%, transparent 100%)',
        boxShadow: '0 0 12px rgba(255, 200, 0, 1)',
      };
    }
    
    if (lowerName.includes('fire')) {
      return {
        background: 'radial-gradient(circle, rgba(255, 100, 0, 1) 0%, rgba(255, 50, 0, 0.9) 50%, transparent 100%)',
        boxShadow: '0 0 10px rgba(255, 100, 0, 0.9)',
      };
    }
    
    // Default gold
    return {
      background: 'radial-gradient(circle, rgba(255, 215, 0, 1) 0%, rgba(255, 165, 0, 0.8) 50%, transparent 100%)',
      boxShadow: '0 0 8px rgba(255, 215, 0, 0.8)',
    };
  };

  return (
    <>
      {particles.map((particle, index) => (
        <div
          key={particle.id}
          className="absolute pointer-events-none z-10"
          style={{
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            opacity: particle.opacity,
            animation: `glitterSparkle 0.6s ease-out forwards`,
            animationDelay: `${particle.delay}s`,
          }}
        >
          <div
            className="w-full h-full"
            style={{
              borderRadius: '50%',
              ...getTrailStyle(trailName, index),
            }}
          />
        </div>
      ))}
    </>
  );
});
```

---

## 8. COIN EFFECT (CoinEffect.tsx)

```tsx
import { useEffect, useState } from 'react';

interface CoinEffectProps {
  x: number;
  y: number;
  onComplete: () => void;
}

export function CoinEffect({ x, y, onComplete }: CoinEffectProps) {
  const [particles, setParticles] = useState<Array<{ id: number; angle: number }>>([]);

  useEffect(() => {
    const particleCount = 8;
    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      angle: (i / particleCount) * Math.PI * 2,
    }));
    setParticles(newParticles);

    const timer = setTimeout(() => {
      onComplete();
    }, 600);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <>
      {particles.map((particle) => {
        const distance = 60;
        const finalX = x + Math.cos(particle.angle) * distance;
        const finalY = y + Math.sin(particle.angle) * distance;

        return (
          <div
            key={particle.id}
            className="absolute w-[8px] h-[8px] bg-yellow-400 rounded-full pointer-events-none"
            style={{
              left: `${x}px`,
              top: `${y}px`,
              animation: `coinBurst 0.6s ease-out forwards`,
              '--burst-x': `${finalX - x}px`,
              '--burst-y': `${finalY - y}px`,
            } as React.CSSProperties}
          />
        );
      })}
      <div
        className="absolute w-[30px] h-[30px] border-2 border-yellow-400 rounded-full pointer-events-none"
        style={{
          left: `${x - 15}px`,
          top: `${y - 15}px`,
          animation: `coinPulse 0.6s ease-out forwards`,
        }}
      />
    </>
  );
}
```

---

## 9. SOUND MANAGER (SoundManager.tsx)

```tsx
class GameSoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    const saved = localStorage.getItem('sound_enabled');
    this.enabled = saved !== 'false';
  }

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('sound_enabled', enabled.toString());
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'square', volume: number = 0.3) {
    if (!this.enabled) return;

    try {
      const ctx = this.getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (error) {
      console.warn('Sound playback failed:', error);
    }
  }

  jump() {
    this.playTone(600, 0.1, 'square', 0.2);
  }

  coin() {
    setTimeout(() => this.playTone(800, 0.05, 'sine', 0.25), 0);
    setTimeout(() => this.playTone(1000, 0.05, 'sine', 0.25), 50);
    setTimeout(() => this.playTone(1200, 0.1, 'sine', 0.25), 100);
  }

  powerup() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.1, 'triangle', 0.2), i * 80);
    });
  }

  collision() {
    this.playTone(100, 0.15, 'sawtooth', 0.4);
    setTimeout(() => this.playTone(80, 0.15, 'square', 0.4), 50);
    setTimeout(() => this.playTone(60, 0.2, 'sawtooth', 0.3), 100);
  }

  buttonClick() {
    this.playTone(400, 0.08, 'sine', 0.2);
  }
}

export const soundManager = new GameSoundManager();
```

---

## 10. MAIN GAME LOOP (Game.tsx - Core Logic)

```tsx
// Game state
const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
const [score, setScore] = useState(0);

// Physics refs
const birdY = useRef(200);
const birdVelocity = useRef(0);
const pipes = useRef<Array<{x: number, topHeight: number, passed: boolean}>>([]);
const coins = useRef<Array<{x: number, y: number, value: number, collected: boolean}>>([]);
const powerUps = useRef<Array<{x: number, y: number, type: string, collected: boolean}>>([]);

// Powerup states
const godModeRef = useRef(false);
const godModeEndTime = useRef<number>(0);
const coinMagnetRef = useRef(false);
const coinMagnetEndTime = useRef<number>(0);
const doublePointsActiveRef = useRef(false);
const doublePointsEndTime = useRef<number>(0);

// Jump function
const jump = () => {
  if (gameState === 'playing') {
    birdVelocity.current = JUMP_STRENGTH;
    soundManager.jump();
  } else if (gameState === 'start') {
    setGameState('playing');
    birdVelocity.current = JUMP_STRENGTH;
    resetGame();
  }
};

// Game loop
const gameLoop = useCallback((timestamp: number) => {
  if (gameState !== 'playing') return;

  const gameHeight = 600;
  const gameWidth = 400;

  // 1. PHYSICS
  birdVelocity.current += GRAVITY;
  if (birdVelocity.current > MAX_FALL_SPEED) {
    birdVelocity.current = MAX_FALL_SPEED;
  }
  birdY.current += birdVelocity.current;

  // 2. BOUNDARY CHECK
  const minY = 50;
  const maxY = gameHeight - GROUND_HEIGHT - 10;
  
  if (!godModeRef.current && birdY.current >= maxY) {
    gameOver();
    return;
  }
  
  birdY.current = Math.max(minY, Math.min(maxY, birdY.current));

  // 3. SPAWN PIPES
  if (timestamp - lastPipeTime.current > PIPE_SPAWN_RATE) {
    const minPipeHeight = 50;
    const maxPipeHeight = gameHeight - GROUND_HEIGHT - GAP_SIZE - minPipeHeight;
    const randomHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight + 1)) + minPipeHeight;
    
    pipes.current.push({ x: gameWidth, topHeight: randomHeight, passed: false });
    lastPipeTime.current = timestamp;
  }

  // 4. SPAWN COINS (random value 1-100)
  if (timestamp - lastCoinTime.current > COIN_SPAWN_RATE) {
    const coinValue = Math.floor(Math.random() * 100) + 1;
    const coinY = Math.floor(Math.random() * (gameHeight - GROUND_HEIGHT - 100)) + 50;
    
    coins.current.push({ x: gameWidth, y: coinY, value: coinValue, collected: false });
    lastCoinTime.current = timestamp;
  }

  // 5. MOVE EVERYTHING LEFT
  pipes.current.forEach(pipe => pipe.x -= PIPE_SPEED);
  coins.current.forEach(coin => {
    coin.x -= PIPE_SPEED;
    
    // Coin magnet attraction
    if (coinMagnetRef.current && !coin.collected) {
      const dx = (BIRD_X + BIRD_WIDTH / 2) - coin.x;
      const dy = birdY.current - coin.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 150 && dist > 0) {
        coin.x += (dx / dist) * 8;
        coin.y += (dy / dist) * 8;
      }
    }
  });
  powerUps.current.forEach(pu => pu.x -= PIPE_SPEED);

  // 6. CLEANUP OFF-SCREEN
  pipes.current = pipes.current.filter(pipe => pipe.x > -PIPE_WIDTH);
  coins.current = coins.current.filter(coin => coin.x > -COIN_WIDTH);

  // 7. UPDATE POWERUP TIMERS
  if (godModeRef.current && timestamp > godModeEndTime.current) {
    godModeRef.current = false;
  }
  if (coinMagnetRef.current && timestamp > coinMagnetEndTime.current) {
    coinMagnetRef.current = false;
  }
  if (doublePointsActiveRef.current && timestamp > doublePointsEndTime.current) {
    doublePointsActiveRef.current = false;
  }

  // 8. COLLISION DETECTION
  const birdRect = {
    top: birdY.current - 15,
    bottom: birdY.current + 15,
    left: BIRD_X + 35,
    right: BIRD_X + BIRD_WIDTH - 35
  };

  // Pipe collision (skip if god mode)
  if (!godModeRef.current) {
    pipes.current.forEach(pipe => {
      if (birdRect.right > pipe.x && birdRect.left < pipe.x + PIPE_WIDTH) {
        if (birdRect.top < pipe.topHeight || birdRect.bottom > pipe.topHeight + GAP_SIZE) {
          gameOver();
        }
      }
    });
  }

  // Coin collision
  const collectRect = {
    top: birdY.current - 35,
    bottom: birdY.current + 35,
    left: BIRD_X + 15,
    right: BIRD_X + BIRD_WIDTH - 15
  };

  coins.current.forEach(coin => {
    if (!coin.collected) {
      if (collectRect.right > coin.x && collectRect.left < coin.x + COIN_WIDTH &&
          collectRect.bottom > coin.y && collectRect.top < coin.y + COIN_HEIGHT) {
        coin.collected = true;
        soundManager.coin();
        const points = doublePointsActiveRef.current ? coin.value * 2 : coin.value;
        setScore(s => s + points);
      }
    }
  });

  // Remove collected coins
  coins.current = coins.current.filter(coin => !coin.collected);

  // 9. POWERUP COLLISION
  powerUps.current.forEach(powerUp => {
    if (!powerUp.collected) {
      if (collectRect.right > powerUp.x && collectRect.left < powerUp.x + POWERUP_WIDTH &&
          collectRect.bottom > powerUp.y && collectRect.top < powerUp.y + POWERUP_HEIGHT) {
        powerUp.collected = true;
        soundManager.powerup();
        
        const type = powerUp.type.toLowerCase();
        
        if (type.includes('shield') || type.includes('nescafe')) {
          godModeRef.current = true;
          godModeEndTime.current = timestamp + 5000;
        } else if (type.includes('double') || type.includes('points')) {
          if (doublePointsActiveRef.current) {
            doublePointsEndTime.current += 10000; // Extend
          } else {
            doublePointsActiveRef.current = true;
            doublePointsEndTime.current = timestamp + 10000;
          }
        } else if (type.includes('magnet')) {
          coinMagnetRef.current = true;
          coinMagnetEndTime.current = timestamp + 8000;
        }
      }
    }
  });

  powerUps.current = powerUps.current.filter(pu => !pu.collected);

  // Request next frame
  requestAnimationFrame(gameLoop);
}, [gameState]);
```

---

## 11. CSS ANIMATIONS

```css
@keyframes powerUpBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

@keyframes godModeAura {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 0.8; }
}

@keyframes glitterSparkle {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(0); opacity: 0; }
}

@keyframes coinBurst {
  0% { transform: translate(0, 0); opacity: 1; }
  100% { transform: translate(var(--burst-x), var(--burst-y)); opacity: 0; }
}

@keyframes coinPulse {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(2); opacity: 0; }
}

@keyframes scroll-ground {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.animate-scroll-ground {
  animation: scroll-ground 2s linear infinite;
}
```

---

## 12. POWERUP EFFECTS SUMMARY

| Powerup | Duration | Effect |
|---------|----------|--------|
| Shield | 5s | Invincibility (god mode) |
| Extended Shield | 8s | Invincibility (god mode) |
| NESCAFE Boost | 6s | Invincibility (god mode) |
| Shield Regeneration | 5s | Invincibility (god mode) |
| Double Points | 10s | x2 coin value (extends on multiple pickups) |
| Coin Magnet | 8s | Attracts coins within 150px radius |
| Speed Burst | instant | No duration effect |

---

This document contains all the core mechanics for Flappy Roachy. Copy the components you need into your mobile app project!
