import { useState, useEffect, useCallback } from 'react';
import { Skull, Zap, Heart, Users, Swords, Shield, Clock } from 'lucide-react';

const RARITY_COLORS: Record<string, string> = {
  common: '#9CA3AF',
  uncommon: '#22C55E',
  rare: '#3B82F6',
  epic: '#A855F7',
  legendary: '#F59E0B',
};

interface Raid {
  id: string;
  name: string;
  rarity: string;
  class: string;
  currentHP: number;
  maxHP: number;
  participantCount: number;
  expiresAt: string;
}

interface RaidBattleMiniGameProps {
  raid: Raid;
  walletAddress: string;
  onComplete: (rewards: { chyCoins: number; xp: number; contribution: number; guaranteedEgg: boolean } | null) => void;
  onCancel: () => void;
}

export default function RaidBattleMiniGame({ raid, walletAddress, onComplete, onCancel }: RaidBattleMiniGameProps) {
  const [currentHP, setCurrentHP] = useState(raid.currentHP);
  const [isJoined, setIsJoined] = useState(false);
  const [isAttacking, setIsAttacking] = useState(false);
  const [totalDamage, setTotalDamage] = useState(0);
  const [lastDamage, setLastDamage] = useState<number | null>(null);
  const [attackCooldown, setAttackCooldown] = useState(0);
  const [isDefeated, setIsDefeated] = useState(false);
  const [rewards, setRewards] = useState<any>(null);
  const [participantCount, setParticipantCount] = useState(raid.participantCount);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [hitZonePosition, setHitZonePosition] = useState(50);
  const [attackerPosition, setAttackerPosition] = useState(0);
  const [isTimingActive, setIsTimingActive] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const endTime = new Date(raid.expiresAt).getTime();
      const now = Date.now();
      const remaining = endTime - now;
      
      if (remaining <= 0) {
        setTimeRemaining('Expired');
        return;
      }
      
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [raid.expiresAt]);

  useEffect(() => {
    if (attackCooldown > 0) {
      const timer = setTimeout(() => setAttackCooldown(attackCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [attackCooldown]);

  useEffect(() => {
    if (isTimingActive) {
      const interval = setInterval(() => {
        setAttackerPosition(prev => {
          const newPos = prev + 3;
          if (newPos >= 100) {
            setIsTimingActive(false);
            handleAttackMiss();
            return 0;
          }
          return newPos;
        });
      }, 20);
      return () => clearInterval(interval);
    }
  }, [isTimingActive]);

  const handleJoinRaid = async () => {
    try {
      const response = await fetch(`/api/hunt/raids/${raid.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
      });
      
      const data = await response.json();
      if (data.success) {
        setIsJoined(true);
        setParticipantCount(data.raid.participantCount);
      }
    } catch (error) {
      console.error('Failed to join raid:', error);
    }
  };

  const startAttackTiming = () => {
    if (attackCooldown > 0 || isTimingActive) return;
    
    setHitZonePosition(30 + Math.random() * 40);
    setAttackerPosition(0);
    setIsTimingActive(true);
  };

  const handleAttackTap = async () => {
    if (!isTimingActive) {
      startAttackTiming();
      return;
    }

    setIsTimingActive(false);
    
    const hitZoneStart = hitZonePosition - 10;
    const hitZoneEnd = hitZonePosition + 10;
    const isCritical = attackerPosition >= hitZoneStart && attackerPosition <= hitZoneEnd;
    const isHit = attackerPosition >= hitZoneStart - 15 && attackerPosition <= hitZoneEnd + 15;
    
    const attackPower = isCritical ? 150 : isHit ? 75 : 30;
    
    await executeAttack(attackPower, isCritical ? 'CRITICAL!' : isHit ? 'HIT!' : 'MISS');
  };

  const handleAttackMiss = async () => {
    await executeAttack(30, 'MISS');
  };

  const executeAttack = async (attackPower: number, hitType: string) => {
    setIsAttacking(true);
    
    try {
      const response = await fetch(`/api/hunt/raids/${raid.id}/attack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, attackPower }),
      });
      
      const data = await response.json();
      if (data.success) {
        setCurrentHP(data.bossHP);
        setLastDamage(data.damage);
        setTotalDamage(data.yourTotalDamage);
        setAttackCooldown(2);
        
        if (data.isDefeated) {
          setIsDefeated(true);
          setRewards(data.rewards);
          setTimeout(() => onComplete(data.rewards), 3000);
        }
      }
    } catch (error) {
      console.error('Failed to attack:', error);
    }
    
    setIsAttacking(false);
    setAttackerPosition(0);
  };

  const hpPercent = (currentHP / raid.maxHP) * 100;
  const hpColor = hpPercent > 50 ? '#22C55E' : hpPercent > 25 ? '#F59E0B' : '#EF4444';

  return (
    <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-[3000] p-4">
      <div className="w-full max-w-md">
        {/* Raid Boss Header */}
        <div className="text-center mb-6">
          <div 
            className="text-8xl mb-4 animate-pulse"
            style={{ 
              filter: `drop-shadow(0 0 30px ${RARITY_COLORS[raid.rarity]})`,
            }}
          >
            💀
          </div>
          <h2 
            className="text-3xl font-bold mb-1"
            style={{ color: RARITY_COLORS[raid.rarity] }}
          >
            {raid.name}
          </h2>
          <p className="text-gray-400 capitalize">{raid.rarity} {raid.class}</p>
        </div>

        {/* HP Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400 flex items-center gap-1">
              <Heart className="w-4 h-4" style={{ color: hpColor }} />
              HP
            </span>
            <span className="text-white font-mono">{currentHP.toLocaleString()} / {raid.maxHP.toLocaleString()}</span>
          </div>
          <div className="h-6 bg-[#3b2418] rounded-full overflow-hidden border-2 border-[#5a3d2a]">
            <div 
              className="h-full transition-all duration-500 rounded-full"
              style={{ 
                width: `${hpPercent}%`,
                backgroundColor: hpColor,
                boxShadow: `0 0 20px ${hpColor}`,
              }}
            />
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex justify-around mb-6 text-center">
          <div>
            <Users className="w-5 h-5 mx-auto mb-1 text-blue-400" />
            <div className="text-white font-bold">{participantCount}</div>
            <div className="text-xs text-gray-500">Players</div>
          </div>
          <div>
            <Swords className="w-5 h-5 mx-auto mb-1 text-red-400" />
            <div className="text-white font-bold">{totalDamage.toLocaleString()}</div>
            <div className="text-xs text-gray-500">Your Damage</div>
          </div>
          <div>
            <Clock className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
            <div className="text-white font-bold font-mono">{timeRemaining}</div>
            <div className="text-xs text-gray-500">Time Left</div>
          </div>
        </div>

        {/* Attack Zone - Timing Mini-Game */}
        {isJoined && !isDefeated && (
          <div className="mb-6">
            <div className="relative h-12 bg-[#1e1109] rounded-lg border border-[#3b2418] overflow-hidden mb-4">
              {/* Hit Zone */}
              <div 
                className="absolute top-0 bottom-0 bg-green-500/30 border-l-2 border-r-2 border-green-500"
                style={{ 
                  left: `${hitZonePosition - 10}%`,
                  width: '20%',
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center text-green-500 text-xs font-bold">
                  HIT
                </div>
              </div>
              
              {/* Attacker Indicator */}
              {isTimingActive && (
                <div 
                  className="absolute top-0 bottom-0 w-2 bg-[#f0c850] shadow-lg transition-none"
                  style={{ 
                    left: `${attackerPosition}%`,
                    boxShadow: '0 0 10px #f0c850',
                  }}
                />
              )}
              
              {!isTimingActive && attackCooldown === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-[#c4955e] text-sm">
                  Tap to Attack!
                </div>
              )}
              
              {attackCooldown > 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
                  Cooldown: {attackCooldown}s
                </div>
              )}
            </div>

            {/* Last Damage Display */}
            {lastDamage !== null && (
              <div className="text-center mb-4 animate-bounce">
                <span className="text-2xl font-bold text-red-400">-{lastDamage}</span>
              </div>
            )}

            <button
              onClick={handleAttackTap}
              disabled={attackCooldown > 0 || isAttacking}
              className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                attackCooldown > 0 || isAttacking
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : isTimingActive
                  ? 'bg-red-600 text-white animate-pulse hover:bg-red-700'
                  : 'bg-[#f0c850] text-[#120a05] hover:bg-[#d4a574]'
              }`}
            >
              <Swords className="w-6 h-6" />
              {isTimingActive ? 'TAP NOW!' : attackCooldown > 0 ? `Wait ${attackCooldown}s` : 'Start Attack'}
            </button>
          </div>
        )}

        {/* Join Button */}
        {!isJoined && !isDefeated && (
          <button
            onClick={handleJoinRaid}
            className="w-full py-4 rounded-xl font-bold text-lg bg-[#f0c850] text-[#120a05] hover:bg-[#d4a574] flex items-center justify-center gap-2"
          >
            <Users className="w-6 h-6" />
            Join Raid
          </button>
        )}

        {/* Victory Screen */}
        {isDefeated && rewards && (
          <div className="text-center animate-pulse">
            <div className="text-4xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-[#f0c850] mb-4">VICTORY!</h3>
            <div className="space-y-2 text-lg">
              <p className="text-[#c4955e]">Contribution: <span className="text-white font-bold">{rewards.contribution}%</span></p>
              <p className="text-[#c4955e]">CHY Earned: <span className="text-[#f0c850] font-bold">+{rewards.chyCoins}</span></p>
              <p className="text-[#c4955e]">XP Earned: <span className="text-blue-400 font-bold">+{rewards.xp}</span></p>
              {rewards.guaranteedEgg && (
                <p className="text-purple-400 font-bold animate-bounce">🥚 Bonus Egg Received!</p>
              )}
            </div>
          </div>
        )}

        {/* Cancel Button */}
        {!isDefeated && (
          <button
            onClick={onCancel}
            className="w-full mt-4 py-3 border border-[#3b2418] rounded-xl text-[#c4955e] hover:bg-[#3b2418] transition-colors"
          >
            Leave Raid
          </button>
        )}
      </div>
    </div>
  );
}
