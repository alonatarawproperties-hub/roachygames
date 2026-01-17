import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HeaderButton } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { BattlesHomeScreen } from "@/games/battles/BattlesHomeScreen";
import { TeamSelectScreen } from "@/games/battles/TeamSelectScreen";
import { BattleMatchmakingScreen } from "@/games/battles/BattleMatchmakingScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { GameColors } from "@/constants/theme";

export type BattlesStackParamList = {
  BattlesHome: undefined;
  BattleTeamSelect: undefined;
  BattleMatchmaking: { teamId: string; selectedRoachyIds: string[] };
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
    </Stack.Navigator>
  );
}
