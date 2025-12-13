import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Alert,
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

const DEV_WALLET_ADDRESS = "8LgfzMdcXbxhNkURkLuhVcdxJzVw9w7yeVRof1wSPeJW";

const GoogleLogo = ({ size = 24 }: { size?: number }) => (
  <Image
    source={{ uri: "https://www.google.com/favicon.ico" }}
    style={{ width: size, height: size }}
    contentFit="contain"
  />
);

export function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { devLogin, continueAsGuest, isLoading } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleAuth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Coming Soon",
      "Google sign-in will be available in the next update. For now, please continue as a guest to try the beta!",
      [{ text: "OK" }]
    );
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

  const handleDevLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSubmitting(true);
    try {
      const result = await devLogin(DEV_WALLET_ADDRESS);
      if (!result.success) {
        Alert.alert("Error", result.error || "Dev login failed");
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Dev login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = isSubmitting || isLoading;

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
            Play Games, Earn Rewards
          </ThemedText>
        </View>

        <View style={styles.authContainer}>
          <Pressable
            style={[styles.authButton, styles.googleButton, styles.disabledButton]}
            onPress={handleGoogleAuth}
          >
            <GoogleLogo size={22} />
            <ThemedText style={styles.googleButtonText}>
              Continue with Google
            </ThemedText>
            <View style={styles.comingSoonBadge}>
              <Feather name="lock" size={12} color={GameColors.textSecondary} />
            </View>
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

          <Pressable 
            style={[styles.authButton, styles.devButton]} 
            onPress={handleDevLogin}
            disabled={isDisabled}
          >
            <Feather name="terminal" size={22} color="#00FF00" />
            <ThemedText style={styles.devButtonText}>Dev Login</ThemedText>
          </Pressable>
        </View>

        <View style={styles.features}>
          <View style={styles.featureItem}>
            <Feather name="play-circle" size={24} color={GameColors.gold} />
            <ThemedText style={styles.featureText}>Play Free Games</ThemedText>
          </View>
          <View style={styles.featureItem}>
            <Feather name="award" size={24} color={GameColors.gold} />
            <ThemedText style={styles.featureText}>Earn Chy Coins</ThemedText>
          </View>
          <View style={styles.featureItem}>
            <Feather name="gift" size={24} color={GameColors.gold} />
            <ThemedText style={styles.featureText}>Claim Rewards on Web</ThemedText>
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
  disabledButton: {
    opacity: 0.6,
  },
  comingSoonBadge: {
    position: "absolute",
    right: 16,
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
  devButton: {
    backgroundColor: "rgba(0, 255, 0, 0.1)",
    borderWidth: 1,
    borderColor: "#00FF00",
  },
  devButtonText: {
    color: "#00FF00",
    fontSize: 16,
    fontWeight: "600",
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
