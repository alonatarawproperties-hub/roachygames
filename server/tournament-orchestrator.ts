import { db } from "./db";
import { chessTournaments, chessTournamentParticipants, chessTournamentMatches, chessMatches } from "@shared/schema";
import { eq, and, lt, gte, sql, inArray, isNull } from "drizzle-orm";

const TICK_INTERVAL = 15000;
const SIT_AND_GO_MIN_POOL = 2;

interface TournamentTemplate {
  name: string;
  tournamentType: 'sit_and_go' | 'daily' | 'weekly' | 'monthly';
  timeControl: string;
  entryFee: number;
  maxPlayers: number;
  minPlayers: number;
}

const DEFAULT_TEMPLATES: TournamentTemplate[] = [
  { name: 'Quick 8', tournamentType: 'sit_and_go', timeControl: 'blitz', entryFee: 0, maxPlayers: 8, minPlayers: 2 },
  { name: 'Diamond Rush', tournamentType: 'sit_and_go', timeControl: 'blitz', entryFee: 10, maxPlayers: 8, minPlayers: 4 },
  { name: 'Rapid Arena', tournamentType: 'sit_and_go', timeControl: 'rapid', entryFee: 25, maxPlayers: 8, minPlayers: 4 },
  { name: 'Elite 8', tournamentType: 'sit_and_go', timeControl: 'blitz', entryFee: 100, maxPlayers: 8, minPlayers: 8 },
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

  start() {
    if (this.isRunning) {
      console.log('[TournamentOrchestrator] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[TournamentOrchestrator] Starting automatic tournament management');

    this.tick();
    this.tickInterval = setInterval(() => this.tick(), TICK_INTERVAL);
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
      await this.ensureSitAndGoPool();
      await this.startReadyTournaments();
      await this.checkMatchCompletions();
      await this.advanceBrackets();
      await this.finalizeTournaments();
    } catch (error) {
      console.error('[TournamentOrchestrator] Tick error:', error);
    }
  }

  private async ensureSitAndGoPool() {
    for (const template of DEFAULT_TEMPLATES) {
      const openTournaments = await db
        .select()
        .from(chessTournaments)
        .where(
          and(
            eq(chessTournaments.tournamentType, template.tournamentType),
            eq(chessTournaments.timeControl, template.timeControl),
            eq(chessTournaments.entryFee, template.entryFee),
            eq(chessTournaments.maxPlayers, template.maxPlayers),
            eq(chessTournaments.status, 'registering')
          )
        );

      const needToCreate = SIT_AND_GO_MIN_POOL - openTournaments.length;
      
      if (needToCreate > 0) {
        for (let i = 0; i < needToCreate; i++) {
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
        isAgainstBot: false,
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

    console.log(`[TournamentOrchestrator] Created chess match ${newMatch.id} for tournament match ${tourneyMatchId}`);

    return newMatch.id;
  }
}

export const tournamentOrchestrator = new TournamentOrchestrator();
