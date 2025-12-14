import { useQuery } from "@tanstack/react-query";
import { getUserNfts, OwnedNft } from "@/lib/webapp-api";
import { useAuth } from "@/context/AuthContext";

export const USER_NFTS_QUERY_KEY = "/api/webapp/nfts";

export function useUserNfts() {
  const { user, isGuest } = useAuth();

  const query = useQuery<OwnedNft[]>({
    queryKey: [USER_NFTS_QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!user?.id || isGuest) return [];

      const result = await getUserNfts(user.id);
      if (result.success && result.nfts) {
        return result.nfts;
      }
      return [];
    },
    enabled: !!user?.id && !isGuest,
    staleTime: 60000,
    refetchInterval: 120000,
  });

  const ownsNft = (nftType: string, game?: string): boolean => {
    if (!query.data) return false;
    return query.data.some(
      (nft) =>
        nft.type.toLowerCase() === nftType.toLowerCase() &&
        (!game || nft.game.toLowerCase() === game.toLowerCase())
    );
  };

  const getOwnedSkins = (game: string): string[] => {
    if (!query.data) return [];
    return query.data
      .filter((nft) => nft.game.toLowerCase() === game.toLowerCase() && nft.type === "skin")
      .map((nft) => nft.name.toLowerCase().replace(/\s+/g, "_"));
  };

  return {
    nfts: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    ownsNft,
    getOwnedSkins,
  };
}
