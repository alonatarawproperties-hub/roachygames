import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import * as Crypto from "expo-crypto";

export type CompetitionType = "ranked" | "boss" | "custom";
export type CompetitionPeriod = "daily" | "weekly" | "one-time";

export interface Competition {
  id: string;
  name: string;
  status: "scheduled" | "active" | "finalizing" | "closed";
  entryFee: number;
  prizePool: number;
  startsAt: string;
  endsAt: string;
  maxEntries?: number;
  currentEntries?: number;
  type?: CompetitionType;
  period?: CompetitionPeriod;
  basePrizeBoost?: number;
}

export interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  displayName: string;
  score: number;
  submittedAt: string;
}

export interface Winner {
  rank: number;
  walletAddress: string;
  displayName: string;
  score: number;
  prize: number;
}

export interface SubmitScoreRequest {
  competitionId: string;
  walletAddress: string;
  displayName: string;
  score: number;
  runId: string;
  powerUpsUsed?: string[];
}

export interface SubmitScoreResponse {
  success: boolean;
  message?: string;
  rank?: number;
  isNewHighScore?: boolean;
  previousBest?: number;
  error?: string;
}

interface ActiveCompetitionsResponse {
  success: boolean;
  competitions: Competition[];
}

export function useActiveCompetitions() {
  return useQuery<Competition[], Error>({
    queryKey: ["/api/competitions/active"],
    staleTime: 60_000,
    refetchInterval: 60_000,
    select: (data: any) => {
      if (data?.competitions && Array.isArray(data.competitions)) {
        return data.competitions.map((c: any) => ({
          id: c.id,
          name: c.name,
          status: c.status,
          entryFee: c.entryFee ?? 0,
          prizePool: c.prizePool ?? 0,
          startsAt: c.startsAt,
          endsAt: c.endsAt,
          maxEntries: c.maxEntries,
          currentEntries: c.participantCount ?? c.currentEntries,
          type: c.type ?? "boss",
          period: c.period ?? "one-time",
          basePrizeBoost: c.basePrizeBoost ?? 0,
        }));
      }
      if (Array.isArray(data)) {
        return data;
      }
      return [];
    },
  });
}

export function filterRankedCompetitions(competitions: Competition[]): Competition[] {
  return competitions.filter((c) => c.type === "ranked");
}

export function filterBossCompetitions(competitions: Competition[]): Competition[] {
  // Boss challenges include type: "boss", "custom", or undefined (default to boss)
  return competitions.filter((c) => c.type === "boss" || c.type === "custom" || !c.type);
}

export function getRankedByPeriod(
  competitions: Competition[],
  period: "daily" | "weekly"
): Competition | undefined {
  return competitions.find((c) => c.type === "ranked" && c.period === period);
}

export function useCompetition(competitionId: string | null) {
  return useQuery<Competition>({
    queryKey: ["/api/competitions", competitionId],
    enabled: !!competitionId,
    staleTime: 30_000,
  });
}

export function useCompetitionLeaderboard(
  competitionId: string | null,
  options?: { refetchInterval?: number }
) {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/competitions", competitionId, "leaderboard"],
    enabled: !!competitionId,
    staleTime: 30_000,
    refetchInterval: options?.refetchInterval,
  });
}

export function useCompetitionWinners(competitionId: string | null) {
  return useQuery<Winner[]>({
    queryKey: ["/api/competitions", competitionId, "winners"],
    enabled: !!competitionId,
    staleTime: 300_000,
  });
}

export function generateRunId(): string {
  const uuid = Crypto.randomUUID();
  return uuid;
}

export function useSubmitCompetitionScore() {
  const queryClient = useQueryClient();

  return useMutation<SubmitScoreResponse, Error, SubmitScoreRequest>({
    mutationFn: async (data) => {
      const response = await apiRequest(
        "POST",
        "/api/competitions/submit-score",
        data
      );
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/competitions", variables.competitionId, "leaderboard"],
      });
    },
  });
}
