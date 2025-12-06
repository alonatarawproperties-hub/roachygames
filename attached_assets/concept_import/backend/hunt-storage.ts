  async updatePlayerLocation(walletAddress: string, latitude: number, longitude: number, displayName?: string): Promise<HuntPlayerLocation> {
    const database = await getDb();
    
    const existing = await database.select().from(huntPlayerLocations).where(eq(huntPlayerLocations.walletAddress, walletAddress));
    
    if (existing.length > 0) {
      const result = await database
        .update(huntPlayerLocations)
        .set({
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          isOnline: true,
          lastSeen: new Date(),
          updatedAt: new Date(),
          ...(displayName && { displayName }),
        })
        .where(eq(huntPlayerLocations.walletAddress, walletAddress))
        .returning();
      return result[0];
    } else {
      const result = await database
        .insert(huntPlayerLocations)
        .values({
          walletAddress,
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          isOnline: true,
          displayName,
        })
        .returning();
      return result[0];
    }
  }

  async getPlayerLocation(walletAddress: string): Promise<HuntPlayerLocation | undefined> {
    const database = await getDb();
    const result = await database.select().from(huntPlayerLocations).where(eq(huntPlayerLocations.walletAddress, walletAddress));
    return result[0];
  }

  async getNearbyPlayers(latitude: number, longitude: number, radiusKm: number): Promise<HuntPlayerLocation[]> {
    const database = await getDb();
    
    // Haversine formula for distance calculation
    // 1 degree latitude = ~111km
    const latDelta = radiusKm / 111;
    const lonDelta = radiusKm / (111 * Math.cos(latitude * Math.PI / 180));
    
    const result = await database
      .select()
      .from(huntPlayerLocations)
      .where(
        and(
          sql`CAST(${huntPlayerLocations.latitude} AS DECIMAL) BETWEEN ${latitude - latDelta} AND ${latitude + latDelta}`,
          sql`CAST(${huntPlayerLocations.longitude} AS DECIMAL) BETWEEN ${longitude - lonDelta} AND ${longitude + lonDelta}`,
          eq(huntPlayerLocations.isOnline, true),
          sql`${huntPlayerLocations.lastSeen} > NOW() - INTERVAL '5 minutes'`
        )
      );
    
    return result;
  }

  async setPlayerOffline(walletAddress: string): Promise<void> {
    const database = await getDb();
    await database
      .update(huntPlayerLocations)
      .set({ isOnline: false, updatedAt: new Date() })
      .where(eq(huntPlayerLocations.walletAddress, walletAddress));
  }

  async createWildSpawn(data: InsertWildRoachySpawn): Promise<WildRoachySpawn> {
    const database = await getDb();
    const result = await database.insert(wildRoachySpawns).values(data).returning();
    return result[0];
  }

  async getNearbySpawns(latitude: number, longitude: number, radiusKm: number): Promise<WildRoachySpawn[]> {
    const database = await getDb();
    
    const latDelta = radiusKm / 111;
    const lonDelta = radiusKm / (111 * Math.cos(latitude * Math.PI / 180));
    
    const result = await database
      .select()
      .from(wildRoachySpawns)
      .where(
        and(
          sql`CAST(${wildRoachySpawns.latitude} AS DECIMAL) BETWEEN ${latitude - latDelta} AND ${latitude + latDelta}`,
          sql`CAST(${wildRoachySpawns.longitude} AS DECIMAL) BETWEEN ${longitude - lonDelta} AND ${longitude + lonDelta}`,
          eq(wildRoachySpawns.isActive, true),
          sql`${wildRoachySpawns.caughtByWallet} IS NULL`,
          sql`${wildRoachySpawns.expiresAt} > NOW()`
        )
      );
    
    return result;
  }

  async getSpawnById(spawnId: string): Promise<WildRoachySpawn | undefined> {
    const database = await getDb();
    const result = await database.select().from(wildRoachySpawns).where(eq(wildRoachySpawns.id, spawnId));
    return result[0];
  }

  async catchSpawn(spawnId: string, walletAddress: string): Promise<WildRoachySpawn | null> {
    const database = await getDb();
    
    // Check if spawn is still available
    const spawn = await this.getSpawnById(spawnId);
    if (!spawn || spawn.caughtByWallet || !spawn.isActive || new Date(spawn.expiresAt) < new Date()) {
      return null;
    }
    
    // Mark as caught
    const result = await database
      .update(wildRoachySpawns)
      .set({
        caughtByWallet: walletAddress,
        caughtAt: new Date(),
        isActive: false,
      })
      .where(
        and(
          eq(wildRoachySpawns.id, spawnId),
          sql`${wildRoachySpawns.caughtByWallet} IS NULL`
        )
      )
      .returning();
    
    return result[0] || null;
  }

  async cleanupExpiredSpawns(): Promise<number> {
    const database = await getDb();
    
    const result = await database
      .update(wildRoachySpawns)
      .set({ isActive: false })
      .where(
        and(
          eq(wildRoachySpawns.isActive, true),
          sql`${wildRoachySpawns.expiresAt} < NOW()`
        )
      )
      .returning();
    
    return result.length;
  }

  async addCaughtRoachy(data: InsertHuntCaughtRoachy): Promise<HuntCaughtRoachy> {
    const database = await getDb();
    const result = await database.insert(huntCaughtRoachies).values(data).returning();
    return result[0];
  }

  async getPlayerCaughtRoachies(walletAddress: string): Promise<HuntCaughtRoachy[]> {
    const database = await getDb();
    return await database
      .select()
      .from(huntCaughtRoachies)
      .where(eq(huntCaughtRoachies.walletAddress, walletAddress))
      .orderBy(desc(huntCaughtRoachies.caughtAt));
  }

  async getCaughtRoachyById(id: string): Promise<HuntCaughtRoachy | undefined> {
    const database = await getDb();
    const result = await database.select().from(huntCaughtRoachies).where(eq(huntCaughtRoachies.id, id));
    return result[0];
  }

  async levelUpCaughtRoachy(id: string, xpGained: number): Promise<HuntCaughtRoachy | undefined> {
    const database = await getDb();
    
    const roachy = await this.getCaughtRoachyById(id);
    if (!roachy) return undefined;
    
    let newXp = roachy.xp + xpGained;
    let newLevel = roachy.level;
    let xpToNext = roachy.xpToNextLevel;
    
    // Level up if enough XP
    while (newXp >= xpToNext) {
      newXp -= xpToNext;
      newLevel += 1;
      xpToNext = Math.floor(xpToNext * 1.5); // Increase XP requirement each level
    }
    
    const result = await database
      .update(huntCaughtRoachies)
      .set({
        level: newLevel,
        xp: newXp,
        xpToNextLevel: xpToNext,
      })
      .where(eq(huntCaughtRoachies.id, id))
      .returning();
    
    return result[0];
  }

  async updateHuntLeaderboard(walletAddress: string, rarity: HuntRarity, displayName?: string): Promise<HuntLeaderboard> {
    const database = await getDb();
    
    const existing = await database.select().from(huntLeaderboard).where(eq(huntLeaderboard.walletAddress, walletAddress));
    
    if (existing.length > 0) {
      const entry = existing[0];
      const updateData: any = {
        totalCaught: entry.totalCaught + 1,
        updatedAt: new Date(),
      };
      
      // Increment rarity counter
      if (rarity === 'common') updateData.commonCaught = entry.commonCaught + 1;
      else if (rarity === 'uncommon') updateData.uncommonCaught = entry.uncommonCaught + 1;
      else if (rarity === 'rare') updateData.rareCaught = entry.rareCaught + 1;
      else if (rarity === 'epic') updateData.epicCaught = entry.epicCaught + 1;
      else if (rarity === 'legendary') updateData.legendaryCaught = entry.legendaryCaught + 1;
      
      if (displayName) updateData.displayName = displayName;
      
      const result = await database
        .update(huntLeaderboard)
        .set(updateData)
        .where(eq(huntLeaderboard.walletAddress, walletAddress))
        .returning();
      return result[0];
    } else {
      const insertData: any = {
        walletAddress,
        totalCaught: 1,
        commonCaught: rarity === 'common' ? 1 : 0,
        uncommonCaught: rarity === 'uncommon' ? 1 : 0,
        rareCaught: rarity === 'rare' ? 1 : 0,
        epicCaught: rarity === 'epic' ? 1 : 0,
        legendaryCaught: rarity === 'legendary' ? 1 : 0,
        uniqueRoachies: 1,
      };
      
      if (displayName) insertData.displayName = displayName;
      
      const result = await database.insert(huntLeaderboard).values(insertData).returning();
      return result[0];
    }
  }

  async getHuntLeaderboard(limit: number = 50): Promise<HuntLeaderboard[]> {
    const database = await getDb();
    return await database
      .select()
      .from(huntLeaderboard)
      .orderBy(desc(huntLeaderboard.totalCaught))
      .limit(limit);
  }

  async getPlayerHuntStats(walletAddress: string): Promise<HuntLeaderboard | undefined> {
    const database = await getDb();
    const result = await database.select().from(huntLeaderboard).where(eq(huntLeaderboard.walletAddress, walletAddress));
    return result[0];
  }

  // Hunt Economy Stats Methods
  async getOrCreateEconomyStats(walletAddress: string): Promise<HuntEconomyStats> {
    const database = await getDb();
    const existing = await database.select().from(huntEconomyStats).where(eq(huntEconomyStats.walletAddress, walletAddress));
    
    if (existing.length > 0) {
      return existing[0];
    }
    
    const result = await database.insert(huntEconomyStats).values({
      walletAddress,
    }).returning();
    return result[0];
  }

  async updateEconomyStatsOnCatch(walletAddress: string, rarity: string, streakBonusClaimed: boolean = false): Promise<HuntEconomyStats> {
    const database = await getDb();
    const stats = await this.getOrCreateEconomyStats(walletAddress);
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const updateData: any = {
      catchesToday: stats.catchesToday + 1,
      catchesThisWeek: stats.catchesThisWeek + 1,
      energy: Math.max(0, stats.energy - 1),
      updatedAt: now,
    };
    
    // Update pity counters based on rarity caught
    if (rarity === 'rare' || rarity === 'epic' || rarity === 'legendary') {
      updateData.catchesSinceRare = 0;
    } else {
      updateData.catchesSinceRare = stats.catchesSinceRare + 1;
    }
    
    if (rarity === 'epic' || rarity === 'legendary') {
      updateData.catchesSinceEpic = 0;
    } else {
      updateData.catchesSinceEpic = stats.catchesSinceEpic + 1;
    }
    
    // Track legendary catches
    if (rarity === 'legendary') {
      updateData.lastLegendaryCatch = now;
      updateData.legendaryCountThisMonth = stats.legendaryCountThisMonth + 1;
    }
    
    // Update catch streak
    const lastCatchDate = stats.lastCatchDate;
    if (lastCatchDate) {
      const lastDate = new Date(lastCatchDate);
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (lastCatchDate === todayStr) {
        // Same day - no streak change
      } else if (lastCatchDate === yesterdayStr) {
        // Consecutive day - increase streak!
        const newStreak = stats.currentStreak + 1;
        updateData.currentStreak = newStreak;
        updateData.longestStreak = Math.max(stats.longestStreak, newStreak);
        updateData.streakBonusClaimedToday = false; // Reset for new day
      } else {
        // Streak broken - reset to 1
        updateData.currentStreak = 1;
        updateData.streakBonusClaimedToday = false;
      }
    } else {
      // First catch ever - start streak at 1
      updateData.currentStreak = 1;
    }
    updateData.lastCatchDate = todayStr;
    
    // Mark streak bonus as claimed if used
    if (streakBonusClaimed) {
      updateData.streakBonusClaimedToday = true;
    }
    
    const result = await database
      .update(huntEconomyStats)
      .set(updateData)
      .where(eq(huntEconomyStats.walletAddress, walletAddress))
      .returning();
    return result[0];
  }

  async checkCatchLimits(walletAddress: string): Promise<{ 
    canCatch: boolean; 
    reason?: string; 
    energy: number;
    catchesToday: number;
    catchesThisWeek: number;
    pityRare: number;
    pityEpic: number;
    lastLegendaryCatch: Date | null;
    currentStreak: number;
    longestStreak: number;
    lastCatchDate: string | null;
    streakBonusAvailable: boolean;
  }> {
    const stats = await this.getOrCreateEconomyStats(walletAddress);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Check if daily reset needed
    const lastDailyReset = new Date(stats.lastDailyReset);
    const isNewDay = now.toDateString() !== lastDailyReset.toDateString();
    
    // Check if weekly reset needed (Monday)
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    const lastWeeklyReset = new Date(stats.lastWeeklyReset);
    const isNewWeek = lastWeeklyReset < weekStart;
    
    let energy = stats.energy;
    let catchesToday = stats.catchesToday;
    let catchesThisWeek = stats.catchesThisWeek;
    
    // Apply resets if needed
    if (isNewDay) {
      energy = stats.maxEnergy;
      catchesToday = 0;
    }
    
    if (isNewWeek) {
      catchesThisWeek = 0;
    }
    
    // Calculate current streak considering if it's still valid
    let currentStreak = stats.currentStreak;
    const lastCatchDate = stats.lastCatchDate;
    if (lastCatchDate) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      // If last catch was today, streak is current
      // If last catch was yesterday, streak is current (will increment on next catch)
      // Otherwise, streak is broken
      if (lastCatchDate !== todayStr && lastCatchDate !== yesterdayStr) {
        currentStreak = 0; // Streak broken
      }
    }
    
    // Streak bonus available at day 7 (and multiples of 7)
    const streakBonusAvailable = currentStreak >= 7 && currentStreak % 7 === 0 && !stats.streakBonusClaimedToday;
    
    // Check limits
    if (energy <= 0) {
      return {
        canCatch: false,
        reason: "Out of energy! Come back tomorrow.",
        energy,
        catchesToday,
        catchesThisWeek,
        pityRare: stats.catchesSinceRare,
        pityEpic: stats.catchesSinceEpic,
        lastLegendaryCatch: stats.lastLegendaryCatch,
        currentStreak,
        longestStreak: stats.longestStreak,
        lastCatchDate: stats.lastCatchDate,
        streakBonusAvailable,
      };
    }
    
    if (catchesToday >= stats.maxCatchesPerDay) {
      return {
        canCatch: false,
        reason: `Daily limit reached (${stats.maxCatchesPerDay}/day). Come back tomorrow!`,
        energy,
        catchesToday,
        catchesThisWeek,
        pityRare: stats.catchesSinceRare,
        pityEpic: stats.catchesSinceEpic,
        lastLegendaryCatch: stats.lastLegendaryCatch,
        currentStreak,
        longestStreak: stats.longestStreak,
        lastCatchDate: stats.lastCatchDate,
        streakBonusAvailable,
      };
    }
    
    if (catchesThisWeek >= stats.maxCatchesPerWeek) {
      return {
        canCatch: false,
        reason: `Weekly limit reached (${stats.maxCatchesPerWeek}/week). Come back next week!`,
        energy,
        catchesToday,
        catchesThisWeek,
        pityRare: stats.catchesSinceRare,
        pityEpic: stats.catchesSinceEpic,
        lastLegendaryCatch: stats.lastLegendaryCatch,
        currentStreak,
        longestStreak: stats.longestStreak,
        lastCatchDate: stats.lastCatchDate,
        streakBonusAvailable,
      };
    }
    
    return {
      canCatch: true,
      energy,
      catchesToday,
      catchesThisWeek,
      pityRare: stats.catchesSinceRare,
      pityEpic: stats.catchesSinceEpic,
      lastLegendaryCatch: stats.lastLegendaryCatch,
      currentStreak,
      longestStreak: stats.longestStreak,
      lastCatchDate: stats.lastCatchDate,
      streakBonusAvailable,
    };
  }

  async consumeEnergy(walletAddress: string): Promise<boolean> {
    const database = await getDb();
    const stats = await this.getOrCreateEconomyStats(walletAddress);
    
    if (stats.energy <= 0) return false;
    
    const now = new Date();
    const lastDailyReset = new Date(stats.lastDailyReset);
    const isNewDay = now.toDateString() !== lastDailyReset.toDateString();
    
    // Reset energy if it's a new day
    if (isNewDay) {
      await database
        .update(huntEconomyStats)
        .set({
          energy: stats.maxEnergy - 1,
          catchesToday: 1,
          lastDailyReset: now,
          updatedAt: now,
        })
        .where(eq(huntEconomyStats.walletAddress, walletAddress));
    } else {
      await database
        .update(huntEconomyStats)
        .set({
          energy: stats.energy - 1,
          catchesToday: stats.catchesToday + 1,
          updatedAt: now,
        })
        .where(eq(huntEconomyStats.walletAddress, walletAddress));
    }
    
    return true;
  }
  
  // ============================================
  // EGG INCUBATOR METHODS
  // ============================================
  
  async getPlayerEggs(walletAddress: string): Promise<HuntEgg[]> {
    const database = await getDb();
    return database
      .select()
      .from(huntEggs)
      .where(eq(huntEggs.walletAddress, walletAddress))
      .orderBy(desc(huntEggs.foundAt));
  }
  
  async getPlayerIncubators(walletAddress: string): Promise<HuntIncubator[]> {
    const database = await getDb();
    const existing = await database
      .select()
      .from(huntIncubators)
      .where(eq(huntIncubators.walletAddress, walletAddress));
    
    // Create default incubator if player has none
    if (existing.length === 0) {
      const result = await database
        .insert(huntIncubators)
        .values({
          walletAddress,
          incubatorType: 'basic',
          speedMultiplier: 1.0,
          slotNumber: 1,
          isUnlocked: true,
        })
        .returning();
      return result;
    }
    
    return existing;
  }
  
  async createEgg(walletAddress: string, rarity: string, latitude?: number, longitude?: number): Promise<HuntEgg> {
    const database = await getDb();
    
    // Distance requirements by rarity
    const distanceByRarity: Record<string, number> = {
      common: 2000,      // 2km
      uncommon: 5000,    // 5km
      rare: 7000,        // 7km
      epic: 10000,       // 10km
      legendary: 12000,  // 12km
    };
    
    const result = await database
      .insert(huntEggs)
      .values({
        walletAddress,
        rarity,
        requiredDistance: distanceByRarity[rarity] || 2000,
        walkedDistance: 0,
        isIncubating: false,
        foundLatitude: latitude?.toString(),
        foundLongitude: longitude?.toString(),
      })
      .returning();
    
    return result[0];
  }
  
  async startIncubating(eggId: string, incubatorId: string): Promise<{ success: boolean; error?: string }> {
    const database = await getDb();
    
    // Check if incubator exists and is empty
    const incubators = await database
      .select()
      .from(huntIncubators)
      .where(eq(huntIncubators.id, incubatorId));
    
    if (incubators.length === 0) {
      return { success: false, error: 'Incubator not found' };
    }
    
    const incubator = incubators[0];
    if (incubator.currentEggId) {
      return { success: false, error: 'Incubator already has an egg' };
    }
    
    // Check if egg exists and isn't already incubating
    const eggs = await database
      .select()
      .from(huntEggs)
      .where(eq(huntEggs.id, eggId));
    
    if (eggs.length === 0) {
      return { success: false, error: 'Egg not found' };
    }
    
    const egg = eggs[0];
    if (egg.isIncubating) {
      return { success: false, error: 'Egg already incubating' };
    }
    
    if (egg.hatchedAt) {
      return { success: false, error: 'Egg already hatched' };
    }
    
    // Start incubating
    await database
      .update(huntEggs)
      .set({
        isIncubating: true,
        startedIncubatingAt: new Date(),
      })
      .where(eq(huntEggs.id, eggId));
    
    await database
      .update(huntIncubators)
      .set({ currentEggId: eggId })
      .where(eq(huntIncubators.id, incubatorId));
    
    return { success: true };
  }
  
  async updateEggDistance(walletAddress: string, distanceWalked: number): Promise<HuntEgg[]> {
    const database = await getDb();
    
    // Get all incubating eggs for this wallet
    const incubatingEggs = await database
      .select()
      .from(huntEggs)
      .where(
        and(
          eq(huntEggs.walletAddress, walletAddress),
          eq(huntEggs.isIncubating, true),
          sql`${huntEggs.hatchedAt} IS NULL`
        )
      );
    
    const updatedEggs: HuntEgg[] = [];
    
    for (const egg of incubatingEggs) {
      const newDistance = egg.walkedDistance + distanceWalked;
      
      await database
        .update(huntEggs)
        .set({ walkedDistance: newDistance })
        .where(eq(huntEggs.id, egg.id));
      
      updatedEggs.push({ ...egg, walkedDistance: newDistance });
    }
    
    return updatedEggs;
  }
  
  async hatchEgg(eggId: string): Promise<{ success: boolean; roachy?: HuntCaughtRoachy; error?: string }> {
    const database = await getDb();
    
    // Get the egg
    const eggs = await database
      .select()
      .from(huntEggs)
      .where(eq(huntEggs.id, eggId));
    
    if (eggs.length === 0) {
      return { success: false, error: 'Egg not found' };
    }
    
    const egg = eggs[0];
    
    if (egg.hatchedAt) {
      return { success: false, error: 'Egg already hatched' };
    }
    
    if (egg.walkedDistance < egg.requiredDistance) {
      return { success: false, error: 'Not enough distance walked' };
    }
    
    // Hatch the egg - create a roachy with the egg's rarity
    const templates = [
      { templateId: 'egg-roach-01', name: 'Eggborn Scout', roachyClass: 'assassin', baseHp: 75, baseAtk: 55, baseDef: 15, baseSpd: 60 },
      { templateId: 'egg-roach-02', name: 'Eggborn Tank', roachyClass: 'tank', baseHp: 130, baseAtk: 25, baseDef: 45, baseSpd: 15 },
      { templateId: 'egg-roach-03', name: 'Eggborn Sage', roachyClass: 'mage', baseHp: 85, baseAtk: 50, baseDef: 20, baseSpd: 45 },
      { templateId: 'egg-roach-04', name: 'Eggborn Healer', roachyClass: 'support', baseHp: 95, baseAtk: 25, baseDef: 35, baseSpd: 35 },
    ];
    
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    // Rarity multiplier
    const rarityMultiplier: Record<string, number> = {
      common: 1.0,
      uncommon: 1.15,
      rare: 1.3,
      epic: 1.5,
      legendary: 1.8,
    };
    const mult = rarityMultiplier[egg.rarity] || 1.0;
    
    const roachy = await this.addCaughtRoachy({
      walletAddress: egg.walletAddress,
      templateId: template.templateId,
      name: template.name,
      roachyClass: template.roachyClass as any,
      rarity: egg.rarity,
      baseHp: Math.floor(template.baseHp * mult),
      baseAtk: Math.floor(template.baseAtk * mult),
      baseDef: Math.floor(template.baseDef * mult),
      baseSpd: Math.floor(template.baseSpd * mult),
      catchLatitude: egg.foundLatitude || '0',
      catchLongitude: egg.foundLongitude || '0',
      origin: 'egg',
    });
    
    // Mark egg as hatched
    await database
      .update(huntEggs)
      .set({
        hatchedAt: new Date(),
        hatchedRoachyId: roachy.id,
      })
      .where(eq(huntEggs.id, eggId));
    
    // Free up the incubator
    await database
      .update(huntIncubators)
      .set({ currentEggId: null })
      .where(eq(huntIncubators.currentEggId, eggId));
    
    return { success: true, roachy };
  }
}

export const storage = new PostgresStorage();
