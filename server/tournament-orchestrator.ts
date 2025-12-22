import { db } from "./db";
import { chessTournaments, chessTournamentParticipants, chessTournamentMatches, chessMatches } from "@shared/schema";
import { eq, and, lt, gte, sql, inArray, isNull } from "drizzle-orm";

const TICK_INTERVAL = 15000;
const SIT_AND_GO_MIN_POOL = 1;
const FREE_TOURNAMENT_BOT_FILL_DELAY_MS = 10 * 60 * 1000; // 10 minutes

// Human-like bot names (no obvious "bot" patterns)
const BOT_FIRST_NAMES = [
  'Alex', 'Jordan', 'Casey', 'Morgan', 'Riley', 'Quinn', 'Avery', 'Taylor',
  'Jamie', 'Sage', 'Dakota', 'Phoenix', 'River', 'Skyler', 'Blake', 'Cameron',
  'Drew', 'Finley', 'Harper', 'Logan', 'Mason', 'Noah', 'Peyton', 'Reese',
  'Mika', 'Sasha', 'Kai', 'Remy', 'Ellis', 'Parker', 'Rowan', 'Hayden',
  'Charlie', 'Emerson', 'Jessie', 'Kerry', 'Lee', 'Max', 'Pat', 'Sam',
  'Toni', 'Val', 'Wren', 'Zion', 'Ari', 'Bay', 'Cody', 'Devon'
];

const BOT_LAST_NAMES = [
  'Knight', 'Storm', 'Wolf', 'Swift', 'Stone', 'Frost', 'Blaze', 'Cross',
  'Steel', 'Hawk', 'Fox', 'Reed', 'Nash', 'Cole', 'Grey', 'Price',
  'Lane', 'Hayes', 'Wells', 'Hunt', 'Clay', 'Flynn', 'Ross', 'Cruz',
  'Wade', 'Cash', 'Pike', 'Webb', 'Dunn', 'Vega', 'Chen', 'Park',
  'Kim', 'Shah', 'Patel', 'Singh', 'Wong', 'Lee', 'Zhao', 'Kumar'
];

const BOT_SUFFIXES = ['', '', '', '', '99', '23', 'x', '_gg', '77', '88', '11', ''];

function generateBotName(): string {
  const firstName = BOT_FIRST_NAMES[Math.floor(Math.random() * BOT_FIRST_NAMES.length)];
  const lastName = BOT_LAST_NAMES[Math.floor(Math.random() * BOT_LAST_NAMES.length)];
  const suffix = BOT_SUFFIXES[Math.floor(Math.random() * BOT_SUFFIXES.length)];
  
  const formats = [
    `${firstName}${lastName}${suffix}`,
    `${firstName}_${lastName}${suffix}`,
    `${firstName.toLowerCase()}${lastName.toLowerCase()}${suffix}`,
    `${firstName}${suffix}`,
    `${lastName}${firstName.slice(0, 1)}${suffix}`,
  ];
  
  return formats[Math.floor(Math.random() * formats.length)];
}

function generateBotWallet(botName: string): string {
  // Generate a fake wallet-like address for bots
  const randomHex = Array.from({ length: 32 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  return `BOT_${botName}_${randomHex.slice(0, 16)}`;
}

function isBot(walletAddress: string | null): boolean {
  return walletAddress?.startsWith('BOT_') ?? false;
}

interface TournamentTemplate {
  name: string;
  tournamentType: 'sit_and_go' | 'daily' | 'weekly' | 'monthly';
  timeControl: string;
  entryFee: number;
  maxPlayers: number;
  minPlayers: number;
}

const DEFAULT_TEMPLATES: TournamentTemplate[] = [
  { name: 'Quick 8 - Free', tournamentType: 'sit_and_go', timeControl: 'blitz', entryFee: 0, maxPlayers: 8, minPlayers: 2 },
  { name: 'Quick 8 - Entry', tournamentType: 'sit_and_go', timeControl: 'blitz', entryFee: 5, maxPlayers: 8, minPlayers: 4 },
  { name: 'Diamond Rush', tournamentType: 'sit_and_go', timeControl: 'rapid', entryFee: 10, maxPlayers: 8, minPlayers: 4 },
  { name: 'Rapid Arena', tournamentType: 'sit_and_go', timeControl: 'rapid', entryFee: 25, maxPlayers: 8, minPlayers: 4 },
  { name: 'Elite 8', tournamentType: 'sit_and_go', timeControl: 'rapid', entryFee: 50, maxPlayers: 8, minPlayers: 4 },
];

function calculateTotalRounds(playerCount: number): number {
  return Math.ceil(Math.log2(playerCount));
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

class TournamentOrchestrator {
  private isRunning = false;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private consecutiveErrors = 0;

  start() {
    if (this.isRunning) {
      console.log('[TournamentOrchestrator] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[TournamentOrchestrator] Starting automatic tournament management');

    // Delay first tick by 5 seconds to let DB warm up
    setTimeout(() => {
      this.tick();
      this.tickInterval = setInterval(() => this.tick(), TICK_INTERVAL);
    }, 5000);
  }

  stop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.isRunning = false;
    console.log('[TournamentOrchestrator] Stopped');
  }

  private async tick() {
    try {
      console.log('[TournamentOrchestrator] Tick starting...');
      await this.ensureSitAndGoPool();
      await this.fillFreeTournamentsWithBots();
      await this.startReadyTournaments();
      await this.checkMatchCompletions();
      await this.advanceBrackets();
      await this.finalizeTournaments();
      await this.checkArenaTournamentEnd();
      this.consecutiveErrors = 0;
      console.log('[TournamentOrchestrator] Tick completed');
    } catch (error: any) {
      this.consecutiveErrors++;
      if (this.consecutiveErrors <= 3) {
        console.error('[TournamentOrchestrator] Tick error (attempt ' + this.consecutiveErrors + '):', error?.message || error);
      } else if (this.consecutiveErrors === 4) {
        console.error('[TournamentOrchestrator] Multiple DB errors, reducing log frequency');
      }
    }
  }

  private async fillFreeTournamentsWithBots() {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - FREE_TOURNAMENT_BOT_FILL_DELAY_MS);

    // Find free sit_and_go tournaments that have been registering for 10+ minutes
    // and have at least 1 human player but are not full
    const freeTournaments = await db
      .select()
      .from(chessTournaments)
      .where(
        and(
          eq(chessTournaments.tournamentType, 'sit_and_go'),
          eq(chessTournaments.status, 'registering'),
          eq(chessTournaments.entryFee, 0)
        )
      );

    for (const tournament of freeTournaments) {
      // Check if tournament has been registering for at least 10 minutes
      const createdAt = new Date(tournament.createdAt);
      if (createdAt > cutoffTime) {
        continue; // Not old enough yet
      }

      // Check if it has at least 1 player and is not full
      if (tournament.currentPlayers === 0 || tournament.currentPlayers >= tournament.maxPlayers) {
        continue; // No players or already full
      }

      // Get existing participants to avoid duplicate bot names
      const existingParticipants = await db
        .select()
        .from(chessTournamentParticipants)
        .where(eq(chessTournamentParticipants.tournamentId, tournament.id));

      const existingWallets = new Set(existingParticipants.map(p => p.walletAddress));
      const slotsToFill = tournament.maxPlayers - tournament.currentPlayers;

      console.log(`[TournamentOrchestrator] Filling ${slotsToFill} slots with bots in "${tournament.name}"`);

      // Add bots to fill remaining slots
      for (let i = 0; i < slotsToFill; i++) {
        let botName: string;
        let botWallet: string;
        let attempts = 0;

        // Generate unique bot name/wallet
        do {
          botName = generateBotName();
          botWallet = generateBotWallet(botName);
          attempts++;
        } while (existingWallets.has(botWallet) && attempts < 20);

        existingWallets.add(botWallet);

        await db.insert(chessTournamentParticipants).values({
          tournamentId: tournament.id,
          walletAddress: botWallet,
        });
      }

      // Update player count
      await db
        .update(chessTournaments)
        .set({ currentPlayers: tournament.maxPlayers })
        .where(eq(chessTournaments.id, tournament.id));

      console.log(`[TournamentOrchestrator] Filled "${tournament.name}" with ${slotsToFill} bots, now ready to start`);
    }
  }

  private async checkArenaTournamentEnd() {
    const now = new Date();
    const activeArenaTournaments = await db
      .select()
      .from(chessTournaments)
      .where(
        and(
          eq(chessTournaments.status, 'active'),
          eq(chessTournaments.tournamentFormat, 'arena')
        )
      );

    for (const tournament of activeArenaTournaments) {
      if (tournament.scheduledEndAt && new Date(tournament.scheduledEndAt) <= now) {
        await this.finalizeArenaTournament(tournament.id);
      }
    }
  }

  private async finalizeArenaTournament(tournamentId: string) {
    console.log(`[TournamentOrchestrator] Finalizing arena tournament ${tournamentId}`);

    const tournament = await db.select().from(chessTournaments).where(eq(chessTournaments.id, tournamentId)).limit(1);
    if (tournament.length === 0) return;

    const participants = await db
      .select()
      .from(chessTournamentParticipants)
      .where(eq(chessTournamentParticipants.tournamentId, tournamentId));

    if (participants.length === 0) {
      await db.update(chessTournaments)
        .set({ status: 'cancelled', endedAt: new Date() })
        .where(eq(chessTournaments.id, tournamentId));
      return;
    }

    const sortedByPoints = [...participants].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.gamesPlayed - a.gamesPlayed;
    });

    const prizePool = tournament[0].prizePool;
    const prizes = [
      Math.floor(prizePool * 0.60),
      Math.floor(prizePool * 0.25),
      Math.floor(prizePool * 0.15),
    ];

    for (let i = 0; i < sortedByPoints.length; i++) {
      const prize = i < prizes.length ? prizes[i] : 0;
      await db.update(chessTournamentParticipants)
        .set({
          finalPlacement: i + 1,
          prizesWon: prize,
        })
        .where(eq(chessTournamentParticipants.id, sortedByPoints[i].id));
    }

    const winner = sortedByPoints[0];
    await db.update(chessTournaments)
      .set({
        status: 'completed',
        winnerWallet: winner.walletAddress,
        endedAt: new Date(),
      })
      .where(eq(chessTournaments.id, tournamentId));

    console.log(`[TournamentOrchestrator] Arena tournament ${tournamentId} completed! Winner: ${winner.walletAddress} with ${winner.points} points`);
  }

  private async ensureSitAndGoPool() {
    // First, clean up ALL sit_and_go tournaments that are empty (no players) and in registering status
    // Then create exactly 1 per template
    
    // Get all registering sit_and_go tournaments
    const allSitAndGo = await db
      .select()
      .from(chessTournaments)
      .where(
        and(
          eq(chessTournaments.tournamentType, 'sit_and_go'),
          eq(chessTournaments.status, 'registering')
        )
      );
    
    // Group by entry fee to identify duplicates
    const templateEntryFees = new Set(DEFAULT_TEMPLATES.map(t => t.entryFee));
    const validTournamentIds = new Set<string>();
    
    for (const template of DEFAULT_TEMPLATES) {
      // Find tournaments matching this template
      const matching = allSitAndGo.filter(t => 
        t.entryFee === template.entryFee && 
        t.currentPlayers === 0
      );
      
      // Keep the first one (oldest), mark others for deletion
      if (matching.length > 0) {
        validTournamentIds.add(matching[0].id);
      }
    }
    
    // Delete all empty sit_and_go tournaments that aren't in our valid set
    // or have entry fees that don't match our templates
    for (const tournament of allSitAndGo) {
      const isValidTemplate = templateEntryFees.has(tournament.entryFee);
      const isKept = validTournamentIds.has(tournament.id);
      const hasPlayers = tournament.currentPlayers > 0;
      
      if (!hasPlayers && (!isValidTemplate || !isKept)) {
        await db.delete(chessTournaments).where(eq(chessTournaments.id, tournament.id));
        console.log(`[TournamentOrchestrator] Cleaned up duplicate/invalid tournament: ${tournament.name}`);
      }
    }
    
    // Now ensure exactly 1 tournament per template
    for (const template of DEFAULT_TEMPLATES) {
      const openTournaments = await db
        .select()
        .from(chessTournaments)
        .where(
          and(
            eq(chessTournaments.tournamentType, template.tournamentType),
            eq(chessTournaments.entryFee, template.entryFee),
            eq(chessTournaments.status, 'registering')
          )
        );

      if (openTournaments.length === 0) {
        const prizePool = Math.floor(template.entryFee * template.maxPlayers * 0.85);
        const rakeAmount = Math.floor(template.entryFee * template.maxPlayers * 0.15);
        
        await db.insert(chessTournaments).values({
          name: `${template.name} #${Date.now().toString(36).slice(-4).toUpperCase()}`,
          tournamentType: template.tournamentType,
          timeControl: template.timeControl,
          entryFee: template.entryFee,
          prizePool,
          rakeAmount,
          maxPlayers: template.maxPlayers,
          minPlayers: template.minPlayers,
          totalRounds: calculateTotalRounds(template.maxPlayers),
          status: 'registering',
        });
        
        console.log(`[TournamentOrchestrator] Created new ${template.name} tournament`);
      }
    }
  }

  private async startReadyTournaments() {
    const readyTournaments = await db
      .select()
      .from(chessTournaments)
      .where(eq(chessTournaments.status, 'registering'));

    for (const tournament of readyTournaments) {
      const isFull = tournament.currentPlayers >= tournament.maxPlayers;
      const hasMinPlayers = tournament.currentPlayers >= tournament.minPlayers;
      const isScheduledToStart = tournament.scheduledStartAt && new Date(tournament.scheduledStartAt) <= new Date();

      if (isFull || (hasMinPlayers && isScheduledToStart)) {
        await this.startTournament(tournament.id);
      }
    }
  }

  private async startTournament(tournamentId: string) {
    console.log(`[TournamentOrchestrator] Starting tournament ${tournamentId}`);

    const participants = await db
      .select()
      .from(chessTournamentParticipants)
      .where(eq(chessTournamentParticipants.tournamentId, tournamentId));

    if (participants.length < 2) {
      console.log(`[TournamentOrchestrator] Not enough participants for ${tournamentId}`);
      return;
    }

    const shuffled = shuffleArray(participants);
    for (let i = 0; i < shuffled.length; i++) {
      await db
        .update(chessTournamentParticipants)
        .set({ seed: i + 1 })
        .where(eq(chessTournamentParticipants.id, shuffled[i].id));
    }

    const totalRounds = calculateTotalRounds(shuffled.length);
    const firstRoundMatches = Math.ceil(shuffled.length / 2);

    for (let i = 0; i < firstRoundMatches; i++) {
      const player1 = shuffled[i * 2];
      const player2 = shuffled[i * 2 + 1];

      await db.insert(chessTournamentMatches).values({
        tournamentId,
        roundNumber: 1,
        matchNumber: i + 1,
        player1Wallet: player1.walletAddress,
        player2Wallet: player2?.walletAddress || null,
        status: player2 ? 'pending' : 'completed',
        winnerWallet: player2 ? null : player1.walletAddress,
      });

      if (!player2) {
        console.log(`[TournamentOrchestrator] Bye given to ${player1.walletAddress}`);
      }
    }

    await db
      .update(chessTournaments)
      .set({
        status: 'active',
        currentRound: 1,
        totalRounds,
        startedAt: new Date(),
      })
      .where(eq(chessTournaments.id, tournamentId));

    console.log(`[TournamentOrchestrator] Tournament ${tournamentId} started with ${shuffled.length} players`);
  }

  private async checkMatchCompletions() {
    const activeMatches = await db
      .select()
      .from(chessTournamentMatches)
      .where(
        and(
          eq(chessTournamentMatches.status, 'active'),
          sql`${chessTournamentMatches.chessMatchId} IS NOT NULL`
        )
      );

    for (const tourneyMatch of activeMatches) {
      if (!tourneyMatch.chessMatchId) continue;

      const [chessMatch] = await db
        .select()
        .from(chessMatches)
        .where(eq(chessMatches.id, tourneyMatch.chessMatchId));

      if (chessMatch && chessMatch.status === 'completed' && chessMatch.winnerWallet) {
        const winnerWallet = chessMatch.winnerWallet;

        const loserWallet = chessMatch.winnerWallet === chessMatch.player1Wallet 
          ? chessMatch.player2Wallet 
          : chessMatch.player1Wallet;

        await db
          .update(chessTournamentMatches)
          .set({
            status: 'completed',
            winnerWallet,
            endedAt: new Date(),
          })
          .where(eq(chessTournamentMatches.id, tourneyMatch.id));

        await db
          .update(chessTournamentParticipants)
          .set({
            wins: sql`${chessTournamentParticipants.wins} + 1`,
          })
          .where(
            and(
              eq(chessTournamentParticipants.tournamentId, tourneyMatch.tournamentId),
              eq(chessTournamentParticipants.walletAddress, winnerWallet)
            )
          );

        if (loserWallet) {
          await db
            .update(chessTournamentParticipants)
            .set({
              losses: sql`${chessTournamentParticipants.losses} + 1`,
              isEliminated: true,
            })
            .where(
              and(
                eq(chessTournamentParticipants.tournamentId, tourneyMatch.tournamentId),
                eq(chessTournamentParticipants.walletAddress, loserWallet)
              )
            );
        }

        console.log(`[TournamentOrchestrator] Match ${tourneyMatch.id} completed: ${winnerWallet} wins`);
      }
    }
  }

  private async advanceBrackets() {
    const activeTournaments = await db
      .select()
      .from(chessTournaments)
      .where(eq(chessTournaments.status, 'active'));

    for (const tournament of activeTournaments) {
      const currentRoundMatches = await db
        .select()
        .from(chessTournamentMatches)
        .where(
          and(
            eq(chessTournamentMatches.tournamentId, tournament.id),
            eq(chessTournamentMatches.roundNumber, tournament.currentRound)
          )
        );

      const allCompleted = currentRoundMatches.every(m => m.status === 'completed');

      if (allCompleted && currentRoundMatches.length > 0) {
        if (tournament.currentRound >= tournament.totalRounds) {
          continue;
        }

        const winners = currentRoundMatches
          .filter(m => m.winnerWallet)
          .map(m => m.winnerWallet!);

        const nextRound = tournament.currentRound + 1;
        const nextRoundMatches = Math.ceil(winners.length / 2);

        for (let i = 0; i < nextRoundMatches; i++) {
          const player1 = winners[i * 2];
          const player2 = winners[i * 2 + 1];

          await db.insert(chessTournamentMatches).values({
            tournamentId: tournament.id,
            roundNumber: nextRound,
            matchNumber: i + 1,
            player1Wallet: player1,
            player2Wallet: player2 || null,
            status: player2 ? 'pending' : 'completed',
            winnerWallet: player2 ? null : player1,
          });
        }

        await db
          .update(chessTournaments)
          .set({ currentRound: nextRound })
          .where(eq(chessTournaments.id, tournament.id));

        console.log(`[TournamentOrchestrator] Tournament ${tournament.id} advanced to round ${nextRound}`);
      }
    }
  }

  private async finalizeTournaments() {
    const activeTournaments = await db
      .select()
      .from(chessTournaments)
      .where(eq(chessTournaments.status, 'active'));

    for (const tournament of activeTournaments) {
      if (tournament.currentRound < tournament.totalRounds) continue;

      const finalMatches = await db
        .select()
        .from(chessTournamentMatches)
        .where(
          and(
            eq(chessTournamentMatches.tournamentId, tournament.id),
            eq(chessTournamentMatches.roundNumber, tournament.totalRounds)
          )
        );

      const allFinalsCompleted = finalMatches.every(m => m.status === 'completed');

      if (allFinalsCompleted && finalMatches.length > 0) {
        const winner = finalMatches[0].winnerWallet;

        if (winner) {
          const firstPrize = Math.floor(tournament.prizePool * 0.6);
          const secondPrize = Math.floor(tournament.prizePool * 0.25);
          const thirdPrize = Math.floor(tournament.prizePool * 0.15);

          await db
            .update(chessTournamentParticipants)
            .set({ finalPlacement: 1, prizesWon: firstPrize })
            .where(
              and(
                eq(chessTournamentParticipants.tournamentId, tournament.id),
                eq(chessTournamentParticipants.walletAddress, winner)
              )
            );

          const loser = finalMatches[0].player1Wallet === winner 
            ? finalMatches[0].player2Wallet 
            : finalMatches[0].player1Wallet;

          if (loser) {
            await db
              .update(chessTournamentParticipants)
              .set({ finalPlacement: 2, prizesWon: secondPrize })
              .where(
                and(
                  eq(chessTournamentParticipants.tournamentId, tournament.id),
                  eq(chessTournamentParticipants.walletAddress, loser)
                )
              );
          }

          await db
            .update(chessTournaments)
            .set({
              status: 'completed',
              winnerWallet: winner,
              endedAt: new Date(),
            })
            .where(eq(chessTournaments.id, tournament.id));

          console.log(`[TournamentOrchestrator] Tournament ${tournament.id} completed! Winner: ${winner}`);
          console.log(`[TournamentOrchestrator] Prizes distributed: 1st=${firstPrize}, 2nd=${secondPrize}`);
        }
      }
    }
  }

  async createChessMatchForTournament(tourneyMatchId: string): Promise<string | null> {
    const [tourneyMatch] = await db
      .select()
      .from(chessTournamentMatches)
      .where(eq(chessTournamentMatches.id, tourneyMatchId));

    if (!tourneyMatch || !tourneyMatch.player1Wallet || !tourneyMatch.player2Wallet) {
      return null;
    }

    const player1IsBot = isBot(tourneyMatch.player1Wallet);
    const player2IsBot = isBot(tourneyMatch.player2Wallet);

    // If both players are bots, auto-resolve the match with random winner
    if (player1IsBot && player2IsBot) {
      const winner = Math.random() < 0.5 ? tourneyMatch.player1Wallet : tourneyMatch.player2Wallet;
      
      await db
        .update(chessTournamentMatches)
        .set({
          status: 'completed',
          winnerWallet: winner,
          startedAt: new Date(),
          endedAt: new Date(),
        })
        .where(eq(chessTournamentMatches.id, tourneyMatchId));

      console.log(`[TournamentOrchestrator] Bot vs Bot match auto-resolved: ${winner} wins`);
      return null; // No actual chess match needed
    }

    const [tournament] = await db
      .select()
      .from(chessTournaments)
      .where(eq(chessTournaments.id, tourneyMatch.tournamentId));

    if (!tournament) return null;

    const timeControlSeconds: Record<string, number> = {
      bullet: 60,
      blitz: 300,
      rapid: 600,
      classical: 1800,
    };

    const timeLimit = timeControlSeconds[tournament.timeControl] || 300;
    const matchAgainstBot = player1IsBot || player2IsBot;

    const [newMatch] = await db
      .insert(chessMatches)
      .values({
        player1Wallet: tourneyMatch.player1Wallet,
        player2Wallet: tourneyMatch.player2Wallet,
        gameMode: 'ranked',
        timeControl: tournament.timeControl,
        player1TimeRemaining: timeLimit,
        player2TimeRemaining: timeLimit,
        status: 'active',
        wagerAmount: 0,
        isAgainstBot: matchAgainstBot,
      })
      .returning();

    await db
      .update(chessTournamentMatches)
      .set({
        chessMatchId: newMatch.id,
        status: 'active',
        startedAt: new Date(),
      })
      .where(eq(chessTournamentMatches.id, tourneyMatchId));

    console.log(`[TournamentOrchestrator] Created chess match ${newMatch.id} for tournament match ${tourneyMatchId}${matchAgainstBot ? ' (vs bot)' : ''}`);

    return newMatch.id;
  }
}

export const tournamentOrchestrator = new TournamentOrchestrator();
