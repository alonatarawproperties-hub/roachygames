import React, { useRef, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Text,
  Pressable,
} from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { GameColors } from "@/constants/theme";

const Colors = {
  text: GameColors.textPrimary,
  textSecondary: GameColors.textSecondary,
  background: GameColors.background,
  cardBackground: GameColors.surface,
  primary: GameColors.primary,
};

interface WebGameViewProps {
  gameUrl: string;
  gameName: string;
  onExit?: () => void;
}

export function WebGameView({ gameUrl, gameName, onExit }: WebGameViewProps) {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          {onExit ? (
            <Pressable onPress={onExit} style={styles.exitButton}>
              <Feather name="x" size={24} color={Colors.text} />
            </Pressable>
          ) : null}
          <Text style={styles.headerTitle}>{gameName}</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.webFallback}>
          <Feather name="smartphone" size={48} color={Colors.textSecondary} />
          <Text style={styles.webFallbackText}>
            Play {gameName} in the Expo Go app for the best experience
          </Text>
          <Pressable
            style={styles.openWebButton}
            onPress={() => {
              if (typeof window !== "undefined") {
                window.open(gameUrl, "_blank");
              }
            }}
          >
            <Text style={styles.openWebButtonText}>Open in Browser</Text>
            <Feather name="external-link" size={16} color={GameColors.background} />
          </Pressable>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          {onExit ? (
            <Pressable onPress={onExit} style={styles.exitButton}>
              <Feather name="x" size={24} color={Colors.text} />
            </Pressable>
          ) : null}
          <Text style={styles.headerTitle}>{gameName}</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Feather name="wifi-off" size={48} color={Colors.textSecondary} />
          <Text style={styles.errorText}>Failed to load game</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setIsLoading(true);
              webViewRef.current?.reload();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        {onExit ? (
          <Pressable onPress={onExit} style={styles.exitButton}>
            <Feather name="x" size={24} color={Colors.text} />
          </Pressable>
        ) : null}
        <Text style={styles.headerTitle}>{gameName}</Text>
        <View style={styles.placeholder} />
      </View>
      
      <View style={styles.webViewContainer}>
        <WebView
          ref={webViewRef}
          source={{ uri: gameUrl }}
          style={styles.webView}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            setError(nativeEvent.description || "Failed to load game");
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo={true}
          scalesPageToFit={true}
          bounces={false}
          scrollEnabled={false}
        />
        {isLoading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={GameColors.primary} />
            <Text style={styles.loadingText}>Loading {gameName}...</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBackground,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
  },
  exitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.cardBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    width: 40,
  },
  webViewContainer: {
    flex: 1,
    position: "relative",
  },
  webView: {
    flex: 1,
    backgroundColor: GameColors.background,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: GameColors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: GameColors.primary,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.background,
  },
  webFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  webFallbackText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  openWebButton: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: GameColors.primary,
    borderRadius: 12,
  },
  openWebButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.background,
  },
});
