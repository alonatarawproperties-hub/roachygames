import React from "react";
import { useNavigation } from "@react-navigation/native";
import { WebGameView } from "@/components/WebGameView";

export function RoachyBattlesScreen() {
  const navigation = useNavigation();

  return (
    <WebGameView
      gameUrl="https://roachy.games/battles"
      gameName="Roachy Battles"
      onExit={() => navigation.goBack()}
    />
  );
}
