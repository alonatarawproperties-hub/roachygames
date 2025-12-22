import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import * as Updates from "expo-updates";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GameProvider } from "@/context/GameContext";
import { HuntProvider } from "@/context/HuntContext";
import { WalletProvider } from "@/context/WalletContext";
import { ArcadeInventoryProvider } from "@/context/ArcadeInventoryContext";
import { FlappySkinProvider } from "@/context/FlappySkinContext";
import { FlappyTrailProvider } from "@/context/FlappyTrailContext";
import { AuthProvider } from "@/context/AuthContext";
import { SkinProvider as ChessSkinProvider } from "@/games/chess/skins/SkinContext";
import AnimatedSplash from "@/components/AnimatedSplash";
import { AppKitWrapper } from "@/components/AppKitWrapper";
import { GameColors } from "@/constants/theme";

SystemUI.setBackgroundColorAsync(GameColors.background);
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);

  useEffect(() => {
    async function prepare() {
      try {
        if (Platform.OS !== 'web' && !__DEV__) {
          console.log('[App] Checking for OTA updates...');
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            console.log('[App] Update available, downloading...');
            await Updates.fetchUpdateAsync();
            console.log('[App] Update downloaded, reloading app...');
            await Updates.reloadAsync();
            return;
          }
          console.log('[App] No update available, continuing...');
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) {
        console.warn('[App] Error during preparation:', e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  const handleSplashComplete = useCallback(() => {
    setShowAnimatedSplash(false);
  }, []);

  if (!appIsReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider onLayout={onLayoutRootView}>
          <GestureHandlerRootView style={styles.root}>
            {showAnimatedSplash ? (
              <AnimatedSplash onAnimationComplete={handleSplashComplete} />
            ) : (
              <AuthProvider>
                <AppKitWrapper>
                  <WalletProvider>
                    <GameProvider>
                      <HuntProvider>
                        <ArcadeInventoryProvider>
                          <FlappySkinProvider>
                            <FlappyTrailProvider>
                              <ChessSkinProvider>
                                <NavigationContainer>
                                  <RootStackNavigator />
                                </NavigationContainer>
                              </ChessSkinProvider>
                            </FlappyTrailProvider>
                          </FlappySkinProvider>
                        </ArcadeInventoryProvider>
                      </HuntProvider>
                    </GameProvider>
                  </WalletProvider>
                </AppKitWrapper>
              </AuthProvider>
            )}
            <StatusBar style="light" />
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
