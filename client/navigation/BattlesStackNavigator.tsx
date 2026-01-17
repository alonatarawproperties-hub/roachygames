import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HeaderButton } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { BattlesHomeScreen } from "@/games/battles/BattlesHomeScreen";
import { TeamSelectScreen } from "@/games/battles/TeamSelectScreen";
import { BattleMatchmakingScreen } from "@/games/battles/BattleMatchmakingScreen";
import { BattleMatchScreen } from "@/games/battles/BattleMatchScreen";
import { BattleResultScreen } from "@/games/battles/BattleResultScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { GameColors } from "@/constants/theme";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

export type BattlesStackParamList = {
  BattlesHome: undefined;
  BattleTeamSelect: undefined;
  BattleMatchmaking: { teamId: string; selectedRoachyIds: string[] };
  BattleMatch: { matchId: string; team?: string[] };
  BattleResult: {
    matchId: string;
    result: "win" | "lose";
    rankDelta: number;
    xpGained: number;
    warmthGained?: number;
    dailyBonusProgress?: { current: number; max: number };
  };
};

const Stack = createNativeStackNavigator<BattlesStackParamList>();

function ExitButton() {
  const navigation = useNavigation<any>();

  return (
    <HeaderButton
      onPress={() => navigation.navigate("ArcadeHome")}
      accessibilityLabel="Exit to Arcade"
    >
      <Feather name="x" size={24} color={GameColors.textPrimary} />
    </HeaderButton>
  );
}

export default function BattlesStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="BattlesHome"
        component={BattlesHomeScreen}
        options={{
          headerTitle: "Roachy Battles",
          headerLeft: () => <ExitButton />,
        }}
      />
      <Stack.Screen
        name="BattleTeamSelect"
        component={TeamSelectScreen}
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="BattleMatchmaking"
        component={BattleMatchmakingScreen}
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="BattleMatch"
        component={BattleMatchScreen}
        options={{
          headerShown: false,
          animation: "fade",
          orientation: "landscape",
        }}
      />
      <Stack.Screen
        name="BattleResult"
        component={BattleResultScreen}
        options={{
          headerShown: false,
          animation: "fade",
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
}
