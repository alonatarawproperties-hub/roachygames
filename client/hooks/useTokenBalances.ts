import { useQuery } from "@tanstack/react-query";
import { fetchTokenBalances, TokenBalances } from "../lib/solana";

interface UseTokenBalancesResult {
  roachy: number;
  diamonds: number;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useTokenBalances(
  walletAddress: string | null,
  isConnected: boolean
): UseTokenBalancesResult {
  const query = useQuery<TokenBalances>({
    queryKey: ["wallet", "balances", walletAddress],
    queryFn: () => fetchTokenBalances(walletAddress!),
    enabled: isConnected && !!walletAddress,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  return {
    roachy: query.data?.roachy ?? 0,
    diamonds: query.data?.diamonds ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
