import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Gets the base URL for the Express API server
 * In production, uses roachy.games. In development, uses local server.
 * @returns {string} The API base URL
 */
export function getApiUrl(): string {
  // Production builds use roachy.games as the shared backend
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Development fallback to local server
  let host = process.env.EXPO_PUBLIC_DOMAIN;

  if (!host) {
    throw new Error("EXPO_PUBLIC_DOMAIN or EXPO_PUBLIC_API_URL is not set");
  }

  let url = new URL(`https://${host}`);

  return url.href;
}

/**
 * Gets the marketplace URL for cross-app navigation
 */
export function getMarketplaceUrl(): string {
  return "https://roachy.games";
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
