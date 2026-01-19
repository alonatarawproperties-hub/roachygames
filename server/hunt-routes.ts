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
  huntClaims,
  huntWeeklyLeaderboard,
  users,
} from "@shared/schema";
import { eq, and, gte, lte, sql, desc, isNull, asc } from "drizzle-orm";
import { logUserActivity } from "./economy-routes";
import {
  HUNT_CONFIG,
  getManilaDate,
  getManilaYesterday,
  getManilaWeekKey,
  calculateDistance,
  generateDeterministicNodes,
  selectEggRarity,
  computeLevelFromXp,
  getStreakXpMult,
  getStreakCapBonus,
  computeDailyCap,
  isHeatModeActive,
  shouldAwardStreakChest,
  getDailyCapForLevel,
  getWarmthCapForLevel,
  getUnlockedFeatures,
  getNextUnlock,
} from "./hunt-config";

const RARITY_RATES = {
  common: 0.85,
  rare: 0.12,
  epic: 0.028,
  legendary: 0.002,
};

const SPAWN_TYPE_RATES = {
  egg: 0.60,
  creature: 0.40,
};

const EGG_TEMPLATES = [
  { id: 'egg_common', name: 'Common Egg', roachyClass: 'egg', rarity: 'common', baseHp: 0, baseAtk: 0, baseDef: 0, baseSpd: 0 },
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
  { id: 'vikingbug', name: 'Viking Bug', roachyClass: 'tank', rarity: 'common', baseHp: 140, baseAtk: 55, baseDef: 90, baseSpd: 35 },
  { id: 'shadowblade', name: 'Shadowblade', roachyClass: 'assassin', rarity: 'common', baseHp: 65, baseAtk: 85, baseDef: 40, baseSpd: 95 },
  { id: 'frostmage', name: 'Frost Mage', roachyClass: 'mage', rarity: 'rare', baseHp: 60, baseAtk: 95, baseDef: 45, baseSpd: 70 },
  { id: 'aviator', name: 'Aviator', roachyClass: 'support', rarity: 'rare', baseHp: 80, baseAtk: 50, baseDef: 65, baseSpd: 75 },
  { id: 'royalmage', name: 'Royal Mage', roachyClass: 'mage', rarity: 'epic', baseHp: 70, baseAtk: 110, baseDef: 55, baseSpd: 80 },
  { id: 'warlord', name: 'Warlord', roachyClass: 'tank', rarity: 'epic', baseHp: 160, baseAtk: 70, baseDef: 100, baseSpd: 40 },
  { id: 'nightstalker', name: 'Nightstalker', roachyClass: 'assassin', rarity: 'epic', baseHp: 70, baseAtk: 105, baseDef: 45, baseSpd: 100 },
  { id: 'cosmicking', name: 'Cosmic King', roachyClass: 'tank', rarity: 'legendary', baseHp: 200, baseAtk: 90, baseDef: 120, baseSpd: 60 },
];

const EGG_DISTANCES: Record<string, number> = {
  common: 2000,
  rare: 5000,
  epic: 8000,
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

// ===== HYBRID SPAWN SYSTEM CONSTANTS =====
const HOME_RADIUS_M = 500;
const HOME_TARGET_MIN = 3;
const HOME_TARGET_MAX = 5;
const HOME_TTL_MIN = 20; // Fixed TTL for predictable cooldown
const HOME_TOPUP_COOLDOWN_MIN = 12; // Top-up every 12 minutes
const HOTDROP_MIN_DIST_M = 900;
const HOTDROP_MAX_DIST_M = 3000;
const HOTDROP_TTL_MIN = 12;
const HOTDROP_COOLDOWN_MIN = 8;

// ===== HYBRID SPAWN HELPER FUNCTIONS =====
function metersToLatDelta(m: number): number {
  return (m / 1000) / 111.32;
}

function metersToLngDelta(m: number, lat: number): number {
  return (m / 1000) / (111.32 * Math.cos(lat * Math.PI / 180));
}

function getCellBounds(lat: number, lng: number, cellMeters: number) {
  const latDelta = metersToLatDelta(cellMeters);
  const lngDelta = metersToLngDelta(cellMeters, lat);
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

function bearingDegrees(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const lat1 = fromLat * Math.PI / 180;
  const lat2 = toLat * Math.PI / 180;
  const dLng = (toLng - fromLng) * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
}

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000; // Earth radius in meters
  const lat1 = aLat * Math.PI / 180;
  const lat2 = bLat * Math.PI / 180;
  const dLat = (bLat - aLat) * Math.PI / 180;
  const dLng = (bLng - aLng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function randomOffsetInRing(minM: number, maxM: number, centerLat: number): { lat: number; lng: number } {
  const angle = Math.random() * 2 * Math.PI;
  const distance = minM + Math.random() * (maxM - minM);
  const latOffset = metersToLatDelta(distance) * Math.cos(angle);
  const lngOffset = metersToLngDelta(distance, centerLat) * Math.sin(angle);
  return { lat: latOffset, lng: lngOffset };
}

function selectHotDropRarity(): string {
  const roll = Math.random();
  if (roll < 0.05) return 'legendary';
  if (roll < 0.30) return 'epic';
  return 'rare';
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
      const now = new Date();

      // 1) Expire old spawns
      await db.update(wildCreatureSpawns)
        .set({ isActive: false })
        .where(and(
          eq(wildCreatureSpawns.isActive, true),
          lte(wildCreatureSpawns.expiresAt, now)
        ));

      // 2) Get home bounds (500m) for nearby spawns
      const homeBounds = getCellBounds(lat, lng, HOME_RADIUS_M);
      
      // 3) Fetch active uncaught spawns in home radius
      let homeSpawns = await db.select().from(wildCreatureSpawns)
        .where(and(
          eq(wildCreatureSpawns.isActive, true),
          isNull(wildCreatureSpawns.caughtByWallet),
          gte(wildCreatureSpawns.latitude, homeBounds.minLat.toString()),
          lte(wildCreatureSpawns.latitude, homeBounds.maxLat.toString()),
          gte(wildCreatureSpawns.longitude, homeBounds.minLng.toString()),
          lte(wildCreatureSpawns.longitude, homeBounds.maxLng.toString()),
          gte(wildCreatureSpawns.expiresAt, now),
        ))
        .limit(20);

      // Count home spawns vs hotdrops
      const homeEggCount = homeSpawns.filter(s => s.templateId === 'wild_egg_home' || s.templateId === 'wild_egg').length;
      
      // 4) HYBRID HOME TOP-UP
      let homeNextTopUpInSec: number | null = null;
      let homeCreated = 0;
      
      if (homeEggCount < HOME_TARGET_MIN) {
        // Check cooldown using last spawn's expiresAt
        const cooldownBounds = getCellBounds(lat, lng, 800);
        const [lastHomeSpawn] = await db.select().from(wildCreatureSpawns)
          .where(and(
            sql`${wildCreatureSpawns.templateId} IN ('wild_egg_home', 'wild_egg')`,
            gte(wildCreatureSpawns.latitude, cooldownBounds.minLat.toString()),
            lte(wildCreatureSpawns.latitude, cooldownBounds.maxLat.toString()),
            gte(wildCreatureSpawns.longitude, cooldownBounds.minLng.toString()),
            lte(wildCreatureSpawns.longitude, cooldownBounds.maxLng.toString()),
          ))
          .orderBy(desc(wildCreatureSpawns.expiresAt))
          .limit(1);

        let canTopUp = true;
        if (lastHomeSpawn && lastHomeSpawn.expiresAt) {
          const lastCreatedAt = new Date(lastHomeSpawn.expiresAt.getTime() - HOME_TTL_MIN * 60 * 1000);
          const cooldownEndAt = new Date(lastCreatedAt.getTime() + HOME_TOPUP_COOLDOWN_MIN * 60 * 1000);
          if (now < cooldownEndAt) {
            canTopUp = false;
            homeNextTopUpInSec = Math.ceil((cooldownEndAt.getTime() - now.getTime()) / 1000);
            console.log(`[HOME_COOLDOWN] remaining: ${homeNextTopUpInSec}s`);
          }
        }

        if (canTopUp) {
          const needed = Math.min(HOME_TARGET_MIN - homeEggCount, HOME_TARGET_MAX);
          for (let i = 0; i < needed; i++) {
            const radius = i === 0 ? 50 : 200;
            const offset = getRandomOffset(radius);
            const expiresAt = new Date(now.getTime() + HOME_TTL_MIN * 60 * 1000);
            const eggTemplate = selectEggByRarity();
            
            await db.insert(wildCreatureSpawns).values({
              latitude: (lat + offset.lat).toString(),
              longitude: (lng + offset.lng).toString(),
              templateId: 'wild_egg_home',
              name: 'Mystery Egg',
              creatureClass: 'egg',
              rarity: eggTemplate.rarity,
              baseHp: 0,
              baseAtk: 0,
              baseDef: 0,
              baseSpd: 0,
              containedTemplateId: null,
              expiresAt,
            });
            homeCreated++;
          }
          console.log(`[HOME_TOPUP] inserted ${homeCreated}`);
        }
      }

      // 5) HOT DROP ENSURE
      const hotdropBounds = getCellBounds(lat, lng, 3500);
      let hotdropMeta: { active: boolean; distanceM?: number; bearingDeg?: number; expiresInSec?: number; direction?: string } = { active: false };
      
      // Check for active hotdrop in region
      const [activeHotdrop] = await db.select().from(wildCreatureSpawns)
        .where(and(
          eq(wildCreatureSpawns.templateId, 'wild_egg_hotdrop'),
          eq(wildCreatureSpawns.isActive, true),
          isNull(wildCreatureSpawns.caughtByWallet),
          gte(wildCreatureSpawns.expiresAt, now),
          gte(wildCreatureSpawns.latitude, hotdropBounds.minLat.toString()),
          lte(wildCreatureSpawns.latitude, hotdropBounds.maxLat.toString()),
          gte(wildCreatureSpawns.longitude, hotdropBounds.minLng.toString()),
          lte(wildCreatureSpawns.longitude, hotdropBounds.maxLng.toString()),
        ))
        .limit(1);

      if (activeHotdrop) {
        const hdLat = parseFloat(activeHotdrop.latitude);
        const hdLng = parseFloat(activeHotdrop.longitude);
        const distM = haversineMeters(lat, lng, hdLat, hdLng);
        const bearing = bearingDegrees(lat, lng, hdLat, hdLng);
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const dirIndex = Math.round(bearing / 45) % 8;
        
        hotdropMeta = {
          active: true,
          distanceM: Math.round(distM),
          bearingDeg: Math.round(bearing),
          direction: directions[dirIndex],
          expiresInSec: Math.ceil((activeHotdrop.expiresAt!.getTime() - now.getTime()) / 1000),
        };
      } else {
        // Check cooldown for hotdrop
        const [lastHotdrop] = await db.select().from(wildCreatureSpawns)
          .where(and(
            eq(wildCreatureSpawns.templateId, 'wild_egg_hotdrop'),
            gte(wildCreatureSpawns.latitude, hotdropBounds.minLat.toString()),
            lte(wildCreatureSpawns.latitude, hotdropBounds.maxLat.toString()),
            gte(wildCreatureSpawns.longitude, hotdropBounds.minLng.toString()),
            lte(wildCreatureSpawns.longitude, hotdropBounds.maxLng.toString()),
          ))
          .orderBy(desc(wildCreatureSpawns.expiresAt))
          .limit(1);

        let canSpawnHotdrop = true;
        if (lastHotdrop && lastHotdrop.expiresAt) {
          const lastCreatedAt = new Date(lastHotdrop.expiresAt.getTime() - HOTDROP_TTL_MIN * 60 * 1000);
          const cooldownEndAt = new Date(lastCreatedAt.getTime() + HOTDROP_COOLDOWN_MIN * 60 * 1000);
          if (now < cooldownEndAt) {
            canSpawnHotdrop = false;
            console.log(`[HOTDROP_COOLDOWN] remaining: ${Math.ceil((cooldownEndAt.getTime() - now.getTime()) / 1000)}s`);
          }
        }

        if (canSpawnHotdrop) {
          const offset = randomOffsetInRing(HOTDROP_MIN_DIST_M, HOTDROP_MAX_DIST_M, lat);
          const expiresAt = new Date(now.getTime() + HOTDROP_TTL_MIN * 60 * 1000);
          const rarity = selectHotDropRarity();
          
          const [newHotdrop] = await db.insert(wildCreatureSpawns).values({
            latitude: (lat + offset.lat).toString(),
            longitude: (lng + offset.lng).toString(),
            templateId: 'wild_egg_hotdrop',
            name: 'Hot Drop Egg',
            creatureClass: 'egg',
            rarity,
            baseHp: 0,
            baseAtk: 0,
            baseDef: 0,
            baseSpd: 0,
            containedTemplateId: null,
            expiresAt,
          }).returning();
          
          console.log(`[HOTDROP] inserted 1 (${rarity})`);
          
          const hdLat = parseFloat(newHotdrop.latitude);
          const hdLng = parseFloat(newHotdrop.longitude);
          const distM = haversineMeters(lat, lng, hdLat, hdLng);
          const bearing = bearingDegrees(lat, lng, hdLat, hdLng);
          const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
          const dirIndex = Math.round(bearing / 45) % 8;
          
          hotdropMeta = {
            active: true,
            distanceM: Math.round(distM),
            bearingDeg: Math.round(bearing),
            direction: directions[dirIndex],
            expiresInSec: HOTDROP_TTL_MIN * 60,
          };
        }
      }

      // 6) Re-fetch home spawns after potential inserts
      if (homeCreated > 0) {
        homeSpawns = await db.select().from(wildCreatureSpawns)
          .where(and(
            eq(wildCreatureSpawns.isActive, true),
            isNull(wildCreatureSpawns.caughtByWallet),
            gte(wildCreatureSpawns.latitude, homeBounds.minLat.toString()),
            lte(wildCreatureSpawns.latitude, homeBounds.maxLat.toString()),
            gte(wildCreatureSpawns.longitude, homeBounds.minLng.toString()),
            lte(wildCreatureSpawns.longitude, homeBounds.maxLng.toString()),
            gte(wildCreatureSpawns.expiresAt, now),
          ))
          .limit(20);
      }

      // 7) Build response with meta
      const meta = {
        home: {
          target: HOME_TARGET_MIN,
          current: homeSpawns.length,
          nextTopUpInSec: homeNextTopUpInSec,
        },
        hotdrop: hotdropMeta,
      };

      res.json({ spawns: homeSpawns, meta });
    } catch (error) {
      console.error("Spawns fetch error:", error);
      res.status(500).json({ error: "Failed to fetch spawns" });
    }
  });

  // In-memory cooldown map for spawn ensure (60s per wallet)
  const spawnCooldownMap = (globalThis as any).__huntSpawnCooldown ??= new Map<string, number>();
  const SPAWN_TARGET = 12;
  const SPAWN_COOLDOWN_MS = 60_000;

  app.post("/api/hunt/spawn", async (req: Request, res: Response) => {
    try {
      const { latitude, longitude, walletAddress: bodyWallet } = req.body;
      const walletAddress = (req.headers["x-wallet-address"] as string) || bodyWallet;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ error: "Missing coordinates" });
      }

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const radiusKm = 500 / 1000;
      const latDelta = radiusKm / 111.32;
      const lngDelta = radiusKm / (111.32 * Math.cos(lat * Math.PI / 180));
      const now = new Date();

      // Expire old spawns first
      await db.update(wildCreatureSpawns)
        .set({ isActive: false })
        .where(and(
          eq(wildCreatureSpawns.isActive, true),
          lte(wildCreatureSpawns.expiresAt, now)
        ));

      // Count active uncaught spawns in radius
      const activeSpawns = await db.select().from(wildCreatureSpawns)
        .where(and(
          eq(wildCreatureSpawns.isActive, true),
          isNull(wildCreatureSpawns.caughtByWallet),
          gte(wildCreatureSpawns.latitude, (lat - latDelta).toString()),
          lte(wildCreatureSpawns.latitude, (lat + latDelta).toString()),
          gte(wildCreatureSpawns.longitude, (lng - lngDelta).toString()),
          lte(wildCreatureSpawns.longitude, (lng + lngDelta).toString()),
          gte(wildCreatureSpawns.expiresAt, now),
        ));

      const activeCount = activeSpawns.length;
      const missing = Math.max(0, SPAWN_TARGET - activeCount);

      // If already at target, return early
      if (missing === 0) {
        return res.json({ 
          success: true, 
          created: 0, 
          activeCount, 
          reason: "at_target",
          spawns: [] 
        });
      }

      // Check cooldown per wallet
      if (walletAddress) {
        const lastSpawn = spawnCooldownMap.get(walletAddress) || 0;
        if (Date.now() - lastSpawn < SPAWN_COOLDOWN_MS) {
          return res.json({ 
            success: true, 
            created: 0, 
            activeCount, 
            reason: "cooldown",
            cooldownRemaining: Math.ceil((SPAWN_COOLDOWN_MS - (Date.now() - lastSpawn)) / 1000),
            spawns: [] 
          });
        }
        spawnCooldownMap.set(walletAddress, Date.now());
      }

      // Create only the missing spawns
      const createdSpawns = [];
      for (let i = 0; i < missing; i++) {
        const radius = i === 0 ? 50 : 200;
        const offset = getRandomOffset(radius);
        const expiresAt = new Date(Date.now() + (15 + Math.random() * 15) * 60 * 1000);
        
        // Phase I: All spawns are pure Mystery Eggs (no hatching)
        const isMysteryEgg = HUNT_CONFIG.PHASE1_EGGS_ONLY || Math.random() < SPAWN_TYPE_RATES.egg;
        
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
          // Phase II only: Roachy Eggs that hatch into creatures
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
          latitude: (lat + offset.lat).toString(),
          longitude: (lng + offset.lng).toString(),
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

        createdSpawns.push(spawn);
      }

      console.log(`[EnsureSpawns] wallet=${walletAddress || 'anon'} activeCount=${activeCount} created=${createdSpawns.length}`);
      res.json({ 
        success: true, 
        created: createdSpawns.length, 
        activeCount: activeCount + createdSpawns.length,
        spawns: createdSpawns 
      });
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

      const manilaToday = getManilaDate();
      const manilaYest = getManilaYesterday();
      const isNewDay = economy.lastCatchDate !== manilaToday;
      let newStreak = economy.currentStreak;

      if (isNewDay) {
        newStreak = economy.lastCatchDate === manilaYest ? economy.currentStreak + 1 : 1;
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
          lastCatchDate: manilaToday,
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

      const user = await db.query.users.findFirst({
        where: eq(users.walletAddress, walletAddress),
      });
      if (user) {
        await logUserActivity(
          user.id,
          "catch",
          "Caught Roachy",
          `${spawn.rarity} ${spawn.creatureClass}: ${creatureName}`,
          xpGain,
          "xp"
        );
      }

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

      const user = await db.query.users.findFirst({
        where: eq(users.walletAddress, walletAddress),
      });
      if (user) {
        await logUserActivity(
          user.id,
          "hatch",
          "Egg Hatched",
          `${rarity} ${template.roachyClass}: ${template.name}`,
          50,
          "xp"
        );
      }

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

  // ==================== PHASE I ENDPOINTS ====================

  app.get("/api/hunt/nodes", async (req: Request, res: Response) => {
    try {
      const { latitude, longitude, walletAddress } = req.query;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ error: "Missing coordinates" });
      }

      const lat = parseFloat(latitude as string);
      const lon = parseFloat(longitude as string);
      const dayKey = getManilaDate();
      
      const nodes = generateDeterministicNodes(lat, lon, dayKey);
      
      let claimedNodeIds: string[] = [];
      if (walletAddress) {
        const claims = await db.select({ nodeId: huntClaims.nodeId })
          .from(huntClaims)
          .where(and(
            eq(huntClaims.walletAddress, walletAddress as string),
            eq(huntClaims.dayKey, dayKey)
          ));
        claimedNodeIds = claims.map(c => c.nodeId);
      }
      
      const nodesWithStatus = nodes.map(node => ({
        ...node,
        claimed: claimedNodeIds.includes(node.nodeId),
      }));

      res.json({ 
        nodes: nodesWithStatus,
        dayKey,
        totalNodes: nodes.length,
        claimedCount: claimedNodeIds.length,
      });
    } catch (error) {
      console.error("Nodes fetch error:", error);
      res.status(500).json({ error: "Failed to fetch nodes" });
    }
  });

  app.post("/api/hunt/phase1/claim", async (req: Request, res: Response) => {
    try {
      const { walletAddress, nodeId, lat, lon, quality } = req.body;
      
      if (!walletAddress || !nodeId || lat === undefined || lon === undefined || !quality) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (!['perfect', 'great', 'good'].includes(quality)) {
        return res.status(400).json({ error: "Invalid quality" });
      }

      const dayKey = getManilaDate();
      const weekKey = getManilaWeekKey();
      
      const existingClaim = await db.select()
        .from(huntClaims)
        .where(and(
          eq(huntClaims.walletAddress, walletAddress),
          eq(huntClaims.nodeId, nodeId),
          eq(huntClaims.dayKey, dayKey)
        ))
        .limit(1);

      if (existingClaim.length > 0) {
        return res.status(400).json({ error: "Node already claimed today" });
      }

      let [economy] = await db.select().from(huntEconomyStats)
        .where(eq(huntEconomyStats.walletAddress, walletAddress))
        .limit(1);

      if (!economy) {
        [economy] = await db.insert(huntEconomyStats).values({
          walletAddress,
          energy: 30,
          maxEnergy: 30,
        }).returning();
      }

      const isNewDay = economy.lastCatchDate !== dayKey;
      const huntsToday = isNewDay ? 0 : economy.catchesToday;
      
      const manilaYesterday = getManilaYesterday();
      const currentStreak = isNewDay 
        ? (economy.lastCatchDate === manilaYesterday ? economy.currentStreak + 1 : 1)
        : economy.currentStreak;
      
      const currentLevel = computeLevelFromXp(economy.hunterXp || 0).level;
      const dailyCap = computeDailyCap(currentStreak, currentLevel);
      
      if (huntsToday >= dailyCap) {
        return res.status(400).json({ error: "Daily hunt limit reached" });
      }

      if (economy.lastClaimAt) {
        const secondsSinceLastClaim = (Date.now() - new Date(economy.lastClaimAt).getTime()) / 1000;
        if (secondsSinceLastClaim < HUNT_CONFIG.COOLDOWN_SECONDS) {
          return res.status(400).json({ 
            error: `Cooldown active. Wait ${Math.ceil(HUNT_CONFIG.COOLDOWN_SECONDS - secondsSinceLastClaim)} seconds` 
          });
        }
      }

      const nodes = generateDeterministicNodes(lat, lon, dayKey);
      const targetNode = nodes.find(n => n.nodeId === nodeId);
      
      if (!targetNode) {
        return res.status(400).json({ error: "Invalid node" });
      }

      const distance = calculateDistance(lat, lon, targetNode.lat, targetNode.lon);
      if (distance > HUNT_CONFIG.DISTANCE_MAX_METERS) {
        return res.status(400).json({ error: `Too far from node. Distance: ${Math.round(distance)}m` });
      }

      const heatModeActive = isHeatModeActive(economy.heatModeUntil);
      const pityCounters = {
        sinceRare: (economy.catchesSinceRare ?? 0) + 1,
        sinceEpic: (economy.catchesSinceEpic ?? 0) + 1,
        sinceLegendary: (economy.catchesSinceLegendary ?? 0) + 1,
      };

      const eggRarity = selectEggRarity(pityCounters, heatModeActive);
      
      const xpAwarded = HUNT_CONFIG.XP_REWARDS[quality] || 30;
      const pointsAwarded = HUNT_CONFIG.POINTS_REWARDS[quality] || 30;
      const isPerfect = quality === 'perfect';

      await db.insert(huntClaims).values({
        walletAddress,
        nodeId,
        latitude: lat.toString(),
        longitude: lon.toString(),
        quality,
        eggRarity,
        xpAwarded,
        pointsAwarded,
        dayKey,
      });

      let newSinceRare = pityCounters.sinceRare;
      let newSinceEpic = pityCounters.sinceEpic;
      let newSinceLegendary = pityCounters.sinceLegendary;
      
      if (eggRarity === 'legendary') {
        newSinceLegendary = 0;
        newSinceEpic = 0;
        newSinceRare = 0;
      } else if (eggRarity === 'epic') {
        newSinceEpic = 0;
        newSinceRare = 0;
      } else if (eggRarity === 'rare') {
        newSinceRare = 0;
      }

      // Safety clamp: prevent counters from exceeding thresholds
      newSinceRare = Math.min(newSinceRare, HUNT_CONFIG.PITY_RARE);
      newSinceEpic = Math.min(newSinceEpic, HUNT_CONFIG.PITY_EPIC);
      newSinceLegendary = Math.min(newSinceLegendary, HUNT_CONFIG.PITY_LEGENDARY);

      let newStreak = economy.currentStreak;
      if (isNewDay) {
        newStreak = economy.lastCatchDate === manilaYesterday ? economy.currentStreak + 1 : 1;
      }

      const streakXpMult = getStreakXpMult(newStreak);
      const xpBase = HUNT_CONFIG.XP_REWARDS[quality] || 30;
      const isFirstCatchToday = isNewDay || huntsToday === 0;
      const firstCatchBonus = isFirstCatchToday ? HUNT_CONFIG.FIRST_CATCH_BONUS_XP : 0;
      const xpFinal = Math.round((xpBase + firstCatchBonus) * streakXpMult);
      
      const newHunterXp = (economy.hunterXp || 0) + xpFinal;
      const levelInfo = computeLevelFromXp(newHunterXp);
      const newHunterLevel = levelInfo.level;

      let warmthBonus = 0;
      if (isPerfect) {
        warmthBonus = HUNT_CONFIG.WARMTH.PERFECT_CATCH_BONUS_WARMTH;
      }

      let streakChestReward = { warmth: 0, xp: 0 };
      const lastChestDay = economy.lastStreakChestDay || 0;
      if (newStreak > lastChestDay && shouldAwardStreakChest(newStreak)) {
        streakChestReward = HUNT_CONFIG.STREAK.CHEST_REWARD;
      }

      const eggField = `egg${eggRarity.charAt(0).toUpperCase() + eggRarity.slice(1)}` as 
        'eggCommon' | 'eggRare' | 'eggEpic' | 'eggLegendary';
      const currentEggCount = economy[eggField] || 0;

      const currentWeekKey = economy.currentWeekKey;
      const isNewWeek = currentWeekKey !== weekKey;

      const totalXpGain = xpFinal + streakChestReward.xp;
      const totalWarmthGain = warmthBonus + streakChestReward.warmth;
      const finalHunterXp = (economy.hunterXp || 0) + totalXpGain;
      const finalLevelInfo = computeLevelFromXp(finalHunterXp);

      await db.update(huntEconomyStats)
        .set({
          catchesToday: huntsToday + 1,
          lastCatchDate: dayKey,
          lastClaimAt: new Date(),
          catchesSinceRare: newSinceRare,
          catchesSinceEpic: newSinceEpic,
          catchesSinceLegendary: newSinceLegendary,
          [eggField]: currentEggCount + 1,
          hunterXp: finalHunterXp,
          hunterLevel: finalLevelInfo.level,
          warmth: (economy.warmth || 0) + totalWarmthGain,
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, economy.longestStreak),
          lastStreakChestDay: streakChestReward.warmth > 0 ? newStreak : (economy.lastStreakChestDay || 0),
          pointsThisWeek: isNewWeek ? pointsAwarded : (economy.pointsThisWeek || 0) + pointsAwarded,
          perfectsThisWeek: isNewWeek ? (isPerfect ? 1 : 0) : (economy.perfectsThisWeek || 0) + (isPerfect ? 1 : 0),
          currentWeekKey: weekKey,
          updatedAt: new Date(),
        })
        .where(eq(huntEconomyStats.walletAddress, walletAddress));

      await db.insert(huntWeeklyLeaderboard)
        .values({
          weekKey,
          walletAddress,
          points: pointsAwarded,
          perfects: isPerfect ? 1 : 0,
          eggsTotal: 1,
        })
        .onConflictDoUpdate({
          target: [huntWeeklyLeaderboard.weekKey, huntWeeklyLeaderboard.walletAddress],
          set: {
            points: sql`${huntWeeklyLeaderboard.points} + ${pointsAwarded}`,
            perfects: sql`${huntWeeklyLeaderboard.perfects} + ${isPerfect ? 1 : 0}`,
            eggsTotal: sql`${huntWeeklyLeaderboard.eggsTotal} + 1`,
            updatedAt: new Date(),
          },
        });

      const recentClaims = await db.select({
        eggRarity: huntClaims.eggRarity,
        quality: huntClaims.quality,
      })
        .from(huntClaims)
        .where(eq(huntClaims.walletAddress, walletAddress))
        .orderBy(desc(huntClaims.createdAt))
        .limit(5);

      res.json({
        success: true,
        eggRarity,
        xpAwarded: totalXpGain,
        pointsAwarded,
        quality,
        huntsToday: huntsToday + 1,
        dailyCap,
        streakCount: newStreak,
        streakXpMult,
        firstCatchBonus: isFirstCatchToday ? firstCatchBonus : 0,
        streakChestAwarded: streakChestReward.warmth > 0,
        heatModeActive,
        eggs: {
          common: eggRarity === 'common' ? currentEggCount + 1 : (economy.eggCommon || 0),
          rare: eggRarity === 'rare' ? currentEggCount + 1 : (economy.eggRare || 0),
          epic: eggRarity === 'epic' ? currentEggCount + 1 : (economy.eggEpic || 0),
          legendary: eggRarity === 'legendary' ? currentEggCount + 1 : (economy.eggLegendary || 0),
        },
        pity: {
          rareIn: Math.max(0, HUNT_CONFIG.PITY_RARE - newSinceRare),
          epicIn: Math.max(0, HUNT_CONFIG.PITY_EPIC - newSinceEpic),
          legendaryIn: Math.max(0, HUNT_CONFIG.PITY_LEGENDARY - newSinceLegendary),
        },
        warmth: (economy.warmth || 0) + totalWarmthGain,
        hunterLevel: finalLevelInfo.level,
        hunterXp: finalHunterXp,
        level: finalLevelInfo.level,
        xpThisLevel: finalLevelInfo.xpIntoLevel,
        xpToNextLevel: finalLevelInfo.xpForNext,
        recentDrops: recentClaims.map(c => c.eggRarity),
      });
    } catch (error) {
      console.error("Phase1 claim error:", error);
      res.status(500).json({ error: "Failed to claim" });
    }
  });

  // Phase I spawn-based claim - works with wildCreatureSpawns table
  app.post("/api/hunt/phase1/claim-spawn", async (req: Request, res: Response) => {
    console.log(`[Phase1 Claim] ROUTE HIT - body:`, JSON.stringify(req.body));
    try {
      const { walletAddress, spawnId, lat, lon, quality } = req.body;
      console.log(`[Phase1 Claim] Parsed: wallet=${walletAddress}, spawn=${spawnId}, quality=${quality}`);
      
      if (!walletAddress || !spawnId || lat === undefined || lon === undefined || !quality) {
        console.log(`[Phase1 Claim] Missing fields: wallet=${!!walletAddress}, spawn=${!!spawnId}, lat=${lat !== undefined}, lon=${lon !== undefined}, quality=${!!quality}`);
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (!['perfect', 'great', 'good'].includes(quality)) {
        return res.status(400).json({ error: "Invalid quality" });
      }

      // Verify spawn exists and is not already caught
      const [spawn] = await db.select()
        .from(wildCreatureSpawns)
        .where(and(
          eq(wildCreatureSpawns.id, spawnId),
          eq(wildCreatureSpawns.isActive, true),
          isNull(wildCreatureSpawns.caughtByWallet)
        ))
        .limit(1);

      if (!spawn) {
        return res.status(400).json({ error: "Spawn not found or already caught" });
      }

      const dayKey = getManilaDate();
      const weekKey = getManilaWeekKey();

      let [economy] = await db.select().from(huntEconomyStats)
        .where(eq(huntEconomyStats.walletAddress, walletAddress))
        .limit(1);

      if (!economy) {
        [economy] = await db.insert(huntEconomyStats).values({
          walletAddress,
          energy: 30,
          maxEnergy: 30,
        }).returning();
      }

      const isNewDay = economy.lastCatchDate !== dayKey;
      const huntsToday = isNewDay ? 0 : economy.catchesToday;
      
      const manilaYest = getManilaYesterday();
      let newStreak = economy.currentStreak;
      if (isNewDay) {
        newStreak = economy.lastCatchDate === manilaYest ? economy.currentStreak + 1 : 1;
      }
      
      const currentLevel = computeLevelFromXp(economy.hunterXp || 0).level;
      const dailyCap = computeDailyCap(newStreak, currentLevel);
      
      if (huntsToday >= dailyCap) {
        return res.status(400).json({ error: "Daily hunt limit reached" });
      }

      const heatModeActive = isHeatModeActive(economy.heatModeUntil);
      const pityCounters = {
        sinceRare: (economy.catchesSinceRare ?? 0) + 1,
        sinceEpic: (economy.catchesSinceEpic ?? 0) + 1,
        sinceLegendary: (economy.catchesSinceLegendary ?? 0) + 1,
      };

      // Check if pity threshold is reached (guaranteed rarity)
      type EggRarity = 'common' | 'rare' | 'epic' | 'legendary';
      const guaranteed: EggRarity | null =
        pityCounters.sinceLegendary >= HUNT_CONFIG.PITY_LEGENDARY ? 'legendary'
        : pityCounters.sinceEpic >= HUNT_CONFIG.PITY_EPIC ? 'epic'
        : pityCounters.sinceRare >= HUNT_CONFIG.PITY_RARE ? 'rare'
        : null;

      // Use spawn preset rarity if present, otherwise roll normally
      let rawRarity: EggRarity = (spawn.rarity as EggRarity) || selectEggRarity(pityCounters, heatModeActive);

      // Normalize any legacy uncommon value
      rawRarity = (rawRarity === ('uncommon' as any) ? 'common' : rawRarity) as EggRarity;

      // ✅ If pity threshold is reached, override to the guaranteed tier
      const eggRarity: EggRarity = guaranteed ?? rawRarity;
      
      const pointsAwarded = HUNT_CONFIG.POINTS_REWARDS[quality] || 30;
      const isPerfect = quality === 'perfect';

      await db.update(wildCreatureSpawns)
        .set({
          caughtByWallet: walletAddress,
          caughtAt: new Date(),
          isActive: false,
        })
        .where(eq(wildCreatureSpawns.id, spawnId));

      let newSinceRare = pityCounters.sinceRare;
      let newSinceEpic = pityCounters.sinceEpic;
      let newSinceLegendary = pityCounters.sinceLegendary;
      
      if (eggRarity === 'legendary') {
        newSinceLegendary = 0;
        newSinceEpic = 0;
        newSinceRare = 0;
      } else if (eggRarity === 'epic') {
        newSinceEpic = 0;
        newSinceRare = 0;
      } else if (eggRarity === 'rare') {
        newSinceRare = 0;
      }

      // Safety clamp: prevent counters from exceeding thresholds
      newSinceRare = Math.min(newSinceRare, HUNT_CONFIG.PITY_RARE);
      newSinceEpic = Math.min(newSinceEpic, HUNT_CONFIG.PITY_EPIC);
      newSinceLegendary = Math.min(newSinceLegendary, HUNT_CONFIG.PITY_LEGENDARY);

      const streakXpMult = getStreakXpMult(newStreak);
      const xpBase = HUNT_CONFIG.XP_REWARDS[quality] || 30;
      const isFirstCatchToday = isNewDay || huntsToday === 0;
      const firstCatchBonus = isFirstCatchToday ? HUNT_CONFIG.FIRST_CATCH_BONUS_XP : 0;
      const xpFinal = Math.round((xpBase + firstCatchBonus) * streakXpMult);

      let warmthBonus = 0;
      if (isPerfect) {
        warmthBonus = HUNT_CONFIG.WARMTH.PERFECT_CATCH_BONUS_WARMTH;
      }

      let streakChestReward = { warmth: 0, xp: 0 };
      const lastChestDay = economy.lastStreakChestDay || 0;
      if (newStreak > lastChestDay && shouldAwardStreakChest(newStreak)) {
        streakChestReward = HUNT_CONFIG.STREAK.CHEST_REWARD;
      }

      const eggField = `egg${eggRarity.charAt(0).toUpperCase() + eggRarity.slice(1)}` as 
        'eggCommon' | 'eggRare' | 'eggEpic' | 'eggLegendary';
      const currentEggCount = economy[eggField] || 0;

      const currentWeekKey = economy.currentWeekKey;
      const isNewWeek = currentWeekKey !== weekKey;

      const totalXpGain = xpFinal + streakChestReward.xp;
      const totalWarmthGain = warmthBonus + streakChestReward.warmth;
      const finalHunterXp = (economy.hunterXp || 0) + totalXpGain;
      const finalLevelInfo = computeLevelFromXp(finalHunterXp);

      await db.update(huntEconomyStats)
        .set({
          catchesToday: huntsToday + 1,
          lastCatchDate: dayKey,
          lastClaimAt: new Date(),
          catchesSinceRare: newSinceRare,
          catchesSinceEpic: newSinceEpic,
          catchesSinceLegendary: newSinceLegendary,
          [eggField]: currentEggCount + 1,
          hunterXp: finalHunterXp,
          hunterLevel: finalLevelInfo.level,
          warmth: (economy.warmth || 0) + totalWarmthGain,
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, economy.longestStreak),
          lastStreakChestDay: streakChestReward.warmth > 0 ? newStreak : (economy.lastStreakChestDay || 0),
          pointsThisWeek: isNewWeek ? pointsAwarded : (economy.pointsThisWeek || 0) + pointsAwarded,
          perfectsThisWeek: isNewWeek ? (isPerfect ? 1 : 0) : (economy.perfectsThisWeek || 0) + (isPerfect ? 1 : 0),
          currentWeekKey: weekKey,
          updatedAt: new Date(),
        })
        .where(eq(huntEconomyStats.walletAddress, walletAddress));

      // Update weekly leaderboard
      await db.insert(huntWeeklyLeaderboard)
        .values({
          weekKey,
          walletAddress,
          points: pointsAwarded,
          perfects: isPerfect ? 1 : 0,
          eggsTotal: 1,
        })
        .onConflictDoUpdate({
          target: [huntWeeklyLeaderboard.weekKey, huntWeeklyLeaderboard.walletAddress],
          set: {
            points: sql`${huntWeeklyLeaderboard.points} + ${pointsAwarded}`,
            perfects: sql`${huntWeeklyLeaderboard.perfects} + ${isPerfect ? 1 : 0}`,
            eggsTotal: sql`${huntWeeklyLeaderboard.eggsTotal} + 1`,
            updatedAt: new Date(),
          },
        });

      // Calculate pity values with Math.max to never go negative
      const pityRareIn = Math.max(0, HUNT_CONFIG.PITY_RARE - newSinceRare);
      const pityEpicIn = Math.max(0, HUNT_CONFIG.PITY_EPIC - newSinceEpic);
      const pityLegendaryIn = Math.max(0, HUNT_CONFIG.PITY_LEGENDARY - newSinceLegendary);

      console.log(`[Phase1-v16] ${walletAddress} claimed spawn ${spawnId}: ${eggRarity} egg (guaranteed=${guaranteed}, rawRarity=${rawRarity}), pity counters: rare=${newSinceRare}/${HUNT_CONFIG.PITY_RARE}, epic=${newSinceEpic}/${HUNT_CONFIG.PITY_EPIC}, legendary=${newSinceLegendary}/${HUNT_CONFIG.PITY_LEGENDARY}, response pity: rareIn=${pityRareIn}, epicIn=${pityEpicIn}, legendaryIn=${pityLegendaryIn}`);

      res.json({
        success: true,
        eggRarity,
        xpAwarded: xpFinal,
        pointsAwarded,
        quality,
        huntsToday: huntsToday + 1,
        dailyCap,
        streakCount: newStreak,
        streakXpMult,
        firstCatchBonus: isFirstCatchToday ? firstCatchBonus : 0,
        streakChestAwarded: streakChestReward.warmth > 0,
        heatModeActive,
        eggs: {
          common: eggRarity === 'common' ? currentEggCount + 1 : (economy.eggCommon || 0),
          rare: eggRarity === 'rare' ? currentEggCount + 1 : (economy.eggRare || 0),
          epic: eggRarity === 'epic' ? currentEggCount + 1 : (economy.eggEpic || 0),
          legendary: eggRarity === 'legendary' ? currentEggCount + 1 : (economy.eggLegendary || 0),
        },
        pity: {
          rareIn: pityRareIn,
          epicIn: pityEpicIn,
          legendaryIn: pityLegendaryIn,
        },
        warmth: (economy.warmth || 0) + totalWarmthGain,
        hunterLevel: finalLevelInfo.level,
        hunterXp: finalHunterXp,
        level: finalLevelInfo.level,
        xpThisLevel: finalLevelInfo.xpIntoLevel,
        xpToNextLevel: finalLevelInfo.xpForNext,
      });
    } catch (error: any) {
      console.error("Phase1 spawn claim error:", error);
      // v15: Return actual error message for debugging
      const errorMessage = error?.message || String(error) || "Unknown server error";
      res.status(500).json({ error: `Server error: ${errorMessage}` });
    }
  });

  app.post("/api/hunt/recycle", async (req: Request, res: Response) => {
    try {
      const { walletAddress, amount } = req.body;
      
      if (!walletAddress || !amount || amount < 1) {
        return res.status(400).json({ error: "Invalid request" });
      }

      const [economy] = await db.select().from(huntEconomyStats)
        .where(eq(huntEconomyStats.walletAddress, walletAddress))
        .limit(1);

      if (!economy) {
        return res.status(404).json({ error: "Player not found" });
      }

      const currentCommon = economy.eggCommon || 0;
      if (currentCommon < amount) {
        return res.status(400).json({ error: `Not enough common eggs. Have: ${currentCommon}` });
      }

      const warmthGained = amount * HUNT_CONFIG.RECYCLE_COMMON_TO_WARMTH;
      
      await db.update(huntEconomyStats)
        .set({
          eggCommon: currentCommon - amount,
          warmth: (economy.warmth || 0) + warmthGained,
          updatedAt: new Date(),
        })
        .where(eq(huntEconomyStats.walletAddress, walletAddress));

      await db.insert(huntActivityLog).values({
        walletAddress,
        activityType: 'recycle',
        details: JSON.stringify({ amount, warmthGained }),
      });

      res.json({
        success: true,
        recycled: amount,
        warmthGained,
        newWarmth: (economy.warmth || 0) + warmthGained,
        eggs: {
          common: currentCommon - amount,
          rare: economy.eggRare || 0,
          epic: economy.eggEpic || 0,
          legendary: economy.eggLegendary || 0,
        },
      });
    } catch (error) {
      console.error("Recycle error:", error);
      res.status(500).json({ error: "Failed to recycle" });
    }
  });

  app.post("/api/hunt/warmth/spend", async (req: Request, res: Response) => {
    try {
      const { walletAddress, action } = req.body;
      
      if (!walletAddress || !action) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const validActions = ['tracker_ping', 'second_attempt', 'heat_mode'];
      if (!validActions.includes(action)) {
        return res.status(400).json({ error: "Invalid action. Must be: tracker_ping, second_attempt, or heat_mode" });
      }

      const [economy] = await db.select().from(huntEconomyStats)
        .where(eq(huntEconomyStats.walletAddress, walletAddress))
        .limit(1);

      if (!economy) {
        return res.status(404).json({ error: "Player not found" });
      }

      const costs: Record<string, number> = {
        tracker_ping: HUNT_CONFIG.WARMTH.SPEND.TRACKER_PING,
        second_attempt: HUNT_CONFIG.WARMTH.SPEND.SECOND_ATTEMPT,
        heat_mode: HUNT_CONFIG.WARMTH.SPEND.HEAT_MODE,
      };

      const cost = costs[action];
      const currentWarmth = economy.warmth || 0;

      if (currentWarmth < cost) {
        return res.status(400).json({ error: `Not enough warmth. Need ${cost}, have ${currentWarmth}` });
      }

      let updateData: any = {
        warmth: currentWarmth - cost,
        updatedAt: new Date(),
      };

      let effectDetails: any = { action, cost };

      if (action === 'heat_mode') {
        const heatModeUntil = new Date(Date.now() + HUNT_CONFIG.WARMTH.HEAT_MODE_MINUTES * 60 * 1000);
        updateData.heatModeUntil = heatModeUntil;
        effectDetails.heatModeUntil = heatModeUntil.toISOString();
        effectDetails.durationMinutes = HUNT_CONFIG.WARMTH.HEAT_MODE_MINUTES;
      }

      await db.update(huntEconomyStats)
        .set(updateData)
        .where(eq(huntEconomyStats.walletAddress, walletAddress));

      await db.insert(huntActivityLog).values({
        walletAddress,
        activityType: 'warmth_spend',
        details: JSON.stringify(effectDetails),
      });

      res.json({
        success: true,
        action,
        warmthSpent: cost,
        newWarmth: currentWarmth - cost,
        ...effectDetails,
      });
    } catch (error) {
      console.error("Warmth spend error:", error);
      res.status(500).json({ error: "Failed to spend warmth" });
    }
  });

  app.post("/api/hunt/fuse", async (req: Request, res: Response) => {
    try {
      const { walletAddress, rarity, times = 1 } = req.body;
      
      if (!walletAddress || !rarity || !['common', 'rare', 'epic'].includes(rarity)) {
        return res.status(400).json({ error: "Invalid request" });
      }

      const [economy] = await db.select().from(huntEconomyStats)
        .where(eq(huntEconomyStats.walletAddress, walletAddress))
        .limit(1);

      if (!economy) {
        return res.status(404).json({ error: "Player not found" });
      }

      const sourceField = `egg${rarity.charAt(0).toUpperCase() + rarity.slice(1)}` as 
        'eggCommon' | 'eggRare' | 'eggEpic';
      const targetRarity = rarity === 'common' ? 'rare' : rarity === 'rare' ? 'epic' : 'legendary';
      const targetField = `egg${targetRarity.charAt(0).toUpperCase() + targetRarity.slice(1)}` as 
        'eggRare' | 'eggEpic' | 'eggLegendary';

      const currentSource = economy[sourceField] || 0;
      const required = times * HUNT_CONFIG.FUSE_RATIO;
      
      if (currentSource < required) {
        return res.status(400).json({ 
          error: `Not enough ${rarity} eggs. Need ${required}, have ${currentSource}` 
        });
      }

      const currentTarget = economy[targetField] || 0;

      await db.update(huntEconomyStats)
        .set({
          [sourceField]: currentSource - required,
          [targetField]: currentTarget + times,
          updatedAt: new Date(),
        })
        .where(eq(huntEconomyStats.walletAddress, walletAddress));

      await db.insert(huntActivityLog).values({
        walletAddress,
        activityType: 'fuse',
        details: JSON.stringify({ sourceRarity: rarity, targetRarity, times, eggsUsed: required }),
      });

      res.json({
        success: true,
        fused: times,
        sourceRarity: rarity,
        targetRarity,
        eggsUsed: required,
        eggs: {
          common: rarity === 'common' ? currentSource - required : (economy.eggCommon || 0),
          rare: rarity === 'rare' ? currentSource - required : (targetRarity === 'rare' ? currentTarget + times : (economy.eggRare || 0)),
          epic: rarity === 'epic' ? currentSource - required : (targetRarity === 'epic' ? currentTarget + times : (economy.eggEpic || 0)),
          legendary: targetRarity === 'legendary' ? currentTarget + times : (economy.eggLegendary || 0),
        },
      });
    } catch (error) {
      console.error("Fuse error:", error);
      res.status(500).json({ error: "Failed to fuse" });
    }
  });

  app.get("/api/hunt/weekly-leaderboard", async (req: Request, res: Response) => {
    try {
      const weekKey = getManilaWeekKey();
      
      const leaderboard = await db.select()
        .from(huntWeeklyLeaderboard)
        .where(eq(huntWeeklyLeaderboard.weekKey, weekKey))
        .orderBy(desc(huntWeeklyLeaderboard.points))
        .limit(100);

      const rankedLeaderboard = leaderboard.map((entry, index) => ({
        rank: index + 1,
        walletAddress: entry.walletAddress,
        displayName: entry.displayName,
        points: entry.points,
        perfects: entry.perfects,
        eggsTotal: entry.eggsTotal,
      }));

      res.json({
        weekKey,
        leaderboard: rankedLeaderboard,
      });
    } catch (error) {
      console.error("Weekly leaderboard error:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  app.get("/api/hunt/me", async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.query;
      
      if (!walletAddress) {
        return res.status(400).json({ error: "Missing wallet address" });
      }

      let [economy] = await db.select().from(huntEconomyStats)
        .where(eq(huntEconomyStats.walletAddress, walletAddress as string))
        .limit(1);

      if (!economy) {
        [economy] = await db.insert(huntEconomyStats).values({
          walletAddress: walletAddress as string,
          energy: 30,
          maxEnergy: 30,
        }).returning();
      }

      const dayKey = getManilaDate();
      const weekKey = getManilaWeekKey();
      const isNewDay = economy.lastCatchDate !== dayKey;
      
      const recentClaims = await db.select({
        eggRarity: huntClaims.eggRarity,
      })
        .from(huntClaims)
        .where(eq(huntClaims.walletAddress, walletAddress as string))
        .orderBy(desc(huntClaims.createdAt))
        .limit(5);

      const currentStreak = economy.currentStreak || 0;
      const hunterXp = economy.hunterXp || 0;
      const levelInfo = computeLevelFromXp(hunterXp);
      const level = levelInfo.level;
      
      const baseDailyCap = getDailyCapForLevel(level);
      const streakBonus = getStreakCapBonus(currentStreak);
      const dailyCap = baseDailyCap + streakBonus;
      
      const warmthCap = getWarmthCapForLevel(level);
      const streakXpMult = getStreakXpMult(currentStreak);
      const heatModeActive = isHeatModeActive(economy.heatModeUntil);
      const heatModeUntil = economy.heatModeUntil ? new Date(economy.heatModeUntil).toISOString() : null;
      const unlockedFeatures = getUnlockedFeatures(level);
      const nextUnlock = getNextUnlock(level);
      
      res.json({
        walletAddress,
        huntsToday: isNewDay ? 0 : economy.catchesToday,
        dailyCap,
        dailyCapBase: baseDailyCap,
        dailyCapStreakBonus: streakBonus,
        streakCount: currentStreak,
        longestStreak: economy.longestStreak,
        streakXpMult,
        heatModeActive,
        heatModeUntil,
        eggs: {
          common: economy.eggCommon || 0,
          rare: economy.eggRare || 0,
          epic: economy.eggEpic || 0,
          legendary: economy.eggLegendary || 0,
        },
        pity: {
          rareIn: Math.max(0, HUNT_CONFIG.PITY_RARE - economy.catchesSinceRare),
          epicIn: Math.max(0, HUNT_CONFIG.PITY_EPIC - economy.catchesSinceEpic),
          legendaryIn: Math.max(0, HUNT_CONFIG.PITY_LEGENDARY - (economy.catchesSinceLegendary || 0)),
        },
        warmth: economy.warmth || 0,
        warmthCap,
        level,
        xp: hunterXp,
        xpThisLevel: levelInfo.xpIntoLevel,
        xpToNextLevel: levelInfo.xpForNext,
        currentLevelStartXp: levelInfo.currentLevelStartXp,
        nextLevelTotalXp: levelInfo.nextLevelTotalXp,
        unlockedFeatures,
        nextUnlock,
        warmthShopCosts: {
          trackerPing: HUNT_CONFIG.WARMTH.SPEND.TRACKER_PING,
          secondAttempt: HUNT_CONFIG.WARMTH.SPEND.SECOND_ATTEMPT,
          heatMode: HUNT_CONFIG.WARMTH.SPEND.HEAT_MODE,
        },
        hunterLevel: level,
        hunterXp,
        boostTokens: economy.boostTokens || 0,
        recentDrops: recentClaims.map(c => c.eggRarity),
        weekKey,
        pointsThisWeek: economy.currentWeekKey === weekKey ? (economy.pointsThisWeek || 0) : 0,
        perfectsThisWeek: economy.currentWeekKey === weekKey ? (economy.perfectsThisWeek || 0) : 0,
      });
    } catch (error) {
      console.error("Hunt me error:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.post("/api/hunt/inventory/fuse", async (req: Request, res: Response) => {
    try {
      const { walletAddress, rarity, times } = req.body;

      if (!walletAddress || !rarity || !times) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const fusionTimes = parseInt(times);
      if (isNaN(fusionTimes) || fusionTimes < 1) {
        return res.status(400).json({ error: "Times must be at least 1" });
      }

      const FUSION_CONFIG: Record<string, { cost: number; chance: number; sourceField: 'eggCommon' | 'eggRare' | 'eggEpic'; targetField: 'eggRare' | 'eggEpic' | 'eggLegendary' }> = {
        common: { cost: 5, chance: 1.0, sourceField: 'eggCommon', targetField: 'eggRare' },
        rare: { cost: 20, chance: 0.15, sourceField: 'eggRare', targetField: 'eggEpic' },
        epic: { cost: 30, chance: 0.05, sourceField: 'eggEpic', targetField: 'eggLegendary' },
      };

      const config = FUSION_CONFIG[rarity as string];
      if (!config) {
        return res.status(400).json({ error: "Invalid rarity. Must be: common, rare, or epic" });
      }

      const totalCost = config.cost * fusionTimes;

      const result = await db.transaction(async (tx) => {
        const [economy] = await tx.select().from(huntEconomyStats)
          .where(eq(huntEconomyStats.walletAddress, walletAddress))
          .limit(1);

        if (!economy) {
          throw new Error("Player not found");
        }

        const currentEggs = economy[config.sourceField] || 0;
        if (currentEggs < totalCost) {
          throw new Error(`Not enough ${rarity} eggs. Need ${totalCost}, have ${currentEggs}`);
        }

        await tx.update(huntEconomyStats)
          .set({ [config.sourceField]: sql`${huntEconomyStats[config.sourceField]} - ${totalCost}` })
          .where(eq(huntEconomyStats.walletAddress, walletAddress));

        let successCount = 0;
        for (let i = 0; i < fusionTimes; i++) {
          if (Math.random() < config.chance) {
            successCount++;
          }
        }

        if (successCount > 0) {
          await tx.update(huntEconomyStats)
            .set({ [config.targetField]: sql`${huntEconomyStats[config.targetField]} + ${successCount}` })
            .where(eq(huntEconomyStats.walletAddress, walletAddress));
        }

        const [updated] = await tx.select().from(huntEconomyStats)
          .where(eq(huntEconomyStats.walletAddress, walletAddress))
          .limit(1);

        return {
          successCount,
          failCount: fusionTimes - successCount,
          eggs: {
            common: updated?.eggCommon || 0,
            rare: updated?.eggRare || 0,
            epic: updated?.eggEpic || 0,
            legendary: updated?.eggLegendary || 0,
          },
        };
      });

      res.json(result);
    } catch (error: any) {
      console.error("Fusion error:", error);
      if (error.message?.includes("Not enough") || error.message?.includes("Player not found")) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Fusion failed" });
    }
  });
}
