import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Pressable, Text, Alert, Platform } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChessBoard } from "@/games/chess/ChessBoard";
import { GameColors, Spacing } from "@/constants/theme";
import { getApiUrl, apiRequest, queryClient } from "@/lib/query-client";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type RouteParams = {
  ChessGame: {
    matchId: string;
    walletAddress: string;
  };
};

export function ChessGameScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<RouteParams, 'ChessGame'>>();
  const insets = useSafeAreaInsets();
  
  const { matchId, walletAddress } = route.params;
  
  const [currentFen, setCurrentFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [player1Time, setPlayer1Time] = useState(600);
  const [player2Time, setPlayer2Time] = useState(600);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [winReason, setWinReason] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState('Opponent');
  const [moveStartTime, setMoveStartTime] = useState(Date.now());
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const { data: matchData, refetch: refetchMatch } = useQuery({
    queryKey: ['/api/chess/match', matchId],
    queryFn: () => fetch(new URL(`/api/chess/match/${matchId}`, getApiUrl()).toString()).then(r => r.json()),
    refetchInterval: gameOver ? false : 1500,
  });
  
  useEffect(() => {
    if (matchData?.match) {
      const match = matchData.match;
      
      const isPlayer1 = match.player1Wallet === walletAddress;
      const color = isPlayer1 ? 'white' : 'black';
      setPlayerColor(color);
      
      const myTurn = (match.currentTurn === 'white' && isPlayer1) || 
                     (match.currentTurn === 'black' && !isPlayer1);
      
      if (myTurn !== isMyTurn) {
        setMoveStartTime(Date.now());
      }
      setIsMyTurn(myTurn);
      
      setCurrentFen(match.fen);
      setPlayer1Time(match.player1TimeRemaining);
      setPlayer2Time(match.player2TimeRemaining);
      
      const opponent = isPlayer1 ? match.player2Wallet : match.player1Wallet;
      setOpponentName(opponent === 'bot' ? 'Roachy Bot' : `Player ${opponent.slice(0, 6)}...`);
      
      if (match.status === 'completed') {
        setGameOver(true);
        setWinner(match.winnerWallet);
        setWinReason(match.winReason);
      }
    }
  }, [matchData, walletAddress, isMyTurn]);
  
  useEffect(() => {
    if (gameOver) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    
    timerRef.current = setInterval(() => {
      if (playerColor === 'white') {
        if (isMyTurn) {
          setPlayer1Time(prev => Math.max(0, prev - 1));
        } else {
          setPlayer2Time(prev => Math.max(0, prev - 1));
        }
      } else {
        if (isMyTurn) {
          setPlayer2Time(prev => Math.max(0, prev - 1));
        } else {
          setPlayer1Time(prev => Math.max(0, prev - 1));
        }
      }
    }, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isMyTurn, playerColor, gameOver]);
  
  const moveMutation = useMutation({
    mutationFn: async (move: { from: string; to: string; promotion?: string }) => {
      const thinkTimeMs = Date.now() - moveStartTime;
      const moveUci = move.from + move.to + (move.promotion || '');
      const res = await apiRequest('POST', '/api/chess/move', {
        matchId,
        walletAddress,
        moveUci,
        thinkTimeMs,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.match) {
        setCurrentFen(data.match.fen);
        setPlayer1Time(data.match.player1TimeRemaining);
        setPlayer2Time(data.match.player2TimeRemaining);
        
        if (data.gameOver) {
          setGameOver(true);
          setWinner(data.winner);
          setWinReason(data.reason);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['/api/chess/match', matchId] });
    },
  });
  
  const endGameMutation = useMutation({
    mutationFn: async (reason: string) => {
      const winnerWallet = matchData?.match?.player1Wallet === walletAddress 
        ? matchData?.match?.player2Wallet 
        : matchData?.match?.player1Wallet;
      const res = await apiRequest('POST', '/api/chess/end', {
        matchId,
        winnerWallet,
        winReason: reason,
      });
      return res.json();
    },
    onSuccess: () => {
      refetchMatch();
    },
  });
  
  const handleMove = useCallback((move: { from: string; to: string; san: string; fen: string; promotion?: string }) => {
    if (gameOver || !isMyTurn) return;
    moveMutation.mutate({ from: move.from, to: move.to, promotion: move.promotion });
  }, [gameOver, isMyTurn, moveMutation]);
  
  const handleResign = () => {
    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to resign?')) {
        endGameMutation.mutate('resign');
      }
    } else {
      Alert.alert(
        'Resign Game',
        'Are you sure you want to resign?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Resign', style: 'destructive', onPress: () => endGameMutation.mutate('resign') },
        ]
      );
    }
  };
  
  const handleExit = () => {
    navigation.navigate('ChessLobby');
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const myTime = playerColor === 'white' ? player1Time : player2Time;
  const opponentTime = playerColor === 'white' ? player2Time : player1Time;
  
  const didWin = winner === walletAddress;
  const isDraw = winReason === 'draw' || winReason === 'stalemate' || winReason === 'threefold_repetition';
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.playerBar}>
        <View style={styles.playerInfo}>
          <Feather name="user" size={18} color={GameColors.textSecondary} />
          <Text style={styles.playerName}>{opponentName}</Text>
        </View>
        <View style={[styles.timer, !isMyTurn && !gameOver && styles.timerActive]}>
          <Feather name="clock" size={16} color={!isMyTurn ? GameColors.primary : GameColors.textSecondary} />
          <Text style={[styles.timerText, !isMyTurn && !gameOver && styles.timerTextActive]}>
            {formatTime(opponentTime)}
          </Text>
        </View>
      </View>
      
      <View style={styles.boardContainer}>
        <ChessBoard
          fen={currentFen}
          playerColor={playerColor}
          onMove={handleMove}
          disabled={!isMyTurn || gameOver}
          showCoordinates={true}
        />
      </View>
      
      <View style={styles.playerBar}>
        <View style={styles.playerInfo}>
          <Feather name="user" size={18} color={GameColors.primary} />
          <Text style={[styles.playerName, styles.playerNameActive]}>You ({playerColor})</Text>
        </View>
        <View style={[styles.timer, isMyTurn && !gameOver && styles.timerActive]}>
          <Feather name="clock" size={16} color={isMyTurn ? GameColors.primary : GameColors.textSecondary} />
          <Text style={[styles.timerText, isMyTurn && !gameOver && styles.timerTextActive]}>
            {formatTime(myTime)}
          </Text>
        </View>
      </View>
      
      {gameOver ? (
        <View style={styles.gameOverContainer}>
          <View style={[
            styles.gameOverBanner,
            isDraw ? styles.drawBanner : didWin ? styles.winBanner : styles.loseBanner
          ]}>
            <Text style={styles.gameOverTitle}>
              {isDraw ? 'Draw!' : didWin ? 'Victory!' : 'Defeat'}
            </Text>
            <Text style={styles.gameOverReason}>
              {winReason === 'checkmate' ? 'by Checkmate' :
               winReason === 'resign' ? 'by Resignation' :
               winReason === 'timeout' ? 'on Time' :
               winReason === 'stalemate' ? 'Stalemate' :
               winReason}
            </Text>
          </View>
          <Pressable style={styles.exitButton} onPress={handleExit}>
            <Text style={styles.exitButtonText}>Back to Lobby</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.controls}>
          <Pressable style={styles.resignButton} onPress={handleResign}>
            <Feather name="flag" size={20} color={GameColors.error} />
            <Text style={styles.resignButtonText}>Resign</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
  },
  playerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: GameColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: GameColors.surfaceElevated,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '500',
    color: GameColors.textSecondary,
  },
  playerNameActive: {
    color: GameColors.primary,
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: GameColors.background,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  timerActive: {
    backgroundColor: 'rgba(240, 200, 80, 0.2)',
  },
  timerText: {
    fontSize: 18,
    fontWeight: '700',
    color: GameColors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  timerTextActive: {
    color: GameColors.primary,
  },
  boardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  resignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: GameColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GameColors.error,
  },
  resignButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: GameColors.error,
  },
  gameOverContainer: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  gameOverBanner: {
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: 16,
    gap: Spacing.sm,
  },
  winBanner: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.5)',
  },
  loseBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  drawBanner: {
    backgroundColor: 'rgba(240, 200, 80, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(240, 200, 80, 0.5)',
  },
  gameOverTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: GameColors.textPrimary,
  },
  gameOverReason: {
    fontSize: 16,
    color: GameColors.textSecondary,
  },
  exitButton: {
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: GameColors.primary,
    borderRadius: 16,
  },
  exitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: GameColors.background,
  },
});

export default ChessGameScreen;
