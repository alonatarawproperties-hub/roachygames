import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";

interface NetworkStatusBadgeProps {
  isConnected: boolean;
  networkName?: string;
  onPress?: () => void;
}

export function NetworkStatusBadge({
  isConnected,
  networkName = "Solana",
  onPress,
}: NetworkStatusBadgeProps) {
  const pulseOpacity = useSharedValue(1);

  React.useEffect(() => {
    if (isConnected) {
      pulseOpacity.value = withRepeat(
        withTiming(0.4, { duration: 1500 }),
        -1,
        true
      );
    }
  }, [isConnected]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.content}>
        <View style={styles.statusContainer}>
          {isConnected ? (
            <Animated.View style={[styles.statusDot, styles.connected, pulseStyle]} />
          ) : (
            <View style={[styles.statusDot, styles.disconnected]} />
          )}
          <View style={[styles.statusDotBase, isConnected ? styles.connected : styles.disconnected]} />
        </View>
        <ThemedText style={[styles.networkText, !isConnected && styles.disconnectedText]}>
          {networkName}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: GameColors.surfaceElevated,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: GameColors.surfaceGlow,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusContainer: {
    width: 10,
    height: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  statusDotBase: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: "absolute",
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: "absolute",
  },
  connected: {
    backgroundColor: GameColors.success,
  },
  disconnected: {
    backgroundColor: GameColors.textTertiary,
  },
  networkText: {
    fontSize: 11,
    fontWeight: "600",
    color: GameColors.success,
  },
  disconnectedText: {
    color: GameColors.textTertiary,
  },
});
