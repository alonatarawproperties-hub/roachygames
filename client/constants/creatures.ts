export type CreatureRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type RoachyClass = 'tank' | 'assassin' | 'mage' | 'support';

export interface CreatureStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface RoachyDefinition {
  id: string;
  name: string;
  roachyClass: RoachyClass;
  rarity: CreatureRarity;
  baseStats: CreatureStats;
  description: string;
  catchRate: number;
}

export const ROACHY_DEFINITIONS: RoachyDefinition[] = [
  {
    id: 'ironshell',
    name: 'Ironshell',
    roachyClass: 'tank',
    rarity: 'common',
    baseStats: { hp: 120, attack: 40, defense: 80, speed: 30 },
    description: 'A heavily armored roach with a metallic exoskeleton. Nearly impervious to damage.',
    catchRate: 0.7,
  },
  {
    id: 'scuttler',
    name: 'Scuttler',
    roachyClass: 'assassin',
    rarity: 'common',
    baseStats: { hp: 60, attack: 75, defense: 35, speed: 90 },
    description: 'A swift roach that strikes from the shadows. Incredibly fast and deadly.',
    catchRate: 0.7,
  },
  {
    id: 'sparkroach',
    name: 'Sparkroach',
    roachyClass: 'mage',
    rarity: 'common',
    baseStats: { hp: 55, attack: 80, defense: 40, speed: 65 },
    description: 'A mystical roach that channels arcane energies through its antennae.',
    catchRate: 0.7,
  },
  {
    id: 'leafwing',
    name: 'Leafwing',
    roachyClass: 'support',
    rarity: 'common',
    baseStats: { hp: 75, attack: 35, defense: 60, speed: 55 },
    description: 'A gentle roach with leaf-like wings that heals its allies with natural energy.',
    catchRate: 0.7,
  },
  {
    id: 'vikingbug',
    name: 'Viking Bug',
    roachyClass: 'tank',
    rarity: 'common',
    baseStats: { hp: 140, attack: 55, defense: 90, speed: 35 },
    description: 'A warrior roach wearing a tiny horned helmet. Charges into battle fearlessly.',
    catchRate: 0.55,
  },
  {
    id: 'shadowblade',
    name: 'Shadowblade',
    roachyClass: 'assassin',
    rarity: 'common',
    baseStats: { hp: 65, attack: 85, defense: 40, speed: 95 },
    description: 'A master of stealth that phases through darkness. Its strikes are lethal.',
    catchRate: 0.55,
  },
  {
    id: 'frostmage',
    name: 'Frost Mage',
    roachyClass: 'mage',
    rarity: 'rare',
    baseStats: { hp: 60, attack: 95, defense: 45, speed: 70 },
    description: 'An ice-wielding roach that freezes enemies solid with blizzard magic.',
    catchRate: 0.45,
  },
  {
    id: 'aviator',
    name: 'Aviator',
    roachyClass: 'support',
    rarity: 'rare',
    baseStats: { hp: 80, attack: 50, defense: 65, speed: 75 },
    description: 'A dashing roach pilot with goggles and scarf. Provides aerial reconnaissance.',
    catchRate: 0.45,
  },
  {
    id: 'royalmage',
    name: 'Royal Mage',
    roachyClass: 'mage',
    rarity: 'epic',
    baseStats: { hp: 70, attack: 110, defense: 55, speed: 80 },
    description: 'An ancient roach sorcerer wearing a crown. Commands devastating spells.',
    catchRate: 0.25,
  },
  {
    id: 'warlord',
    name: 'Warlord',
    roachyClass: 'tank',
    rarity: 'epic',
    baseStats: { hp: 160, attack: 70, defense: 100, speed: 40 },
    description: 'A battle-hardened commander with countless victories. Leads armies of roaches.',
    catchRate: 0.25,
  },
  {
    id: 'nightstalker',
    name: 'Nightstalker',
    roachyClass: 'assassin',
    rarity: 'epic',
    baseStats: { hp: 70, attack: 105, defense: 45, speed: 100 },
    description: 'A legendary assassin that moves unseen. None have survived its ambush.',
    catchRate: 0.25,
  },
  {
    id: 'cosmicking',
    name: 'Cosmic King',
    roachyClass: 'tank',
    rarity: 'legendary',
    baseStats: { hp: 200, attack: 90, defense: 120, speed: 60 },
    description: 'The ultimate roach emperor from beyond the stars. Possesses godlike power.',
    catchRate: 0.1,
  },
];

export const ROACHY_IMAGES: Record<string, any> = {
};

export function getRoachyDefinition(id: string): RoachyDefinition | undefined {
  return ROACHY_DEFINITIONS.find(r => r.id === id);
}

export function getRarityColor(rarity: CreatureRarity): string {
  const colors: Record<CreatureRarity, string> = {
    common: '#9CA3AF',
    rare: '#00D9FF',
    epic: '#9B59B6',
    legendary: '#FFD700',
  };
  return colors[rarity];
}

export function getClassColor(roachyClass: RoachyClass): string {
  const colors: Record<RoachyClass, string> = {
    tank: '#22C55E',
    assassin: '#EF4444',
    mage: '#8B5CF6',
    support: '#06B6D4',
  };
  return colors[roachyClass];
}

export function getClassIcon(roachyClass: RoachyClass): string {
  const icons: Record<RoachyClass, string> = {
    tank: 'shield',
    assassin: 'zap',
    mage: 'star',
    support: 'heart',
  };
  return icons[roachyClass];
}

export const CREATURE_DEFINITIONS = ROACHY_DEFINITIONS;
export const CREATURE_IMAGES = ROACHY_IMAGES;
export const getCreatureDefinition = getRoachyDefinition;
export type CreatureType = RoachyClass;
export type CreatureDefinition = RoachyDefinition;
