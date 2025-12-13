import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Gets the base URL for the Express API server (game backend)
 * Uses the deployed Replit app's server for game features
 * @returns {string} The API base URL
 */
export function getApiUrl(): string {
  // Use explicitly set API URL if provided
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // For web platform, use relative URLs - Express serves everything on same domain
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    // In web browser - use current origin (Express proxies API on same port)
    return window.location.origin;
  }

  // Use domain if provided (for native apps)
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    // Remove :5000 port if present - HTTPS uses 443
    const domain = process.env.EXPO_PUBLIC_DOMAIN.replace(/:5000$/, '');
    return `https://${domain}`;
  }

  // Development fallback - use local server
  // In development, Express runs alongside Expo
  return "http://localhost:5000";
}

/**
 * Gets the marketplace URL for cross-app navigation
 * Opens the roachy.games web marketplace for trading
 */
export function getMarketplaceUrl(path: string = ""): string {
  return `https://roachy.games${path}`;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
