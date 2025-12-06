import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
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
import { AppLoadingScreen } from "@/components/AppLoadingScreen";
import { GameColors } from "@/constants/theme";

SystemUI.setBackgroundColorAsync(GameColors.background);
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (e) {
        console.warn(e);
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
            <KeyboardProvider>
              <GameProvider>
                <HuntProvider>
                  <NavigationContainer>
                    <RootStackNavigator />
                  </NavigationContainer>
                </HuntProvider>
              </GameProvider>
              <StatusBar style="light" />
            </KeyboardProvider>
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
