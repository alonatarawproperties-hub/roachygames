import React from "react";
import { useNavigation } from "@react-navigation/native";
import { WebGameView } from "@/components/WebGameView";

export function RoachyMateScreen() {
  const navigation = useNavigation();

  return (
    <WebGameView
      gameUrl="https://roachy.games/chess"
      gameName="Roachy Mate"
      onExit={() => navigation.goBack()}
    />
  );
}

export default RoachyMateScreen;
