import React, { useEffect } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { FlappyGame } from "@/games/flappy/FlappyGame";
import * as ScreenOrientation from "expo-screen-orientation";
import { useAuth } from "@/context/AuthContext";

export function FlappyRoachScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  useEffect(() => {
    let isMounted = true;
    
    async function lockOrientation() {
      if (Platform.OS !== "web") {
        try {
          await ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.PORTRAIT_UP
          );
        } catch (e) {
          // Orientation lock not supported
        }
      }
    }
    
    lockOrientation();
    
    return () => {
      isMounted = false;
      if (Platform.OS !== "web") {
        ScreenOrientation.unlockAsync().catch(() => {});
      }
    };
  }, []);

  const handleExit = () => {
    if (Platform.OS !== "web") {
      ScreenOrientation.unlockAsync().catch(() => {});
    }
    navigation.goBack();
  };

  const handleScoreSubmit = (score: number) => {
    console.log("Flappy Roach score:", score);
  };

  return (
    <View style={styles.container}>
      <FlappyGame onExit={handleExit} onScoreSubmit={handleScoreSubmit} userId={user?.id} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
