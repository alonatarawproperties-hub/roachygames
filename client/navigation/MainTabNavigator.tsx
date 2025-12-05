import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapStackNavigator from "@/navigation/MapStackNavigator";
import InventoryStackNavigator from "@/navigation/InventoryStackNavigator";
import ProfileStackNavigator from "@/navigation/ProfileStackNavigator";
import { GameColors, Spacing } from "@/constants/theme";
import { useGame } from "@/context/GameContext";

export type MainTabParamList = {
  MapTab: undefined;
  InventoryTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  const { state } = useGame();
  
  const nearestCreature = state.nearbyCreatures[0];
  const canCatch = nearestCreature && nearestCreature.distance < 100;

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        initialRouteName="MapTab"
        screenOptions={{
          tabBarActiveTintColor: GameColors.primary,
          tabBarInactiveTintColor: GameColors.textSecondary,
          tabBarStyle: {
            position: "absolute",
            backgroundColor: Platform.select({
              ios: "transparent",
              android: GameColors.surface,
            }),
            borderTopWidth: 0,
            elevation: 0,
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom,
          },
          tabBarBackground: () =>
            Platform.OS === "ios" ? (
              <BlurView
                intensity={100}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
            ) : null,
          headerShown: false,
        }}
      >
        <Tab.Screen
          name="MapTab"
          component={MapStackNavigator}
          options={{
            title: "Hunt",
            tabBarIcon: ({ color, size }) => (
              <Feather name="map" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="InventoryTab"
          component={InventoryStackNavigator}
          options={{
            title: "Collection",
            tabBarIcon: ({ color, size }) => (
              <Feather name="grid" size={size} color={color} />
            ),
            tabBarBadge: state.inventory.length > 0 ? state.inventory.length : undefined,
            tabBarBadgeStyle: {
              backgroundColor: GameColors.primary,
              color: '#fff',
              fontSize: 10,
            },
          }}
        />
        <Tab.Screen
          name="ProfileTab"
          component={ProfileStackNavigator}
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => (
              <Feather name="user" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </View>
  );
}
