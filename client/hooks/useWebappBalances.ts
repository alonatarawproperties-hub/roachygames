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

  // Use webappUserId (UUID from roachy.games) for balance sync
  const webappUserId = user?.webappUserId;
  
  // Diagnostic logging
  console.log("[useWebappBalances] user?.id:", user?.id);
  console.log("[useWebappBalances] webappUserId:", webappUserId);
  console.log("[useWebappBalances] isGuest:", isGuest);

  const query = useQuery<WebappBalances | null>({
    queryKey: [WEBAPP_BALANCES_QUERY_KEY, webappUserId],
    queryFn: async () => {
      console.log("[useWebappBalances] queryFn called, webappUserId:", webappUserId, "isGuest:", isGuest);
      if (!webappUserId || isGuest) {
        console.log("[useWebappBalances] Skipping fetch - no webappUserId or guest");
        return null;
      }

      const result = await getUserBalances(webappUserId);
      console.log("[useWebappBalances] getUserBalances result:", JSON.stringify(result));
      if (result.success && result.balances) {
        console.log("[useWebappBalances] Returning balances:", JSON.stringify(result.balances));
        return result.balances;
      }
      if (result.error) {
        console.error("[useWebappBalances] Error:", result.error);
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

  const returnValue = {
    diamonds: query.data?.diamonds ?? 0,
    chy: query.data?.chy ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    invalidateBalances,
  };
  
  console.log("[useWebappBalances] Returning to UI - chy:", returnValue.chy, "diamonds:", returnValue.diamonds);
  
  return returnValue;
}
