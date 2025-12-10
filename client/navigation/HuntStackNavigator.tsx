import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HeaderButton } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import HuntScreen from "@/screens/HuntScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { GameColors } from "@/constants/theme";

export type HuntStackParamList = {
  HuntMain: undefined;
};

const Stack = createNativeStackNavigator<HuntStackParamList>();

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

export default function HuntStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="HuntMain"
        component={HuntScreen}
        options={{
          headerTitle: "Roachy Hunt",
          headerLeft: () => <ExitButton />,
        }}
      />
    </Stack.Navigator>
  );
}
