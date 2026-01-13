export const HUNT_CONFIG = {
  DAILY_HUNT_CAP: 25,
  RADIUS_METERS: 600,
  NODE_COUNT: 12,
  DISTANCE_MAX_METERS: 100,
  COOLDOWN_SECONDS: 30,
  TIMEZONE: 'Asia/Manila',
  
  PITY_RARE: 20,
  PITY_EPIC: 60,
  PITY_LEGENDARY: 200,
  
  BASE_RATES: {
    common: 0.85,
    rare: 0.12,
    epic: 0.028,
    legendary: 0.002,
  } as Record<string, number>,
  
  FUSE_RATIO: 5,
  RECYCLE_COMMON_TO_WARMTH: 1,
  
  XP_REWARDS: {
    perfect: 150,
    great: 75,
    good: 30,
  } as Record<string, number>,
  
  POINTS_REWARDS: {
    perfect: 150,
    great: 75,
    good: 30,
  } as Record<string, number>,
  
  XP_PER_LEVEL: 1000,
  
  BOOST_HUNTS_THRESHOLD: 10,
};

export function getManilaDate(): string {
  const now = new Date();
  const manilaOffset = 8 * 60;
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const manilaTime = new Date(utcTime + (manilaOffset * 60000));
  return manilaTime.toISOString().split('T')[0];
}

export function getManilaWeekKey(): string {
  const now = new Date();
  const manilaOffset = 8 * 60;
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const manilaTime = new Date(utcTime + (manilaOffset * 60000));
  
  const year = manilaTime.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((manilaTime.getTime() - startOfYear.getTime()) / 86400000);
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function generateDeterministicNodes(
  centerLat: number,
  centerLon: number,
  dayKey: string,
  serverSecret: string = process.env.MOBILE_API_SECRET || 'hunt-secret'
): Array<{ nodeId: string; lat: number; lon: number }> {
  const seed = hashString(`${dayKey}-${serverSecret}`);
  const nodes: Array<{ nodeId: string; lat: number; lon: number }> = [];
  
  const radiusKm = HUNT_CONFIG.RADIUS_METERS / 1000;
  const latDelta = radiusKm / 111.32;
  const lonDelta = radiusKm / (111.32 * Math.cos(centerLat * Math.PI / 180));
  
  const gridSize = Math.ceil(Math.sqrt(HUNT_CONFIG.NODE_COUNT));
  const cellLatSize = (latDelta * 2) / gridSize;
  const cellLonSize = (lonDelta * 2) / gridSize;
  
  let nodeIndex = 0;
  for (let i = 0; i < gridSize && nodeIndex < HUNT_CONFIG.NODE_COUNT; i++) {
    for (let j = 0; j < gridSize && nodeIndex < HUNT_CONFIG.NODE_COUNT; j++) {
      const cellSeed = hashString(`${seed}-${i}-${j}`);
      
      const offsetLat = (cellSeed % 1000) / 1000 * cellLatSize;
      const offsetLon = ((cellSeed >> 10) % 1000) / 1000 * cellLonSize;
      
      const nodeLat = centerLat - latDelta + (i * cellLatSize) + offsetLat;
      const nodeLon = centerLon - lonDelta + (j * cellLonSize) + offsetLon;
      
      const nodeId = `node-${dayKey}-${hashString(`${cellSeed}-${nodeLat.toFixed(5)}-${nodeLon.toFixed(5)}`)}`;
      
      nodes.push({
        nodeId,
        lat: parseFloat(nodeLat.toFixed(6)),
        lon: parseFloat(nodeLon.toFixed(6)),
      });
      
      nodeIndex++;
    }
  }
  
  return nodes;
}

export function selectEggRarity(pityCounters: {
  sinceRare: number;
  sinceEpic: number;
  sinceLegendary: number;
}): 'common' | 'rare' | 'epic' | 'legendary' {
  if (pityCounters.sinceLegendary >= HUNT_CONFIG.PITY_LEGENDARY) {
    return 'legendary';
  }
  if (pityCounters.sinceEpic >= HUNT_CONFIG.PITY_EPIC) {
    return 'epic';
  }
  if (pityCounters.sinceRare >= HUNT_CONFIG.PITY_RARE) {
    return 'rare';
  }
  
  const roll = Math.random();
  let cumulative = 0;
  for (const [rarity, rate] of Object.entries(HUNT_CONFIG.BASE_RATES)) {
    cumulative += rate;
    if (roll <= cumulative) {
      return rarity as 'common' | 'rare' | 'epic' | 'legendary';
    }
  }
  return 'common';
}
