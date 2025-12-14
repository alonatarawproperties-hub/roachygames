import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUserBalances } from "@/lib/webapp-api";
import { useAuth } from "@/context/AuthContext";
import { useCallback } from "react";

interface WebappBalances {
  diamonds: number;
  chy: number;
}

export const WEBAPP_BALANCES_QUERY_KEY = "/api/webapp/balances";

export function useWebappBalances() {
  const { user, isGuest } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery<WebappBalances | null>({
    queryKey: [WEBAPP_BALANCES_QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!user?.id || isGuest) return null;

      const result = await getUserBalances(user.id);
      if (result.success && result.balances) {
        return result.balances;
      }
      if (result.error) {
        throw new Error(result.error);
      }
      return null;
    },
    enabled: !!user?.id && !isGuest,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const invalidateBalances = useCallback(() => {
    if (user?.id) {
      queryClient.invalidateQueries({
        queryKey: [WEBAPP_BALANCES_QUERY_KEY, user.id],
      });
    }
  }, [queryClient, user?.id]);

  return {
    diamonds: query.data?.diamonds ?? 0,
    chy: query.data?.chy ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    invalidateBalances,
  };
}
