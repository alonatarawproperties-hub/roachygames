import type { Express, Request, Response } from "express";
import {
  BATTLE_CONFIG,
  STARTER_ROACHIES,
  generateStats,
  calculateDamage,
  calculateMomentumChange,
  resolveCounter,
  calculateNewMmr,
  getRankFromMmr,
  type Skill,
  type SkillType,
  type RoachyStats,
  type StarterRoachy,
  type Rarity,
  type RoachyClass,
} from "./battle-config";

interface BattleRoachy {
  id: string;
  instanceId: string;
  name: string;
  roachyClass: RoachyClass;
  rarity: Rarity;
  stats: RoachyStats;
  skillA: Skill;
  skillB: Skill;
  isKO: boolean;
}

interface PlayerState {
  playerId: string;
  team: BattleRoachy[];
  activeIndex: number;
  momentum: number;
  kos: number;
}

interface TurnAction {
  roachyInstanceId: string;
  skillId: 'A' | 'B';
}

interface TurnResult {
  player1Action: TurnAction | null;
  player2Action: TurnAction | null;
  player1Damage: number;
  player2Damage: number;
  player1Skill: Skill | null;
  player2Skill: Skill | null;
  player1Counter: string;
  player2Counter: string;
  player1MomentumChange: number;
  player2MomentumChange: number;
  player1Healed: number;
  player2Healed: number;
  player1Crit: boolean;
  player2Crit: boolean;
  koEvents: Array<{ playerId: string; roachyId: string }>;
}

interface MatchState {
  matchId: string;
  player1: PlayerState;
  player2: PlayerState;
  currentTurn: number;
  status: 'team_select' | 'active' | 'completed';
  winner: string | null;
  winReason: 'ko' | 'turns' | 'forfeit' | null;
  turnHistory: TurnResult[];
  pendingActions: {
    player1: TurnAction | null;
    player2: TurnAction | null;
  };
  createdAt: Date;
  lastActionAt: Date;
  isAgainstBot: boolean;
  player1TeamSubmitted: boolean;
  player2TeamSubmitted: boolean;
}

interface QueueEntry {
  playerId: string;
  mmr: number;
  joinedAt: Date;
}

interface PlayerStats {
  playerId: string;
  mmr: number;
  wins: number;
  losses: number;
  draws: number;
}

const matchStore: Map<string, MatchState> = new Map();
const queueStore: Map<string, QueueEntry> = new Map();
const playerStatsStore: Map<string, PlayerStats> = new Map();
const playerMatchMap: Map<string, string> = new Map();

function generateMatchId(): string {
  return `battle_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateInstanceId(): string {
  return `inst_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getOrCreatePlayerStats(playerId: string): PlayerStats {
  let stats = playerStatsStore.get(playerId);
  if (!stats) {
    stats = {
      playerId,
      mmr: BATTLE_CONFIG.STARTING_MMR,
      wins: 0,
      losses: 0,
      draws: 0,
    };
    playerStatsStore.set(playerId, stats);
  }
  return stats;
}

function createMockRoster(playerId: string): BattleRoachy[] {
  const roster: BattleRoachy[] = [];
  const shuffled = [...STARTER_ROACHIES].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < Math.min(BATTLE_CONFIG.ROSTER_SIZE, shuffled.length); i++) {
    const template = shuffled[i];
    roster.push({
      id: template.id,
      instanceId: generateInstanceId(),
      name: template.name,
      roachyClass: template.roachyClass,
      rarity: template.rarity,
      stats: generateStats(template.rarity, template.roachyClass),
      skillA: template.skillA,
      skillB: template.skillB,
      isKO: false,
    });
  }
  
  return roster;
}

function createBotPlayer(): PlayerState {
  const botRoster = createMockRoster('BOT_PLAYER');
  const botTeam = botRoster.slice(0, BATTLE_CONFIG.TEAM_SIZE);
  
  return {
    playerId: 'BOT_PLAYER',
    team: botTeam,
    activeIndex: 0,
    momentum: BATTLE_CONFIG.STARTING_MOMENTUM,
    kos: 0,
  };
}

function selectBotAction(botState: PlayerState, enemyState: PlayerState): TurnAction {
  const activeRoachy = botState.team[botState.activeIndex];
  const enemyRoachy = enemyState.team[enemyState.activeIndex];
  
  if (!activeRoachy || activeRoachy.isKO) {
    for (let i = 0; i < botState.team.length; i++) {
      if (!botState.team[i].isKO) {
        botState.activeIndex = i;
        return { roachyInstanceId: botState.team[i].instanceId, skillId: 'A' };
      }
    }
    return { roachyInstanceId: activeRoachy?.instanceId || '', skillId: 'A' };
  }
  
  const hpPercent = activeRoachy.stats.hp / activeRoachy.stats.maxHp;
  if (hpPercent < 0.3 && (activeRoachy.skillA.type === 'GUARD' || activeRoachy.skillB.type === 'GUARD')) {
    return {
      roachyInstanceId: activeRoachy.instanceId,
      skillId: activeRoachy.skillA.type === 'GUARD' ? 'A' : 'B',
    };
  }
  
  const lastTurn = enemyState.team[enemyState.activeIndex];
  if (lastTurn) {
    if (activeRoachy.skillA.type === 'PIERCE' || activeRoachy.skillB.type === 'PIERCE') {
      return {
        roachyInstanceId: activeRoachy.instanceId,
        skillId: activeRoachy.skillA.type === 'PIERCE' ? 'A' : 'B',
      };
    }
  }
  
  const skillAMult = activeRoachy.skillA.multiplier || 0;
  const skillBMult = activeRoachy.skillB.multiplier || 0;
  
  return {
    roachyInstanceId: activeRoachy.instanceId,
    skillId: skillAMult >= skillBMult ? 'A' : 'B',
  };
}

function resolveTurn(match: MatchState): TurnResult {
  const p1Action = match.pendingActions.player1;
  const p2Action = match.pendingActions.player2;
  
  const p1Roachy = match.player1.team[match.player1.activeIndex];
  const p2Roachy = match.player2.team[match.player2.activeIndex];
  
  const p1Skill = p1Action?.skillId === 'A' ? p1Roachy?.skillA : p1Roachy?.skillB;
  const p2Skill = p2Action?.skillId === 'A' ? p2Roachy?.skillA : p2Roachy?.skillB;
  
  const result: TurnResult = {
    player1Action: p1Action,
    player2Action: p2Action,
    player1Damage: 0,
    player2Damage: 0,
    player1Skill: p1Skill || null,
    player2Skill: p2Skill || null,
    player1Counter: 'NONE',
    player2Counter: 'NONE',
    player1MomentumChange: 0,
    player2MomentumChange: 0,
    player1Healed: 0,
    player2Healed: 0,
    player1Crit: false,
    player2Crit: false,
    koEvents: [],
  };
  
  if (!p1Roachy || !p2Roachy || !p1Skill || !p2Skill) {
    return result;
  }
  
  const p1Type: SkillType = p1Skill.type;
  const p2Type: SkillType = p2Skill.type;
  
  const p2DamageReduction = p2Skill.damageReduction || 0;
  const p1DamageResult = calculateDamage(
    p1Roachy.stats.atk,
    p2Roachy.stats.def,
    p1Skill.multiplier,
    p1Type,
    p2Type,
    p2DamageReduction
  );
  
  const p1DamageReduction = p1Skill.damageReduction || 0;
  const p2DamageResult = calculateDamage(
    p2Roachy.stats.atk,
    p1Roachy.stats.def,
    p2Skill.multiplier,
    p2Type,
    p1Type,
    p1DamageReduction
  );
  
  result.player1Damage = p1DamageResult.damage;
  result.player2Damage = p2DamageResult.damage;
  result.player1Counter = p1DamageResult.counterType;
  result.player2Counter = p2DamageResult.counterType;
  result.player1Crit = p1DamageResult.isCrit;
  result.player2Crit = p2DamageResult.isCrit;
  
  const p2UsedBurst = p2Type === 'BURST';
  const p1UsedBurst = p1Type === 'BURST';
  
  const p1Counter = resolveCounter(p1Type, p2Type);
  const p2Counter = resolveCounter(p2Type, p1Type);
  
  result.player1MomentumChange = calculateMomentumChange(p1Skill, p1Counter, p2UsedBurst);
  result.player2MomentumChange = calculateMomentumChange(p2Skill, p2Counter, p1UsedBurst);
  
  if (p1Type !== 'FOCUS') {
    p2Roachy.stats.hp = Math.max(0, p2Roachy.stats.hp - p1DamageResult.damage);
  }
  if (p2Type !== 'FOCUS') {
    p1Roachy.stats.hp = Math.max(0, p1Roachy.stats.hp - p2DamageResult.damage);
  }
  
  if (p1Skill.healAllyPercent && match.player1.team.length > 1) {
    const allyIndex = match.player1.activeIndex === 0 ? 1 : 0;
    const ally = match.player1.team[allyIndex];
    if (ally && !ally.isKO) {
      const healAmount = Math.floor(ally.stats.maxHp * p1Skill.healAllyPercent);
      ally.stats.hp = Math.min(ally.stats.maxHp, ally.stats.hp + healAmount);
      result.player1Healed = healAmount;
    }
  }
  
  if (p2Skill.healAllyPercent && match.player2.team.length > 1) {
    const allyIndex = match.player2.activeIndex === 0 ? 1 : 0;
    const ally = match.player2.team[allyIndex];
    if (ally && !ally.isKO) {
      const healAmount = Math.floor(ally.stats.maxHp * p2Skill.healAllyPercent);
      ally.stats.hp = Math.min(ally.stats.maxHp, ally.stats.hp + healAmount);
      result.player2Healed = healAmount;
    }
  }
  
  match.player1.momentum = Math.max(
    BATTLE_CONFIG.MIN_MOMENTUM,
    Math.min(BATTLE_CONFIG.MAX_MOMENTUM, match.player1.momentum + result.player1MomentumChange)
  );
  match.player2.momentum = Math.max(
    BATTLE_CONFIG.MIN_MOMENTUM,
    Math.min(BATTLE_CONFIG.MAX_MOMENTUM, match.player2.momentum + result.player2MomentumChange)
  );
  
  if (p2Roachy.stats.hp <= 0) {
    p2Roachy.isKO = true;
    match.player1.kos++;
    result.koEvents.push({ playerId: match.player2.playerId, roachyId: p2Roachy.instanceId });
    
    for (let i = 0; i < match.player2.team.length; i++) {
      if (!match.player2.team[i].isKO) {
        match.player2.activeIndex = i;
        break;
      }
    }
  }
  
  if (p1Roachy.stats.hp <= 0) {
    p1Roachy.isKO = true;
    match.player2.kos++;
    result.koEvents.push({ playerId: match.player1.playerId, roachyId: p1Roachy.instanceId });
    
    for (let i = 0; i < match.player1.team.length; i++) {
      if (!match.player1.team[i].isKO) {
        match.player1.activeIndex = i;
        break;
      }
    }
  }
  
  return result;
}

function checkMatchEnd(match: MatchState): void {
  if (match.player1.kos >= BATTLE_CONFIG.KOS_TO_WIN) {
    match.status = 'completed';
    match.winner = match.player1.playerId;
    match.winReason = 'ko';
    return;
  }
  
  if (match.player2.kos >= BATTLE_CONFIG.KOS_TO_WIN) {
    match.status = 'completed';
    match.winner = match.player2.playerId;
    match.winReason = 'ko';
    return;
  }
  
  if (match.currentTurn >= BATTLE_CONFIG.MAX_TURNS) {
    match.status = 'completed';
    match.winReason = 'turns';
    
    const p1TotalHp = match.player1.team.reduce((sum, r) => sum + r.stats.hp, 0);
    const p1MaxHp = match.player1.team.reduce((sum, r) => sum + r.stats.maxHp, 0);
    const p1HpPercent = p1TotalHp / p1MaxHp;
    
    const p2TotalHp = match.player2.team.reduce((sum, r) => sum + r.stats.hp, 0);
    const p2MaxHp = match.player2.team.reduce((sum, r) => sum + r.stats.maxHp, 0);
    const p2HpPercent = p2TotalHp / p2MaxHp;
    
    if (p1HpPercent > p2HpPercent) {
      match.winner = match.player1.playerId;
    } else if (p2HpPercent > p1HpPercent) {
      match.winner = match.player2.playerId;
    } else {
      match.winner = null;
    }
  }
}

function updatePlayerStatsAfterMatch(match: MatchState): void {
  if (match.player2.playerId === 'BOT_PLAYER') {
    const p1Stats = getOrCreatePlayerStats(match.player1.playerId);
    if (match.winner === match.player1.playerId) {
      p1Stats.wins++;
      p1Stats.mmr += 15;
    } else if (match.winner === 'BOT_PLAYER') {
      p1Stats.losses++;
      p1Stats.mmr = Math.max(0, p1Stats.mmr - 10);
    } else {
      p1Stats.draws++;
    }
    return;
  }
  
  const p1Stats = getOrCreatePlayerStats(match.player1.playerId);
  const p2Stats = getOrCreatePlayerStats(match.player2.playerId);
  
  if (match.winner === match.player1.playerId) {
    const { winnerNew, loserNew } = calculateNewMmr(p1Stats.mmr, p2Stats.mmr);
    p1Stats.mmr = winnerNew;
    p2Stats.mmr = loserNew;
    p1Stats.wins++;
    p2Stats.losses++;
  } else if (match.winner === match.player2.playerId) {
    const { winnerNew, loserNew } = calculateNewMmr(p2Stats.mmr, p1Stats.mmr);
    p2Stats.mmr = winnerNew;
    p1Stats.mmr = loserNew;
    p2Stats.wins++;
    p1Stats.losses++;
  } else {
    const { winnerNew, loserNew } = calculateNewMmr(p1Stats.mmr, p2Stats.mmr, true);
    p1Stats.mmr = winnerNew;
    p2Stats.mmr = loserNew;
    p1Stats.draws++;
    p2Stats.draws++;
  }
}

export function registerBattleRoutes(app: Express) {
  app.post("/api/battles/queue/join", async (req: Request, res: Response) => {
    try {
      const { playerId } = req.body;
      
      if (!playerId) {
        return res.status(400).json({ success: false, error: "Missing playerId" });
      }
      
      const existingMatchId = playerMatchMap.get(playerId);
      if (existingMatchId) {
        const existingMatch = matchStore.get(existingMatchId);
        if (existingMatch && existingMatch.status !== 'completed') {
          return res.json({ success: true, matchFound: true, matchId: existingMatchId });
        }
      }
      
      const stats = getOrCreatePlayerStats(playerId);
      
      queueStore.delete(playerId);
      
      const ratingRange = 200;
      for (const [otherWallet, entry] of queueStore.entries()) {
        if (Math.abs(entry.mmr - stats.mmr) <= ratingRange) {
          queueStore.delete(otherWallet);
          
          const matchId = generateMatchId();
          const match: MatchState = {
            matchId,
            player1: {
              playerId,
              team: [],
              activeIndex: 0,
              momentum: BATTLE_CONFIG.STARTING_MOMENTUM,
              kos: 0,
            },
            player2: {
              playerId: otherWallet,
              team: [],
              activeIndex: 0,
              momentum: BATTLE_CONFIG.STARTING_MOMENTUM,
              kos: 0,
            },
            currentTurn: 0,
            status: 'team_select',
            winner: null,
            winReason: null,
            turnHistory: [],
            pendingActions: { player1: null, player2: null },
            createdAt: new Date(),
            lastActionAt: new Date(),
            isAgainstBot: false,
            player1TeamSubmitted: false,
            player2TeamSubmitted: false,
          };
          
          matchStore.set(matchId, match);
          playerMatchMap.set(playerId, matchId);
          playerMatchMap.set(otherWallet, matchId);
          
          return res.json({ success: true, matchFound: true, matchId });
        }
      }
      
      queueStore.set(playerId, {
        playerId,
        mmr: stats.mmr,
        joinedAt: new Date(),
      });
      
      res.json({ success: true, matchFound: false, inQueue: true });
    } catch (error) {
      console.error("Error joining battle queue:", error);
      res.status(500).json({ success: false, error: "Failed to join queue" });
    }
  });

  app.post("/api/battles/queue/leave", async (req: Request, res: Response) => {
    try {
      const { playerId } = req.body;
      
      if (!playerId) {
        return res.status(400).json({ success: false, error: "Missing playerId" });
      }
      
      queueStore.delete(playerId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error leaving battle queue:", error);
      res.status(500).json({ success: false, error: "Failed to leave queue" });
    }
  });

  app.get("/api/battles/queue/check/:playerId", async (req: Request, res: Response) => {
    try {
      const { playerId } = req.params;
      
      const existingMatchId = playerMatchMap.get(playerId);
      if (existingMatchId) {
        const existingMatch = matchStore.get(existingMatchId);
        if (existingMatch && existingMatch.status !== 'completed') {
          return res.json({ matchFound: true, matchId: existingMatchId });
        }
      }
      
      const entry = queueStore.get(playerId);
      if (!entry) {
        return res.json({ matchFound: false, inQueue: false });
      }
      
      const waitTime = Date.now() - entry.joinedAt.getTime();
      
      if (waitTime > BATTLE_CONFIG.QUEUE_TIMEOUT_BOT_MS) {
        queueStore.delete(playerId);
        
        const matchId = generateMatchId();
        const botPlayer = createBotPlayer();
        
        const match: MatchState = {
          matchId,
          player1: {
            playerId,
            team: [],
            activeIndex: 0,
            momentum: BATTLE_CONFIG.STARTING_MOMENTUM,
            kos: 0,
          },
          player2: botPlayer,
          currentTurn: 0,
          status: 'team_select',
          winner: null,
          winReason: null,
          turnHistory: [],
          pendingActions: { player1: null, player2: null },
          createdAt: new Date(),
          lastActionAt: new Date(),
          isAgainstBot: true,
          player1TeamSubmitted: false,
          player2TeamSubmitted: true,
        };
        
        matchStore.set(matchId, match);
        playerMatchMap.set(playerId, matchId);
        
        return res.json({ matchFound: true, matchId, isBot: true });
      }
      
      res.json({ matchFound: false, inQueue: true, waitTime });
    } catch (error) {
      console.error("Error checking battle queue:", error);
      res.status(500).json({ success: false, error: "Failed to check queue" });
    }
  });

  app.get("/api/battles/roster/:playerId", async (req: Request, res: Response) => {
    try {
      const { playerId } = req.params;
      console.log("[Battles] Roster request for playerId:", playerId);
      
      if (!playerId) {
        return res.status(400).json({ success: false, error: "Missing playerId" });
      }
      
      const roster = createMockRoster(playerId);
      console.log("[Battles] Returning roster with", roster.length, "roachies for", playerId);
      res.json({ success: true, roachies: roster });
    } catch (error) {
      console.error("Error fetching battle roster:", error);
      res.status(500).json({ success: false, error: "Failed to fetch roster" });
    }
  });

  app.post("/api/battles/match/submit-team", async (req: Request, res: Response) => {
    try {
      const { playerId, matchId, team } = req.body;
      
      if (!playerId || !matchId || !team || !Array.isArray(team)) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }
      
      if (team.length !== BATTLE_CONFIG.TEAM_SIZE) {
        return res.status(400).json({ success: false, error: `Team must have exactly ${BATTLE_CONFIG.TEAM_SIZE} roachies` });
      }
      
      const match = matchStore.get(matchId);
      if (!match) {
        return res.status(404).json({ success: false, error: "Match not found" });
      }
      
      if (match.status !== 'team_select') {
        return res.status(400).json({ success: false, error: "Match not in team selection phase" });
      }
      
      const isPlayer1 = match.player1.playerId === playerId;
      const isPlayer2 = match.player2.playerId === playerId;
      
      if (!isPlayer1 && !isPlayer2) {
        return res.status(403).json({ success: false, error: "Not a player in this match" });
      }
      
      const battleTeam: BattleRoachy[] = team.map((r: any) => ({
        id: r.id,
        instanceId: r.instanceId || generateInstanceId(),
        name: r.name,
        roachyClass: r.roachyClass,
        rarity: r.rarity,
        stats: r.stats,
        skillA: r.skillA,
        skillB: r.skillB,
        isKO: false,
      }));
      
      if (isPlayer1) {
        match.player1.team = battleTeam;
        match.player1TeamSubmitted = true;
      } else {
        match.player2.team = battleTeam;
        match.player2TeamSubmitted = true;
      }
      
      if (match.player1TeamSubmitted && match.player2TeamSubmitted) {
        match.status = 'active';
        match.currentTurn = 1;
        match.lastActionAt = new Date();
      }
      
      res.json({ success: true, matchStatus: match.status });
    } catch (error) {
      console.error("Error submitting team:", error);
      res.status(500).json({ success: false, error: "Failed to submit team" });
    }
  });

  app.post("/api/battles/match/submit-turn", async (req: Request, res: Response) => {
    try {
      const { playerId, matchId, action } = req.body;
      
      if (!playerId || !matchId || !action) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }
      
      const match = matchStore.get(matchId);
      if (!match) {
        return res.status(404).json({ success: false, error: "Match not found" });
      }
      
      if (match.status !== 'active') {
        return res.status(400).json({ success: false, error: "Match is not active" });
      }
      
      const isPlayer1 = match.player1.playerId === playerId;
      const isPlayer2 = match.player2.playerId === playerId;
      
      if (!isPlayer1 && !isPlayer2) {
        return res.status(403).json({ success: false, error: "Not a player in this match" });
      }
      
      if (isPlayer1) {
        match.pendingActions.player1 = action;
      } else {
        match.pendingActions.player2 = action;
      }
      
      if (match.isAgainstBot && isPlayer1 && !match.pendingActions.player2) {
        match.pendingActions.player2 = selectBotAction(match.player2, match.player1);
      }
      
      if (match.pendingActions.player1 && match.pendingActions.player2) {
        const turnResult = resolveTurn(match);
        match.turnHistory.push(turnResult);
        
        match.pendingActions = { player1: null, player2: null };
        match.currentTurn++;
        match.lastActionAt = new Date();
        
        checkMatchEnd(match);
        
        if ((match as MatchState).status === 'completed') {
          updatePlayerStatsAfterMatch(match);
        }
        
        return res.json({
          success: true,
          turnResolved: true,
          turnResult,
          matchState: {
            currentTurn: match.currentTurn,
            status: match.status,
            winner: match.winner,
            winReason: match.winReason,
            player1: {
              momentum: match.player1.momentum,
              kos: match.player1.kos,
              team: match.player1.team,
              activeIndex: match.player1.activeIndex,
            },
            player2: {
              momentum: match.player2.momentum,
              kos: match.player2.kos,
              team: match.player2.team,
              activeIndex: match.player2.activeIndex,
            },
          },
        });
      }
      
      res.json({ success: true, turnResolved: false, waitingForOpponent: true });
    } catch (error) {
      console.error("Error submitting turn:", error);
      res.status(500).json({ success: false, error: "Failed to submit turn" });
    }
  });

  app.get("/api/battles/match/:matchId", async (req: Request, res: Response) => {
    try {
      const { matchId } = req.params;
      const { playerId } = req.query;
      
      const match = matchStore.get(matchId);
      if (!match) {
        return res.status(404).json({ success: false, error: "Match not found" });
      }
      
      res.json({
        success: true,
        match: {
          matchId: match.matchId,
          status: match.status,
          currentTurn: match.currentTurn,
          winner: match.winner,
          winReason: match.winReason,
          isAgainstBot: match.isAgainstBot,
          player1: {
            playerId: match.player1.playerId,
            momentum: match.player1.momentum,
            kos: match.player1.kos,
            team: match.player1.team,
            activeIndex: match.player1.activeIndex,
            teamSubmitted: match.player1TeamSubmitted,
          },
          player2: {
            playerId: match.player2.playerId,
            momentum: match.player2.momentum,
            kos: match.player2.kos,
            team: match.player2.team,
            activeIndex: match.player2.activeIndex,
            teamSubmitted: match.player2TeamSubmitted,
          },
          turnHistory: match.turnHistory,
          hasPendingAction: playerId === match.player1.playerId
            ? !!match.pendingActions.player1
            : !!match.pendingActions.player2,
        },
      });
    } catch (error) {
      console.error("Error fetching match:", error);
      res.status(500).json({ success: false, error: "Failed to fetch match" });
    }
  });

  app.post("/api/battles/match/forfeit", async (req: Request, res: Response) => {
    try {
      const { playerId, matchId } = req.body;
      
      if (!playerId || !matchId) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }
      
      const match = matchStore.get(matchId);
      if (!match) {
        return res.status(404).json({ success: false, error: "Match not found" });
      }
      
      if (match.status === 'completed') {
        return res.status(400).json({ success: false, error: "Match already completed" });
      }
      
      const isPlayer1 = match.player1.playerId === playerId;
      const isPlayer2 = match.player2.playerId === playerId;
      
      if (!isPlayer1 && !isPlayer2) {
        return res.status(403).json({ success: false, error: "Not a player in this match" });
      }
      
      match.status = 'completed';
      match.winReason = 'forfeit';
      match.winner = isPlayer1 ? match.player2.playerId : match.player1.playerId;
      
      updatePlayerStatsAfterMatch(match);
      
      res.json({ success: true, winner: match.winner });
    } catch (error) {
      console.error("Error forfeiting match:", error);
      res.status(500).json({ success: false, error: "Failed to forfeit match" });
    }
  });

  app.get("/api/battles/stats/:playerId", async (req: Request, res: Response) => {
    try {
      const { playerId } = req.params;
      console.log("[Battles] Stats request for playerId:", playerId);
      
      if (!playerId) {
        console.log("[Battles] Missing playerId in stats request");
        return res.status(400).json({ success: false, error: "Missing playerId" });
      }
      
      const stats = getOrCreatePlayerStats(playerId);
      console.log("[Battles] Returning stats for", playerId, ":", JSON.stringify(stats));
      const rank = getRankFromMmr(stats.mmr);
      
      res.json({
        success: true,
        stats: {
          ...stats,
          rank,
          totalGames: stats.wins + stats.losses + stats.draws,
          winRate: stats.wins + stats.losses > 0
            ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100)
            : 0,
        },
      });
    } catch (error) {
      console.error("Error fetching battle stats:", error);
      res.status(500).json({ success: false, error: "Failed to fetch stats" });
    }
  });
}
