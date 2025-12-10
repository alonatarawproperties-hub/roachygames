import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GameProvider } from "@/context/GameContext";
import { HuntProvider } from "@/context/HuntContext";
import { WalletProvider } from "@/context/WalletContext";
import { ArcadeInventoryProvider } from "@/context/ArcadeInventoryContext";
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
              <AppKitWrapper>
                <WalletProvider>
                  <GameProvider>
                    <HuntProvider>
                      <ArcadeInventoryProvider>
                        <NavigationContainer>
                          <RootStackNavigator />
                        </NavigationContainer>
                      </ArcadeInventoryProvider>
                    </HuntProvider>
                  </GameProvider>
                </WalletProvider>
              </AppKitWrapper>
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
