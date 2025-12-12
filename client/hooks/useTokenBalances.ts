import { useQuery } from "@tanstack/react-query";
import { fetchTokenBalances, fetchRoachyPrice, TokenBalances, TokenPrices } from "../lib/solana";

interface UseTokenBalancesResult {
  roachy: number;
  diamonds: number;
  roachyPrice: number;
  roachyPriceChange24h: number;
  roachyUsdValue: number;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useTokenBalances(
  walletAddress: string | null,
  isConnected: boolean
): UseTokenBalancesResult {
  const balanceQuery = useQuery<TokenBalances>({
    queryKey: ["wallet", "balances", walletAddress],
    queryFn: () => fetchTokenBalances(walletAddress!),
    enabled: isConnected && !!walletAddress,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const priceQuery = useQuery<TokenPrices>({
    queryKey: ["token", "price", "roachy"],
    queryFn: fetchRoachyPrice,
    staleTime: 60000,
    refetchInterval: 120000,
  });

  const roachy = balanceQuery.data?.roachy ?? 0;
  const roachyPrice = priceQuery.data?.roachyPrice ?? 0;

  return {
    roachy,
    diamonds: balanceQuery.data?.diamonds ?? 0,
    roachyPrice,
    roachyPriceChange24h: priceQuery.data?.roachyPriceChange24h ?? 0,
    roachyUsdValue: roachy * roachyPrice,
    isLoading: balanceQuery.isLoading || priceQuery.isLoading,
    isError: balanceQuery.isError || priceQuery.isError,
    refetch: () => {
      balanceQuery.refetch();
      priceQuery.refetch();
    },
  };
}
