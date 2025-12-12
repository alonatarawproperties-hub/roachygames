import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";

const GoogleLogo = ({ size = 24 }: { size?: number }) => (
  <Image
    source={{ uri: "https://www.google.com/favicon.ico" }}
    style={{ width: size, height: size }}
    contentFit="contain"
  />
);

export function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { loginWithGoogle, loginWithWallet, continueAsGuest, isLoading } = useAuth();
  const { connectWallet, signMessage } = useWallet();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState(false);

  const handleGoogleAuth = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);

    try {
      const result = await loginWithGoogle();
      if (!result.success) {
        if (result.error !== "Sign-in cancelled") {
          Alert.alert("Error", result.error || "Google sign-in failed");
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Google sign-in failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWalletAuth = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConnectingWallet(true);

    try {
      const walletAddress = await connectWallet("phantom");
      
      if (!walletAddress) {
        return;
      }

      const result = await loginWithWallet(walletAddress, signMessage);
      if (!result.success) {
        if (result.error !== "Wallet signature cancelled") {
          Alert.alert("Error", result.error || "Wallet sign-in failed");
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Wallet sign-in failed");
    } finally {
      setConnectingWallet(false);
    }
  };

  const handleGuestMode = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSubmitting(true);
    try {
      const result = await continueAsGuest();
      if (!result.success) {
        Alert.alert("Error", result.error || "Failed to continue as guest");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = isSubmitting || connectingWallet || isLoading;

  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={[GameColors.surface, GameColors.background, "#050302"]}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={[styles.content, { paddingTop: insets.top + Spacing["2xl"], paddingBottom: insets.bottom + Spacing.xl }]}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/roachy-logo.png")}
              style={styles.logoImage}
              contentFit="contain"
            />
          </View>
          <ThemedText style={styles.title}>Roachy Games</ThemedText>
          <ThemedText style={styles.subtitle}>
            Play-to-Earn Arcade on Solana
          </ThemedText>
        </View>

        <View style={styles.authContainer}>
          <Pressable
            style={[styles.authButton, styles.googleButton]}
            onPress={handleGoogleAuth}
            disabled={isDisabled}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#333" size="small" />
            ) : (
              <>
                <GoogleLogo size={22} />
                <ThemedText style={styles.googleButtonText}>
                  Continue with Google
                </ThemedText>
              </>
            )}
          </Pressable>

          <Pressable
            style={[styles.authButton, styles.walletButton]}
            onPress={handleWalletAuth}
            disabled={isDisabled}
          >
            {connectingWallet ? (
              <ActivityIndicator color={GameColors.gold} size="small" />
            ) : (
              <>
                <Feather name="credit-card" size={22} color={GameColors.gold} />
                <ThemedText style={styles.walletButtonText}>
                  Connect Wallet
                </ThemedText>
              </>
            )}
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <ThemedText style={styles.dividerText}>or</ThemedText>
            <View style={styles.dividerLine} />
          </View>

          <Pressable 
            style={styles.guestButton} 
            onPress={handleGuestMode}
            disabled={isDisabled}
          >
            <Feather name="user" size={18} color={GameColors.textSecondary} />
            <ThemedText style={styles.guestButtonText}>Continue as Guest</ThemedText>
          </Pressable>
        </View>

        <View style={styles.features}>
          <View style={styles.featureItem}>
            <Feather name="play-circle" size={24} color={GameColors.gold} />
            <ThemedText style={styles.featureText}>Play Free Games</ThemedText>
          </View>
          <View style={styles.featureItem}>
            <Feather name="award" size={24} color={GameColors.gold} />
            <ThemedText style={styles.featureText}>Earn CHY Points</ThemedText>
          </View>
          <View style={styles.featureItem}>
            <Feather name="zap" size={24} color={GameColors.gold} />
            <ThemedText style={styles.featureText}>Earn Real Crypto Rewards</ThemedText>
          </View>
        </View>

        <ThemedText style={styles.disclaimer}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    marginTop: Spacing.xl,
  },
  logoContainer: {
    marginBottom: Spacing.md,
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: GameColors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: GameColors.textSecondary,
  },
  authContainer: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
    gap: Spacing.md,
  },
  authButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    paddingHorizontal: Spacing.lg,
    gap: 12,
  },
  googleButton: {
    backgroundColor: "#FFFFFF",
  },
  googleButtonText: {
    color: "#333333",
    fontSize: 16,
    fontWeight: "600",
  },
  walletButton: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: GameColors.gold,
  },
  walletButtonText: {
    color: GameColors.gold,
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  dividerText: {
    color: GameColors.textSecondary,
    paddingHorizontal: Spacing.md,
    fontSize: 14,
  },
  guestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  guestButtonText: {
    color: GameColors.textSecondary,
    fontSize: 14,
  },
  features: {
    gap: Spacing.md,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  featureText: {
    color: GameColors.textSecondary,
    fontSize: 14,
  },
  disclaimer: {
    textAlign: "center",
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
    lineHeight: 18,
  },
});
