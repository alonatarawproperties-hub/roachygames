import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Pressable,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";

const GoogleLogo = ({ size = 24 }: { size?: number }) => (
  <Image
    source={{ uri: "https://www.google.com/favicon.ico" }}
    style={{ width: size, height: size }}
    contentFit="contain"
  />
);

type AuthMode = "login" | "register";

export function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { login, register, loginWithGoogle, isLoading } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (mode === "register" && password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return;
    }

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = mode === "login" 
        ? await login(email, password)
        : await register(email, password, displayName || undefined);

      if (!result.success) {
        Alert.alert("Error", result.error || "Authentication failed");
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const toggleMode = () => {
    Haptics.selectionAsync();
    setMode(mode === "login" ? "register" : "login");
    setPassword("");
  };

  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={[GameColors.surface, GameColors.background, "#050302"]}
        style={StyleSheet.absoluteFill}
      />
      
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
        ]}
      >
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
            {mode === "login" ? "Welcome back!" : "Join the arcade"}
          </ThemedText>
        </View>

        <View style={styles.formContainer}>
          <Pressable
            style={styles.googleButton}
            onPress={handleGoogleAuth}
            disabled={isSubmitting}
          >
            <GoogleLogo size={20} />
            <ThemedText style={styles.googleButtonText}>
              Continue with Google
            </ThemedText>
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <ThemedText style={styles.dividerText}>or</ThemedText>
            <View style={styles.dividerLine} />
          </View>

          {mode === "register" ? (
            <View style={styles.inputContainer}>
              <Feather name="user" size={20} color={GameColors.textSecondary} style={styles.inputIcon} />
              <TextInput
                placeholder="Display Name (optional)"
                placeholderTextColor={GameColors.textSecondary}
                value={displayName}
                onChangeText={setDisplayName}
                style={styles.textInput}
              />
            </View>
          ) : null}

          <View style={styles.inputContainer}>
            <Feather name="mail" size={20} color={GameColors.textSecondary} style={styles.inputIcon} />
            <TextInput
              placeholder="Email"
              placeholderTextColor={GameColors.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.textInput}
            />
          </View>

          <View style={styles.inputContainer}>
            <Feather name="lock" size={20} color={GameColors.textSecondary} style={styles.inputIcon} />
            <TextInput
              placeholder="Password"
              placeholderTextColor={GameColors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              style={styles.textInput}
            />
            <Pressable
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Feather
                name={showPassword ? "eye-off" : "eye"}
                size={20}
                color={GameColors.textSecondary}
              />
            </Pressable>
          </View>

          <Button
            onPress={handleEmailAuth}
            disabled={isSubmitting || !email.trim() || !password.trim()}
            style={styles.submitButton}
          >
            {isSubmitting ? (
              <ActivityIndicator color={GameColors.background} size="small" />
            ) : (
              mode === "login" ? "Sign In" : "Create Account"
            )}
          </Button>

          <Pressable style={styles.switchMode} onPress={toggleMode}>
            <ThemedText style={styles.switchModeText}>
              {mode === "login" 
                ? "Don't have an account? " 
                : "Already have an account? "}
              <ThemedText style={styles.switchModeLink}>
                {mode === "login" ? "Sign Up" : "Sign In"}
              </ThemedText>
            </ThemedText>
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
            <ThemedText style={styles.featureText}>Connect Wallet for Real Rewards</ThemedText>
          </View>
        </View>

        <ThemedText style={styles.disclaimer}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </ThemedText>
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
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
  formContainer: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
    marginBottom: Spacing.xl,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    gap: 12,
  },
  googleButtonText: {
    color: "#333333",
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.lg,
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
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  eyeButton: {
    padding: Spacing.sm,
  },
  textInput: {
    flex: 1,
    height: 48,
    color: GameColors.textPrimary,
    fontSize: 16,
  },
  submitButton: {
    marginTop: Spacing.sm,
  },
  switchMode: {
    alignItems: "center",
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  switchModeText: {
    color: GameColors.textSecondary,
    fontSize: 14,
  },
  switchModeLink: {
    color: GameColors.gold,
    fontWeight: "600",
  },
  features: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
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
