import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { getApiUrl } from "@/lib/query-client";

export type NodeType = "PERSONAL" | "HOTSPOT" | "EVENT";
export type NodeQuality = "POOR" | "GOOD" | "GREAT" | "EXCELLENT";
export type NodePlayerStatus = "AVAILABLE" | "RESERVED" | "ARRIVED" | "COLLECTED" | "EXPIRED";

export interface MapNode {
  nodeId: string;
  type: NodeType;
  lat: number;
  lng: number;
  quality: NodeQuality;
  expiresAt: string;
  status: NodePlayerStatus;
  reservedUntil: string | null;
  groupId?: string;
  eventKey?: string;
}

interface MapNodesResponse {
  scenario: string;
  personalNodes: MapNode[];
  hotspots: MapNode[];
  events: MapNode[];
  warning?: string;
}

interface ReserveResponse {
  reservationId: string;
  nodeId: string;
  status: "RESERVED";
  reservedUntil: string;
}

interface ArriveResponse {
  reservationId: string;
  nodeId: string;
  status: "ARRIVED";
  arrivedAt: string;
}

interface CollectResponse {
  success: boolean;
  nodeId: string;
  quality: NodeQuality;
  status: "COLLECTED";
  collectedAt: string;
}

export interface SpawnReservation {
  spawnId: string;
  reservedByWallet: string;
  reservedUntil: string;
  isOwn: boolean;
}

interface SpawnReservationsResponse {
  reservations: SpawnReservation[];
}

export function useSpawnReservations() {
  const { user, isGuest } = useAuth();
  const walletAddress = user?.walletAddress || (isGuest ? `guest_${user?.id || "anon"}` : null);

  return useQuery<SpawnReservationsResponse>({
    queryKey: ["/api/hunt/spawns/reservations", walletAddress],
    queryFn: async () => {
      if (!walletAddress) {
        return { reservations: [] };
      }

      const response = await fetch(`${getApiUrl()}/api/hunt/spawns/reservations`, {
        headers: {
          "x-wallet-address": walletAddress,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch spawn reservations");
      }

      return response.json();
    },
    enabled: !!walletAddress,
    refetchInterval: 5000,
    staleTime: 3000,
  });
}

export function useMapNodes(lat: number | null, lng: number | null) {
  const { user, isGuest } = useAuth();
  const walletAddress = user?.walletAddress || (isGuest ? `guest_${user?.id || "anon"}` : null);

  return useQuery<MapNodesResponse>({
    queryKey: ["/api/map/nodes", lat, lng, walletAddress],
    queryFn: async () => {
      if (!lat || !lng || !walletAddress) {
        return { scenario: "", personalNodes: [], hotspots: [], events: [] };
      }

      const url = new URL("/api/map/nodes", getApiUrl());
      url.searchParams.set("lat", lat.toString());
      url.searchParams.set("lng", lng.toString());

      const response = await fetch(url.toString(), {
        headers: {
          "x-wallet-address": walletAddress,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch map nodes");
      }

      return response.json();
    },
    enabled: !!lat && !!lng && !!walletAddress,
    refetchInterval: 30000,
    staleTime: 10000,
  });
}

export function useLocationUpdate() {
  const { user, isGuest } = useAuth();
  const walletAddress = user?.walletAddress || (isGuest ? `guest_${user?.id || "anon"}` : null);

  return useMutation({
    mutationFn: async (location: {
      lat: number;
      lng: number;
      accuracy?: number;
      speedMps?: number;
      headingDeg?: number;
    }) => {
      if (!walletAddress) throw new Error("No wallet address");

      const response = await fetch(`${getApiUrl()}/api/location/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({
          ...location,
          clientTime: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update location");
      }

      return response.json();
    },
  });
}

export function useReserveNode() {
  const { user, isGuest } = useAuth();
  const walletAddress = user?.walletAddress || (isGuest ? `guest_${user?.id || "anon"}` : null);
  const queryClient = useQueryClient();

  return useMutation<ReserveResponse, Error, { nodeId: string; lat?: number; lng?: number }>({
    mutationFn: async ({ nodeId, lat, lng }) => {
      if (!walletAddress) throw new Error("No wallet address");

      const response = await fetch(`${getApiUrl()}/api/nodes/reserve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({ nodeId, lat, lng }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to reserve node");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/map/nodes"] });
    },
  });
}

export function useArriveNode() {
  const { user, isGuest } = useAuth();
  const walletAddress = user?.walletAddress || (isGuest ? `guest_${user?.id || "anon"}` : null);
  const queryClient = useQueryClient();

  return useMutation<ArriveResponse, Error, { reservationId: string; lat?: number; lng?: number }>({
    mutationFn: async ({ reservationId, lat, lng }) => {
      if (!walletAddress) throw new Error("No wallet address");

      const response = await fetch(`${getApiUrl()}/api/nodes/arrive`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({ reservationId, lat, lng }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to mark arrival");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/map/nodes"] });
    },
  });
}

export function useCollectNode() {
  const { user, isGuest } = useAuth();
  const walletAddress = user?.walletAddress || (isGuest ? `guest_${user?.id || "anon"}` : null);
  const queryClient = useQueryClient();

  return useMutation<CollectResponse, Error, { reservationId?: string; nodeId?: string }>({
    mutationFn: async ({ reservationId, nodeId }) => {
      if (!walletAddress) throw new Error("No wallet address");

      const response = await fetch(`${getApiUrl()}/api/nodes/collect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({ reservationId, nodeId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to collect");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/map/nodes"] });
    },
  });
}

export function getQualityColor(quality: NodeQuality): string {
  switch (quality) {
    case "POOR":
      return "#9CA3AF";
    case "GOOD":
      return "#22C55E";
    case "GREAT":
      return "#3B82F6";
    case "EXCELLENT":
      return "#F59E0B";
    default:
      return "#22C55E";
  }
}

export function getTypeLabel(type: NodeType): string {
  switch (type) {
    case "PERSONAL":
      return "";
    case "HOTSPOT":
      return "HOT";
    case "EVENT":
      return "EVENT";
    default:
      return "";
  }
}

export function getTypeBadgeColor(type: NodeType): string {
  switch (type) {
    case "PERSONAL":
      return "transparent";
    case "HOTSPOT":
      return "#EF4444";
    case "EVENT":
      return "#A855F7";
    default:
      return "transparent";
  }
}

export function getExpiryTimeLeft(expiresAt: string): string {
  const now = new Date().getTime();
  const expiry = new Date(expiresAt).getTime();
  const diff = expiry - now;

  if (diff <= 0) return "Expired";

  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${seconds}s`;
}

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
