  // ROACHY HUNT - GPS CREATURE HUNTING GAME
  // ============================================

  // Hunt spawn templates
  const HUNT_ROACHY_TEMPLATES = [
    { templateId: 'hunt-roach-01', name: 'Scuttler', roachyClass: 'tank', baseHp: 120, baseAtk: 25, baseDef: 40, baseSpd: 15 },
    { templateId: 'hunt-roach-02', name: 'Shadow Runner', roachyClass: 'assassin', baseHp: 70, baseAtk: 50, baseDef: 15, baseSpd: 55 },
    { templateId: 'hunt-roach-03', name: 'Mystic Crawler', roachyClass: 'mage', baseHp: 80, baseAtk: 45, baseDef: 20, baseSpd: 40 },
    { templateId: 'hunt-roach-04', name: 'Healer Bug', roachyClass: 'support', baseHp: 90, baseAtk: 20, baseDef: 35, baseSpd: 30 },
    { templateId: 'hunt-roach-05', name: 'Armor Beetle', roachyClass: 'tank', baseHp: 150, baseAtk: 20, baseDef: 50, baseSpd: 10 },
    { templateId: 'hunt-roach-06', name: 'Night Striker', roachyClass: 'assassin', baseHp: 65, baseAtk: 55, baseDef: 10, baseSpd: 60 },
    { templateId: 'hunt-roach-07', name: 'Arcane Roach', roachyClass: 'mage', baseHp: 75, baseAtk: 50, baseDef: 15, baseSpd: 45 },
    { templateId: 'hunt-roach-08', name: 'Guardian Roach', roachyClass: 'support', baseHp: 100, baseAtk: 25, baseDef: 40, baseSpd: 25 },
    { templateId: 'hunt-roach-09', name: 'Golden Roach', roachyClass: 'tank', baseHp: 180, baseAtk: 35, baseDef: 55, baseSpd: 20 },
    { templateId: 'hunt-roach-10', name: 'Void Walker', roachyClass: 'assassin', baseHp: 80, baseAtk: 60, baseDef: 20, baseSpd: 70 },
    { templateId: 'hunt-roach-11', name: 'Crystal Sage', roachyClass: 'mage', baseHp: 90, baseAtk: 55, baseDef: 25, baseSpd: 50 },
    { templateId: 'hunt-roach-12', name: 'Divine Roach', roachyClass: 'support', baseHp: 120, baseAtk: 30, baseDef: 45, baseSpd: 35 },
  ];

  // Rarity spawn rates
  const HUNT_RARITY_RATES = {
    common: 0.60,     // 60%
    uncommon: 0.25,   // 25%
    rare: 0.10,       // 10%
    epic: 0.04,       // 4%
    legendary: 0.01,  // 1%
  };

  function rollHuntRarity(): string {
    const roll = Math.random();
    let cumulative = 0;
    for (const [rarity, rate] of Object.entries(HUNT_RARITY_RATES)) {
      cumulative += rate;
      if (roll < cumulative) return rarity;
    }
    return 'common';
  }

  // Check if it's currently nighttime (6pm-6am)
  function isNighttime(): boolean {
    const hour = new Date().getHours();
    return hour >= 18 || hour < 6;
  }
  
  // Weather system - simulated weather patterns
  // Weather changes every 3 hours based on pseudo-random seed
  // Spec: Rainy=Mage, Sunny=Tank, Cloudy=Assassin, Foggy=Support (40% spawn boost)
  type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'foggy';
  
  const WEATHER_CLASS_BOOSTS: Record<WeatherCondition, string> = {
    sunny: 'tank',      // Sunny weather boosts Tank spawns (40%)
    cloudy: 'assassin', // Cloudy weather boosts Assassin spawns (40%)
    rainy: 'mage',      // Rainy weather boosts Mage spawns (40%)
    foggy: 'support',   // Foggy weather boosts Support spawns (40%)
  };
  
  // Get current weather (changes every 3 hours, seeded by date)
  function getCurrentWeather(): WeatherCondition {
    const now = new Date();
    // Create a seed from year, month, day, and 3-hour block
    const threeHourBlock = Math.floor(now.getHours() / 3);
    const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate() * 10 + threeHourBlock;
    
    // Simple pseudo-random from seed
    const random = (seed * 1103515245 + 12345) % 2147483647;
    const normalized = (random / 2147483647);
    
    // Weather probabilities: sunny 30%, cloudy 30%, rainy 25%, foggy 15%
    if (normalized < 0.30) return 'sunny';
    if (normalized < 0.60) return 'cloudy';
    if (normalized < 0.85) return 'rainy';
    return 'foggy';
  }
  
  // Habitat zone system - simulated based on coordinate patterns
  // Spec: Park boosts Support/Mage, Urban boosts Tank/Assassin (25% spawn boost)
  type HabitatType = 'urban' | 'park';
  
  const HABITAT_CLASS_BOOSTS: Record<HabitatType, string[]> = {
    urban: ['tank', 'assassin'],   // Urban areas favor Tank and Assassin (25% boost each)
    park: ['support', 'mage'],     // Parks favor Support and Mage (25% boost each)
  };
  
  // Detect habitat type based on coordinates (simulated using coordinate patterns)
  // Simplified to Park/Urban as per spec
  function detectHabitat(latitude: number, longitude: number): HabitatType {
    // Create a pseudo-random seed from coordinates
    // This ensures the same location always returns the same habitat
    const latInt = Math.floor(latitude * 1000);
    const lonInt = Math.floor(longitude * 1000);
    const seed = (latInt * 31 + lonInt * 17) % 100;
    
    // 40% urban, 60% park (parks are slightly more common for outdoor game)
    return seed < 40 ? 'urban' : 'park';
  }
  
  // Day/night class preferences
  // Template indices by class:
  // Tank: 0, 4, 8 | Assassin: 1, 5, 9 | Mage: 2, 6, 10 | Support: 3, 7, 11
  const CLASS_INDICES: Record<string, number[]> = {
    tank: [0, 4, 8],
    assassin: [1, 5, 9],
    mage: [2, 6, 10],
    support: [3, 7, 11],
  };
  
  function getHuntTemplate(rarity: string, latitude?: number, longitude?: number) {
    // Better roachies for higher rarities
    const templates = HUNT_ROACHY_TEMPLATES;
    
    // Habitat-based spawn boost (25% chance) - if coordinates provided
    // Spec: Park boosts Support/Mage, Urban boosts Tank/Assassin
    if (latitude !== undefined && longitude !== undefined) {
      const habitat = detectHabitat(latitude, longitude);
      const habitatClasses = HABITAT_CLASS_BOOSTS[habitat]; // Now returns array
      const habitatClass = habitatClasses[Math.floor(Math.random() * habitatClasses.length)];
      const habitatIndices = CLASS_INDICES[habitatClass];
      
      if (Math.random() < 0.25 && habitatIndices.length > 0) {
        const tierIndex = rarity === 'legendary' || rarity === 'epic' ? 2 :
                          rarity === 'rare' ? 1 : 0;
        const templateIndex = habitatIndices[Math.min(tierIndex, habitatIndices.length - 1)];
        return templates[templateIndex];
      }
    }
    
    // Get current weather boost (40% chance)
    // Spec: Rainy=Mage, Sunny=Tank, Cloudy=Assassin, Foggy=Support
    const weather = getCurrentWeather();
    const weatherClass = WEATHER_CLASS_BOOSTS[weather];
    const weatherIndices = CLASS_INDICES[weatherClass];
    
    // Weather-based spawn boost (40% chance per spec)
    if (Math.random() < 0.40 && weatherIndices.length > 0) {
      const tierIndex = rarity === 'legendary' || rarity === 'epic' ? 2 :
                        rarity === 'rare' ? 1 : 0;
      const templateIndex = weatherIndices[Math.min(tierIndex, weatherIndices.length - 1)];
      return templates[templateIndex];
    }
    
    // Apply day/night spawn weights (15% chance)
    // Spec: Assassin at night (6pm-6am), Support during day
    const nightMode = isNighttime();
    const preferredClass = nightMode ? 'assassin' : 'support';
    const preferredIndices = CLASS_INDICES[preferredClass];
    
    // Day/night boost (15% chance per spec)
    if (Math.random() < 0.15 && preferredIndices.length > 0) {
      const tierIndex = rarity === 'legendary' || rarity === 'epic' ? 2 :
                        rarity === 'rare' ? 1 : 0;
      const templateIndex = preferredIndices[Math.min(tierIndex, preferredIndices.length - 1)];
      return templates[templateIndex];
    }
    
    // Standard rarity-based selection (45% of the time)
    const index = rarity === 'legendary' ? Math.floor(Math.random() * 4) + 8 :
                  rarity === 'epic' ? Math.floor(Math.random() * 4) + 4 :
                  rarity === 'rare' ? Math.floor(Math.random() * 4) + 2 :
                  Math.floor(Math.random() * templates.length);
    return templates[Math.min(index, templates.length - 1)];
  }

  // Generate spawn near a location
  function generateSpawnNearLocation(latitude: number, longitude: number, radiusMeters: number = 200) {
    // Random angle and distance
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * radiusMeters;
    
    // Convert to lat/lon offsets (approximate)
    const latOffset = (distance * Math.cos(angle)) / 111000; // 111km per degree
    const lonOffset = (distance * Math.sin(angle)) / (111000 * Math.cos(latitude * Math.PI / 180));
    
    // Calculate spawn position for habitat detection
    const spawnLat = latitude + latOffset;
    const spawnLon = longitude + lonOffset;
    
    const rarity = rollHuntRarity();
    const template = getHuntTemplate(rarity, spawnLat, spawnLon);
    
    // Stat multipliers based on rarity
    const rarityMultiplier: Record<string, number> = {
      common: 1.0,
      uncommon: 1.15,
      rare: 1.3,
      epic: 1.5,
      legendary: 1.8,
    };
    const mult = rarityMultiplier[rarity] || 1.0;
    
    return {
      latitude: spawnLat.toString(),
      longitude: spawnLon.toString(),
      templateId: template.templateId,
      name: template.name,
      roachyClass: template.roachyClass,
      rarity,
      baseHp: Math.floor(template.baseHp * mult),
      baseAtk: Math.floor(template.baseAtk * mult),
      baseDef: Math.floor(template.baseDef * mult),
      baseSpd: Math.floor(template.baseSpd * mult),
      isActive: true,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    };
  }

  // Update player location
  app.post("/api/hunt/location", async (req, res) => {
    try {
      const { walletAddress, latitude, longitude, displayName } = req.body;
      
      if (!walletAddress || typeof walletAddress !== "string") {
        return res.status(400).json({ error: "Invalid wallet address" });
      }
      
      if (typeof latitude !== "number" || typeof longitude !== "number") {
        return res.status(400).json({ error: "Invalid coordinates" });
      }

      const location = await storage.updatePlayerLocation(walletAddress, latitude, longitude, displayName);
      res.json({ success: true, location });
    } catch (error: any) {
      console.error("Error updating location:", error);
      res.status(400).json({ error: error.message || "Failed to update location" });
    }
  });

  // Get nearby players
  app.get("/api/hunt/nearby-players", async (req, res) => {
    try {
      const { latitude, longitude, radiusKm } = req.query;
      
      const lat = parseFloat(latitude as string);
      const lon = parseFloat(longitude as string);
      const radius = parseFloat(radiusKm as string) || 5; // Default 5km
      
      if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({ error: "Invalid coordinates" });
      }

      const players = await storage.getNearbyPlayers(lat, lon, radius);
      res.json({ success: true, players });
    } catch (error: any) {
      console.error("Error getting nearby players:", error);
      res.status(400).json({ error: error.message || "Failed to get nearby players" });
    }
  });

  // Set player offline
  app.post("/api/hunt/offline", async (req, res) => {
    try {
      const { walletAddress } = req.body;
      
      if (!walletAddress || typeof walletAddress !== "string") {
        return res.status(400).json({ error: "Invalid wallet address" });
      }

      await storage.setPlayerOffline(walletAddress);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error setting player offline:", error);
      res.status(400).json({ error: error.message || "Failed to set offline" });
    }
  });

  // Get nearby spawns (auto-generates if none found)
  app.get("/api/hunt/nearby-spawns", async (req, res) => {
    try {
      const { latitude, longitude, radiusKm } = req.query;
      
      const lat = parseFloat(latitude as string);
      const lon = parseFloat(longitude as string);
      const radius = parseFloat(radiusKm as string) || 2; // Default 2km
      
      if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({ error: "Invalid coordinates" });
      }

      let spawns = await storage.getNearbySpawns(lat, lon, radius);
      
      // Auto-generate spawns if none found nearby
      if (spawns.length === 0) {
        const spawnCount = 3 + Math.floor(Math.random() * 3); // 3-5 spawns
        for (let i = 0; i < spawnCount; i++) {
          const spawnData = generateSpawnNearLocation(lat, lon, 300); // 300m radius
          await storage.createWildSpawn(spawnData as any);
        }
        spawns = await storage.getNearbySpawns(lat, lon, radius);
      }
      
      res.json({ success: true, spawns });
    } catch (error: any) {
      console.error("Error getting spawns:", error);
      res.status(400).json({ error: error.message || "Failed to get spawns" });
    }
  });

  // Generate spawns (called periodically or on-demand)
  app.post("/api/hunt/generate-spawns", async (req, res) => {
    try {
      const { latitude, longitude, count } = req.body;
      
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      const spawnCount = Math.min(count || 5, 10); // Max 10 spawns at once
      
      if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({ error: "Invalid coordinates" });
      }

      const createdSpawns = [];
      for (let i = 0; i < spawnCount; i++) {
        const spawnData = generateSpawnNearLocation(lat, lon, 500); // 500m radius
        const spawn = await storage.createWildSpawn(spawnData as any);
        createdSpawns.push(spawn);
      }

      res.json({ success: true, spawns: createdSpawns });
    } catch (error: any) {
      console.error("Error generating spawns:", error);
      res.status(400).json({ error: error.message || "Failed to generate spawns" });
    }
  });

  // IV Variance System: ±5% on stats, 1% chance for Perfect (+7%)
  function rollIVs(): { ivHp: number; ivAtk: number; ivDef: number; ivSpd: number; isPerfect: boolean } {
    const isPerfect = Math.random() < 0.01; // 1% chance for perfect
    if (isPerfect) {
      return { ivHp: 7, ivAtk: 7, ivDef: 7, ivSpd: 7, isPerfect: true };
    }
    return {
      ivHp: Math.floor(Math.random() * 11) - 5, // -5 to +5
      ivAtk: Math.floor(Math.random() * 11) - 5,
      ivDef: Math.floor(Math.random() * 11) - 5,
      ivSpd: Math.floor(Math.random() * 11) - 5,
      isPerfect: false,
    };
  }

  // Apply IV variance to base stats
  function applyIVs(baseStat: number, iv: number): number {
    return Math.floor(baseStat * (1 + iv / 100));
  }

  // Catch quality XP bonuses
  const CATCH_QUALITY_XP: Record<string, number> = {
    perfect: 150,
    great: 75,
    good: 30,
  };

  // Pity system constants
  const PITY_RARE_THRESHOLD = 20; // Guaranteed rare every 20 catches
  const PITY_EPIC_THRESHOLD = 60; // Guaranteed epic every 60 catches
  const LEGENDARY_COOLDOWN_DAYS = 30; // 1 legendary per 30 days

  // Egg drop rates when catching
  const EGG_DROP_RATES: Record<string, number> = {
    common: 0.10,      // 10% chance to find common egg
    uncommon: 0.05,    // 5% chance
    rare: 0.03,        // 3% chance
    epic: 0.01,        // 1% chance
    legendary: 0.005,  // 0.5% chance
  };
  
  // Roll for egg drop after catching
  function rollForEgg(): { found: boolean; rarity?: string } {
    const roll = Math.random();
    let cumulative = 0;
    
    for (const [rarity, rate] of Object.entries(EGG_DROP_RATES)) {
      cumulative += rate;
      if (roll < cumulative) {
        return { found: true, rarity };
      }
    }
    
    return { found: false };
  }

  // Apply pity upgrade to rarity
  // Note: pityRare/pityEpic are the counts BEFORE this catch, so we check for >= threshold - 1
  // because this current catch will be the Nth catch that triggers the pity
  function applyPityUpgrade(baseRarity: string, pityRare: number, pityEpic: number): { rarity: string; pityTriggered: string | null } {
    // Check epic pity first (higher priority) - triggers on the 60th catch without epic+
    if (pityEpic >= PITY_EPIC_THRESHOLD - 1 && (baseRarity === 'common' || baseRarity === 'uncommon' || baseRarity === 'rare')) {
      return { rarity: 'epic', pityTriggered: 'epic' };
    }
    // Check rare pity - triggers on the 20th catch without rare+
    if (pityRare >= PITY_RARE_THRESHOLD - 1 && (baseRarity === 'common' || baseRarity === 'uncommon')) {
      return { rarity: 'rare', pityTriggered: 'rare' };
    }
    return { rarity: baseRarity, pityTriggered: null };
  }

  // Catch a wild roachy
  app.post("/api/hunt/catch", async (req, res) => {
    try {
      const { walletAddress, spawnId, catchQuality } = req.body;
      
      if (!walletAddress || typeof walletAddress !== "string") {
        return res.status(400).json({ error: "Invalid wallet address" });
      }
      
      if (!spawnId || typeof spawnId !== "string") {
        return res.status(400).json({ error: "Invalid spawn ID" });
      }

      // Check catch limits before proceeding
      const limits = await storage.checkCatchLimits(walletAddress);
      if (!limits.canCatch) {
        return res.status(429).json({ 
          error: limits.reason,
          energy: limits.energy,
          catchesToday: limits.catchesToday,
          catchesThisWeek: limits.catchesThisWeek,
        });
      }

      // Try to catch the spawn
      const caughtSpawn = await storage.catchSpawn(spawnId, walletAddress);
      
      if (!caughtSpawn) {
        return res.status(400).json({ error: "Spawn not available (already caught or expired)" });
      }

      // Check legendary cooldown
      let finalRarity = caughtSpawn.rarity;
      let pityTriggered: string | null = null;
      
      if (caughtSpawn.rarity === 'legendary') {
        // Check if legendary is on cooldown
        if (limits.lastLegendaryCatch) {
          const daysSinceLegendary = (Date.now() - new Date(limits.lastLegendaryCatch).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceLegendary < LEGENDARY_COOLDOWN_DAYS) {
            // Downgrade legendary to epic due to cooldown
            finalRarity = 'epic';
            console.log(`Legendary downgraded to epic for ${walletAddress} - cooldown active (${Math.floor(daysSinceLegendary)} days since last)`);
          }
        }
      } else {
        // Apply pity system upgrades
        const pityResult = applyPityUpgrade(caughtSpawn.rarity, limits.pityRare, limits.pityEpic);
        finalRarity = pityResult.rarity;
        pityTriggered = pityResult.pityTriggered;
        
        if (pityTriggered) {
          console.log(`Pity triggered for ${walletAddress}: ${caughtSpawn.rarity} -> ${finalRarity} (${pityTriggered} pity)`);
        }
        
        // Apply 7-day streak bonus (guaranteed Rare or better)
        if (limits.streakBonusAvailable && (finalRarity === 'common' || finalRarity === 'uncommon')) {
          finalRarity = 'rare';
          pityTriggered = 'streak';
          console.log(`Streak bonus triggered for ${walletAddress}: upgraded to rare (${limits.currentStreak}-day streak)`);
        }
      }

      // Get player location for catch coordinates
      const playerLocation = await storage.getPlayerLocation(walletAddress);
      const catchLat = playerLocation?.latitude || caughtSpawn.latitude;
      const catchLon = playerLocation?.longitude || caughtSpawn.longitude;

      // Roll IVs for stat variance
      const ivs = rollIVs();
      
      // Apply IVs to base stats
      const finalHp = applyIVs(caughtSpawn.baseHp, ivs.ivHp);
      const finalAtk = applyIVs(caughtSpawn.baseAtk, ivs.ivAtk);
      const finalDef = applyIVs(caughtSpawn.baseDef, ivs.ivDef);
      const finalSpd = applyIVs(caughtSpawn.baseSpd, ivs.ivSpd);
      
      // Calculate starting XP from catch quality
      const quality = catchQuality || 'good';
      const startingXp = CATCH_QUALITY_XP[quality] || 30;

      // Add to player's collection with IVs and catch quality
      const caughtRoachy = await storage.addCaughtRoachy({
        walletAddress,
        templateId: caughtSpawn.templateId,
        name: caughtSpawn.name,
        roachyClass: caughtSpawn.roachyClass,
        rarity: finalRarity, // Use final rarity (may be upgraded by pity)
        baseHp: finalHp,
        baseAtk: finalAtk,
        baseDef: finalDef,
        baseSpd: finalSpd,
        catchLatitude: catchLat.toString(),
        catchLongitude: catchLon.toString(),
        ivHp: ivs.ivHp,
        ivAtk: ivs.ivAtk,
        ivDef: ivs.ivDef,
        ivSpd: ivs.ivSpd,
        isPerfect: ivs.isPerfect,
        catchQuality: quality,
        origin: 'hunt',
        xp: startingXp,
      });

      // Update economy stats (counters, energy, pity, streak bonus claimed)
      const streakBonusClaimed = pityTriggered === 'streak';
      await storage.updateEconomyStatsOnCatch(walletAddress, finalRarity, streakBonusClaimed);

      // Update leaderboard
      await storage.updateHuntLeaderboard(
        walletAddress, 
        finalRarity as any,
        playerLocation?.displayName || undefined
      );

      // Roll for egg drop (chance increases slightly with catch quality)
      const qualityBonus = quality === 'perfect' ? 0.05 : quality === 'great' ? 0.02 : 0;
      let eggFound = null;
      const eggRoll = rollForEgg();
      if (eggRoll.found || Math.random() < qualityBonus) {
        const eggRarity = eggRoll.rarity || 'common';
        eggFound = await storage.createEgg(walletAddress, eggRarity, catchLat, catchLon);
      }

      // Build response message
      let message = `You caught a ${finalRarity} ${caughtSpawn.name}!`;
      if (ivs.isPerfect) {
        message = `✨ PERFECT! ${message}`;
      }
      if (pityTriggered) {
        message = `🎯 PITY BONUS! ${message}`;
      }
      if (eggFound) {
        message += ` 🥚 You found a ${eggFound.rarity} egg!`;
      }

      res.json({ 
        success: true, 
        caught: {
          ...caughtRoachy,
          ivs,
          bonusXp: startingXp,
        },
        rarity: finalRarity,
        originalRarity: caughtSpawn.rarity,
        pityTriggered,
        isPerfect: ivs.isPerfect,
        energy: limits.energy - 1,
        catchesToday: limits.catchesToday + 1,
        eggFound,
        message,
      });
    } catch (error: any) {
      console.error("Error catching roachy:", error);
      res.status(400).json({ error: error.message || "Failed to catch roachy" });
    }
  });

  // Get player's caught roachies
  app.get("/api/hunt/collection/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        return res.status(400).json({ error: "Invalid wallet address" });
      }

      const roachies = await storage.getPlayerCaughtRoachies(walletAddress);
      const stats = await storage.getPlayerHuntStats(walletAddress);
      
      res.json({ 
        success: true, 
        roachies,
        stats: stats || {
          totalCaught: 0,
          commonCaught: 0,
          uncommonCaught: 0,
          rareCaught: 0,
          epicCaught: 0,
          legendaryCaught: 0,
        }
      });
    } catch (error: any) {
      console.error("Error getting collection:", error);
      res.status(400).json({ error: error.message || "Failed to get collection" });
    }
  });

  // Level up a caught roachy
  app.post("/api/hunt/level-up", async (req, res) => {
    try {
      const { roachyId, xpAmount } = req.body;
      
      if (!roachyId || typeof roachyId !== "string") {
        return res.status(400).json({ error: "Invalid roachy ID" });
      }
      
      const xp = xpAmount || 50; // Default XP gain
      const updatedRoachy = await storage.levelUpCaughtRoachy(roachyId, xp);
      
      if (!updatedRoachy) {
        return res.status(404).json({ error: "Roachy not found" });
      }

      res.json({ success: true, roachy: updatedRoachy });
    } catch (error: any) {
      console.error("Error leveling up:", error);
      res.status(400).json({ error: error.message || "Failed to level up" });
    }
  });

  // Get hunt leaderboard
  app.get("/api/hunt/leaderboard", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const leaderboard = await storage.getHuntLeaderboard(limit);
      res.json({ success: true, leaderboard });
    } catch (error: any) {
      console.error("Error getting leaderboard:", error);
      res.status(400).json({ error: error.message || "Failed to get leaderboard" });
    }
  });

  // Get player economy stats (energy, limits, pity, streak)
  app.get("/api/hunt/economy/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        return res.status(400).json({ error: "Invalid wallet address" });
      }

      const limits = await storage.checkCatchLimits(walletAddress);
      
      res.json({ 
        success: true,
        energy: limits.energy,
        maxEnergy: 30,
        catchesToday: limits.catchesToday,
        maxCatchesPerDay: 25,
        catchesThisWeek: limits.catchesThisWeek,
        maxCatchesPerWeek: 120,
        pityRare: limits.pityRare,
        pityRareThreshold: PITY_RARE_THRESHOLD,
        pityEpic: limits.pityEpic,
        pityEpicThreshold: PITY_EPIC_THRESHOLD,
        lastLegendaryCatch: limits.lastLegendaryCatch,
        legendaryCooldownDays: LEGENDARY_COOLDOWN_DAYS,
        // Streak data
        currentStreak: limits.currentStreak,
        longestStreak: limits.longestStreak,
        lastCatchDate: limits.lastCatchDate,
        streakBonusAvailable: limits.streakBonusAvailable,
        streakBonusThreshold: 7,
      });
    } catch (error: any) {
      console.error("Error getting economy stats:", error);
      res.status(400).json({ error: error.message || "Failed to get economy stats" });
    }
  });

  // Get current weather conditions (for spawn modifiers)
  app.get("/api/hunt/weather", async (req, res) => {
    try {
      const weather = getCurrentWeather();
      const boostedClass = WEATHER_CLASS_BOOSTS[weather];
      const isNight = isNighttime();
      
      res.json({ 
        success: true,
        weather,
        boostedClass,
        isNight,
        nightBoostedClass: isNight ? 'assassin' : 'support',
      });
    } catch (error: any) {
      console.error("Error getting weather:", error);
      res.status(400).json({ error: error.message || "Failed to get weather" });
    }
  });

  // Get habitat zone for a location
  app.get("/api/hunt/habitat", async (req, res) => {
    try {
      const { latitude, longitude } = req.query;
      
      const lat = parseFloat(latitude as string);
      const lon = parseFloat(longitude as string);
      
      if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({ error: "Invalid coordinates" });
      }
      
      const habitat = detectHabitat(lat, lon);
      const boostedClasses = HABITAT_CLASS_BOOSTS[habitat];
      const boostedClass = boostedClasses.join('/'); // "tank/assassin" or "support/mage"
      
      res.json({ 
        success: true,
        habitat,
        boostedClass,
      });
    } catch (error: any) {
      console.error("Error getting habitat:", error);
      res.status(400).json({ error: error.message || "Failed to get habitat" });
    }
  });

  // ============================================
  // EGG INCUBATOR ENDPOINTS
  // ============================================
  
  // Get player's eggs and incubators
  app.get("/api/hunt/eggs/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        return res.status(400).json({ error: "Invalid wallet address" });
      }
      
      const eggs = await storage.getPlayerEggs(walletAddress);
      const incubators = await storage.getPlayerIncubators(walletAddress);
      
      res.json({ 
        success: true,
        eggs,
        incubators,
      });
    } catch (error: any) {
      console.error("Error getting eggs:", error);
      res.status(400).json({ error: error.message || "Failed to get eggs" });
    }
  });
  
  // Start incubating an egg
  app.post("/api/hunt/eggs/incubate", async (req, res) => {
    try {
      const { eggId, incubatorId } = req.body;
      
      if (!eggId || !incubatorId) {
        return res.status(400).json({ error: "Missing eggId or incubatorId" });
      }
      
      const result = await storage.startIncubating(eggId, incubatorId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error starting incubation:", error);
      res.status(400).json({ error: error.message || "Failed to start incubation" });
    }
  });
  
  // Update egg distance (called when player moves)
  app.post("/api/hunt/eggs/walk", async (req, res) => {
    try {
      const { walletAddress, distanceWalked } = req.body;
      
      if (!walletAddress || typeof distanceWalked !== 'number') {
        return res.status(400).json({ error: "Invalid parameters" });
      }
      
      const updatedEggs = await storage.updateEggDistance(walletAddress, Math.floor(distanceWalked));
      
      // Check if any eggs are ready to hatch
      const readyToHatch = updatedEggs.filter(egg => egg.walkedDistance >= egg.requiredDistance);
      
      res.json({ 
        success: true,
        updatedEggs: updatedEggs.length,
        readyToHatch: readyToHatch.length,
        eggs: updatedEggs,
      });
    } catch (error: any) {
      console.error("Error updating egg distance:", error);
      res.status(400).json({ error: error.message || "Failed to update distance" });
    }
  });
  
  // Hatch an egg
  app.post("/api/hunt/eggs/hatch", async (req, res) => {
    try {
      const { eggId } = req.body;
      
      if (!eggId) {
        return res.status(400).json({ error: "Missing eggId" });
      }
      
      const result = await storage.hatchEgg(eggId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json({ 
        success: true,
        roachy: result.roachy,
      });
    } catch (error: any) {
      console.error("Error hatching egg:", error);
      res.status(400).json({ error: error.message || "Failed to hatch egg" });
    }
  });

  // Cleanup expired spawns (cron job or periodic call)
  app.post("/api/hunt/cleanup", async (req, res) => {
    try {
      const cleaned = await storage.cleanupExpiredSpawns();
      res.json({ success: true, cleanedCount: cleaned });
    } catch (error: any) {
      console.error("Error cleaning spawns:", error);
      res.status(400).json({ error: error.message || "Failed to cleanup" });
    }
  });

  // ============================================
  // FLASH EVENTS SYSTEM
  // ============================================
  
  // Flash events store (in-memory for simplicity)
  interface FlashEvent {
    id: string;
    name: string;
    description: string;
    rarity: string;
    boostedClass: string;
    spawnMultiplier: number;
    startTime: Date;
    endTime: Date;
    isActive: boolean;
  }
  
  let activeFlashEvents: FlashEvent[] = [];
  
  // Predefined flash event templates
  const FLASH_EVENT_TEMPLATES = [
    { name: 'Legendary Hour', description: 'Legendary spawn rates increased!', rarity: 'legendary', boostedClass: 'all', spawnMultiplier: 5.0 },
    { name: 'Assassin Surge', description: 'Assassin spawns everywhere!', rarity: 'epic', boostedClass: 'assassin', spawnMultiplier: 3.0 },
    { name: 'Tank Rally', description: 'Tank Roachies are gathering!', rarity: 'rare', boostedClass: 'tank', spawnMultiplier: 3.0 },
    { name: 'Mage Convergence', description: 'Mystical Mages appearing!', rarity: 'rare', boostedClass: 'mage', spawnMultiplier: 3.0 },
    { name: 'Support Swarm', description: 'Support Roachies helping out!', rarity: 'rare', boostedClass: 'support', spawnMultiplier: 3.0 },
    { name: 'Epic Storm', description: 'Epic spawns increased!', rarity: 'epic', boostedClass: 'all', spawnMultiplier: 4.0 },
  ];
  
  // Check for active flash events
  function getActiveFlashEvents(): FlashEvent[] {
    const now = new Date();
    return activeFlashEvents.filter(e => e.isActive && e.startTime <= now && e.endTime > now);
  }
  
  // Generate random flash event ID
  function generateFlashEventId(): string {
    return `flash-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Get current flash events
  app.get("/api/hunt/flash-events", async (req, res) => {
    try {
      const now = new Date();
      const active = getActiveFlashEvents();
      
      // Also include upcoming events (next 30 minutes)
      const upcoming = activeFlashEvents.filter(e => 
        e.isActive && 
        e.startTime > now && 
        e.startTime.getTime() - now.getTime() < 30 * 60 * 1000
      );
      
      res.json({ 
        success: true,
        active,
        upcoming,
        serverTime: now.toISOString(),
      });
    } catch (error: any) {
      console.error("Error getting flash events:", error);
      res.status(400).json({ error: error.message || "Failed to get flash events" });
    }
  });
  
  // Create a flash event (admin only)
  app.post("/api/hunt/flash-events", async (req, res) => {
    try {
      const { walletAddress, template, durationMinutes } = req.body;
      
      // Only dev wallet can create events
      if (!DEV_WALLET_EXCEPTIONS.includes(walletAddress)) {
        return res.status(403).json({ error: "Only admins can create flash events" });
      }
      
      const templateData = FLASH_EVENT_TEMPLATES[template] || FLASH_EVENT_TEMPLATES[0];
      const duration = durationMinutes || 15; // Default 15 minutes
      
      const now = new Date();
      const event: FlashEvent = {
        id: generateFlashEventId(),
        name: templateData.name,
        description: templateData.description,
        rarity: templateData.rarity,
        boostedClass: templateData.boostedClass,
        spawnMultiplier: templateData.spawnMultiplier,
        startTime: now,
        endTime: new Date(now.getTime() + duration * 60 * 1000),
        isActive: true,
      };
      
      activeFlashEvents.push(event);
      
      // Auto-cleanup old events
      activeFlashEvents = activeFlashEvents.filter(e => e.endTime > now);
      
      res.json({ success: true, event });
    } catch (error: any) {
      console.error("Error creating flash event:", error);
      res.status(400).json({ error: error.message || "Failed to create flash event" });
    }
  });
  
  // Scheduled flash events (simulated - triggers randomly)
  // Check every hour for a chance to spawn a flash event
  function maybeSpawnFlashEvent() {
    const now = new Date();
    const hour = now.getHours();
    
    // Higher chance during peak hours (12-14, 18-21)
    const peakHours = [12, 13, 14, 18, 19, 20, 21];
    const chance = peakHours.includes(hour) ? 0.10 : 0.03; // 10% during peak, 3% otherwise
    
    if (Math.random() < chance) {
      const template = FLASH_EVENT_TEMPLATES[Math.floor(Math.random() * FLASH_EVENT_TEMPLATES.length)];
      const duration = 15 + Math.floor(Math.random() * 15); // 15-30 minutes
      
      const event: FlashEvent = {
        id: generateFlashEventId(),
        name: template.name,
        description: template.description,
        rarity: template.rarity,
        boostedClass: template.boostedClass,
        spawnMultiplier: template.spawnMultiplier,
        startTime: now,
        endTime: new Date(now.getTime() + duration * 60 * 1000),
        isActive: true,
      };
      
      activeFlashEvents.push(event);
      console.log(`🎉 Flash event spawned: ${event.name} for ${duration} minutes`);
    }
  }
  
  // Check for flash events every 10 minutes
  setInterval(() => {
    maybeSpawnFlashEvent();
    // Cleanup expired events
    activeFlashEvents = activeFlashEvents.filter(e => e.endTime > new Date());
  }, 10 * 60 * 1000);

  // ============================================
  // CO-OP RAIDS SYSTEM
  // ============================================
  
  interface RaidBoss {
    id: string;
    name: string;
    rarity: string;
    class: string;
    maxHP: number;
    currentHP: number;
    attackPower: number;
    defenseRating: number;
    latitude: number;
    longitude: number;
    spawnedAt: Date;
    expiresAt: Date;
    participants: Map<string, { damage: number; displayName: string; joinedAt: Date }>;
    isDefeated: boolean;
    rewards: { chyCoins: number; xp: number; guaranteedEgg: boolean };
  }
  
  let activeRaids: Map<string, RaidBoss> = new Map();
  
  // Boss templates
  const RAID_BOSS_TEMPLATES = [
    { name: 'Mega Tank Rex', rarity: 'legendary', class: 'tank', hp: 10000, attack: 150, defense: 200, rewards: { chyCoins: 500, xp: 2000, guaranteedEgg: true } },
    { name: 'Shadow Assassin', rarity: 'epic', class: 'assassin', hp: 6000, attack: 250, defense: 80, rewards: { chyCoins: 300, xp: 1200, guaranteedEgg: true } },
    { name: 'Arcane Mage King', rarity: 'legendary', class: 'mage', hp: 8000, attack: 200, defense: 100, rewards: { chyCoins: 450, xp: 1800, guaranteedEgg: true } },
    { name: 'Guardian Support', rarity: 'epic', class: 'support', hp: 7000, attack: 100, defense: 150, rewards: { chyCoins: 350, xp: 1400, guaranteedEgg: true } },
  ];
  
  function generateRaidId(): string {
    return `raid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Get nearby raids
  app.get("/api/hunt/raids", async (req, res) => {
    try {
      const { latitude, longitude } = req.query;
      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: "Invalid coordinates" });
      }
      
      const now = new Date();
      const nearbyRaids: any[] = [];
      
      activeRaids.forEach((raid, id) => {
        if (raid.isDefeated || raid.expiresAt < now) return;
        
        // Check if within 2km
        const distance = Math.sqrt(
          Math.pow((raid.latitude - lat) * 111, 2) + 
          Math.pow((raid.longitude - lng) * 111 * Math.cos(lat * Math.PI / 180), 2)
        );
        
        if (distance <= 2) {
          nearbyRaids.push({
            id: raid.id,
            name: raid.name,
            rarity: raid.rarity,
            class: raid.class,
            currentHP: raid.currentHP,
            maxHP: raid.maxHP,
            participantCount: raid.participants.size,
            latitude: raid.latitude,
            longitude: raid.longitude,
            expiresAt: raid.expiresAt.toISOString(),
            distanceKm: distance.toFixed(2),
          });
        }
      });
      
      res.json({ success: true, raids: nearbyRaids });
    } catch (error: any) {
      console.error("Error getting raids:", error);
      res.status(400).json({ error: error.message || "Failed to get raids" });
    }
  });
  
  // Join a raid
  app.post("/api/hunt/raids/:raidId/join", async (req, res) => {
    try {
      const { raidId } = req.params;
      const { walletAddress, displayName } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ error: "Missing wallet address" });
      }
      
      const raid = activeRaids.get(raidId);
      if (!raid) {
        return res.status(404).json({ error: "Raid not found or expired" });
      }
      
      if (raid.isDefeated) {
        return res.status(400).json({ error: "Raid already defeated" });
      }
      
      if (raid.expiresAt < new Date()) {
        return res.status(400).json({ error: "Raid has expired" });
      }
      
      // Add or update participant
      if (!raid.participants.has(walletAddress)) {
        raid.participants.set(walletAddress, {
          damage: 0,
          displayName: displayName || walletAddress.slice(0, 8),
          joinedAt: new Date(),
        });
      }
      
      res.json({ 
        success: true, 
        raid: {
          id: raid.id,
          name: raid.name,
          rarity: raid.rarity,
          class: raid.class,
          currentHP: raid.currentHP,
          maxHP: raid.maxHP,
          participantCount: raid.participants.size,
          expiresAt: raid.expiresAt.toISOString(),
        },
      });
    } catch (error: any) {
      console.error("Error joining raid:", error);
      res.status(400).json({ error: error.message || "Failed to join raid" });
    }
  });
  
  // Attack a raid boss
  app.post("/api/hunt/raids/:raidId/attack", async (req, res) => {
    try {
      const { raidId } = req.params;
      const { walletAddress, attackPower } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ error: "Missing wallet address" });
      }
      
      const raid = activeRaids.get(raidId);
      if (!raid) {
        return res.status(404).json({ error: "Raid not found or expired" });
      }
      
      if (raid.isDefeated) {
        return res.status(400).json({ error: "Raid already defeated" });
      }
      
      // Must be a participant
      const participant = raid.participants.get(walletAddress);
      if (!participant) {
        return res.status(400).json({ error: "You must join the raid first" });
      }
      
      // Calculate damage (base + player attack - boss defense, minimum 10)
      const baseDamage = attackPower || 50;
      const actualDamage = Math.max(10, baseDamage - Math.floor(raid.defenseRating / 10));
      
      raid.currentHP = Math.max(0, raid.currentHP - actualDamage);
      participant.damage += actualDamage;
      
      let rewards: any = null;
      
      // Check if defeated
      if (raid.currentHP <= 0) {
        raid.isDefeated = true;
        
        // Distribute rewards based on damage contribution
        const totalDamage = Array.from(raid.participants.values()).reduce((sum, p) => sum + p.damage, 0);
        const contribution = participant.damage / totalDamage;
        
        const chyReward = Math.floor(raid.rewards.chyCoins * contribution);
        const xpReward = Math.floor(raid.rewards.xp * contribution);
        
        // Give rewards to player
        if (chyReward > 0) {
          await storage.addChyToWallet(walletAddress, chyReward);
        }
        
        rewards = {
          chyCoins: chyReward,
          xp: xpReward,
          contribution: Math.round(contribution * 100),
          guaranteedEgg: raid.rewards.guaranteedEgg && contribution >= 0.1, // 10% minimum contribution for egg
        };
        
        // Create egg reward if earned
        if (rewards.guaranteedEgg) {
          const eggRarity = raid.rarity === 'legendary' ? 'epic' : 'rare';
          await storage.createEgg(walletAddress, eggRarity);
        }
      }
      
      res.json({
        success: true,
        damage: actualDamage,
        bossHP: raid.currentHP,
        maxHP: raid.maxHP,
        isDefeated: raid.isDefeated,
        yourTotalDamage: participant.damage,
        rewards,
      });
    } catch (error: any) {
      console.error("Error attacking raid:", error);
      res.status(400).json({ error: error.message || "Failed to attack" });
    }
  });
  
  // Spawn a raid (admin only or random)
  app.post("/api/hunt/raids/spawn", async (req, res) => {
    try {
      const { walletAddress, latitude, longitude, templateIndex } = req.body;
      
      // Only dev wallet can spawn raids
      if (!DEV_WALLET_EXCEPTIONS.includes(walletAddress)) {
        return res.status(403).json({ error: "Only admins can spawn raids" });
      }
      
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        return res.status(400).json({ error: "Invalid coordinates" });
      }
      
      const template = RAID_BOSS_TEMPLATES[templateIndex] || RAID_BOSS_TEMPLATES[Math.floor(Math.random() * RAID_BOSS_TEMPLATES.length)];
      const now = new Date();
      
      const raid: RaidBoss = {
        id: generateRaidId(),
        name: template.name,
        rarity: template.rarity,
        class: template.class,
        maxHP: template.hp,
        currentHP: template.hp,
        attackPower: template.attack,
        defenseRating: template.defense,
        latitude,
        longitude,
        spawnedAt: now,
        expiresAt: new Date(now.getTime() + 30 * 60 * 1000), // 30 minute duration
        participants: new Map(),
        isDefeated: false,
        rewards: template.rewards,
      };
      
      activeRaids.set(raid.id, raid);
      
      res.json({
        success: true,
        raid: {
          id: raid.id,
          name: raid.name,
          rarity: raid.rarity,
          class: raid.class,
          maxHP: raid.maxHP,
          currentHP: raid.currentHP,
          participantCount: raid.participants.size,
          expiresAt: raid.expiresAt.toISOString(),
        },
      });
    } catch (error: any) {
      console.error("Error spawning raid:", error);
      res.status(400).json({ error: error.message || "Failed to spawn raid" });
    }
  });
  
  // Cleanup expired raids every 5 minutes
  setInterval(() => {
    const now = new Date();
    activeRaids.forEach((raid, id) => {
      if (raid.expiresAt < now || raid.isDefeated) {
        activeRaids.delete(id);
      }
    });
  }, 5 * 60 * 1000);

  const httpServer = createServer(app);

  // ============================================
  // WEBSOCKET SERVER FOR REAL-TIME HUNT FEATURES
  // ============================================
  
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/hunt' });
  
  // Track connected players by wallet
  const connectedPlayers = new Map<string, { ws: WebSocket; latitude: number; longitude: number; displayName?: string }>();
  
  // Broadcast to all connected players within radius
  function broadcastToNearby(latitude: number, longitude: number, radiusKm: number, message: any, excludeWallet?: string) {
    const latDelta = radiusKm / 111;
    connectedPlayers.forEach((player, wallet) => {
      if (wallet === excludeWallet) return;
      
      const latDiff = Math.abs(player.latitude - latitude);
      if (latDiff <= latDelta && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify(message));
      }
    });
  }
  
  wss.on('connection', (ws: WebSocket) => {
    let playerWallet: string | null = null;
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'join':
            // Player joining the hunt
            playerWallet = message.walletAddress;
            if (playerWallet && message.latitude !== undefined && message.longitude !== undefined) {
              connectedPlayers.set(playerWallet, {
                ws,
                latitude: message.latitude,
                longitude: message.longitude,
                displayName: message.displayName,
              });
              
              // Update database location
              await storage.updatePlayerLocation(playerWallet, message.latitude, message.longitude, message.displayName);
              
              // Notify nearby players
              broadcastToNearby(message.latitude, message.longitude, 5, {
                type: 'player_joined',
                wallet: playerWallet.substring(0, 8) + '...',
                displayName: message.displayName,
              }, playerWallet);
              
              // Send nearby players to this player
              const nearbyPlayers = await storage.getNearbyPlayers(message.latitude, message.longitude, 5);
              ws.send(JSON.stringify({
                type: 'nearby_players',
                players: nearbyPlayers.map(p => ({
                  wallet: p.walletAddress.substring(0, 8) + '...',
                  latitude: Number(p.latitude),
                  longitude: Number(p.longitude),
                  displayName: p.displayName,
                })),
              }));
              
              // Send nearby spawns
              const nearbySpawns = await storage.getNearbySpawns(message.latitude, message.longitude, 2);
              ws.send(JSON.stringify({
                type: 'nearby_spawns',
                spawns: nearbySpawns,
              }));
            }
            break;
            
          case 'location_update':
            // Player moved
            if (playerWallet && message.latitude !== undefined && message.longitude !== undefined) {
              connectedPlayers.set(playerWallet, {
                ws,
                latitude: message.latitude,
                longitude: message.longitude,
                displayName: message.displayName,
              });
              
              await storage.updatePlayerLocation(playerWallet, message.latitude, message.longitude);
              
              // Broadcast movement to nearby players
              broadcastToNearby(message.latitude, message.longitude, 5, {
                type: 'player_moved',
                wallet: playerWallet.substring(0, 8) + '...',
                latitude: message.latitude,
                longitude: message.longitude,
              }, playerWallet);
              
              // Send updated nearby spawns
              const spawns = await storage.getNearbySpawns(message.latitude, message.longitude, 2);
              ws.send(JSON.stringify({
                type: 'nearby_spawns',
                spawns,
              }));
            }
            break;
            
          case 'catch_attempt':
            // Player trying to catch a spawn
            if (playerWallet && message.spawnId) {
              const caughtSpawn = await storage.catchSpawn(message.spawnId, playerWallet);
              
              if (caughtSpawn) {
                // Successfully caught
                const playerLocation = connectedPlayers.get(playerWallet);
                const catchLat = playerLocation?.latitude || Number(caughtSpawn.latitude);
                const catchLon = playerLocation?.longitude || Number(caughtSpawn.longitude);
                
                const caughtRoachy = await storage.addCaughtRoachy({
                  walletAddress: playerWallet,
                  templateId: caughtSpawn.templateId,
                  name: caughtSpawn.name,
                  roachyClass: caughtSpawn.roachyClass,
                  rarity: caughtSpawn.rarity,
                  baseHp: caughtSpawn.baseHp,
                  baseAtk: caughtSpawn.baseAtk,
                  baseDef: caughtSpawn.baseDef,
                  baseSpd: caughtSpawn.baseSpd,
                  catchLatitude: catchLat.toString(),
                  catchLongitude: catchLon.toString(),
                });
                
                await storage.updateHuntLeaderboard(playerWallet, caughtSpawn.rarity as any, playerLocation?.displayName);
                
                // Notify the catcher
                ws.send(JSON.stringify({
                  type: 'catch_success',
                  caught: caughtRoachy,
                  rarity: caughtSpawn.rarity,
                  message: `You caught a ${caughtSpawn.rarity} ${caughtSpawn.name}!`,
                }));
                
                // Notify nearby players that spawn was caught
                broadcastToNearby(catchLat, catchLon, 2, {
                  type: 'spawn_caught',
                  spawnId: message.spawnId,
                  caughtBy: playerWallet.substring(0, 8) + '...',
                  roachyName: caughtSpawn.name,
                  rarity: caughtSpawn.rarity,
                }, playerWallet);
              } else {
                ws.send(JSON.stringify({
                  type: 'catch_failed',
                  spawnId: message.spawnId,
                  error: 'Spawn not available (already caught or expired)',
                }));
              }
            }
            break;
            
          case 'request_spawns':
            // Player requesting spawn generation
            if (playerWallet && message.latitude !== undefined && message.longitude !== undefined) {
              const existingSpawns = await storage.getNearbySpawns(message.latitude, message.longitude, 1);
              
              // Only generate if fewer than 3 spawns nearby
              if (existingSpawns.length < 3) {
                const newSpawns = [];
                const count = Math.min(5 - existingSpawns.length, 3);
                
                for (let i = 0; i < count; i++) {
                  const spawnData = generateSpawnNearLocation(message.latitude, message.longitude, 300);
                  const spawn = await storage.createWildSpawn(spawnData as any);
                  newSpawns.push(spawn);
                }
                
                // Broadcast new spawns to nearby players
                broadcastToNearby(message.latitude, message.longitude, 2, {
                  type: 'new_spawns',
                  spawns: newSpawns,
                });
              }
              
              // Send current nearby spawns
              const allSpawns = await storage.getNearbySpawns(message.latitude, message.longitude, 2);
              ws.send(JSON.stringify({
                type: 'nearby_spawns',
                spawns: allSpawns,
              }));
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
