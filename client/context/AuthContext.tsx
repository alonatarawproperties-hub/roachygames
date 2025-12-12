import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { apiRequest, getApiUrl } from "@/lib/query-client";

WebBrowser.maybeCompleteAuthSession();

const AUTH_TOKEN_KEY = "roachy_auth_token";
const USER_DATA_KEY = "roachy_user_data";

export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
  googleId: string | null;
  authProvider: string;
  chyBalance: number;
  diamondBalance: number;
  walletAddress: string | null;
  avatarUrl: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  linkWallet: (walletAddress: string) => Promise<{ success: boolean; error?: string }>;
  unlinkWallet: () => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
  updateBalances: (chy: number, diamonds: number) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const discovery = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

async function secureStoreGet(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function secureStoreSet(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }
  return SecureStore.setItemAsync(key, value);
}

async function secureStoreDelete(key: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
    return;
  }
  return SecureStore.deleteItemAsync(key);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [token, userData] = await Promise.all([
        secureStoreGet(AUTH_TOKEN_KEY),
        secureStoreGet(USER_DATA_KEY),
      ]);

      if (token && userData) {
        const parsedUser = JSON.parse(userData) as AuthUser;
        setUser(parsedUser);
        
        refreshUserFromServer(token).catch(console.error);
      }
    } catch (error) {
      console.error("[Auth] Error loading stored auth:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUserFromServer = async (token: string) => {
    try {
      const response = await fetch(`${getApiUrl()}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        await secureStoreSet(USER_DATA_KEY, JSON.stringify(data.user));
      } else {
        await logout();
      }
    } catch (error) {
      console.error("[Auth] Error refreshing user:", error);
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await apiRequest("POST", "/api/auth/login", { email, password });
      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || "Login failed" };
      }

      await Promise.all([
        secureStoreSet(AUTH_TOKEN_KEY, data.token),
        secureStoreSet(USER_DATA_KEY, JSON.stringify(data.user)),
      ]);

      setUser(data.user);
      return { success: true };
    } catch (error: any) {
      console.error("[Auth] Login error:", error);
      return { success: false, error: error.message || "Login failed" };
    }
  }, []);

  const register = useCallback(async (email: string, password: string, displayName?: string) => {
    try {
      const response = await apiRequest("POST", "/api/auth/register", { 
        email, 
        password, 
        displayName 
      });
      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || "Registration failed" };
      }

      await Promise.all([
        secureStoreSet(AUTH_TOKEN_KEY, data.token),
        secureStoreSet(USER_DATA_KEY, JSON.stringify(data.user)),
      ]);

      setUser(data.user);
      return { success: true };
    } catch (error: any) {
      console.error("[Auth] Register error:", error);
      return { success: false, error: error.message || "Registration failed" };
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    try {
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: "roachy-games",
        path: "auth",
      });

      const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
      
      if (!clientId) {
        return { success: false, error: "Google sign-in not configured" };
      }

      const request = new AuthSession.AuthRequest({
        clientId,
        scopes: ["openid", "profile", "email"],
        redirectUri,
        responseType: AuthSession.ResponseType.IdToken,
      });

      const result = await request.promptAsync(discovery);

      if (result.type === "success" && result.params?.id_token) {
        const response = await apiRequest("POST", "/api/auth/google", {
          idToken: result.params.id_token,
        });

        const data = await response.json();

        if (!response.ok) {
          return { success: false, error: data.error || "Google login failed" };
        }

        await Promise.all([
          secureStoreSet(AUTH_TOKEN_KEY, data.token),
          secureStoreSet(USER_DATA_KEY, JSON.stringify(data.user)),
        ]);

        setUser(data.user);
        return { success: true };
      }

      if (result.type === "cancel") {
        return { success: false, error: "Sign-in cancelled" };
      }

      return { success: false, error: "Google sign-in failed" };
    } catch (error: any) {
      console.error("[Auth] Google login error:", error);
      return { success: false, error: error.message || "Google sign-in failed" };
    }
  }, []);

  const logout = useCallback(async () => {
    await Promise.all([
      secureStoreDelete(AUTH_TOKEN_KEY),
      secureStoreDelete(USER_DATA_KEY),
    ]);
    setUser(null);
  }, []);

  const linkWallet = useCallback(async (walletAddress: string) => {
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    try {
      const response = await apiRequest("POST", "/api/auth/link-wallet", {
        userId: user.id,
        walletAddress,
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || "Failed to link wallet" };
      }

      setUser(data.user);
      await secureStoreSet(USER_DATA_KEY, JSON.stringify(data.user));
      return { success: true };
    } catch (error: any) {
      console.error("[Auth] Link wallet error:", error);
      return { success: false, error: error.message || "Failed to link wallet" };
    }
  }, [user]);

  const unlinkWallet = useCallback(async () => {
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    try {
      const response = await apiRequest("POST", "/api/auth/unlink-wallet", {
        userId: user.id,
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || "Failed to unlink wallet" };
      }

      setUser(data.user);
      await secureStoreSet(USER_DATA_KEY, JSON.stringify(data.user));
      return { success: true };
    } catch (error: any) {
      console.error("[Auth] Unlink wallet error:", error);
      return { success: false, error: error.message || "Failed to unlink wallet" };
    }
  }, [user]);

  const refreshUser = useCallback(async () => {
    const token = await secureStoreGet(AUTH_TOKEN_KEY);
    if (token) {
      await refreshUserFromServer(token);
    }
  }, []);

  const updateBalances = useCallback((chy: number, diamonds: number) => {
    if (user) {
      const updatedUser = { ...user, chyBalance: chy, diamondBalance: diamonds };
      setUser(updatedUser);
      secureStoreSet(USER_DATA_KEY, JSON.stringify(updatedUser)).catch(console.error);
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        loginWithGoogle,
        logout,
        linkWallet,
        unlinkWallet,
        refreshUser,
        updateBalances,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
