import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Gets the base URL for the Express API server (game backend)
 * Uses the deployed Replit app's server for game features
 * @returns {string} The API base URL
 */
const PRODUCTION_API_URL = "https://roachy-games-mobile--alon0x144.replit.app";

export function getApiUrl(): string {
  // Use explicitly set API URL if provided
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // For web platform in development, Metro serves the web app on port 8081 (external 80)
  // but API requests need to go to Express on port 5000 (external 5000)
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const hostname = window.location.hostname;
    
    // In development (localhost), Express API is on port 5000
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    
    // On Replit, Express is on external port 5000
    // Access it via https://hostname:5000 or the port-specific domain
    // Replit port 5000 is accessible via the same domain with :5000 suffix
    return `https://${hostname}:5000`;
  }

  // Use domain if provided (for native apps)
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    // EXPO_PUBLIC_DOMAIN is set to "domain:5000" - use it directly with https
    const domain = process.env.EXPO_PUBLIC_DOMAIN.replace(/:5000$/, '');
    return `https://${domain}:5000`;
  }

  // PRODUCTION FALLBACK: For native iOS/Android builds without env vars
  // This ensures TestFlight/App Store builds always use the correct API
  if (process.env.APP_ENV === 'production' || !__DEV__) {
    return PRODUCTION_API_URL;
  }

  // Development fallback - use local server
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

  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add API secret for authenticated endpoints
  if (process.env.EXPO_PUBLIC_MOBILE_APP_SECRET) {
    headers["x-api-secret"] = process.env.EXPO_PUBLIC_MOBILE_APP_SECRET;
  }

  const res = await fetch(url, {
    method,
    headers,
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

    const headers: Record<string, string> = {};
    
    // Add API secret for authenticated endpoints
    if (process.env.EXPO_PUBLIC_MOBILE_APP_SECRET) {
      headers["x-api-secret"] = process.env.EXPO_PUBLIC_MOBILE_APP_SECRET;
    }

    const res = await fetch(url, {
      credentials: "include",
      headers,
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
