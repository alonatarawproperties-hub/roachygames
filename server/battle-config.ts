export type Rarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
export type RoachyClass = 'TANK' | 'ASSASSIN' | 'MAGE' | 'SUPPORT';
export type SkillType = 'GUARD' | 'PIERCE' | 'BURST' | 'FOCUS';

export interface StatRange {
  hp: { min: number; max: number };
  atk: { min: number; max: number };
  def: { min: number; max: number };
  spd: { min: number; max: number };
}

export const RARITY_STATS: Record<Rarity, StatRange> = {
  COMMON: {
    hp: { min: 80, max: 100 },
    atk: { min: 10, max: 15 },
    def: { min: 5, max: 8 },
    spd: { min: 8, max: 12 },
  },
  RARE: {
    hp: { min: 100, max: 130 },
    atk: { min: 14, max: 20 },
    def: { min: 7, max: 12 },
    spd: { min: 10, max: 16 },
  },
  EPIC: {
    hp: { min: 120, max: 160 },
    atk: { min: 18, max: 26 },
    def: { min: 10, max: 16 },
    spd: { min: 12, max: 20 },
  },
  LEGENDARY: {
    hp: { min: 150, max: 200 },
    atk: { min: 24, max: 35 },
    def: { min: 14, max: 22 },
    spd: { min: 16, max: 25 },
  },
};

export const CLASS_MULTIPLIERS: Record<RoachyClass, { hp: number; atk: number; def: number; spd: number }> = {
  TANK: { hp: 1.3, atk: 0.85, def: 1.25, spd: 0.8 },
  ASSASSIN: { hp: 0.85, atk: 1.3, def: 0.8, spd: 1.25 },
  MAGE: { hp: 0.9, atk: 1.2, def: 0.85, spd: 1.1 },
  SUPPORT: { hp: 1.1, atk: 0.9, def: 1.0, spd: 1.0 },
};

export interface Skill {
  id: string;
  name: string;
  type: SkillType;
  multiplier: number;
  momentumCost?: number;
  momentumGain?: number;
  damageReduction?: number;
  healAllyPercent?: number;
  conditionalMomentum?: {
    condition: 'ENEMY_USED_BURST';
    gain: number;
  };
}

export interface StarterRoachy {
  id: string;
  name: string;
  roachyClass: RoachyClass;
  rarity: Rarity;
  skillA: Skill;
  skillB: Skill;
}

export const STARTER_ROACHIES: StarterRoachy[] = [
  {
    id: 'TANK1',
    name: 'BULWARK',
    roachyClass: 'TANK',
    rarity: 'RARE',
    skillA: {
      id: 'fortify',
      name: 'Fortify',
      type: 'GUARD',
      multiplier: 1.0,
      damageReduction: 0.35,
    },
    skillB: {
      id: 'shield_bash',
      name: 'Shield Bash',
      type: 'PIERCE',
      multiplier: 1.35,
    },
  },
  {
    id: 'TANK2',
    name: 'GRIT',
    roachyClass: 'TANK',
    rarity: 'RARE',
    skillA: {
      id: 'brace',
      name: 'Brace',
      type: 'GUARD',
      multiplier: 1.0,
      momentumGain: 8,
    },
    skillB: {
      id: 'slam',
      name: 'Slam',
      type: 'BURST',
      multiplier: 1.55,
    },
  },
  {
    id: 'ASSASSIN1',
    name: 'STING',
    roachyClass: 'ASSASSIN',
    rarity: 'RARE',
    skillA: {
      id: 'backstab',
      name: 'Backstab',
      type: 'BURST',
      multiplier: 1.55,
    },
    skillB: {
      id: 'feint_pierce',
      name: 'Feint Pierce',
      type: 'PIERCE',
      multiplier: 1.30,
    },
  },
  {
    id: 'ASSASSIN2',
    name: 'VIPER',
    roachyClass: 'ASSASSIN',
    rarity: 'RARE',
    skillA: {
      id: 'armor_break',
      name: 'Armor Break',
      type: 'PIERCE',
      multiplier: 1.25,
    },
    skillB: {
      id: 'rapid_cut',
      name: 'Rapid Cut',
      type: 'BURST',
      multiplier: 1.50,
    },
  },
  {
    id: 'MAGE1',
    name: 'ARC',
    roachyClass: 'MAGE',
    rarity: 'RARE',
    skillA: {
      id: 'arc_bolt',
      name: 'Arc Bolt',
      type: 'PIERCE',
      multiplier: 1.30,
    },
    skillB: {
      id: 'overcharge',
      name: 'Overcharge',
      type: 'BURST',
      multiplier: 1.60,
      momentumCost: 10,
    },
  },
  {
    id: 'MAGE2',
    name: 'HEX',
    roachyClass: 'MAGE',
    rarity: 'RARE',
    skillA: {
      id: 'ward',
      name: 'Ward',
      type: 'GUARD',
      multiplier: 1.0,
      momentumGain: 6,
    },
    skillB: {
      id: 'rune_spear',
      name: 'Rune Spear',
      type: 'PIERCE',
      multiplier: 1.45,
    },
  },
  {
    id: 'SUPPORT1',
    name: 'PULSE',
    roachyClass: 'SUPPORT',
    rarity: 'RARE',
    skillA: {
      id: 'heal_guard',
      name: 'Heal Guard',
      type: 'GUARD',
      multiplier: 1.0,
      healAllyPercent: 0.10,
    },
    skillB: {
      id: 'clean_hit',
      name: 'Clean Hit',
      type: 'PIERCE',
      multiplier: 1.35,
    },
  },
  {
    id: 'SUPPORT2',
    name: 'TEMPO',
    roachyClass: 'SUPPORT',
    rarity: 'RARE',
    skillA: {
      id: 'haste_focus',
      name: 'Haste Focus',
      type: 'FOCUS',
      multiplier: 0,
      momentumGain: 15,
    },
    skillB: {
      id: 'punish',
      name: 'Punish',
      type: 'BURST',
      multiplier: 1.50,
      conditionalMomentum: {
        condition: 'ENEMY_USED_BURST',
        gain: 10,
      },
    },
  },
];

export interface CounterResult {
  attackerBonus: number;
  defenderReduction: number;
  momentumGain: number;
  counterType: 'ARMOR_BREAK' | 'MITIGATE' | 'TEMPO' | 'NONE';
}

export function resolveCounter(attackerType: SkillType, defenderType: SkillType): CounterResult {
  if (attackerType === 'PIERCE' && defenderType === 'GUARD') {
    return {
      attackerBonus: 0.20,
      defenderReduction: 0,
      momentumGain: 0,
      counterType: 'ARMOR_BREAK',
    };
  }
  
  if (attackerType === 'GUARD' && defenderType === 'BURST') {
    return {
      attackerBonus: 0,
      defenderReduction: 0.25,
      momentumGain: 0,
      counterType: 'MITIGATE',
    };
  }
  
  if (attackerType === 'BURST' && defenderType === 'PIERCE') {
    return {
      attackerBonus: 0,
      defenderReduction: 0,
      momentumGain: 10,
      counterType: 'TEMPO',
    };
  }
  
  return {
    attackerBonus: 0,
    defenderReduction: 0,
    momentumGain: 0,
    counterType: 'NONE',
  };
}

export interface RoachyStats {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
}

export function generateStats(rarity: Rarity, roachyClass: RoachyClass): RoachyStats {
  const statRange = RARITY_STATS[rarity];
  const classMultiplier = CLASS_MULTIPLIERS[roachyClass];
  
  const baseHp = Math.floor(Math.random() * (statRange.hp.max - statRange.hp.min + 1)) + statRange.hp.min;
  const baseAtk = Math.floor(Math.random() * (statRange.atk.max - statRange.atk.min + 1)) + statRange.atk.min;
  const baseDef = Math.floor(Math.random() * (statRange.def.max - statRange.def.min + 1)) + statRange.def.min;
  const baseSpd = Math.floor(Math.random() * (statRange.spd.max - statRange.spd.min + 1)) + statRange.spd.min;
  
  const hp = Math.floor(baseHp * classMultiplier.hp);
  const atk = Math.floor(baseAtk * classMultiplier.atk);
  const def = Math.floor(baseDef * classMultiplier.def);
  const spd = Math.floor(baseSpd * classMultiplier.spd);
  
  return { hp, maxHp: hp, atk, def, spd };
}

export interface DamageResult {
  damage: number;
  isCrit: boolean;
  counterType: CounterResult['counterType'];
  momentumGained: number;
}

export function calculateDamage(
  attackerAtk: number,
  defenderDef: number,
  skillMultiplier: number,
  attackerType: SkillType,
  defenderType: SkillType,
  defenderDamageReduction: number = 0
): DamageResult {
  const counter = resolveCounter(attackerType, defenderType);
  
  const baseDamage = attackerAtk * skillMultiplier;
  const bonusDamage = baseDamage * counter.attackerBonus;
  const totalRawDamage = baseDamage + bonusDamage;
  
  const defenseReduction = Math.max(0, defenderDef * 0.5);
  const damageAfterDef = Math.max(1, totalRawDamage - defenseReduction);
  
  const counterReduction = damageAfterDef * counter.defenderReduction;
  const skillReduction = damageAfterDef * defenderDamageReduction;
  const finalDamage = Math.max(1, Math.floor(damageAfterDef - counterReduction - skillReduction));
  
  const isCrit = Math.random() < 0.1;
  const critDamage = isCrit ? Math.floor(finalDamage * 1.5) : finalDamage;
  
  return {
    damage: critDamage,
    isCrit,
    counterType: counter.counterType,
    momentumGained: counter.momentumGain,
  };
}

export function calculateMomentumChange(
  skill: Skill,
  counterResult: CounterResult,
  enemyUsedBurst: boolean
): number {
  let momentum = 0;
  
  if (skill.momentumGain) {
    momentum += skill.momentumGain;
  }
  
  if (skill.momentumCost) {
    momentum -= skill.momentumCost;
  }
  
  momentum += counterResult.momentumGain;
  
  if (skill.conditionalMomentum && enemyUsedBurst && skill.conditionalMomentum.condition === 'ENEMY_USED_BURST') {
    momentum += skill.conditionalMomentum.gain;
  }
  
  return momentum;
}

export const BATTLE_CONFIG = {
  QUEUE_TIMEOUT_FIRST_MS: 20000,
  QUEUE_TIMEOUT_BOT_MS: 40000,
  
  MAX_TURNS: 8,
  KOS_TO_WIN: 2,
  
  STARTING_MOMENTUM: 50,
  MAX_MOMENTUM: 100,
  MIN_MOMENTUM: 0,
  
  STARTING_MMR: 1000,
  MMR_K_FACTOR: 32,
  
  TURN_TIME_LIMIT_MS: 30000,
  
  TEAM_SIZE: 3,
  ROSTER_SIZE: 6,
};

export function calculateNewMmr(winnerMmr: number, loserMmr: number, isDraw: boolean = false): { winnerNew: number; loserNew: number } {
  const K = BATTLE_CONFIG.MMR_K_FACTOR;
  const expectedWinner = 1 / (1 + Math.pow(10, (loserMmr - winnerMmr) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerMmr - loserMmr) / 400));
  
  if (isDraw) {
    return {
      winnerNew: Math.round(winnerMmr + K * (0.5 - expectedWinner)),
      loserNew: Math.round(loserMmr + K * (0.5 - expectedLoser)),
    };
  }
  
  return {
    winnerNew: Math.round(winnerMmr + K * (1 - expectedWinner)),
    loserNew: Math.round(loserMmr + K * (0 - expectedLoser)),
  };
}

export function getRankFromMmr(mmr: number): string {
  if (mmr >= 2000) return 'LEGEND';
  if (mmr >= 1600) return 'DIAMOND';
  if (mmr >= 1400) return 'PLATINUM';
  if (mmr >= 1200) return 'GOLD';
  if (mmr >= 1000) return 'SILVER';
  return 'BRONZE';
}
