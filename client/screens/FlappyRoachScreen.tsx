import React from "react";
import { View, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { FlappyGame } from "@/games/flappy/FlappyGame";

export function FlappyRoachScreen() {
  const navigation = useNavigation();

  const handleExit = () => {
    navigation.goBack();
  };

  const handleScoreSubmit = (score: number) => {
    console.log("Flappy Roach score:", score);
  };

  return (
    <View style={styles.container}>
      <FlappyGame onExit={handleExit} onScoreSubmit={handleScoreSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
