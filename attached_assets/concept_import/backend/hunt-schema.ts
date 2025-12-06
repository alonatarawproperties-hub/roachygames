
// Player locations - real-time GPS positions
export const huntPlayerLocations = pgTable("hunt_player_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull().unique(),
  
  // GPS coordinates
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  
  // Player status
  isOnline: boolean("is_online").notNull().default(true),
  lastSeen: timestamp("last_seen").notNull().default(sql`now()`),
  
  // Display info
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Wild Roachy spawns - creatures spawned in the world
export const wildRoachySpawns = pgTable("wild_roachy_spawns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Spawn location
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  
  // Roachy info
  templateId: text("template_id").notNull(),
  name: text("name").notNull(),
  roachyClass: text("roachy_class").notNull(), // tank, assassin, mage, support
  rarity: text("rarity").notNull().default("common"),
  
  // Base stats
  baseHp: integer("base_hp").notNull().default(100),
  baseAtk: integer("base_atk").notNull().default(20),
  baseDef: integer("base_def").notNull().default(15),
  baseSpd: integer("base_spd").notNull().default(10),
  
  // Spawn status
  isActive: boolean("is_active").notNull().default(true),
  caughtByWallet: text("caught_by_wallet"), // null if not caught yet
  caughtAt: timestamp("caught_at"),
  
  // Despawn time (spawns expire after some time)
  expiresAt: timestamp("expires_at").notNull(),
  
  spawnedAt: timestamp("spawned_at").notNull().default(sql`now()`),
});

// Hunt caught Roachies - extends the concept of owned roachies for hunt
export const huntCaughtRoachies = pgTable("hunt_caught_roachies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull(),
  
  // Roachy identity
  templateId: text("template_id").notNull(),
  name: text("name").notNull(),
  roachyClass: text("roachy_class").notNull(),
  rarity: text("rarity").notNull().default("common"),
  
  // Base stats
  baseHp: integer("base_hp").notNull().default(100),
  baseAtk: integer("base_atk").notNull().default(20),
  baseDef: integer("base_def").notNull().default(15),
  baseSpd: integer("base_spd").notNull().default(10),
  
  // Progression
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  xpToNextLevel: integer("xp_to_next_level").notNull().default(100),
  
  // IV Variance System (±5% on stats, 1% chance for Perfect +7%)
  ivHp: integer("iv_hp").notNull().default(0), // -5 to +5 (or +7 for perfect)
  ivAtk: integer("iv_atk").notNull().default(0),
  ivDef: integer("iv_def").notNull().default(0),
  ivSpd: integer("iv_spd").notNull().default(0),
  isPerfect: boolean("is_perfect").notNull().default(false), // 1% chance "Perfect" tag
  
  // Catch quality bonus
  catchQuality: text("catch_quality"), // 'perfect', 'great', 'good'
  
  // Catch location (where it was caught)
  catchLatitude: decimal("catch_latitude", { precision: 10, scale: 7 }).notNull(),
  catchLongitude: decimal("catch_longitude", { precision: 10, scale: 7 }).notNull(),
  
  // Duplicate count (for leveling)
  duplicatesCaught: integer("duplicates_caught").notNull().default(0),
  
  // Origin tracking for Battles integration
  origin: text("origin").notNull().default("hunt"), // 'hunt', 'gacha', 'trade'
  
  caughtAt: timestamp("caught_at").notNull().default(sql`now()`),
});

// Hunt leaderboard - tracks player stats
export const huntLeaderboard = pgTable("hunt_leaderboard", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull().unique(),
  
  // Catch stats
  totalCaught: integer("total_caught").notNull().default(0),
  commonCaught: integer("common_caught").notNull().default(0),
  uncommonCaught: integer("uncommon_caught").notNull().default(0),
  rareCaught: integer("rare_caught").notNull().default(0),
  epicCaught: integer("epic_caught").notNull().default(0),
  legendaryCaught: integer("legendary_caught").notNull().default(0),
  
  // Unique Roachies (different species)
  uniqueRoachies: integer("unique_roachies").notNull().default(0),
  
  // Highest level Roachy
  highestLevel: integer("highest_level").notNull().default(1),
  
  // Display name
  displayName: text("display_name"),
  
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Hunt activity log
export const huntActivityLog = pgTable("hunt_activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull(),
  
  activityType: text("activity_type").notNull(), // 'catch', 'level_up', 'spawn_nearby'
  
  // Details (JSON)
  details: text("details"),
  
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Hunt economy stats - pity, energy, daily limits
export const huntEconomyStats = pgTable("hunt_economy_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull().unique(),
  
  // Daily energy system (30/day, each catch costs 1)
  energy: integer("energy").notNull().default(30),
  maxEnergy: integer("max_energy").notNull().default(30),
  lastEnergyRefresh: timestamp("last_energy_refresh").notNull().default(sql`now()`),
  
  // Daily catch limits
  catchesToday: integer("catches_today").notNull().default(0),
  maxCatchesPerDay: integer("max_catches_per_day").notNull().default(25),
  lastDailyReset: timestamp("last_daily_reset").notNull().default(sql`now()`),
  
  // Weekly catch limits
  catchesThisWeek: integer("catches_this_week").notNull().default(0),
  maxCatchesPerWeek: integer("max_catches_per_week").notNull().default(120),
  lastWeeklyReset: timestamp("last_weekly_reset").notNull().default(sql`now()`),
  
  // Pity system counters
  catchesSinceRare: integer("catches_since_rare").notNull().default(0), // Guaranteed Rare every 20
  catchesSinceEpic: integer("catches_since_epic").notNull().default(0), // Guaranteed Epic every 60
  
  // Legendary catch limit (1 per 30 days per account)
  lastLegendaryCatch: timestamp("last_legendary_catch"),
  legendaryCountThisMonth: integer("legendary_count_this_month").notNull().default(0),
  
  // Catch streak system - consecutive days of catching
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastCatchDate: text("last_catch_date"), // YYYY-MM-DD format
  streakBonusClaimedToday: boolean("streak_bonus_claimed_today").notNull().default(false),
  
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// ============================================
// INSERT SCHEMAS - Hunt System
// ============================================

export const insertHuntPlayerLocationSchema = createInsertSchema(huntPlayerLocations).omit({
  id: true,
  updatedAt: true,
  lastSeen: true,
});

export const insertWildRoachySpawnSchema = createInsertSchema(wildRoachySpawns).omit({
  id: true,
  spawnedAt: true,
  caughtByWallet: true,
  caughtAt: true,
});

export const insertHuntCaughtRoachySchema = createInsertSchema(huntCaughtRoachies).omit({
  id: true,
  caughtAt: true,
  level: true,
  xpToNextLevel: true,
  duplicatesCaught: true,
});

export const insertHuntLeaderboardSchema = createInsertSchema(huntLeaderboard).omit({
  id: true,
  updatedAt: true,
});

export const insertHuntActivityLogSchema = createInsertSchema(huntActivityLog).omit({
  id: true,
  createdAt: true,
});

export const insertHuntEconomyStatsSchema = createInsertSchema(huntEconomyStats).omit({
  id: true,
  updatedAt: true,
});

// ============================================
// EGG INCUBATOR SYSTEM
// ============================================

// Egg rarity tiers with distance requirements
export const EGG_RARITY_TYPES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
export type EggRarity = typeof EGG_RARITY_TYPES[number];

// Eggs found during hunting (need to be incubated)
export const huntEggs = pgTable("hunt_eggs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull(),
  
  // Egg properties
  rarity: text("rarity").notNull().default('common'), // common, uncommon, rare, epic, legendary
  requiredDistance: integer("required_distance").notNull().default(2000), // meters to hatch
  walkedDistance: integer("walked_distance").notNull().default(0), // meters walked so far
  
  // Incubation status
  isIncubating: boolean("is_incubating").notNull().default(false),
  startedIncubatingAt: timestamp("started_incubating_at"),
  hatchedAt: timestamp("hatched_at"),
  
  // What hatches from the egg (set when hatched)
  hatchedRoachyId: varchar("hatched_roachy_id"),
  
  // Location where egg was found
  foundLatitude: text("found_latitude"),
  foundLongitude: text("found_longitude"),
  
  foundAt: timestamp("found_at").notNull().default(sql`now()`),
});

// Incubator slots (players can have multiple)
export const huntIncubators = pgTable("hunt_incubators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull(),
  
  // Incubator type
  incubatorType: text("incubator_type").notNull().default('basic'), // basic, super, legendary
  speedMultiplier: real("speed_multiplier").notNull().default(1.0), // 1.0 = normal, 2.0 = 2x faster
  
  // Current egg (if any)
  currentEggId: varchar("current_egg_id"),
  
  // Slot info
  slotNumber: integer("slot_number").notNull().default(1),
  isUnlocked: boolean("is_unlocked").notNull().default(true),
  
  acquiredAt: timestamp("acquired_at").notNull().default(sql`now()`),
});

// Insert schemas for eggs
export const insertHuntEggSchema = createInsertSchema(huntEggs).omit({
  id: true,
  foundAt: true,
  hatchedAt: true,
  hatchedRoachyId: true,
});

export const insertHuntIncubatorSchema = createInsertSchema(huntIncubators).omit({
  id: true,
  acquiredAt: true,
});

// ============================================
// TYPE EXPORTS - Hunt System
// ============================================

export type HuntPlayerLocation = typeof huntPlayerLocations.$inferSelect;
export type InsertHuntPlayerLocation = z.infer<typeof insertHuntPlayerLocationSchema>;
export type WildRoachySpawn = typeof wildRoachySpawns.$inferSelect;
export type InsertWildRoachySpawn = z.infer<typeof insertWildRoachySpawnSchema>;
export type HuntCaughtRoachy = typeof huntCaughtRoachies.$inferSelect;
export type InsertHuntCaughtRoachy = z.infer<typeof insertHuntCaughtRoachySchema>;
export type HuntLeaderboard = typeof huntLeaderboard.$inferSelect;
export type InsertHuntLeaderboard = z.infer<typeof insertHuntLeaderboardSchema>;
export type HuntActivityLog = typeof huntActivityLog.$inferSelect;
export type InsertHuntActivityLog = z.infer<typeof insertHuntActivityLogSchema>;
export type HuntEconomyStats = typeof huntEconomyStats.$inferSelect;
export type InsertHuntEconomyStats = z.infer<typeof insertHuntEconomyStatsSchema>;
export type HuntEgg = typeof huntEggs.$inferSelect;
export type InsertHuntEgg = z.infer<typeof insertHuntEggSchema>;
export type HuntIncubator = typeof huntIncubators.$inferSelect;
export type InsertHuntIncubator = z.infer<typeof insertHuntIncubatorSchema>;
