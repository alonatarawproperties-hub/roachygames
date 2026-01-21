import React from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HuntStackNavigator from "@/navigation/HuntStackNavigator";
import BattlesStackNavigator from "@/navigation/BattlesStackNavigator";
import CatchScreen from "@/screens/CatchScreen";
import { ArcadeHomeScreen } from "@/screens/Arcade";
import { AuthScreen } from "@/screens/AuthScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/context/AuthContext";
import { WildCreature } from "@/constants/gameState";
import { GameColors } from "@/constants/theme";

export type RootStackParamList = {
  Auth: undefined;
  ArcadeHome: undefined;
  RoachyHuntStack: undefined;
  RoachyBattlesStack: undefined;
  Catch: { creature: WildCreature };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={loadingStyles.container}>
        <ActivityIndicator size="large" color={GameColors.gold} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {!isAuthenticated ? (
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ headerShown: false, animation: "fade" }}
        />
      ) : (
        <>
          <Stack.Screen
            name="ArcadeHome"
            component={ArcadeHomeScreen}
            options={{ headerShown: false }}
          />
      <Stack.Screen
        name="RoachyHuntStack"
        component={HuntStackNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Catch"
        component={CatchScreen}
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
          animation: "fade",
        }}
      />
      <Stack.Screen
        name="RoachyBattlesStack"
        component={BattlesStackNavigator}
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
        </>
      )}
    </Stack.Navigator>
  );
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: GameColors.background,
  },
});
