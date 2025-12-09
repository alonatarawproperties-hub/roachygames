import type { Express, Request, Response } from "express";
import { db } from "./db";
import {
  huntPlayerLocations,
  wildCreatureSpawns,
  huntCaughtCreatures,
  huntLeaderboard,
  huntActivityLog,
  huntEconomyStats,
  huntEggs,
  huntIncubators,
  huntRaids,
  huntRaidParticipants,
} from "@shared/schema";
import { eq, and, gte, lte, sql, desc, isNull } from "drizzle-orm";

const RARITY_RATES = {
  common: 0.60,
  uncommon: 0.25,
  rare: 0.10,
  epic: 0.04,
  legendary: 0.01,
};

const SPAWN_TYPE_RATES = {
  egg: 0.60,
  creature: 0.40,
};

const EGG_TEMPLATES = [
  { id: 'egg_common', name: 'Common Egg', roachyClass: 'egg', rarity: 'common', baseHp: 0, baseAtk: 0, baseDef: 0, baseSpd: 0 },
  { id: 'egg_uncommon', name: 'Uncommon Egg', roachyClass: 'egg', rarity: 'uncommon', baseHp: 0, baseAtk: 0, baseDef: 0, baseSpd: 0 },
  { id: 'egg_rare', name: 'Rare Egg', roachyClass: 'egg', rarity: 'rare', baseHp: 0, baseAtk: 0, baseDef: 0, baseSpd: 0 },
  { id: 'egg_epic', name: 'Epic Egg', roachyClass: 'egg', rarity: 'epic', baseHp: 0, baseAtk: 0, baseDef: 0, baseSpd: 0 },
  { id: 'egg_legendary', name: 'Legendary Egg', roachyClass: 'egg', rarity: 'legendary', baseHp: 0, baseAtk: 0, baseDef: 0, baseSpd: 0 },
];

function selectEggByRarity(): typeof EGG_TEMPLATES[0] {
  const roll = Math.random();
  let cumulative = 0;
  for (const egg of EGG_TEMPLATES) {
    cumulative += RARITY_RATES[egg.rarity as keyof typeof RARITY_RATES] || 0;
    if (roll <= cumulative) return egg;
  }
  return EGG_TEMPLATES[0];
}

const EGGS_REQUIRED_FOR_HATCH = 10;

const ROACHY_TEMPLATES = [
  { id: 'ironshell', name: 'Ironshell', roachyClass: 'tank', rarity: 'common', baseHp: 120, baseAtk: 40, baseDef: 80, baseSpd: 30 },
  { id: 'scuttler', name: 'Scuttler', roachyClass: 'assassin', rarity: 'common', baseHp: 60, baseAtk: 75, baseDef: 35, baseSpd: 90 },
  { id: 'sparkroach', name: 'Sparkroach', roachyClass: 'mage', rarity: 'common', baseHp: 55, baseAtk: 80, baseDef: 40, baseSpd: 65 },
  { id: 'leafwing', name: 'Leafwing', roachyClass: 'support', rarity: 'common', baseHp: 75, baseAtk: 35, baseDef: 60, baseSpd: 55 },
  { id: 'vikingbug', name: 'Viking Bug', roachyClass: 'tank', rarity: 'uncommon', baseHp: 140, baseAtk: 55, baseDef: 90, baseSpd: 35 },
  { id: 'shadowblade', name: 'Shadowblade', roachyClass: 'assassin', rarity: 'uncommon', baseHp: 65, baseAtk: 85, baseDef: 40, baseSpd: 95 },
  { id: 'frostmage', name: 'Frost Mage', roachyClass: 'mage', rarity: 'rare', baseHp: 60, baseAtk: 95, baseDef: 45, baseSpd: 70 },
  { id: 'aviator', name: 'Aviator', roachyClass: 'support', rarity: 'rare', baseHp: 80, baseAtk: 50, baseDef: 65, baseSpd: 75 },
  { id: 'royalmage', name: 'Royal Mage', roachyClass: 'mage', rarity: 'epic', baseHp: 70, baseAtk: 110, baseDef: 55, baseSpd: 80 },
  { id: 'warlord', name: 'Warlord', roachyClass: 'tank', rarity: 'epic', baseHp: 160, baseAtk: 70, baseDef: 100, baseSpd: 40 },
  { id: 'nightstalker', name: 'Nightstalker', roachyClass: 'assassin', rarity: 'epic', baseHp: 70, baseAtk: 105, baseDef: 45, baseSpd: 100 },
  { id: 'cosmicking', name: 'Cosmic King', roachyClass: 'tank', rarity: 'legendary', baseHp: 200, baseAtk: 90, baseDef: 120, baseSpd: 60 },
];

const EGG_DISTANCES: Record<string, number> = {
  common: 2000,
  uncommon: 5000,
  rare: 7000,
  epic: 10000,
  legendary: 12000,
};

function selectRarity(pityCounters: { sinceRare: number; sinceEpic: number }): string {
  if (pityCounters.sinceEpic >= 60) return 'epic';
  if (pityCounters.sinceRare >= 20) return 'rare';
  
  const roll = Math.random();
  let cumulative = 0;
  for (const [rarity, rate] of Object.entries(RARITY_RATES)) {
    cumulative += rate;
    if (roll <= cumulative) return rarity;
  }
  return 'common';
}

function generateIVs(): { ivHp: number; ivAtk: number; ivDef: number; ivSpd: number; isPerfect: boolean } {
  const isPerfect = Math.random() < 0.01;
  const range = isPerfect ? 7 : 5;
  return {
    ivHp: Math.floor(Math.random() * (range * 2 + 1)) - (isPerfect ? 0 : 5),
    ivAtk: Math.floor(Math.random() * (range * 2 + 1)) - (isPerfect ? 0 : 5),
    ivDef: Math.floor(Math.random() * (range * 2 + 1)) - (isPerfect ? 0 : 5),
    ivSpd: Math.floor(Math.random() * (range * 2 + 1)) - (isPerfect ? 0 : 5),
    isPerfect,
  };
}

function getRandomOffset(radiusMeters: number): { lat: number; lng: number } {
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * radiusMeters;
  const latOffset = (distance / 111320) * Math.cos(angle);
  const lngOffset = (distance / (111320 * Math.cos(0))) * Math.sin(angle);
  return { lat: latOffset, lng: lngOffset };
}

export function registerHuntRoutes(app: Express) {
  app.post("/api/hunt/location", async (req: Request, res: Response) => {
    try {
      const { walletAddress, latitude, longitude, displayName } = req.body;
      
      if (!walletAddress || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const existing = await db.select().from(huntPlayerLocations)
        .where(eq(huntPlayerLocations.walletAddress, walletAddress))
        .limit(1);

      if (existing.length > 0) {
        await db.update(huntPlayerLocations)
          .set({
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            lastSeen: new Date(),
            updatedAt: new Date(),
            displayName: displayName || existing[0].displayName,
            isOnline: true,
          })
          .where(eq(huntPlayerLocations.walletAddress, walletAddress));
      } else {
        await db.insert(huntPlayerLocations).values({
          walletAddress,
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          displayName,
          isOnline: true,
        });

        const existingEconomy = await db.select().from(huntEconomyStats)
          .where(eq(huntEconomyStats.walletAddress, walletAddress))
          .limit(1);
        
        if (existingEconomy.length === 0) {
          await db.insert(huntEconomyStats).values({
            walletAddress,
            energy: 30,
            maxEnergy: 30,
          });
        }

        const existingLeaderboard = await db.select().from(huntLeaderboard)
          .where(eq(huntLeaderboard.walletAddress, walletAddress))
          .limit(1);
        
        if (existingLeaderboard.length === 0) {
          await db.insert(huntLeaderboard).values({
            walletAddress,
            displayName,
          });
        }

        const existingIncubator = await db.select().from(huntIncubators)
          .where(eq(huntIncubators.walletAddress, walletAddress))
          .limit(1);
        
        if (existingIncubator.length === 0) {
          await db.insert(huntIncubators).values({
            walletAddress,
            incubatorType: 'basic',
            slotNumber: 1,
          });
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Location update error:", error);
      res.status(500).json({ error: "Failed to update location" });
    }
  });

  app.get("/api/hunt/spawns", async (req: Request, res: Response) => {
    try {
      const { latitude, longitude, radius = 500 } = req.query;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ error: "Missing coordinates" });
      }

      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const radiusKm = parseFloat(radius as string) / 1000;
      const latDelta = radiusKm / 111.32;
      const lngDelta = radiusKm / (111.32 * Math.cos(lat * Math.PI / 180));
      const now = new Date();

      await db.update(wildCreatureSpawns)
        .set({ isActive: false })
        .where(and(
          eq(wildCreatureSpawns.isActive, true),
          lte(wildCreatureSpawns.expiresAt, now)
        ));

      const spawns = await db.select().from(wildCreatureSpawns)
        .where(and(
          eq(wildCreatureSpawns.isActive, true),
          isNull(wildCreatureSpawns.caughtByWallet),
          gte(wildCreatureSpawns.latitude, (lat - latDelta).toString()),
          lte(wildCreatureSpawns.latitude, (lat + latDelta).toString()),
          gte(wildCreatureSpawns.longitude, (lng - lngDelta).toString()),
          lte(wildCreatureSpawns.longitude, (lng + lngDelta).toString()),
          gte(wildCreatureSpawns.expiresAt, now),
        ))
        .limit(20);

      res.json({ spawns });
    } catch (error) {
      console.error("Spawns fetch error:", error);
      res.status(500).json({ error: "Failed to fetch spawns" });
    }
  });

  app.post("/api/hunt/spawn", async (req: Request, res: Response) => {
    try {
      const { latitude, longitude, count = 5 } = req.body;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ error: "Missing coordinates" });
      }

      const spawns = [];
      for (let i = 0; i < count; i++) {
        const radius = i === 0 ? 50 : 200;
        const offset = getRandomOffset(radius);
        const expiresAt = new Date(Date.now() + (15 + Math.random() * 15) * 60 * 1000);
        
        const isMysteryEgg = Math.random() < SPAWN_TYPE_RATES.egg;
        
        let spawnData: {
          templateId: string;
          name: string;
          creatureClass: string;
          rarity: string;
          baseHp: number;
          baseAtk: number;
          baseDef: number;
          baseSpd: number;
          containedTemplateId: string | null;
        };
        
        if (isMysteryEgg) {
          const eggTemplate = selectEggByRarity();
          spawnData = {
            templateId: 'wild_egg',
            name: 'Mystery Egg',
            creatureClass: 'egg',
            rarity: eggTemplate.rarity,
            baseHp: 0,
            baseAtk: 0,
            baseDef: 0,
            baseSpd: 0,
            containedTemplateId: null,
          };
        } else {
          const rarity = selectRarity({ sinceRare: 0, sinceEpic: 0 });
          let templates = ROACHY_TEMPLATES.filter(t => t.rarity === rarity);
          if (templates.length === 0) {
            templates = ROACHY_TEMPLATES.filter(t => t.rarity === 'common');
          }
          const creature = templates[Math.floor(Math.random() * templates.length)];
          spawnData = {
            templateId: 'wild_egg',
            name: 'Mystery Egg',
            creatureClass: creature.roachyClass,
            rarity: creature.rarity,
            baseHp: creature.baseHp,
            baseAtk: creature.baseAtk,
            baseDef: creature.baseDef,
            baseSpd: creature.baseSpd,
            containedTemplateId: creature.id,
          };
        }

        const [spawn] = await db.insert(wildCreatureSpawns).values({
          latitude: (latitude + offset.lat).toString(),
          longitude: (longitude + offset.lng).toString(),
          templateId: spawnData.templateId,
          name: spawnData.name,
          creatureClass: spawnData.creatureClass,
          rarity: spawnData.rarity,
          baseHp: spawnData.baseHp,
          baseAtk: spawnData.baseAtk,
          baseDef: spawnData.baseDef,
          baseSpd: spawnData.baseSpd,
          containedTemplateId: spawnData.containedTemplateId,
          expiresAt,
        }).returning();

        spawns.push(spawn);
      }

      res.json({ success: true, spawns });
    } catch (error) {
      console.error("Spawn error:", error);
      res.status(500).json({ error: "Failed to spawn creatures" });
    }
  });

  app.post("/api/hunt/catch", async (req: Request, res: Response) => {
    try {
      const { walletAddress, spawnId, catchQuality, latitude, longitude } = req.body;
      
      if (!walletAddress || !spawnId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const [spawn] = await db.select().from(wildCreatureSpawns)
        .where(and(
          eq(wildCreatureSpawns.id, spawnId),
          eq(wildCreatureSpawns.isActive, true),
        ))
        .limit(1);

      if (!spawn) {
        return res.status(404).json({ error: "Spawn not found or already caught" });
      }

      const [economy] = await db.select().from(huntEconomyStats)
        .where(eq(huntEconomyStats.walletAddress, walletAddress))
        .limit(1);

      if (!economy) {
        return res.status(404).json({ error: "Player economy not found" });
      }

      if (economy.energy <= 0) {
        return res.status(400).json({ error: "Not enough energy" });
      }

      if (economy.catchesToday >= economy.maxCatchesPerDay) {
        return res.status(400).json({ error: "Daily catch limit reached" });
      }

      await db.update(wildCreatureSpawns)
        .set({
          isActive: false,
          caughtByWallet: walletAddress,
          caughtAt: new Date(),
        })
        .where(eq(wildCreatureSpawns.id, spawnId));

      const isMysteryEgg = spawn.creatureClass === 'egg';
      const isRoachyEgg = spawn.containedTemplateId !== null && spawn.creatureClass !== 'egg';

      if (isMysteryEgg) {
        const currentEggs = economy.collectedEggs || 0;
        const newEggCount = currentEggs + 1;
        const canHatch = newEggCount >= EGGS_REQUIRED_FOR_HATCH;

        await db.update(huntEconomyStats)
          .set({
            collectedEggs: newEggCount,
            energy: economy.energy - 1,
            updatedAt: new Date(),
          })
          .where(eq(huntEconomyStats.walletAddress, walletAddress));

        await db.insert(huntActivityLog).values({
          walletAddress,
          activityType: 'egg_collect',
          details: JSON.stringify({
            eggNumber: newEggCount,
            eggRarity: spawn.rarity,
          }),
        });

        return res.json({
          success: true,
          isMysteryEgg: true,
          isRoachyEgg: false,
          eggRarity: spawn.rarity,
          collectedEggs: newEggCount,
          eggsRequired: EGGS_REQUIRED_FOR_HATCH,
          canHatch,
          economy: {
            energy: economy.energy - 1,
            collectedEggs: newEggCount,
          },
        });
      }

      const containedTemplate = ROACHY_TEMPLATES.find(t => t.id === spawn.containedTemplateId);
      const creatureName = containedTemplate ? containedTemplate.name : spawn.name;
      const creatureTemplateId = spawn.containedTemplateId || spawn.templateId;

      const ivs = generateIVs();
      const xpGain = catchQuality === 'perfect' ? 150 : catchQuality === 'great' ? 75 : 30;

      const [caughtCreature] = await db.insert(huntCaughtCreatures).values({
        walletAddress,
        templateId: creatureTemplateId,
        name: creatureName,
        creatureClass: spawn.creatureClass,
        rarity: spawn.rarity,
        baseHp: spawn.baseHp,
        baseAtk: spawn.baseAtk,
        baseDef: spawn.baseDef,
        baseSpd: spawn.baseSpd,
        xp: xpGain,
        ivHp: ivs.ivHp,
        ivAtk: ivs.ivAtk,
        ivDef: ivs.ivDef,
        ivSpd: ivs.ivSpd,
        isPerfect: ivs.isPerfect,
        catchQuality,
        catchLatitude: (latitude || spawn.latitude).toString(),
        catchLongitude: (longitude || spawn.longitude).toString(),
      }).returning();

      const today = new Date().toISOString().split('T')[0];
      const isNewDay = economy.lastCatchDate !== today;
      let newStreak = economy.currentStreak;

      if (isNewDay) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        newStreak = economy.lastCatchDate === yesterday ? economy.currentStreak + 1 : 1;
      }

      let newCatchesSinceRare = spawn.rarity === 'rare' || spawn.rarity === 'epic' || spawn.rarity === 'legendary' 
        ? 0 : economy.catchesSinceRare + 1;
      let newCatchesSinceEpic = spawn.rarity === 'epic' || spawn.rarity === 'legendary' 
        ? 0 : economy.catchesSinceEpic + 1;

      await db.update(huntEconomyStats)
        .set({
          energy: economy.energy - 1,
          catchesToday: isNewDay ? 1 : economy.catchesToday + 1,
          catchesThisWeek: economy.catchesThisWeek + 1,
          catchesSinceRare: newCatchesSinceRare,
          catchesSinceEpic: newCatchesSinceEpic,
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, economy.longestStreak),
          lastCatchDate: today,
          lastDailyReset: isNewDay ? new Date() : economy.lastDailyReset,
          updatedAt: new Date(),
        })
        .where(eq(huntEconomyStats.walletAddress, walletAddress));

      const rarityField = `${spawn.rarity}Caught` as keyof typeof huntLeaderboard;
      await db.update(huntLeaderboard)
        .set({
          totalCaught: sql`${huntLeaderboard.totalCaught} + 1`,
          [rarityField]: sql`${huntLeaderboard[rarityField]} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(huntLeaderboard.walletAddress, walletAddress));

      await db.insert(huntActivityLog).values({
        walletAddress,
        activityType: 'catch',
        details: JSON.stringify({
          creatureId: caughtCreature.id,
          name: creatureName,
          rarity: spawn.rarity,
          catchQuality,
          xpGain,
          isPerfect: ivs.isPerfect,
          fromRoachyEgg: isRoachyEgg,
        }),
      });

      res.json({
        success: true,
        isMysteryEgg: false,
        isRoachyEgg: isRoachyEgg,
        creature: caughtCreature,
        xpGain,
        streak: newStreak,
        economy: {
          energy: economy.energy - 1,
          catchesToday: isNewDay ? 1 : economy.catchesToday + 1,
        },
      });
    } catch (error) {
      console.error("Catch error:", error);
      res.status(500).json({ error: "Failed to catch creature" });
    }
  });

  app.post("/api/hunt/hatch", async (req: Request, res: Response) => {
    try {
      const { walletAddress, latitude, longitude } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ error: "Missing wallet address" });
      }

      const [economy] = await db.select().from(huntEconomyStats)
        .where(eq(huntEconomyStats.walletAddress, walletAddress))
        .limit(1);

      if (!economy) {
        return res.status(404).json({ error: "Player economy not found" });
      }

      const currentEggs = economy.collectedEggs || 0;
      if (currentEggs < EGGS_REQUIRED_FOR_HATCH) {
        return res.status(400).json({ 
          error: `Need ${EGGS_REQUIRED_FOR_HATCH} eggs to hatch, you have ${currentEggs}`,
          collectedEggs: currentEggs,
          eggsRequired: EGGS_REQUIRED_FOR_HATCH,
        });
      }

      const rarity = selectRarity({ sinceRare: economy.catchesSinceRare, sinceEpic: economy.catchesSinceEpic });
      let templates = ROACHY_TEMPLATES.filter(t => t.rarity === rarity);
      if (templates.length === 0) {
        templates = ROACHY_TEMPLATES.filter(t => t.rarity === 'common');
      }
      const template = templates[Math.floor(Math.random() * templates.length)];
      const ivs = generateIVs();

      const [hatchedCreature] = await db.insert(huntCaughtCreatures).values({
        walletAddress,
        templateId: template.id,
        name: template.name,
        creatureClass: template.roachyClass,
        rarity,
        baseHp: template.baseHp,
        baseAtk: template.baseAtk,
        baseDef: template.baseDef,
        baseSpd: template.baseSpd,
        xp: 50,
        ivHp: ivs.ivHp,
        ivAtk: ivs.ivAtk,
        ivDef: ivs.ivDef,
        ivSpd: ivs.ivSpd,
        isPerfect: ivs.isPerfect,
        catchQuality: 'hatched',
        catchLatitude: (latitude || '0').toString(),
        catchLongitude: (longitude || '0').toString(),
        origin: 'egg_hatch',
      }).returning();

      const newEggCount = currentEggs - EGGS_REQUIRED_FOR_HATCH;

      let newCatchesSinceRare = rarity === 'rare' || rarity === 'epic' || rarity === 'legendary' 
        ? 0 : economy.catchesSinceRare + 1;
      let newCatchesSinceEpic = rarity === 'epic' || rarity === 'legendary' 
        ? 0 : economy.catchesSinceEpic + 1;

      await db.update(huntEconomyStats)
        .set({
          collectedEggs: newEggCount,
          catchesSinceRare: newCatchesSinceRare,
          catchesSinceEpic: newCatchesSinceEpic,
          updatedAt: new Date(),
        })
        .where(eq(huntEconomyStats.walletAddress, walletAddress));

      await db.insert(huntActivityLog).values({
        walletAddress,
        activityType: 'egg_hatch',
        details: JSON.stringify({
          creatureId: hatchedCreature.id,
          name: template.name,
          rarity,
          eggsUsed: EGGS_REQUIRED_FOR_HATCH,
        }),
      });

      res.json({
        success: true,
        creature: hatchedCreature,
        collectedEggs: newEggCount,
        eggsRequired: EGGS_REQUIRED_FOR_HATCH,
      });
    } catch (error) {
      console.error("Hatch error:", error);
      res.status(500).json({ error: "Failed to hatch egg" });
    }
  });

  app.get("/api/hunt/economy/:walletAddress", async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;

      let [economy] = await db.select().from(huntEconomyStats)
        .where(eq(huntEconomyStats.walletAddress, walletAddress))
        .limit(1);

      if (!economy) {
        [economy] = await db.insert(huntEconomyStats).values({
          walletAddress,
          energy: 30,
          maxEnergy: 30,
          maxCatchesPerDay: 25,
          maxCatchesPerWeek: 120,
        }).returning();
      }

      const now = new Date();
      const lastRefresh = new Date(economy.lastEnergyRefresh);
      const hoursSinceRefresh = (now.getTime() - lastRefresh.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceRefresh >= 24 && economy.energy < economy.maxEnergy) {
        await db.update(huntEconomyStats)
          .set({
            energy: economy.maxEnergy,
            lastEnergyRefresh: now,
            updatedAt: now,
          })
          .where(eq(huntEconomyStats.walletAddress, walletAddress));
        economy.energy = economy.maxEnergy;
      }

      console.log(`[Economy] wallet=${walletAddress} collectedEggs=${economy.collectedEggs}`);
      res.json({ economy });
    } catch (error) {
      console.error("Economy fetch error:", error);
      res.status(500).json({ error: "Failed to fetch economy stats" });
    }
  });

  app.get("/api/hunt/collection/:walletAddress", async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;

      const creatures = await db.select().from(huntCaughtCreatures)
        .where(eq(huntCaughtCreatures.walletAddress, walletAddress))
        .orderBy(desc(huntCaughtCreatures.caughtAt));

      res.json({ creatures });
    } catch (error) {
      console.error("Collection fetch error:", error);
      res.status(500).json({ error: "Failed to fetch collection" });
    }
  });

  app.get("/api/hunt/leaderboard", async (req: Request, res: Response) => {
    try {
      const leaderboard = await db.select().from(huntLeaderboard)
        .orderBy(desc(huntLeaderboard.totalCaught))
        .limit(50);

      res.json({ leaderboard });
    } catch (error) {
      console.error("Leaderboard fetch error:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  app.get("/api/hunt/eggs/:walletAddress", async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;

      const eggs = await db.select().from(huntEggs)
        .where(and(
          eq(huntEggs.walletAddress, walletAddress),
          sql`${huntEggs.hatchedAt} IS NULL`,
        ))
        .orderBy(desc(huntEggs.foundAt));

      const incubators = await db.select().from(huntIncubators)
        .where(eq(huntIncubators.walletAddress, walletAddress));

      res.json({ eggs, incubators });
    } catch (error) {
      console.error("Eggs fetch error:", error);
      res.status(500).json({ error: "Failed to fetch eggs" });
    }
  });

  app.post("/api/hunt/eggs/:eggId/incubate", async (req: Request, res: Response) => {
    try {
      const { eggId } = req.params;
      const { incubatorId } = req.body;

      await db.update(huntEggs)
        .set({
          isIncubating: true,
          startedIncubatingAt: new Date(),
        })
        .where(eq(huntEggs.id, eggId));

      await db.update(huntIncubators)
        .set({ currentEggId: eggId })
        .where(eq(huntIncubators.id, incubatorId));

      res.json({ success: true });
    } catch (error) {
      console.error("Incubate error:", error);
      res.status(500).json({ error: "Failed to start incubation" });
    }
  });

  app.post("/api/hunt/eggs/:eggId/walk", async (req: Request, res: Response) => {
    try {
      const { eggId } = req.params;
      const { distance, walletAddress } = req.body;

      const [egg] = await db.select().from(huntEggs)
        .where(and(
          eq(huntEggs.id, eggId),
          eq(huntEggs.isIncubating, true),
        ))
        .limit(1);

      if (!egg) {
        return res.status(404).json({ error: "Egg not found or not incubating" });
      }

      const newDistance = egg.walkedDistance + distance;
      
      if (newDistance >= egg.requiredDistance) {
        const rarity = egg.rarity;
        let templates = ROACHY_TEMPLATES.filter(t => t.rarity === rarity);
        if (templates.length === 0) {
          templates = ROACHY_TEMPLATES.filter(t => t.rarity === 'common');
        }
        
        const template = templates[Math.floor(Math.random() * templates.length)];
        const ivs = generateIVs();

        const [hatchedCreature] = await db.insert(huntCaughtCreatures).values({
          walletAddress,
          templateId: template.id,
          name: template.name,
          creatureClass: template.roachyClass,
          rarity,
          baseHp: template.baseHp,
          baseAtk: template.baseAtk,
          baseDef: template.baseDef,
          baseSpd: template.baseSpd,
          xp: 50,
          ivHp: ivs.ivHp,
          ivAtk: ivs.ivAtk,
          ivDef: ivs.ivDef,
          ivSpd: ivs.ivSpd,
          isPerfect: ivs.isPerfect,
          catchQuality: 'good',
          catchLatitude: egg.foundLatitude || "0",
          catchLongitude: egg.foundLongitude || "0",
          origin: 'egg',
        }).returning();

        await db.update(huntEggs)
          .set({
            walkedDistance: newDistance,
            hatchedAt: new Date(),
            hatchedCreatureId: hatchedCreature.id,
          })
          .where(eq(huntEggs.id, eggId));

        await db.update(huntIncubators)
          .set({ currentEggId: null })
          .where(eq(huntIncubators.currentEggId, eggId));

        res.json({ 
          success: true, 
          hatched: true, 
          creature: hatchedCreature 
        });
      } else {
        await db.update(huntEggs)
          .set({ walkedDistance: newDistance })
          .where(eq(huntEggs.id, eggId));

        res.json({ 
          success: true, 
          hatched: false, 
          walkedDistance: newDistance,
          requiredDistance: egg.requiredDistance,
        });
      }
    } catch (error) {
      console.error("Walk error:", error);
      res.status(500).json({ error: "Failed to update egg distance" });
    }
  });

  app.get("/api/hunt/raids", async (req: Request, res: Response) => {
    try {
      const { latitude, longitude, radius = 1000 } = req.query;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ error: "Missing coordinates" });
      }

      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const radiusKm = parseFloat(radius as string) / 1000;
      const latDelta = radiusKm / 111.32;
      const lngDelta = radiusKm / (111.32 * Math.cos(lat * Math.PI / 180));

      const raids = await db.select().from(huntRaids)
        .where(and(
          eq(huntRaids.isActive, true),
          gte(huntRaids.latitude, (lat - latDelta).toString()),
          lte(huntRaids.latitude, (lat + latDelta).toString()),
          gte(huntRaids.longitude, (lng - lngDelta).toString()),
          lte(huntRaids.longitude, (lng + lngDelta).toString()),
          gte(huntRaids.expiresAt, new Date()),
        ));

      res.json({ raids });
    } catch (error) {
      console.error("Raids fetch error:", error);
      res.status(500).json({ error: "Failed to fetch raids" });
    }
  });

  app.post("/api/hunt/raids/:raidId/join", async (req: Request, res: Response) => {
    try {
      const { raidId } = req.params;
      const { walletAddress } = req.body;

      const existing = await db.select().from(huntRaidParticipants)
        .where(and(
          eq(huntRaidParticipants.raidId, raidId),
          eq(huntRaidParticipants.walletAddress, walletAddress),
        ))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(huntRaidParticipants).values({
          raidId,
          walletAddress,
        });

        await db.update(huntRaids)
          .set({
            participantCount: sql`${huntRaids.participantCount} + 1`,
          })
          .where(eq(huntRaids.id, raidId));
      }

      const [raid] = await db.select().from(huntRaids)
        .where(eq(huntRaids.id, raidId))
        .limit(1);

      res.json({ success: true, raid });
    } catch (error) {
      console.error("Join raid error:", error);
      res.status(500).json({ error: "Failed to join raid" });
    }
  });

  app.post("/api/hunt/raids/:raidId/attack", async (req: Request, res: Response) => {
    try {
      const { raidId } = req.params;
      const { walletAddress, attackPower } = req.body;

      const [raid] = await db.select().from(huntRaids)
        .where(and(
          eq(huntRaids.id, raidId),
          eq(huntRaids.isActive, true),
        ))
        .limit(1);

      if (!raid) {
        return res.status(404).json({ error: "Raid not found or already defeated" });
      }

      const damage = Math.floor(attackPower * (0.8 + Math.random() * 0.4));
      const newHp = Math.max(0, raid.currentHp - damage);
      const isDefeated = newHp <= 0;

      await db.update(huntRaids)
        .set({
          currentHp: newHp,
          isActive: !isDefeated,
          defeatedAt: isDefeated ? new Date() : null,
        })
        .where(eq(huntRaids.id, raidId));

      await db.update(huntRaidParticipants)
        .set({
          totalDamage: sql`${huntRaidParticipants.totalDamage} + ${damage}`,
          attackCount: sql`${huntRaidParticipants.attackCount} + 1`,
        })
        .where(and(
          eq(huntRaidParticipants.raidId, raidId),
          eq(huntRaidParticipants.walletAddress, walletAddress),
        ));

      const [participant] = await db.select().from(huntRaidParticipants)
        .where(and(
          eq(huntRaidParticipants.raidId, raidId),
          eq(huntRaidParticipants.walletAddress, walletAddress),
        ))
        .limit(1);

      let rewards = null;
      if (isDefeated) {
        const contribution = Math.round((participant.totalDamage / raid.maxHp) * 100);
        rewards = {
          chyCoins: Math.floor(contribution * 10),
          xp: Math.floor(contribution * 5),
          contribution,
          guaranteedEgg: contribution >= 20,
        };

        if (rewards.guaranteedEgg) {
          await db.insert(huntEggs).values({
            walletAddress,
            rarity: raid.rarity,
            requiredDistance: EGG_DISTANCES[raid.rarity] || 5000,
          });
        }
      }

      res.json({
        success: true,
        damage,
        bossHP: newHp,
        yourTotalDamage: participant.totalDamage,
        isDefeated,
        rewards,
      });
    } catch (error) {
      console.error("Attack error:", error);
      res.status(500).json({ error: "Failed to attack" });
    }
  });

  app.post("/api/hunt/raids/spawn", async (req: Request, res: Response) => {
    try {
      const { latitude, longitude } = req.body;
      
      const rarityRoll = Math.random();
      const rarity = rarityRoll < 0.6 ? 'rare' : rarityRoll < 0.9 ? 'epic' : 'legendary';
      
      const hpMultipliers: Record<string, number> = {
        rare: 5000,
        epic: 15000,
        legendary: 50000,
      };

      const bossNames = ['Ancient Guardian', 'Shadow Beast', 'Storm Titan', 'Flame Wyrm'];
      const bossName = bossNames[Math.floor(Math.random() * bossNames.length)];

      const offset = getRandomOffset(500);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      const [raid] = await db.insert(huntRaids).values({
        latitude: (latitude + offset.lat).toString(),
        longitude: (longitude + offset.lng).toString(),
        bossName,
        bossClass: 'shadow',
        rarity,
        currentHp: hpMultipliers[rarity],
        maxHp: hpMultipliers[rarity],
        expiresAt,
      }).returning();

      res.json({ success: true, raid });
    } catch (error) {
      console.error("Spawn raid error:", error);
      res.status(500).json({ error: "Failed to spawn raid" });
    }
  });
}
