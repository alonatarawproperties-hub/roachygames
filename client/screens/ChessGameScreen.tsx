import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Pressable, Text, Alert, Platform, Dimensions } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  
  const isLowTime = (time: number) => time <= 30;
  const isCriticalTime = (time: number) => time <= 10;
  
  const boardSize = Math.min(SCREEN_WIDTH - 16, SCREEN_HEIGHT * 0.52);
  
  const renderPlayerBar = (isOpponent: boolean) => {
    const name = isOpponent ? opponentName : `You (${playerColor})`;
    const time = isOpponent ? opponentTime : myTime;
    const isActive = isOpponent ? !isMyTurn && !gameOver : isMyTurn && !gameOver;
    const showLowTime = isLowTime(time) && isActive;
    const showCriticalTime = isCriticalTime(time) && isActive;
    
    return (
      <View style={[styles.playerBar, isActive && styles.playerBarActive]}>
        <View style={styles.playerInfo}>
          <View style={[styles.playerAvatar, isActive && styles.playerAvatarActive]}>
            <Text style={styles.avatarText}>
              {isOpponent ? (opponentName === 'Roachy Bot' ? 'R' : 'O') : 'Y'}
            </Text>
          </View>
          <View>
            <Text style={[styles.playerName, isActive && styles.playerNameActive]}>{name}</Text>
            {isActive ? (
              <Text style={styles.turnIndicator}>Your move</Text>
            ) : null}
          </View>
        </View>
        
        <View style={[
          styles.timer,
          isActive && styles.timerActive,
          showLowTime && styles.timerLow,
          showCriticalTime && styles.timerCritical,
        ]}>
          <Feather 
            name="clock" 
            size={18} 
            color={showCriticalTime ? '#fff' : isActive ? GameColors.primary : GameColors.textSecondary} 
          />
          <Text style={[
            styles.timerText,
            isActive && styles.timerTextActive,
            showCriticalTime && styles.timerTextCritical,
          ]}>
            {formatTime(time)}
          </Text>
        </View>
      </View>
    );
  };
  
  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
      {renderPlayerBar(true)}
      
      <View style={styles.boardContainer}>
        <ChessBoard
          fen={currentFen}
          playerColor={playerColor}
          onMove={handleMove}
          disabled={!isMyTurn || gameOver}
          showCoordinates={true}
          size={boardSize}
        />
      </View>
      
      {renderPlayerBar(false)}
      
      {gameOver ? (
        <View style={styles.gameOverContainer}>
          <LinearGradient
            colors={isDraw ? ['#4a4a2a', '#3a3a1a'] : didWin ? ['#1a3a1a', '#0a2a0a'] : ['#3a1a1a', '#2a0a0a']}
            style={styles.gameOverBanner}
          >
            <Text style={[
              styles.gameOverTitle,
              isDraw ? styles.drawText : didWin ? styles.winText : styles.loseText
            ]}>
              {isDraw ? 'Draw!' : didWin ? 'Victory!' : 'Defeat'}
            </Text>
            <Text style={styles.gameOverReason}>
              {winReason === 'checkmate' ? 'by Checkmate' :
               winReason === 'resign' ? 'by Resignation' :
               winReason === 'timeout' ? 'on Time' :
               winReason === 'stalemate' ? 'Stalemate' :
               winReason}
            </Text>
          </LinearGradient>
          <Pressable style={styles.exitButton} onPress={handleExit}>
            <LinearGradient
              colors={[GameColors.primary, GameColors.gold]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.exitButtonGradient}
            >
              <Text style={styles.exitButtonText}>Back to Lobby</Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : (
        <View style={styles.controls}>
          <Pressable style={styles.resignButton} onPress={handleResign}>
            <Feather name="flag" size={18} color={GameColors.error} />
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.sm,
    backgroundColor: GameColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  playerBarActive: {
    borderColor: GameColors.primary,
    backgroundColor: 'rgba(240, 200, 80, 0.1)',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  playerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: GameColors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerAvatarActive: {
    backgroundColor: GameColors.primary,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: GameColors.textPrimary,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '600',
    color: GameColors.textSecondary,
  },
  playerNameActive: {
    color: GameColors.textPrimary,
  },
  turnIndicator: {
    fontSize: 11,
    color: GameColors.primary,
    fontWeight: '500',
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: GameColors.background,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    minWidth: 90,
    justifyContent: 'center',
  },
  timerActive: {
    backgroundColor: 'rgba(240, 200, 80, 0.2)',
  },
  timerLow: {
    backgroundColor: 'rgba(255, 165, 0, 0.3)',
  },
  timerCritical: {
    backgroundColor: GameColors.error,
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
  timerTextCritical: {
    color: '#fff',
  },
  boardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  resignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: GameColors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GameColors.error,
  },
  resignButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: GameColors.error,
  },
  gameOverContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  gameOverBanner: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 12,
    gap: 4,
  },
  gameOverTitle: {
    fontSize: 26,
    fontWeight: '700',
  },
  winText: {
    color: '#4ade80',
  },
  loseText: {
    color: '#f87171',
  },
  drawText: {
    color: GameColors.primary,
  },
  gameOverReason: {
    fontSize: 14,
    color: GameColors.textSecondary,
  },
  exitButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  exitButtonGradient: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  exitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: GameColors.background,
  },
});

export default ChessGameScreen;
