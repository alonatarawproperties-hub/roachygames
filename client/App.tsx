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
import { WalletProvider } from "./context/WalletContext";
import { AppLoadingScreen } from "@/components/AppLoadingScreen";
import { AppKitWrapper } from "./components/AppKitWrapper";
import { GameColors } from "@/constants/theme";

SystemUI.setBackgroundColorAsync(GameColors.background);
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  console.log('[App] Rendering, appIsReady:', appIsReady);

  useEffect(() => {
    console.log('[App] useEffect starting...');
    async function prepare() {
      try {
        console.log('[App] Preparing app...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log('[App] Preparation complete');
      } catch (e) {
        console.warn('[App] Error during preparation:', e);
      } finally {
        console.log('[App] Setting appIsReady to true');
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

  if (!appIsReady) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <AppLoadingScreen />
        <StatusBar style="light" />
      </GestureHandlerRootView>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider onLayout={onLayoutRootView}>
          <GestureHandlerRootView style={styles.root}>
            <AppKitWrapper>
              <WalletProvider>
                <GameProvider>
                  <HuntProvider>
                    <NavigationContainer>
                      <RootStackNavigator />
                    </NavigationContainer>
                  </HuntProvider>
                </GameProvider>
              </WalletProvider>
            </AppKitWrapper>
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
