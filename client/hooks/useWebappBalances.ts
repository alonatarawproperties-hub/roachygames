import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUserBalances } from "@/lib/webapp-api";
import { useAuth } from "@/context/AuthContext";
import { useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useEffect, useRef } from "react";

interface WebappBalances {
  diamonds: number;
  chy: number;
}

export const WEBAPP_BALANCES_QUERY_KEY = "/api/webapp/balances";

export function useWebappBalances() {
  const { user, isGuest } = useAuth();
  const queryClient = useQueryClient();
  const appState = useRef(AppState.currentState);

  // Use googleId to sync with webapp since user IDs differ between systems
  const webappUserId = user?.googleId || user?.id;

  const query = useQuery<WebappBalances | null>({
    queryKey: [WEBAPP_BALANCES_QUERY_KEY, webappUserId],
    queryFn: async () => {
      if (!webappUserId || isGuest) return null;

      const result = await getUserBalances(webappUserId);
      if (result.success && result.balances) {
        return result.balances;
      }
      if (result.error) {
        throw new Error(result.error);
      }
      return null;
    },
    enabled: !!user?.id && !isGuest,
    staleTime: 10000,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        query.refetch();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription?.remove();
  }, [query]);

  const invalidateBalances = useCallback(() => {
    if (webappUserId) {
      queryClient.invalidateQueries({
        queryKey: [WEBAPP_BALANCES_QUERY_KEY, webappUserId],
      });
    }
  }, [queryClient, webappUserId]);

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
