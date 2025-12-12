import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CaughtRoachy {
  id: string;
  templateId: number;
  name: string;
  rarity: string;
  roachyClass: string;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
}

interface EggRevealProps {
  roachy: CaughtRoachy;
  catchQuality: 'perfect' | 'great' | 'good';
  onComplete: () => void;
}

const RARITY_COLORS: Record<string, { primary: string; secondary: string; glow: string }> = {
  common: { 
    primary: '#9CA3AF', 
    secondary: '#6B7280',
    glow: 'rgba(156, 163, 175, 0.5)'
  },
  uncommon: { 
    primary: '#22C55E', 
    secondary: '#16A34A',
    glow: 'rgba(34, 197, 94, 0.6)'
  },
  rare: { 
    primary: '#3B82F6', 
    secondary: '#2563EB',
    glow: 'rgba(59, 130, 246, 0.7)'
  },
  epic: { 
    primary: '#A855F7', 
    secondary: '#9333EA',
    glow: 'rgba(168, 85, 247, 0.8)'
  },
  legendary: { 
    primary: '#F59E0B', 
    secondary: '#D97706',
    glow: 'rgba(245, 158, 11, 0.9)'
  },
};

const CLASS_ICONS: Record<string, string> = {
  tank: '🛡️',
  assassin: '⚔️',
  mage: '✨',
  support: '💚',
};

const ROACHY_IMAGES: Record<string, Record<string, string>> = {
  tank: {
    common: '/assets/roachies/crown-common.jpg',
    uncommon: '/assets/roachies/viking-tank.jpg',
    rare: '/assets/roachies/viking-tank.jpg',
    epic: '/assets/roachies/viking-tank.jpg',
    legendary: '/assets/roachies/cosmic-king.jpg',
  },
  assassin: {
    common: '/assets/roachies/aviator-support.jpg',
    uncommon: '/assets/roachies/aviator-support.jpg',
    rare: '/assets/roachies/aviator-support.jpg',
    epic: '/assets/roachies/royal-mage.jpg',
    legendary: '/assets/roachies/royal-mage.jpg',
  },
  mage: {
    common: '/assets/roachies/frost-mage.jpg',
    uncommon: '/assets/roachies/frost-mage.jpg',
    rare: '/assets/roachies/frost-mage.jpg',
    epic: '/assets/roachies/royal-mage.jpg',
    legendary: '/assets/roachies/royal-mage.jpg',
  },
  support: {
    common: '/assets/roachies/crown-common.jpg',
    uncommon: '/assets/roachies/aviator-support.jpg',
    rare: '/assets/roachies/aviator-support.jpg',
    epic: '/assets/roachies/frost-mage.jpg',
    legendary: '/assets/roachies/cosmic-king.jpg',
  },
};

const getRoachyImage = (roachyClass: string, rarity: string): string => {
  return ROACHY_IMAGES[roachyClass]?.[rarity] || '/assets/roachies/crown-common.jpg';
};

export default function EggReveal({ roachy, catchQuality, onComplete }: EggRevealProps) {
  const [phase, setPhase] = useState<'wobble' | 'crack' | 'hatch' | 'reveal' | 'stats'>('wobble');
  
  const colors = RARITY_COLORS[roachy.rarity] || RARITY_COLORS.common;
  const classIcon = CLASS_ICONS[roachy.roachyClass] || '🪳';

  useEffect(() => {
    const timings = {
      wobble: roachy.rarity === 'legendary' ? 2000 : roachy.rarity === 'epic' ? 1500 : 1000,
      crack: 800,
      hatch: 600,
      reveal: 1500,
    };

    const timer1 = setTimeout(() => setPhase('crack'), timings.wobble);
    const timer2 = setTimeout(() => setPhase('hatch'), timings.wobble + timings.crack);
    const timer3 = setTimeout(() => setPhase('reveal'), timings.wobble + timings.crack + timings.hatch);
    const timer4 = setTimeout(() => setPhase('stats'), timings.wobble + timings.crack + timings.hatch + timings.reveal);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [roachy.rarity]);

  return (
    <div 
      className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[3000] overflow-hidden"
      data-testid="egg-reveal"
    >
      {(roachy.rarity === 'legendary' || roachy.rarity === 'epic') && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full"
              style={{ 
                background: colors.primary,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {(phase === 'wobble' || phase === 'crack') && (
          <motion.div
            key="egg"
            className="relative"
            animate={phase === 'wobble' ? {
              rotate: [-5, 5, -5, 5, -3, 3, 0],
              y: [0, -5, 0, -3, 0],
            } : {
              scale: [1, 1.1, 1, 1.15, 1],
            }}
            transition={{
              duration: phase === 'wobble' ? 0.8 : 0.4,
              repeat: phase === 'wobble' ? Infinity : 2,
            }}
          >
            <div 
              className="w-32 h-40 rounded-[50%] relative"
              style={{
                background: `linear-gradient(180deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                boxShadow: `0 0 60px ${colors.glow}, 0 10px 30px rgba(0,0,0,0.5)`,
              }}
            >
              <div 
                className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-8 rounded-full opacity-30"
                style={{ background: 'white' }}
              />
              
              {phase === 'crack' && (
                <>
                  <motion.div
                    initial={{ opacity: 0, pathLength: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <svg viewBox="0 0 100 120" className="w-full h-full absolute">
                      <motion.path
                        d="M50 10 L45 30 L55 35 L48 55 L58 60 L50 80 L55 100"
                        stroke="white"
                        strokeWidth="3"
                        fill="none"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                    </svg>
                  </motion.div>
                  <motion.div
                    className="absolute inset-0 rounded-[50%]"
                    style={{ background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)` }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 0.2, repeat: Infinity }}
                  />
                </>
              )}
            </div>
            
            <div className="text-center mt-4">
              <p className="text-lg font-bold capitalize" style={{ color: colors.primary }}>
                {roachy.rarity}
              </p>
            </div>
          </motion.div>
        )}

        {phase === 'hatch' && (
          <motion.div
            key="hatch"
            className="relative"
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.5, 0] }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="w-40 h-40 rounded-full"
              style={{
                background: `radial-gradient(circle, white 0%, ${colors.primary} 50%, transparent 70%)`,
                boxShadow: `0 0 100px ${colors.glow}`,
              }}
              animate={{
                scale: [1, 2, 3],
                opacity: [1, 0.8, 0],
              }}
              transition={{ duration: 0.6 }}
            />
          </motion.div>
        )}

        {(phase === 'reveal' || phase === 'stats') && (
          <motion.div
            key="reveal"
            className="flex flex-col items-center"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 10, stiffness: 100 }}
          >
            <motion.div
              className="w-32 h-32 mb-4 rounded-2xl overflow-hidden"
              animate={roachy.rarity === 'legendary' ? {
                boxShadow: [
                  '0 0 20px #F59E0B, 0 0 40px #F59E0B',
                  '0 0 40px #F59E0B, 0 0 80px #F59E0B',
                  '0 0 20px #F59E0B, 0 0 40px #F59E0B',
                ],
              } : roachy.rarity === 'epic' ? {
                boxShadow: [
                  '0 0 15px #A855F7, 0 0 30px #A855F7',
                  '0 0 30px #A855F7, 0 0 60px #A855F7',
                  '0 0 15px #A855F7, 0 0 30px #A855F7',
                ],
              } : {
                boxShadow: `0 0 20px ${colors.glow}`,
              }}
              transition={{ duration: 1, repeat: Infinity }}
              style={{ border: `3px solid ${colors.primary}` }}
            >
              <img 
                src={getRoachyImage(roachy.roachyClass, roachy.rarity)} 
                alt={roachy.name}
                className="w-full h-full object-cover"
              />
            </motion.div>

            <motion.h2
              className="text-3xl font-bold mb-2"
              style={{ color: colors.primary }}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {roachy.name}
            </motion.h2>

            <motion.div
              className="flex items-center gap-2 mb-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <span 
                className="px-3 py-1 rounded-full text-sm font-bold capitalize"
                style={{ 
                  background: `${colors.primary}30`,
                  color: colors.primary,
                  border: `1px solid ${colors.primary}`,
                }}
              >
                {roachy.rarity}
              </span>
              <span className="text-lg">{classIcon}</span>
              <span className="text-[#c4955e] capitalize">{roachy.roachyClass}</span>
            </motion.div>

            {catchQuality === 'perfect' && (
              <motion.div
                className="text-yellow-400 font-bold mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ delay: 0.4 }}
              >
                ⭐ PERFECT CATCH BONUS! ⭐
              </motion.div>
            )}

            <AnimatePresence>
              {phase === 'stats' && (
                <motion.div
                  className="grid grid-cols-4 gap-4 bg-black/50 rounded-xl p-4 border border-[#3b2418]"
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="text-center">
                    <div className="text-2xl">❤️</div>
                    <div className="text-[#f0c850] font-bold">{roachy.baseHp}</div>
                    <div className="text-xs text-gray-500">HP</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl">⚔️</div>
                    <div className="text-[#f0c850] font-bold">{roachy.baseAtk}</div>
                    <div className="text-xs text-gray-500">ATK</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl">🛡️</div>
                    <div className="text-[#f0c850] font-bold">{roachy.baseDef}</div>
                    <div className="text-xs text-gray-500">DEF</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl">💨</div>
                    <div className="text-[#f0c850] font-bold">{roachy.baseSpd}</div>
                    <div className="text-xs text-gray-500">SPD</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {phase === 'stats' && (
              <motion.button
                onClick={onComplete}
                className="mt-6 px-8 py-3 bg-[#f0c850] text-[#120a05] rounded-full font-bold text-lg"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                data-testid="button-continue"
              >
                Awesome!
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {roachy.rarity === 'legendary' && phase === 'reveal' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-2xl"
              style={{
                left: `${Math.random() * 100}%`,
                top: '100%',
              }}
              animate={{
                y: [0, -window.innerHeight - 100],
                rotate: [0, 360],
                opacity: [1, 0],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                delay: Math.random() * 0.5,
                ease: 'easeOut',
              }}
            >
              {['🎉', '✨', '⭐', '🌟'][Math.floor(Math.random() * 4)]}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
