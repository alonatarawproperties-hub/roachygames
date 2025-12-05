import { CreatureDefinition, CREATURE_DEFINITIONS } from './creatures';

export interface CaughtCreature {
  id: string;
  uniqueId: string;
  caughtAt: Date;
  catchLocation: {
    latitude: number;
    longitude: number;
  };
  level: number;
  blockchainMinted: boolean;
  txHash?: string;
}

export interface WildCreature {
  id: string;
  uniqueId: string;
  location: {
    latitude: number;
    longitude: number;
  };
  distance: number;
  spawnedAt: Date;
}

export interface PlayerStats {
  totalCaught: number;
  distanceWalked: number;
  rarestCatch?: string;
}

export interface WalletInfo {
  connected: boolean;
  address?: string;
  nftBalance: number;
}

export interface GameState {
  inventory: CaughtCreature[];
  nearbyCreatures: WildCreature[];
  playerStats: PlayerStats;
  wallet: WalletInfo;
  playerLocation: {
    latitude: number;
    longitude: number;
  } | null;
  catchballCount: number;
}

const generateUniqueId = () => Math.random().toString(36).substring(2, 15);

export const createInitialGameState = (): GameState => ({
  inventory: [],
  nearbyCreatures: [],
  playerStats: {
    totalCaught: 0,
    distanceWalked: 0,
  },
  wallet: {
    connected: false,
    nftBalance: 0,
  },
  playerLocation: null,
  catchballCount: 10,
});

export function spawnCreaturesNearLocation(
  latitude: number,
  longitude: number,
  count: number = 5
): WildCreature[] {
  const creatures: WildCreature[] = [];
  
  for (let i = 0; i < count; i++) {
    const randomCreature = CREATURE_DEFINITIONS[Math.floor(Math.random() * CREATURE_DEFINITIONS.length)];
    
    const offsetLat = (Math.random() - 0.5) * 0.01;
    const offsetLng = (Math.random() - 0.5) * 0.01;
    
    const creatureLat = latitude + offsetLat;
    const creatureLng = longitude + offsetLng;
    
    const distance = Math.round(
      calculateDistance(latitude, longitude, creatureLat, creatureLng)
    );
    
    creatures.push({
      id: randomCreature.id,
      uniqueId: generateUniqueId(),
      location: {
        latitude: creatureLat,
        longitude: creatureLng,
      },
      distance,
      spawnedAt: new Date(),
    });
  }
  
  return creatures.sort((a, b) => a.distance - b.distance);
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function attemptCatch(catchRate: number): boolean {
  return Math.random() < catchRate;
}

export function generateMockTxHash(): string {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}
