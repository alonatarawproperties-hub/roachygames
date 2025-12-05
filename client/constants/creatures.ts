export type CreatureRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type CreatureType = 'fire' | 'water' | 'grass' | 'electric' | 'ice' | 'shadow';

export interface CreatureStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface CreatureDefinition {
  id: string;
  name: string;
  type: CreatureType;
  rarity: CreatureRarity;
  baseStats: CreatureStats;
  description: string;
  catchRate: number;
}

export const CREATURE_DEFINITIONS: CreatureDefinition[] = [
  {
    id: 'emberwing',
    name: 'Emberwing',
    type: 'fire',
    rarity: 'common',
    baseStats: { hp: 65, attack: 70, defense: 45, speed: 75 },
    description: 'A fiery dragon with flames that never extinguish. Its wings leave trails of embers.',
    catchRate: 0.7,
  },
  {
    id: 'aquafin',
    name: 'Aquafin',
    type: 'water',
    rarity: 'common',
    baseStats: { hp: 70, attack: 55, defense: 65, speed: 60 },
    description: 'A graceful sea serpent that glides through water with pearl-like scales.',
    catchRate: 0.7,
  },
  {
    id: 'leafox',
    name: 'Leafox',
    type: 'grass',
    rarity: 'common',
    baseStats: { hp: 60, attack: 60, defense: 55, speed: 70 },
    description: 'A curious plant fox with leaf ears and a flower-tipped tail.',
    catchRate: 0.7,
  },
  {
    id: 'voltcat',
    name: 'Voltcat',
    type: 'electric',
    rarity: 'rare',
    baseStats: { hp: 55, attack: 80, defense: 40, speed: 90 },
    description: 'An electric feline that crackles with lightning energy. Incredibly fast.',
    catchRate: 0.45,
  },
  {
    id: 'frostfang',
    name: 'Frostfang',
    type: 'ice',
    rarity: 'rare',
    baseStats: { hp: 75, attack: 70, defense: 70, speed: 55 },
    description: 'An arctic wolf with crystalline ice fur and frost breath.',
    catchRate: 0.45,
  },
  {
    id: 'shadowisp',
    name: 'Shadowisp',
    type: 'shadow',
    rarity: 'epic',
    baseStats: { hp: 50, attack: 85, defense: 50, speed: 85 },
    description: 'A mysterious dark wisp that phases through shadows. Rarely seen.',
    catchRate: 0.25,
  },
  {
    id: 'phoenixia',
    name: 'Phoenixia',
    type: 'fire',
    rarity: 'legendary',
    baseStats: { hp: 90, attack: 95, defense: 80, speed: 100 },
    description: 'A legendary phoenix of pure golden flames. Said to grant immortality.',
    catchRate: 0.1,
  },
];

export const CREATURE_IMAGES: Record<string, any> = {
  emberwing: require('../../assets/images/creatures/emberwing.png'),
  aquafin: require('../../assets/images/creatures/aquafin.png'),
  leafox: require('../../assets/images/creatures/leafox.png'),
  voltcat: require('../../assets/images/creatures/voltcat.png'),
  frostfang: require('../../assets/images/creatures/frostfang.png'),
  shadowisp: require('../../assets/images/creatures/shadowisp.png'),
  phoenixia: require('../../assets/images/creatures/phoenixia.png'),
};

export function getCreatureDefinition(id: string): CreatureDefinition | undefined {
  return CREATURE_DEFINITIONS.find(c => c.id === id);
}

export function getRarityColor(rarity: CreatureRarity): string {
  const colors: Record<CreatureRarity, string> = {
    common: '#E8E8E8',
    uncommon: '#6BCF7F',
    rare: '#4A90E2',
    epic: '#9B59B6',
    legendary: '#F39C12',
  };
  return colors[rarity];
}

export function getTypeColor(type: CreatureType): string {
  const colors: Record<CreatureType, string> = {
    fire: '#FF6B6B',
    water: '#4ECDC4',
    grass: '#6BCF7F',
    electric: '#FFD93D',
    ice: '#87CEEB',
    shadow: '#9B59B6',
  };
  return colors[type];
}
