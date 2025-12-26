import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import * as Crypto from "expo-crypto";

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

export function useActiveCompetitions() {
  return useQuery<Competition[]>({
    queryKey: ["/api/competitions/active"],
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
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
