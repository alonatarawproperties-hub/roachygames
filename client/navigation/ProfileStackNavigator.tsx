import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProfileScreen from "@/screens/ProfileScreen";
import TradingScreen from "@/screens/TradingScreen";
import PowerupShopScreen from "@/screens/PowerupShopScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { GameColors } from "@/constants/theme";

export type ProfileStackParamList = {
  Profile: undefined;
  Trading: undefined;
  PowerupShop: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
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
        name="Profile"
        component={ProfileScreen}
        options={{
          headerTitle: "Profile",
        }}
      />
      <Stack.Screen
        name="Trading"
        component={TradingScreen}
        options={{
          headerTitle: "Token Exchange",
        }}
      />
      <Stack.Screen
        name="PowerupShop"
        component={PowerupShopScreen}
        options={{
          headerTitle: "Powerup Shop",
        }}
      />
    </Stack.Navigator>
  );
}
