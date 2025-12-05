import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MapScreen from "@/screens/MapScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { GameColors } from "@/constants/theme";

export type MapStackParamList = {
  Map: undefined;
};

const Stack = createNativeStackNavigator<MapStackParamList>();

export default function MapStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator
      screenOptions={{
        ...screenOptions,
        headerShown: false,
        contentStyle: {
          backgroundColor: GameColors.background,
        },
      }}
    >
      <Stack.Screen name="Map" component={MapScreen} />
    </Stack.Navigator>
  );
}
