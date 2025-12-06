import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HuntScreen from "@/screens/HuntScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type HuntStackParamList = {
  HuntMain: undefined;
};

const Stack = createNativeStackNavigator<HuntStackParamList>();

export default function HuntStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="HuntMain"
        component={HuntScreen}
        options={{
          headerTitle: "Roachy Hunt",
        }}
      />
    </Stack.Navigator>
  );
}
