import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import InventoryScreen from "@/screens/InventoryScreen";
import CreatureDetailScreen from "@/screens/CreatureDetailScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { GameColors } from "@/constants/theme";

export type InventoryStackParamList = {
  Inventory: undefined;
  CreatureDetail: { uniqueId: string };
};

const Stack = createNativeStackNavigator<InventoryStackParamList>();

export default function InventoryStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator
      screenOptions={{
        ...screenOptions,
        contentStyle: {
          backgroundColor: GameColors.background,
        },
      }}
    >
      <Stack.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{
          headerTitle: "My Collection",
        }}
      />
      <Stack.Screen
        name="CreatureDetail"
        component={CreatureDetailScreen}
        options={{
          headerTitle: "",
          headerTransparent: true,
        }}
      />
    </Stack.Navigator>
  );
}
