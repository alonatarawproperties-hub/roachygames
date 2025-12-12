import React from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
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
import { TournamentListScreen } from "@/screens/TournamentListScreen";
import { TournamentDetailScreen } from "@/screens/TournamentDetailScreen";
import { AuthScreen } from "@/screens/AuthScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/context/AuthContext";
import { WildCreature } from "@/constants/gameState";
import { GameColors } from "@/constants/theme";

export type RootStackParamList = {
  Auth: undefined;
  ArcadeHome: undefined;
  RoachyHuntStack: undefined;
  FlappyRoachStack: undefined;
  RoachyMateStack: undefined;
  RoachyBattlesStack: undefined;
  Catch: { creature: WildCreature };
  ChessLobby: undefined;
  ChessMatchmaking: { walletAddress: string; gameMode: string; timeControl: string };
  ChessGame: { matchId: string; walletAddress: string };
  TournamentList: undefined;
  TournamentDetail: { tournamentId: string };
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
      ) : null}
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
      <Stack.Screen
        name="TournamentList"
        component={TournamentListScreen}
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="TournamentDetail"
        component={TournamentDetailScreen}
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
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
