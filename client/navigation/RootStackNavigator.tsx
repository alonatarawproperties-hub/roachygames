import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import CatchScreen from "@/screens/CatchScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { WildCreature } from "@/constants/gameState";

export type RootStackParamList = {
  Main: undefined;
  Catch: { creature: WildCreature };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Main"
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
    </Stack.Navigator>
  );
}
