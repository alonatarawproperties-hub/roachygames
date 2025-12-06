import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CatchMiniGameProps {
  rarity: string;
  onComplete: (success: boolean, catchQuality: 'perfect' | 'great' | 'good' | 'miss') => void;
  onCancel: () => void;
}

const RARITY_COLORS: Record<string, string> = {
  common: '#9CA3AF',
  uncommon: '#22C55E',
  rare: '#3B82F6',
  epic: '#A855F7',
  legendary: '#F59E0B',
};

const RARITY_GLOW: Record<string, string> = {
  common: 'rgba(156, 163, 175, 0.3)',
  uncommon: 'rgba(34, 197, 94, 0.4)',
  rare: 'rgba(59, 130, 246, 0.5)',
  epic: 'rgba(168, 85, 247, 0.6)',
  legendary: 'rgba(245, 158, 11, 0.7)',
};

export default function CatchMiniGame({ rarity, onComplete, onCancel }: CatchMiniGameProps) {
  const [ringSize, setRingSize] = useState(200);
  const [isActive, setIsActive] = useState(true);
  const [attempts, setAttempts] = useState(0);
  const [showResult, setShowResult] = useState<string | null>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  
  const targetSize = 60;
  const perfectRange = 8;
  const greatRange = 15;
  const goodRange = 25;
  
  const shrinkSpeed = rarity === 'legendary' ? 0.8 : 
                      rarity === 'epic' ? 0.9 : 
                      rarity === 'rare' ? 1.0 : 
                      rarity === 'uncommon' ? 1.1 : 1.2;

  const animate = useCallback(() => {
    const elapsed = Date.now() - startTimeRef.current;
    const newSize = 200 - (elapsed * shrinkSpeed * 0.1);
    
    if (newSize <= 20) {
      startTimeRef.current = Date.now();
      setRingSize(200);
      setAttempts(prev => {
        const newAttempts = prev + 1;
        if (newAttempts >= 3) {
          setIsActive(false);
          setShowResult('miss');
          setTimeout(() => onComplete(false, 'miss'), 800);
        }
        return newAttempts;
      });
    } else {
      setRingSize(newSize);
    }
    
    if (isActive) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [shrinkSpeed, isActive, onComplete]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  const handleTap = useCallback(() => {
    if (!isActive) return;
    
    const diff = Math.abs(ringSize - targetSize);
    
    let quality: 'perfect' | 'great' | 'good' | 'miss';
    let success = false;
    
    if (diff <= perfectRange) {
      quality = 'perfect';
      success = true;
    } else if (diff <= greatRange) {
      quality = 'great';
      success = true;
    } else if (diff <= goodRange) {
      quality = 'good';
      success = true;
    } else {
      quality = 'miss';
      success = false;
    }
    
    if (success) {
      setIsActive(false);
      setShowResult(quality);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setTimeout(() => onComplete(true, quality), 800);
    } else {
      startTimeRef.current = Date.now();
      setRingSize(200);
      setAttempts(prev => {
        const newAttempts = prev + 1;
        if (newAttempts >= 3) {
          setIsActive(false);
          setShowResult('miss');
          setTimeout(() => onComplete(false, 'miss'), 800);
        }
        return newAttempts;
      });
    }
  }, [isActive, ringSize, onComplete]);

  const color = RARITY_COLORS[rarity] || RARITY_COLORS.common;
  const glow = RARITY_GLOW[rarity] || RARITY_GLOW.common;

  return (
    <div 
      className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-[3000]"
      onClick={handleTap}
      data-testid="catch-minigame"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Catch it!</h2>
        <p className="text-[#c4955e]">Tap when the ring hits the target</p>
        <div className="flex gap-1 justify-center mt-2">
          {[0, 1, 2].map(i => (
            <div 
              key={i}
              className={`w-3 h-3 rounded-full ${i < (3 - attempts) ? 'bg-[#f0c850]' : 'bg-gray-600'}`}
            />
          ))}
        </div>
      </div>

      <div className="relative w-64 h-64 flex items-center justify-center">
        <div 
          className="absolute rounded-full border-4 transition-none"
          style={{
            width: ringSize,
            height: ringSize,
            borderColor: color,
            boxShadow: `0 0 20px ${glow}, inset 0 0 20px ${glow}`,
          }}
        />
        
        <div 
          className="absolute rounded-full border-4 border-dashed"
          style={{
            width: targetSize,
            height: targetSize,
            borderColor: color,
            opacity: 0.8,
          }}
        />
        
        <div 
          className="w-16 h-16 rounded-full flex items-center justify-center text-4xl"
          style={{
            background: `radial-gradient(circle, ${color}40 0%, ${color}20 100%)`,
            boxShadow: `0 0 30px ${glow}`,
          }}
        >
          ❓
        </div>
      </div>

      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute text-4xl font-bold"
            style={{ 
              color: showResult === 'perfect' ? '#FFD700' : 
                     showResult === 'great' ? '#22C55E' : 
                     showResult === 'good' ? '#3B82F6' : '#EF4444',
              textShadow: '0 0 20px currentColor'
            }}
          >
            {showResult === 'perfect' ? 'PERFECT!' : 
             showResult === 'great' ? 'GREAT!' : 
             showResult === 'good' ? 'GOOD!' : 'ESCAPED!'}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={(e) => { e.stopPropagation(); onCancel(); }}
        className="absolute top-4 right-4 text-white/60 hover:text-white p-2"
        data-testid="button-cancel-catch"
      >
        ✕
      </button>

      <div className="absolute bottom-8 text-center">
        <p className="text-xs text-gray-500">Tap anywhere to catch</p>
      </div>
    </div>
  );
}
