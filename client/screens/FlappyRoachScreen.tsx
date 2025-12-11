import React from "react";
import { useNavigation } from "@react-navigation/native";
import { WebGameView } from "@/components/WebGameView";

export function FlappyRoachScreen() {
  const navigation = useNavigation();

  return (
    <WebGameView
      gameUrl="https://roachy.games/flappy"
      gameName="Flappy Roach"
      onExit={() => navigation.goBack()}
    />
  );
}
