import React from "react";
import { View, StyleSheet, Pressable, TextInput, Platform, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const roachyLogo = require("../../../assets/images/roachy-logo.png");

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ArcadeHeaderProps {
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (text: string) => void;
  onWalletPress?: () => void;
  onNotificationPress?: () => void;
  walletConnected?: boolean;
}

function AnimatedButton({
  onPress,
  children,
  style,
  pressedStyle,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  style?: any;
  pressedStyle?: any;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  };

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  return (
    <AnimatedPressable
      style={[style, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      {children}
    </AnimatedPressable>
  );
}

export function ArcadeHeader({
  showSearch = true,
  searchValue = "",
  onSearchChange,
  onWalletPress,
  onNotificationPress,
  walletConnected = false,
}: ArcadeHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.sm }]}>
      <View style={styles.topRow}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Image source={roachyLogo} style={styles.logoImage} resizeMode="cover" />
          </View>
          <ThemedText style={styles.logoText}>Roachy Games</ThemedText>
        </View>

        <View style={styles.actions}>
          <AnimatedButton
            style={[
              styles.actionButton,
              walletConnected && styles.walletConnected,
            ]}
            onPress={onWalletPress}
          >
            {walletConnected ? (
              <View style={styles.walletConnectedDot} />
            ) : null}
            <Feather name="credit-card" size={18} color={walletConnected ? GameColors.secondary : GameColors.gold} />
          </AnimatedButton>

          <AnimatedButton
            style={styles.actionButton}
            onPress={onNotificationPress}
          >
            <View style={styles.notificationDot} />
            <Feather name="bell" size={18} color={GameColors.textSecondary} />
          </AnimatedButton>
        </View>
      </View>

      {showSearch && (
        <View style={styles.searchContainer}>
          <Feather name="search" size={18} color={GameColors.gold} />
          <TextInput
            style={styles.searchInput}
            placeholder="Game Search..."
            placeholderTextColor={GameColors.textTertiary}
            value={searchValue}
            onChangeText={onSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GameColors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: GameColors.gold,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: GameColors.gold,
        shadowOpacity: 0.4,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
      },
      web: {
        boxShadow: `0 0 12px rgba(255, 215, 0, 0.4)`,
      },
    }),
  },
  logoImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  logoText: {
    fontSize: 18,
    fontWeight: "800",
    color: GameColors.gold,
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: GameColors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: GameColors.surfaceGlow,
  },
  walletConnected: {
    borderColor: GameColors.secondary,
    borderWidth: 2,
  },
  walletConnectedDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GameColors.secondary,
    zIndex: 1,
  },
  notificationDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GameColors.error,
    zIndex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.surfaceElevated,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: GameColors.gold + "20",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: GameColors.textPrimary,
    paddingVertical: 6,
    fontWeight: "500",
  },
});
