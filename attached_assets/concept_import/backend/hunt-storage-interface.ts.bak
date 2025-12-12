  updatePlayerLocation(walletAddress: string, latitude: number, longitude: number, displayName?: string): Promise<HuntPlayerLocation>;
  getPlayerLocation(walletAddress: string): Promise<HuntPlayerLocation | undefined>;
  getNearbyPlayers(latitude: number, longitude: number, radiusKm: number): Promise<HuntPlayerLocation[]>;
  setPlayerOffline(walletAddress: string): Promise<void>;
  
  // Wild spawn operations
  createWildSpawn(data: InsertWildRoachySpawn): Promise<WildRoachySpawn>;
  getNearbySpawns(latitude: number, longitude: number, radiusKm: number): Promise<WildRoachySpawn[]>;
  getSpawnById(spawnId: string): Promise<WildRoachySpawn | undefined>;
  catchSpawn(spawnId: string, walletAddress: string): Promise<WildRoachySpawn | null>;
  cleanupExpiredSpawns(): Promise<number>;
  
  // Caught roachies operations
  addCaughtRoachy(data: InsertHuntCaughtRoachy): Promise<HuntCaughtRoachy>;
  getPlayerCaughtRoachies(walletAddress: string): Promise<HuntCaughtRoachy[]>;
  getCaughtRoachyById(id: string): Promise<HuntCaughtRoachy | undefined>;
  levelUpCaughtRoachy(id: string, xpGained: number): Promise<HuntCaughtRoachy | undefined>;
  
  // Hunt leaderboard operations
  updateHuntLeaderboard(walletAddress: string, rarity: HuntRarity, displayName?: string): Promise<HuntLeaderboard>;
  getHuntLeaderboard(limit?: number): Promise<HuntLeaderboard[]>;
  getPlayerHuntStats(walletAddress: string): Promise<HuntLeaderboard | undefined>;
  
  // Hunt economy stats operations
  getOrCreateEconomyStats(walletAddress: string): Promise<HuntEconomyStats>;
  updateEconomyStatsOnCatch(walletAddress: string, rarity: string): Promise<HuntEconomyStats>;
  checkCatchLimits(walletAddress: string): Promise<{ 
    canCatch: boolean; 
    reason?: string; 
    energy: number;
    catchesToday: number;
    catchesThisWeek: number;
    pityRare: number;
    pityEpic: number;
    lastLegendaryCatch: Date | null;
  }>;
  consumeEnergy(walletAddress: string): Promise<boolean>;
}

// PostgreSQL storage implementation
let db: any;

async function getDb() {
  if (!db) {
    const { db: importedDb } = await import("./db");
    db = importedDb;
  }
  return db;
}

export class PostgresStorage implements IStorage {
