import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { exchangeOAuthUser } from "@/lib/webapp-api";

WebBrowser.maybeCompleteAuthSession();

const AUTH_TOKEN_KEY = "roachy_auth_token";
const USER_DATA_KEY = "roachy_user_data";

// Google OAuth Client IDs (platform-specific)
const GOOGLE_CLIENT_ID_IOS = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_ID_ANDROID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID;
// Web client ID needed for Android token exchange (uses web flow internally)
const GOOGLE_CLIENT_ID_WEB = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB;

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
  webappUserId: string | null; // UUID from roachy.games for balance sync
}

interface LinkWalletResult {
  success: boolean;
  error?: string;
  pendingSwitch?: boolean;
  cooldownEndsAt?: string;
}

type SignMessageFn = (message: string) => Promise<string | null>;

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  loginWithWallet: (walletAddress: string, signMessage: SignMessageFn) => Promise<{ success: boolean; error?: string }>;
  devLogin: (walletAddress: string) => Promise<{ success: boolean; error?: string }>;
  continueAsGuest: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  linkWallet: (walletAddress: string, signMessage: SignMessageFn) => Promise<LinkWalletResult>;
  unlinkWallet: () => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
  updateBalances: (chy: number, diamonds: number) => void;
  updateUser: (updatedUser: AuthUser) => Promise<void>;
  updateUserData: (partial: Partial<AuthUser>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

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
        
        // Set user immediately with stored data (including webappUserId if present)
        // This allows balance query to start with existing webappUserId
        setUser(parsedUser);
        setIsLoading(false);
        
        // Then refresh in background to update webappUserId if needed
        refreshUserFromServer(token, parsedUser);
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("[Auth] Error loading stored auth:", error);
      setIsLoading(false);
    }
  };

  const refreshUserFromServer = async (token: string, existingUser?: AuthUser | null) => {
    try {
      const response = await fetch(`${getApiUrl()}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        let webappUserId = existingUser?.webappUserId || data.user.webappUserId || null;
        
        // Always re-sync Google users with webapp to ensure correct webappUserId
        // Use existingUser credentials as fallback since /api/auth/me may not return googleId
        const googleId = data.user.googleId || existingUser?.googleId;
        const email = data.user.email || existingUser?.email;
        
        if (googleId && email) {
          try {
            const webappResult = await exchangeOAuthUser(
              googleId,
              email,
              data.user.displayName || existingUser?.displayName || email.split("@")[0]
            );
            if (webappResult.success && webappResult.user) {
              webappUserId = webappResult.user.id;
            }
          } catch (syncErr) {
            // Keep existing webappUserId if sync fails
          }
        }
        
        const updatedUser = {
          ...data.user,
          googleId: googleId || data.user.googleId,
          webappUserId,
        };
        setUser(updatedUser);
        await secureStoreSet(USER_DATA_KEY, JSON.stringify(updatedUser));
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
      console.log("[Auth] Starting Google OAuth, Platform:", Platform.OS);
      console.log("[Auth] iOS Client ID:", GOOGLE_CLIENT_ID_IOS?.substring(0, 20) + "...");
      console.log("[Auth] Android Client ID:", GOOGLE_CLIENT_ID_ANDROID?.substring(0, 20) + "...");
      console.log("[Auth] Web Client ID:", GOOGLE_CLIENT_ID_WEB?.substring(0, 20) + "...");

      // For browser-based OAuth (expo-auth-session), use Web client ID on Android
      // Android client IDs only work with native Google Sign-In SDK, not browser flows
      // iOS client IDs work with reversed scheme since iOS handles deep links differently
      let clientId: string;
      let redirectUri: string;
      
      if (Platform.OS === "android") {
        // Android browser-based OAuth: Use Web client ID with Expo auth proxy
        clientId = GOOGLE_CLIENT_ID_WEB || "";
        // Use Expo's auth proxy which handles the redirect properly
        redirectUri = AuthSession.makeRedirectUri({
          native: "roachy-games://oauth",
          // This generates: https://auth.expo.io/@roachygames/roachy-games
        });
      } else if (Platform.OS === "ios") {
        // iOS: Use iOS client ID with reversed scheme (works natively)
        clientId = GOOGLE_CLIENT_ID_IOS || "";
        const reversedClientId = clientId.split(".").reverse().join(".");
        redirectUri = `${reversedClientId}:/oauth2redirect/google`;
      } else {
        // Web fallback
        clientId = GOOGLE_CLIENT_ID_WEB || GOOGLE_CLIENT_ID_IOS || "";
        redirectUri = AuthSession.makeRedirectUri({ preferLocalhost: true });
      }
      
      console.log("[Auth] Using client ID:", clientId?.substring(0, 30) + "...");
      console.log("[Auth] Using redirect URI:", redirectUri);

      // Create auth request with platform-specific client ID
      const request = new AuthSession.AuthRequest({
        clientId,
        scopes: ["openid", "profile", "email"],
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
        usePKCE: true,
      });

      const discovery = {
        authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenEndpoint: "https://oauth2.googleapis.com/token",
        revocationEndpoint: "https://oauth2.googleapis.com/revoke",
      };

      const result = await request.promptAsync(discovery);

      console.log("[Auth] Google OAuth result type:", result.type);
      if (result.type === "success" || result.type === "error") {
        console.log("[Auth] Google OAuth result params:", JSON.stringify(result.params || {}));
      }
      
      if (result.type === "error") {
        console.error("[Auth] Google OAuth error:", result.params);
        const errorMsg = result.params?.error_description || result.params?.error || "Google sign-in error";
        return { success: false, error: errorMsg };
      }

      if (result.type === "success" && result.params?.code) {
        // Exchange authorization code for tokens on the server
        const response = await apiRequest("POST", "/api/auth/google-code", {
          code: result.params.code,
          codeVerifier: request.codeVerifier,
          redirectUri,
          // Send the client ID used for this request
          clientId,
        });

        const data = await response.json();

        if (!response.ok) {
          return { success: false, error: data.error || "Google login failed" };
        }

        let finalUser = data.user;
        
        // Sync with webapp (roachy.games) BEFORE returning - critical for balance sync
        if (data.user.googleId && data.user.email) {
          try {
            const webappResult = await exchangeOAuthUser(
              data.user.googleId,
              data.user.email,
              data.user.displayName || data.user.email.split("@")[0]
            );
            if (webappResult.success && webappResult.user) {
              console.log("[Auth] Synced user with webapp, webappUserId:", webappResult.user.id);
              // Store the webapp user ID for balance calls
              finalUser = {
                ...data.user,
                webappUserId: webappResult.user.id,
                chyBalance: webappResult.user.chyBalance,
                diamondBalance: webappResult.user.diamondBalance,
              };
            } else {
              console.warn("[Auth] Webapp sync failed:", webappResult.error);
            }
          } catch (err) {
            console.warn("[Auth] Webapp sync error:", err);
          }
        }

        await Promise.all([
          secureStoreSet(AUTH_TOKEN_KEY, data.token),
          secureStoreSet(USER_DATA_KEY, JSON.stringify(finalUser)),
        ]);

        setUser(finalUser);
        return { success: true };
      }

      if (result.type === "cancel" || result.type === "dismiss") {
        return { success: false, error: "Sign-in cancelled" };
      }

      return { success: false, error: "Google sign-in failed" };
    } catch (error: any) {
      console.error("[Auth] Google login error:", error);
      return { success: false, error: error.message || "Google sign-in failed" };
    }
  }, []);

  const loginWithWallet = useCallback(async (walletAddress: string, signMessage: SignMessageFn) => {
    try {
      const timestamp = Date.now();
      const message = `Sign in to Roachy Games with wallet ${walletAddress}.\n\nTimestamp: ${timestamp}\n\nThis signature proves you own this wallet.`;
      
      const signature = await signMessage(message);
      if (!signature) {
        return { success: false, error: "Wallet signature cancelled" };
      }

      const response = await apiRequest("POST", "/api/auth/wallet-login", {
        walletAddress,
        signature,
        timestamp,
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || "Wallet login failed" };
      }

      await Promise.all([
        secureStoreSet(AUTH_TOKEN_KEY, data.token),
        secureStoreSet(USER_DATA_KEY, JSON.stringify(data.user)),
      ]);

      setUser(data.user);
      return { success: true };
    } catch (error: any) {
      console.error("[Auth] Wallet login error:", error);
      return { success: false, error: error.message || "Wallet sign-in failed" };
    }
  }, []);

  const devLogin = useCallback(async (walletAddress: string) => {
    try {
      const response = await apiRequest("POST", "/api/auth/dev-wallet-login", {
        walletAddress,
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || "Dev login failed" };
      }

      await Promise.all([
        secureStoreSet(AUTH_TOKEN_KEY, data.token),
        secureStoreSet(USER_DATA_KEY, JSON.stringify(data.user)),
      ]);

      setUser(data.user);
      return { success: true };
    } catch (error: any) {
      console.error("[Auth] Dev login error:", error);
      return { success: false, error: error.message || "Dev login failed" };
    }
  }, []);

  const continueAsGuest = useCallback(async () => {
    try {
      const guestUser: AuthUser = {
        id: `guest_${Date.now()}`,
        email: null,
        displayName: "Guest Player",
        googleId: null,
        authProvider: "guest",
        chyBalance: 0,
        diamondBalance: 0,
        walletAddress: null,
        avatarUrl: null,
        webappUserId: null,
      };

      await secureStoreSet(USER_DATA_KEY, JSON.stringify(guestUser));
      setUser(guestUser);
      return { success: true };
    } catch (error: any) {
      console.error("[Auth] Guest login error:", error);
      return { success: false, error: error.message || "Failed to continue as guest" };
    }
  }, []);

  const logout = useCallback(async () => {
    await Promise.all([
      secureStoreDelete(AUTH_TOKEN_KEY),
      secureStoreDelete(USER_DATA_KEY),
    ]);
    setUser(null);
  }, []);

  const linkWallet = useCallback(async (walletAddress: string, signMessage: SignMessageFn): Promise<LinkWalletResult> => {
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    try {
      const checkResponse = await apiRequest("POST", "/api/auth/check-wallet-switch", {
        userId: user.id,
        newWalletAddress: walletAddress,
      });

      const checkData = await checkResponse.json();

      if (!checkResponse.ok) {
        return { success: false, error: checkData.error || "Failed to verify wallet" };
      }

      if (checkData.hasPendingSwitch) {
        return { 
          success: false, 
          error: checkData.message || "A wallet switch is already in progress",
          pendingSwitch: true,
          cooldownEndsAt: checkData.cooldownEndsAt,
        };
      }

      const signature = await signMessage(checkData.messageToSign);
      if (!signature) {
        return { success: false, error: "Signature cancelled or failed" };
      }

      const linkResponse = await apiRequest("POST", "/api/auth/link-wallet", {
        userId: user.id,
        walletAddress,
        signature,
        timestamp: checkData.timestamp,
      });

      const linkData = await linkResponse.json();

      if (!linkResponse.ok) {
        return { success: false, error: linkData.error || "Failed to link wallet" };
      }

      if (linkData.pendingSwitch) {
        return {
          success: true,
          pendingSwitch: true,
          cooldownEndsAt: linkData.cooldownEndsAt,
        };
      }

      setUser(linkData.user);
      await secureStoreSet(USER_DATA_KEY, JSON.stringify(linkData.user));
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

  const updateUser = useCallback(async (updatedUser: AuthUser) => {
    setUser(updatedUser);
    await secureStoreSet(USER_DATA_KEY, JSON.stringify(updatedUser));
  }, []);

  const updateUserData = useCallback(async (partial: Partial<AuthUser>) => {
    if (!user) return;
    const updatedUser = { ...user, ...partial };
    setUser(updatedUser);
    await secureStoreSet(USER_DATA_KEY, JSON.stringify(updatedUser));
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isGuest: user?.authProvider === "guest",
        login,
        register,
        loginWithGoogle,
        loginWithWallet,
        devLogin,
        continueAsGuest,
        logout,
        linkWallet,
        unlinkWallet,
        refreshUser,
        updateBalances,
        updateUser,
        updateUserData,
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
