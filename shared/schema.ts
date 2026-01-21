import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, decimal, real, unique, numeric, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  googleId: text("google_id").unique(),
  walletAddress: text("wallet_address").unique(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  lastUsernameChange: timestamp("last_username_change"),
  authProvider: text("auth_provider").notNull().default("email"),
  chyBalance: integer("chy_balance").notNull().default(0),
  diamondBalance: integer("diamond_balance").notNull().default(0),
  isEmailVerified: boolean("is_email_verified").notNull().default(false),
  isGod: boolean("is_god").notNull().default(false),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  displayName: true,
});

export const registerUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters").optional(),
});

export const loginUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;

export const RARITY_TYPES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
export type Rarity = typeof RARITY_TYPES[number];

export const ROACHY_CLASS_TYPES = ['tank', 'assassin', 'mage', 'support'] as const;
export type RoachyClass = typeof ROACHY_CLASS_TYPES[number];

export const huntPlayerLocations = pgTable("hunt_player_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull().unique(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  isOnline: boolean("is_online").notNull().default(true),
  lastSeen: timestamp("last_seen").notNull().default(sql`now()`),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const wildCreatureSpawns = pgTable("wild_creature_spawns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  templateId: text("template_id").notNull(),
  name: text("name").notNull(),
  creatureClass: text("creature_class").notNull(),
  rarity: text("rarity").notNull().default("common"),
  baseHp: integer("base_hp").notNull().default(100),
  baseAtk: integer("base_atk").notNull().default(20),
  baseDef: integer("base_def").notNull().default(15),
  baseSpd: integer("base_spd").notNull().default(10),
  containedTemplateId: text("contained_template_id"),
  isActive: boolean("is_active").notNull().default(true),
  caughtByWallet: text("caught_by_wallet"),
  caughtAt: timestamp("caught_at"),
  expiresAt: timestamp("expires_at").notNull(),
  spawnedAt: timestamp("spawned_at").notNull().default(sql`now()`),
  sourceType: text("source_type").default("HOME"),
  sourceKey: text("source_key"),
}, (table) => ({
  ownerActiveIdx: index("wcs_owner_active_idx").on(table.sourceType, table.sourceKey, table.isActive, table.expiresAt),
}));

export const HOTSPOT_QUEST_TYPES = ['MICRO_HOTSPOT', 'HOT_DROP', 'LEGENDARY_BEACON'] as const;
export type HotspotQuestType = typeof HOTSPOT_QUEST_TYPES[number];

export const huntHotspotPlayerState = pgTable("hunt_hotspot_player_state", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull(),
  dayKey: text("day_key").notNull(),
  activeQuestType: text("active_quest_type"),
  activeQuestKey: text("active_quest_key"),
  activeQuestExpiresAt: timestamp("active_quest_expires_at"),
  activeQuestCenterLat: decimal("active_quest_center_lat", { precision: 10, scale: 7 }),
  activeQuestCenterLng: decimal("active_quest_center_lng", { precision: 10, scale: 7 }),
  microCooldownUntil: timestamp("micro_cooldown_until"),
  hotdropCooldownUntil: timestamp("hotdrop_cooldown_until"),
  beaconAvailable: boolean("beacon_available").notNull().default(true),
  beaconClaimedAt: timestamp("beacon_claimed_at"),
  beaconQuestKey: text("beacon_quest_key"),
  beaconCompleted: boolean("beacon_completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
}, (table) => ({
  walletDayUnique: unique().on(table.walletAddress, table.dayKey),
}));

export const huntCaughtCreatures = pgTable("hunt_caught_creatures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  walletAddress: text("wallet_address"),
  templateId: text("template_id").notNull(),
  name: text("name").notNull(),
  creatureClass: text("creature_class").notNull(),
  rarity: text("rarity").notNull().default("common"),
  baseHp: integer("base_hp").notNull().default(100),
  baseAtk: integer("base_atk").notNull().default(20),
  baseDef: integer("base_def").notNull().default(15),
  baseSpd: integer("base_spd").notNull().default(10),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  xpToNextLevel: integer("xp_to_next_level").notNull().default(100),
  ivHp: integer("iv_hp").notNull().default(0),
  ivAtk: integer("iv_atk").notNull().default(0),
  ivDef: integer("iv_def").notNull().default(0),
  ivSpd: integer("iv_spd").notNull().default(0),
  isPerfect: boolean("is_perfect").notNull().default(false),
  catchQuality: text("catch_quality"),
  catchLatitude: decimal("catch_latitude", { precision: 10, scale: 7 }).notNull(),
  catchLongitude: decimal("catch_longitude", { precision: 10, scale: 7 }).notNull(),
  duplicatesCaught: integer("duplicates_caught").notNull().default(0),
  origin: text("origin").notNull().default("hunt"),
  caughtAt: timestamp("caught_at").notNull().default(sql`now()`),
});

export const huntLeaderboard = pgTable("hunt_leaderboard", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull().unique(),
  totalCaught: integer("total_caught").notNull().default(0),
  commonCaught: integer("common_caught").notNull().default(0),
  uncommonCaught: integer("uncommon_caught").notNull().default(0),
  rareCaught: integer("rare_caught").notNull().default(0),
  epicCaught: integer("epic_caught").notNull().default(0),
  legendaryCaught: integer("legendary_caught").notNull().default(0),
  uniqueCreatures: integer("unique_creatures").notNull().default(0),
  highestLevel: integer("highest_level").notNull().default(1),
  displayName: text("display_name"),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const huntActivityLog = pgTable("hunt_activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull(),
  activityType: text("activity_type").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const huntEconomyStats = pgTable("hunt_economy_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull().unique(),
  energy: integer("energy").notNull().default(30),
  maxEnergy: integer("max_energy").notNull().default(30),
  lastEnergyRefresh: timestamp("last_energy_refresh").notNull().default(sql`now()`),
  catchesToday: integer("catches_today").notNull().default(0),
  maxCatchesPerDay: integer("max_catches_per_day").notNull().default(25),
  lastDailyReset: timestamp("last_daily_reset").notNull().default(sql`now()`),
  catchesThisWeek: integer("catches_this_week").notNull().default(0),
  maxCatchesPerWeek: integer("max_catches_per_week").notNull().default(120),
  lastWeeklyReset: timestamp("last_weekly_reset").notNull().default(sql`now()`),
  catchesSinceRare: integer("catches_since_rare").notNull().default(0),
  catchesSinceEpic: integer("catches_since_epic").notNull().default(0),
  catchesSinceLegendary: integer("catches_since_legendary").notNull().default(0),
  lastLegendaryCatch: timestamp("last_legendary_catch"),
  legendaryCountThisMonth: integer("legendary_count_this_month").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastCatchDate: text("last_catch_date"),
  lastClaimAt: timestamp("last_claim_at"),
  streakBonusClaimedToday: boolean("streak_bonus_claimed_today").notNull().default(false),
  collectedEggs: integer("collected_eggs").notNull().default(0),
  eggCommon: integer("egg_common").notNull().default(0),
  eggRare: integer("egg_rare").notNull().default(0),
  eggEpic: integer("egg_epic").notNull().default(0),
  eggLegendary: integer("egg_legendary").notNull().default(0),
  warmth: integer("warmth").notNull().default(0),
  boostTokens: integer("boost_tokens").notNull().default(0),
  hunterLevel: integer("hunter_level").notNull().default(1),
  hunterXp: integer("hunter_xp").notNull().default(0),
  pointsThisWeek: integer("points_this_week").notNull().default(0),
  perfectsThisWeek: integer("perfects_this_week").notNull().default(0),
  currentWeekKey: text("current_week_key"),
  heatModeUntil: timestamp("heat_mode_until"),
  lastStreakChestDay: integer("last_streak_chest_day").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const huntEggs = pgTable("hunt_eggs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  walletAddress: text("wallet_address"),
  rarity: text("rarity").notNull().default('common'),
  requiredDistance: integer("required_distance").notNull().default(2000),
  walkedDistance: integer("walked_distance").notNull().default(0),
  isIncubating: boolean("is_incubating").notNull().default(false),
  startedIncubatingAt: timestamp("started_incubating_at"),
  hatchedAt: timestamp("hatched_at"),
  hatchedCreatureId: varchar("hatched_creature_id"),
  foundLatitude: text("found_latitude"),
  foundLongitude: text("found_longitude"),
  foundAt: timestamp("found_at").notNull().default(sql`now()`),
});

export const huntIncubators = pgTable("hunt_incubators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  walletAddress: text("wallet_address"),
  incubatorType: text("incubator_type").notNull().default('basic'),
  speedMultiplier: real("speed_multiplier").notNull().default(1.0),
  currentEggId: varchar("current_egg_id"),
  slotNumber: integer("slot_number").notNull().default(1),
  isUnlocked: boolean("is_unlocked").notNull().default(true),
  acquiredAt: timestamp("acquired_at").notNull().default(sql`now()`),
});

export const huntRaids = pgTable("hunt_raids", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  bossName: text("boss_name").notNull(),
  bossClass: text("boss_class").notNull(),
  rarity: text("rarity").notNull().default("rare"),
  currentHp: integer("current_hp").notNull(),
  maxHp: integer("max_hp").notNull(),
  participantCount: integer("participant_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  defeatedAt: timestamp("defeated_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const huntRaidParticipants = pgTable("hunt_raid_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  raidId: varchar("raid_id").notNull(),
  walletAddress: text("wallet_address").notNull(),
  totalDamage: integer("total_damage").notNull().default(0),
  attackCount: integer("attack_count").notNull().default(0),
  joinedAt: timestamp("joined_at").notNull().default(sql`now()`),
});

export const huntClaims = pgTable("hunt_claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull(),
  nodeId: text("node_id").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  quality: text("quality").notNull(),
  eggRarity: text("egg_rarity").notNull(),
  xpAwarded: integer("xp_awarded").notNull().default(0),
  pointsAwarded: integer("points_awarded").notNull().default(0),
  dayKey: text("day_key").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
}, (table) => ({
  uniqueClaim: unique().on(table.walletAddress, table.nodeId, table.dayKey),
}));

export const huntWeeklyLeaderboard = pgTable("hunt_weekly_leaderboard", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  weekKey: text("week_key").notNull(),
  walletAddress: text("wallet_address").notNull(),
  displayName: text("display_name"),
  points: integer("points").notNull().default(0),
  perfects: integer("perfects").notNull().default(0),
  eggsTotal: integer("eggs_total").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
}, (table) => ({
  uniqueWeekPlayer: unique().on(table.weekKey, table.walletAddress),
}));

export const insertHuntPlayerLocationSchema = createInsertSchema(huntPlayerLocations).omit({
  id: true,
  updatedAt: true,
  lastSeen: true,
});

export const insertWildCreatureSpawnSchema = createInsertSchema(wildCreatureSpawns).omit({
  id: true,
  spawnedAt: true,
  caughtByWallet: true,
  caughtAt: true,
});

export const insertHuntCaughtCreatureSchema = createInsertSchema(huntCaughtCreatures).omit({
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

export const insertHuntEggSchema = createInsertSchema(huntEggs).omit({
  id: true,
  foundAt: true,
  hatchedAt: true,
  hatchedCreatureId: true,
});

export const insertHuntIncubatorSchema = createInsertSchema(huntIncubators).omit({
  id: true,
  acquiredAt: true,
});

export const insertHuntRaidSchema = createInsertSchema(huntRaids).omit({
  id: true,
  createdAt: true,
  defeatedAt: true,
});

export const insertHuntRaidParticipantSchema = createInsertSchema(huntRaidParticipants).omit({
  id: true,
  joinedAt: true,
});

export const insertHuntClaimSchema = createInsertSchema(huntClaims).omit({
  id: true,
  createdAt: true,
});

export const insertHuntWeeklyLeaderboardSchema = createInsertSchema(huntWeeklyLeaderboard).omit({
  id: true,
  updatedAt: true,
});

export type HuntPlayerLocation = typeof huntPlayerLocations.$inferSelect;
export type InsertHuntPlayerLocation = z.infer<typeof insertHuntPlayerLocationSchema>;
export type WildCreatureSpawn = typeof wildCreatureSpawns.$inferSelect;
export type InsertWildCreatureSpawn = z.infer<typeof insertWildCreatureSpawnSchema>;
export type HuntCaughtCreature = typeof huntCaughtCreatures.$inferSelect;
export type InsertHuntCaughtCreature = z.infer<typeof insertHuntCaughtCreatureSchema>;
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
export type HuntRaid = typeof huntRaids.$inferSelect;
export type InsertHuntRaid = z.infer<typeof insertHuntRaidSchema>;
export type HuntRaidParticipant = typeof huntRaidParticipants.$inferSelect;
export type InsertHuntRaidParticipant = z.infer<typeof insertHuntRaidParticipantSchema>;
export type HuntClaim = typeof huntClaims.$inferSelect;
export type InsertHuntClaim = z.infer<typeof insertHuntClaimSchema>;
export type HuntWeeklyLeaderboard = typeof huntWeeklyLeaderboard.$inferSelect;
export type InsertHuntWeeklyLeaderboard = z.infer<typeof insertHuntWeeklyLeaderboardSchema>;

// ==================== CHESS/ROACHY MATE TABLES ====================

export const CHESS_GAME_MODES = ['casual', 'ranked', 'wager', 'tournament'] as const;
export type ChessGameMode = typeof CHESS_GAME_MODES[number];

export const CHESS_TIME_CONTROLS = ['bullet', 'blitz', 'rapid', 'classical'] as const;
export type ChessTimeControl = typeof CHESS_TIME_CONTROLS[number];

export const BOT_DIFFICULTIES = ['rookie', 'club', 'expert', 'magnus'] as const;
export type BotDifficulty = typeof BOT_DIFFICULTIES[number];

export const BOT_ELO_RATINGS: Record<BotDifficulty, number> = {
  rookie: 1350,
  club: 1600,
  expert: 2000,
  magnus: 2800,
};

export const TIME_CONTROL_SECONDS: Record<ChessTimeControl, number> = {
  bullet: 60,
  blitz: 300,
  rapid: 600,
  classical: 1800,
};

export const chessRatings = pgTable("chess_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull().unique(),
  rating: integer("rating").notNull().default(1200),
  gamesPlayed: integer("games_played").notNull().default(0),
  gamesWon: integer("games_won").notNull().default(0),
  gamesLost: integer("games_lost").notNull().default(0),
  gamesDraw: integer("games_draw").notNull().default(0),
  winStreak: integer("win_streak").notNull().default(0),
  bestWinStreak: integer("best_win_streak").notNull().default(0),
  lastPlayedAt: timestamp("last_played_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const chessMatches = pgTable("chess_matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  player1Wallet: text("player1_wallet").notNull(),
  player2Wallet: text("player2_wallet"),
  gameMode: text("game_mode").notNull().default('casual'),
  timeControl: text("time_control").notNull().default('rapid'),
  status: text("status").notNull().default('waiting'),
  fen: text("fen").notNull().default('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'),
  currentTurn: text("current_turn").notNull().default('white'),
  player1TimeRemaining: integer("player1_time_remaining").notNull(),
  player2TimeRemaining: integer("player2_time_remaining").notNull(),
  wagerAmount: integer("wager_amount").notNull().default(0),
  winnerWallet: text("winner_wallet"),
  winReason: text("win_reason"),
  moveHistory: text("move_history").default(''),
  isAgainstBot: boolean("is_against_bot").notNull().default(false),
  botDifficulty: text("bot_difficulty").default('magnus'),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const chessMatchmakingQueue = pgTable("chess_matchmaking_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull().unique(),
  gameMode: text("game_mode").notNull(),
  timeControl: text("time_control").notNull(),
  wagerAmount: integer("wager_amount").notNull().default(0),
  rating: integer("rating").notNull().default(1200),
  joinedAt: timestamp("joined_at").notNull().default(sql`now()`),
});

export const insertChessRatingSchema = createInsertSchema(chessRatings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChessMatchSchema = createInsertSchema(chessMatches).omit({
  id: true,
  createdAt: true,
});

export const insertChessMatchmakingQueueSchema = createInsertSchema(chessMatchmakingQueue).omit({
  id: true,
  joinedAt: true,
});

export type ChessRating = typeof chessRatings.$inferSelect;
export type InsertChessRating = z.infer<typeof insertChessRatingSchema>;
export type ChessMatch = typeof chessMatches.$inferSelect;
export type InsertChessMatch = z.infer<typeof insertChessMatchSchema>;
export type ChessMatchmakingQueue = typeof chessMatchmakingQueue.$inferSelect;
export type InsertChessMatchmakingQueue = z.infer<typeof insertChessMatchmakingQueueSchema>;

// ==================== TOURNAMENT TABLES ====================

export const TOURNAMENT_TYPES = ['sit_and_go', 'daily', 'weekly', 'monthly'] as const;
export type TournamentType = typeof TOURNAMENT_TYPES[number];

export const TOURNAMENT_FORMATS = ['bracket', 'arena'] as const;
export type TournamentFormat = typeof TOURNAMENT_FORMATS[number];

export const TOURNAMENT_STATUS = ['scheduled', 'registering', 'active', 'completed', 'cancelled'] as const;
export type TournamentStatus = typeof TOURNAMENT_STATUS[number];

export const chessTournamentTemplates = pgTable("chess_tournament_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  tournamentType: text("tournament_type").notNull(),
  timeControl: text("time_control").notNull().default('blitz'),
  entryFee: integer("entry_fee").notNull().default(0),
  prizeMultiplier: real("prize_multiplier").notNull().default(0.85),
  maxPlayers: integer("max_players").notNull().default(8),
  minPlayers: integer("min_players").notNull().default(2),
  isActive: boolean("is_active").notNull().default(true),
  autoCreateCount: integer("auto_create_count").notNull().default(1),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const chessTournaments = pgTable("chess_tournaments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id"),
  name: text("name").notNull(),
  tournamentType: text("tournament_type").notNull().default('sit_and_go'),
  tournamentFormat: text("tournament_format").notNull().default('bracket'),
  timeControl: text("time_control").notNull().default('blitz'),
  entryFee: integer("entry_fee").notNull().default(0),
  prizePool: integer("prize_pool").notNull().default(0),
  rakeAmount: integer("rake_amount").notNull().default(0),
  maxPlayers: integer("max_players").notNull().default(8),
  minPlayers: integer("min_players").notNull().default(2),
  currentPlayers: integer("current_players").notNull().default(0),
  currentRound: integer("current_round").notNull().default(0),
  totalRounds: integer("total_rounds").notNull().default(3),
  status: text("status").notNull().default('scheduled'),
  scheduledStartAt: timestamp("scheduled_start_at"),
  scheduledEndAt: timestamp("scheduled_end_at"),
  registrationEndsAt: timestamp("registration_ends_at"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  winnerWallet: text("winner_wallet"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const chessTournamentParticipants = pgTable("chess_tournament_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull(),
  walletAddress: text("wallet_address").notNull(),
  seed: integer("seed"),
  currentRound: integer("current_round").notNull().default(1),
  wins: integer("wins").notNull().default(0),
  draws: integer("draws").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  points: integer("points").notNull().default(0),
  gamesPlayed: integer("games_played").notNull().default(0),
  isEliminated: boolean("is_eliminated").notNull().default(false),
  isBot: boolean("is_bot").notNull().default(false),
  finalPlacement: integer("final_placement"),
  prizesWon: integer("prizes_won").notNull().default(0),
  joinedAt: timestamp("joined_at").notNull().default(sql`now()`),
}, (table) => ({
  // Unique constraint to prevent race conditions - one entry per wallet per tournament
  uniqueParticipant: unique().on(table.tournamentId, table.walletAddress),
}));

export const chessTournamentMatches = pgTable("chess_tournament_matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull(),
  chessMatchId: varchar("chess_match_id"),
  roundNumber: integer("round_number").notNull(),
  matchNumber: integer("match_number").notNull(),
  player1Wallet: text("player1_wallet"),
  player2Wallet: text("player2_wallet"),
  winnerWallet: text("winner_wallet"),
  status: text("status").notNull().default('pending'),
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertChessTournamentSchema = createInsertSchema(chessTournaments).omit({
  id: true,
  createdAt: true,
  currentPlayers: true,
  currentRound: true,
  startedAt: true,
  endedAt: true,
  winnerWallet: true,
});

export const insertChessTournamentParticipantSchema = createInsertSchema(chessTournamentParticipants).omit({
  id: true,
  joinedAt: true,
  seed: true,
  currentRound: true,
  wins: true,
  losses: true,
  isEliminated: true,
  finalPlacement: true,
  prizesWon: true,
});

export const insertChessTournamentMatchSchema = createInsertSchema(chessTournamentMatches).omit({
  id: true,
  createdAt: true,
  chessMatchId: true,
  winnerWallet: true,
  startedAt: true,
  endedAt: true,
});

export const insertChessTournamentTemplateSchema = createInsertSchema(chessTournamentTemplates).omit({
  id: true,
  createdAt: true,
});

export type ChessTournamentTemplate = typeof chessTournamentTemplates.$inferSelect;
export type InsertChessTournamentTemplate = z.infer<typeof insertChessTournamentTemplateSchema>;
export type ChessTournament = typeof chessTournaments.$inferSelect;
export type InsertChessTournament = z.infer<typeof insertChessTournamentSchema>;
export type ChessTournamentParticipant = typeof chessTournamentParticipants.$inferSelect;
export type InsertChessTournamentParticipant = z.infer<typeof insertChessTournamentParticipantSchema>;
export type ChessTournamentMatch = typeof chessTournamentMatches.$inferSelect;
export type InsertChessTournamentMatch = z.infer<typeof insertChessTournamentMatchSchema>;

// ==================== PLAYER ECONOMY & DAILY LOGIN TABLES ====================

export const playerEconomy = pgTable("player_economy", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull().unique(),
  diamonds: numeric("diamonds", { precision: 10, scale: 2 }).notNull().default("0"),
  chy: numeric("chy", { precision: 10, scale: 2 }).notNull().default("0"),
  totalDiamondsEarned: numeric("total_diamonds_earned", { precision: 10, scale: 2 }).notNull().default("0"),
  totalChyEarned: numeric("total_chy_earned", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const dailyLoginBonus = pgTable("daily_login_bonus", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull().unique(),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastClaimDate: text("last_claim_date"),
  totalClaims: integer("total_claims").notNull().default(0),
  totalDiamondsFromBonus: numeric("total_diamonds_from_bonus", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const dailyLoginHistory = pgTable("daily_login_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull(),
  claimDate: text("claim_date").notNull(),
  streakDay: integer("streak_day").notNull(),
  diamondsAwarded: numeric("diamonds_awarded", { precision: 10, scale: 2 }).notNull(),
  deviceFingerprint: text("device_fingerprint"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  fraudFlags: text("fraud_flags"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const dailyBonusFraudTracking = pgTable("daily_bonus_fraud_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deviceFingerprint: text("device_fingerprint").notNull(),
  ipSubnet: text("ip_subnet").notNull(),
  claimsToday: integer("claims_today").notNull().default(0),
  claimsThisWeek: integer("claims_this_week").notNull().default(0),
  linkedWallets: text("linked_wallets"),
  isFlagged: boolean("is_flagged").notNull().default(false),
  flagReason: text("flag_reason"),
  lastClaimAt: timestamp("last_claim_at"),
  lastResetDate: text("last_reset_date"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertPlayerEconomySchema = createInsertSchema(playerEconomy).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDailyLoginBonusSchema = createInsertSchema(dailyLoginBonus).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDailyLoginHistorySchema = createInsertSchema(dailyLoginHistory).omit({
  id: true,
  createdAt: true,
});

export const insertDailyBonusFraudTrackingSchema = createInsertSchema(dailyBonusFraudTracking).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PlayerEconomy = typeof playerEconomy.$inferSelect;
export type InsertPlayerEconomy = z.infer<typeof insertPlayerEconomySchema>;
export type DailyLoginBonus = typeof dailyLoginBonus.$inferSelect;
export type InsertDailyLoginBonus = z.infer<typeof insertDailyLoginBonusSchema>;
export type DailyLoginHistory = typeof dailyLoginHistory.$inferSelect;
export type InsertDailyLoginHistory = z.infer<typeof insertDailyLoginHistorySchema>;
export type DailyBonusFraudTracking = typeof dailyBonusFraudTracking.$inferSelect;
export type InsertDailyBonusFraudTracking = z.infer<typeof insertDailyBonusFraudTrackingSchema>;

// ==================== WALLET LINK HISTORY ====================

export const walletLinkHistory = pgTable("wallet_link_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  previousWallet: text("previous_wallet"),
  newWallet: text("new_wallet").notNull(),
  action: text("action").notNull(), // 'link', 'switch', 'unlink'
  signatureVerified: boolean("signature_verified").notNull().default(false),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  cooldownEndsAt: timestamp("cooldown_ends_at"),
  status: text("status").notNull().default("pending"), // 'pending', 'completed', 'cancelled'
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertWalletLinkHistorySchema = createInsertSchema(walletLinkHistory).omit({
  id: true,
  createdAt: true,
});

export type WalletLinkHistory = typeof walletLinkHistory.$inferSelect;
export type InsertWalletLinkHistory = z.infer<typeof insertWalletLinkHistorySchema>;

// ==================== USER ACTIVITY LOG ====================

export const ACTIVITY_TYPES = ['catch', 'reward', 'hatch', 'trade', 'bonus', 'game', 'competition'] as const;
export type ActivityType = typeof ACTIVITY_TYPES[number];

export const userActivityLog = pgTable("user_activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  activityType: text("activity_type").notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  amount: integer("amount"),
  amountType: text("amount_type").default("chy"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertUserActivityLogSchema = createInsertSchema(userActivityLog).omit({
  id: true,
  createdAt: true,
});

export type UserActivityLog = typeof userActivityLog.$inferSelect;
export type InsertUserActivityLog = z.infer<typeof insertUserActivityLogSchema>;

// ==================== FLAPPY ROACHY TABLES ====================

export const FLAPPY_POWERUP_TYPES = ['shield', 'double', 'magnet'] as const;
export type FlappyPowerUpType = typeof FLAPPY_POWERUP_TYPES[number];

export const LEADERBOARD_PERIODS = ['daily', 'weekly', 'alltime'] as const;
export type LeaderboardPeriod = typeof LEADERBOARD_PERIODS[number];

export const flappyScores = pgTable("flappy_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  score: integer("score").notNull(),
  coinsCollected: integer("coins_collected").notNull().default(0),
  isRanked: boolean("is_ranked").notNull().default(false),
  chyEntryFee: integer("diamond_entry_fee").notNull().default(0),
  playedAt: timestamp("played_at").notNull().default(sql`now()`),
});

export const flappyLeaderboard = pgTable("flappy_leaderboard", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  displayName: text("display_name"),
  bestScore: integer("best_score").notNull().default(0),
  bestRankedScore: integer("best_ranked_score").notNull().default(0),
  totalGamesPlayed: integer("total_games_played").notNull().default(0),
  totalRankedGames: integer("total_ranked_games").notNull().default(0),
  totalCoinsCollected: integer("total_coins_collected").notNull().default(0),
  dailyBestScore: integer("daily_best_score").notNull().default(0),
  dailyBestDate: text("daily_best_date"),
  weeklyBestScore: integer("weekly_best_score").notNull().default(0),
  weeklyBestDate: text("weekly_best_date"),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const flappyPowerUpInventory = pgTable("flappy_powerup_inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  shieldCount: integer("shield_count").notNull().default(0),
  doubleCount: integer("double_count").notNull().default(0),
  magnetCount: integer("magnet_count").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const flappyRankedCompetitions = pgTable("flappy_ranked_competitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  period: text("period").notNull().default('daily'),
  entryFee: integer("entry_fee").notNull().default(1),
  prizePool: integer("prize_pool").notNull().default(0),
  participantCount: integer("participant_count").notNull().default(0),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const flappyRankedEntries = pgTable("flappy_ranked_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  competitionId: varchar("competition_id"),
  period: text("period").notNull(),
  periodDate: text("period_date").notNull(),
  entryFee: integer("entry_fee").notNull().default(1),
  bestScore: integer("best_score").notNull().default(0),
  gamesPlayed: integer("games_played").notNull().default(0),
  enteredAt: timestamp("entered_at").notNull().default(sql`now()`),
});

export const insertFlappyScoreSchema = createInsertSchema(flappyScores).omit({
  id: true,
  playedAt: true,
});

export const insertFlappyLeaderboardSchema = createInsertSchema(flappyLeaderboard).omit({
  id: true,
  updatedAt: true,
});

export const insertFlappyPowerUpInventorySchema = createInsertSchema(flappyPowerUpInventory).omit({
  id: true,
  updatedAt: true,
});

export const insertFlappyRankedCompetitionSchema = createInsertSchema(flappyRankedCompetitions).omit({
  id: true,
  createdAt: true,
});

export const insertFlappyRankedEntrySchema = createInsertSchema(flappyRankedEntries).omit({
  id: true,
  enteredAt: true,
});

export type FlappyScore = typeof flappyScores.$inferSelect;
export type InsertFlappyScore = z.infer<typeof insertFlappyScoreSchema>;
export type FlappyLeaderboard = typeof flappyLeaderboard.$inferSelect;
export type InsertFlappyLeaderboard = z.infer<typeof insertFlappyLeaderboardSchema>;
export type FlappyPowerUpInventory = typeof flappyPowerUpInventory.$inferSelect;
export type InsertFlappyPowerUpInventory = z.infer<typeof insertFlappyPowerUpInventorySchema>;
export type FlappyRankedCompetition = typeof flappyRankedCompetitions.$inferSelect;
export type InsertFlappyRankedCompetition = z.infer<typeof insertFlappyRankedCompetitionSchema>;
export type FlappyRankedEntry = typeof flappyRankedEntries.$inferSelect;
export type InsertFlappyRankedEntry = z.infer<typeof insertFlappyRankedEntrySchema>;

// ========================================
// CHY SECURITY: Transaction Ledger
// Append-only ledger for all CHY mutations
// ========================================

export const CHY_TX_TYPES = [
  'entry_fee',        // Competition entry
  'prize_payout',     // Competition winnings
  'daily_bonus',      // Daily login bonus
  'refund',           // Entry fee refund
  'admin_adjustment', // Admin manual adjustment
  'webapp_sync',      // Sync from webapp
] as const;
export type ChyTxType = typeof CHY_TX_TYPES[number];

export const chyTransactions = pgTable("chy_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // User identification
  userId: varchar("user_id").notNull(),
  webappUserId: varchar("webapp_user_id"),
  
  // Transaction details
  txType: text("tx_type").notNull(), // CHY_TX_TYPES
  amount: integer("amount").notNull(), // Positive for credit, negative for debit
  balanceBefore: integer("balance_before").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  
  // Reference data
  referenceId: varchar("reference_id"), // Competition ID, game session, etc.
  referenceType: text("reference_type"), // 'flappy_daily', 'flappy_weekly', etc.
  
  // Idempotency
  idempotencyKey: varchar("idempotency_key").unique(),
  
  // Security metadata
  clientIp: text("client_ip"),
  userAgent: text("user_agent"),
  deviceFingerprint: text("device_fingerprint"),
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Rate limiting tracking per endpoint
export const rateLimitTracking = pgTable("rate_limit_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  endpoint: text("endpoint").notNull(),
  requestCount: integer("request_count").notNull().default(1),
  windowStart: timestamp("window_start").notNull().default(sql`now()`),
  lastRequest: timestamp("last_request").notNull().default(sql`now()`),
}, (table) => ({
  userEndpointUnique: unique().on(table.userId, table.endpoint),
}));

// Game session tokens for score validation
export const gameSessionTokens = pgTable("game_session_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  sessionToken: varchar("session_token").notNull().unique(),
  gameType: text("game_type").notNull(), // 'flappy', 'chess', etc.
  competitionId: varchar("competition_id"),
  period: text("period"),
  periodDate: text("period_date"),
  maxScore: integer("max_score"), // Server-calculated max possible score
  startedAt: timestamp("started_at").notNull().default(sql`now()`),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"), // Null until score submitted
  score: integer("score"), // Submitted score
  isValid: boolean("is_valid"), // Server validation result
});

// Security audit log for suspicious activity
export const securityAuditLog = pgTable("security_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  eventType: text("event_type").notNull(), // 'rate_limit', 'replay_attempt', 'suspicious_score', etc.
  severity: text("severity").notNull().default('info'), // 'info', 'warning', 'critical'
  details: text("details"),
  clientIp: text("client_ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export type ChyTransaction = typeof chyTransactions.$inferSelect;
export type RateLimitTracking = typeof rateLimitTracking.$inferSelect;
export type GameSessionToken = typeof gameSessionTokens.$inferSelect;
export type SecurityAuditLog = typeof securityAuditLog.$inferSelect;

export const huntNodes = pgTable("hunt_nodes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // PERSONAL | HOTSPOT | EVENT
  regionKey: text("region_key").notNull(),
  cellKey: text("cell_key").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  quality: text("quality").notNull().default("GOOD"), // POOR | GOOD | GREAT | EXCELLENT
  startsAt: timestamp("starts_at").notNull().default(sql`now()`),
  expiresAt: timestamp("expires_at").notNull(),
  groupId: text("group_id"), // for hotspot clusters
  eventKey: text("event_key"), // for event nodes
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const huntNodePlayerState = pgTable("hunt_node_player_state", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nodeId: varchar("node_id").notNull(),
  walletAddress: text("wallet_address").notNull(),
  status: text("status").notNull().default("AVAILABLE"), // AVAILABLE | RESERVED | ARRIVED | COLLECTED | EXPIRED
  reservedUntil: timestamp("reserved_until"),
  arrivedAt: timestamp("arrived_at"),
  collectedAt: timestamp("collected_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
}, (table) => ({
  nodeUserUnique: unique().on(table.nodeId, table.walletAddress),
}));

export const huntLocationSamples = pgTable("hunt_location_samples", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  accuracy: real("accuracy"),
  speedMps: real("speed_mps"),
  headingDeg: real("heading_deg"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const huntEventWindows = pgTable("hunt_event_windows", {
  key: varchar("key").primaryKey(),
  windowKey: text("window_key").notNull(), // NIGHT_HUNT, LUNCH_RUSH
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export type HuntNode = typeof huntNodes.$inferSelect;
export type HuntNodePlayerState = typeof huntNodePlayerState.$inferSelect;
export type HuntLocationSample = typeof huntLocationSamples.$inferSelect;
export type HuntEventWindow = typeof huntEventWindows.$inferSelect;
