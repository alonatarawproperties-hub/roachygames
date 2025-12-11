import React, { useState } from "react";
import { View, StyleSheet, Pressable, Text, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { ChessBoard } from "@/games/chess/ChessBoard";
import { GameColors } from "@/constants/theme";

export function RoachyMateScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [gameKey, setGameKey] = useState(0);

  const handleMove = (move: { from: string; to: string; san: string; fen: string }) => {
    console.log('Move made:', move.san);
  };

  const resetGame = () => {
    setGameKey(prev => prev + 1);
  };

  const flipBoard = () => {
    setPlayerColor(prev => prev === 'white' ? 'black' : 'white');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.exitButton}>
          <Feather name="x" size={24} color={GameColors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Roachy Mate</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.gameInfo}>
          <Text style={styles.subtitle}>Chess with Roachies</Text>
          <Text style={styles.description}>
            Playing as {playerColor === 'white' ? 'White' : 'Black'}
          </Text>
        </View>

        <ChessBoard
          key={gameKey}
          playerColor={playerColor}
          onMove={handleMove}
          disabled={false}
          showCoordinates={true}
        />

        <View style={styles.controls}>
          <Pressable style={styles.controlButton} onPress={resetGame}>
            <Feather name="refresh-cw" size={20} color={GameColors.background} />
            <Text style={styles.controlButtonText}>New Game</Text>
          </Pressable>
          
          <Pressable style={styles.controlButton} onPress={flipBoard}>
            <Feather name="repeat" size={20} color={GameColors.background} />
            <Text style={styles.controlButtonText}>Flip Board</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: GameColors.surface,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  exitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GameColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    width: 40,
  },
  content: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
    gap: 24,
  },
  gameInfo: {
    alignItems: "center",
    gap: 4,
  },
  subtitle: {
    fontSize: 14,
    color: GameColors.textSecondary,
  },
  description: {
    fontSize: 16,
    color: GameColors.primary,
    fontWeight: "500",
  },
  controls: {
    flexDirection: "row",
    gap: 16,
  },
  controlButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: GameColors.primary,
    borderRadius: 12,
  },
  controlButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.background,
  },
});

export default RoachyMateScreen;
