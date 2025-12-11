import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, decimal, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

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
});

export const huntCaughtCreatures = pgTable("hunt_caught_creatures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull(),
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
  lastLegendaryCatch: timestamp("last_legendary_catch"),
  legendaryCountThisMonth: integer("legendary_count_this_month").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastCatchDate: text("last_catch_date"),
  streakBonusClaimedToday: boolean("streak_bonus_claimed_today").notNull().default(false),
  collectedEggs: integer("collected_eggs").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const huntEggs = pgTable("hunt_eggs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull(),
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
  walletAddress: text("wallet_address").notNull(),
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

// ==================== CHESS/ROACHY MATE TABLES ====================

export const CHESS_GAME_MODES = ['casual', 'ranked', 'wager', 'tournament'] as const;
export type ChessGameMode = typeof CHESS_GAME_MODES[number];

export const CHESS_TIME_CONTROLS = ['bullet', 'blitz', 'rapid', 'classical'] as const;
export type ChessTimeControl = typeof CHESS_TIME_CONTROLS[number];

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

export const TOURNAMENT_STATUS = ['scheduled', 'registering', 'active', 'completed', 'cancelled'] as const;
export type TournamentStatus = typeof TOURNAMENT_STATUS[number];

export const chessTournaments = pgTable("chess_tournaments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  tournamentType: text("tournament_type").notNull().default('sit_and_go'),
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
  losses: integer("losses").notNull().default(0),
  isEliminated: boolean("is_eliminated").notNull().default(false),
  finalPlacement: integer("final_placement"),
  prizesWon: integer("prizes_won").notNull().default(0),
  joinedAt: timestamp("joined_at").notNull().default(sql`now()`),
});

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

export type ChessTournament = typeof chessTournaments.$inferSelect;
export type InsertChessTournament = z.infer<typeof insertChessTournamentSchema>;
export type ChessTournamentParticipant = typeof chessTournamentParticipants.$inferSelect;
export type InsertChessTournamentParticipant = z.infer<typeof insertChessTournamentParticipantSchema>;
export type ChessTournamentMatch = typeof chessTournamentMatches.$inferSelect;
export type InsertChessTournamentMatch = z.infer<typeof insertChessTournamentMatchSchema>;
