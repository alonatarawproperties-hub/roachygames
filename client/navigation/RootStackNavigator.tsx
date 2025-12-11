import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import CatchScreen from "@/screens/CatchScreen";
import { ArcadeHomeScreen } from "@/screens/Arcade";
import { FlappyRoachScreen } from "@/screens/FlappyRoachScreen";
import { RoachyMateScreen } from "@/screens/RoachyMateScreen";
import { RoachyBattlesScreen } from "@/screens/RoachyBattlesScreen";
import { ChessLobbyScreen } from "@/screens/ChessLobbyScreen";
import { ChessMatchmakingScreen } from "@/screens/ChessMatchmakingScreen";
import { ChessGameScreen } from "@/screens/ChessGameScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { WildCreature } from "@/constants/gameState";

export type RootStackParamList = {
  ArcadeHome: undefined;
  RoachyHuntStack: undefined;
  FlappyRoachStack: undefined;
  RoachyMateStack: undefined;
  RoachyBattlesStack: undefined;
  Catch: { creature: WildCreature };
  ChessLobby: undefined;
  ChessMatchmaking: { walletAddress: string; gameMode: string; timeControl: string };
  ChessGame: { matchId: string; walletAddress: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="ArcadeHome"
        component={ArcadeHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RoachyHuntStack"
        component={MainTabNavigator}
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
        name="FlappyRoachStack"
        component={FlappyRoachScreen}
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="RoachyMateStack"
        component={RoachyMateScreen}
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="RoachyBattlesStack"
        component={RoachyBattlesScreen}
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="ChessLobby"
        component={ChessLobbyScreen}
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="ChessMatchmaking"
        component={ChessMatchmakingScreen}
        options={{
          headerShown: false,
          animation: "fade",
        }}
      />
      <Stack.Screen
        name="ChessGame"
        component={ChessGameScreen}
        options={{
          headerShown: false,
          animation: "slide_from_bottom",
        }}
      />
    </Stack.Navigator>
  );
}
