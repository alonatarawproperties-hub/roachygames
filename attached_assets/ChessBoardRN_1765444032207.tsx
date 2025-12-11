/**
 * React Native ChessBoard Component
 * 
 * Dependencies needed:
 * npm install chess.js react-native-svg
 * 
 * Usage:
 * import { ChessBoardRN } from './ChessBoardRN';
 * 
 * <ChessBoardRN
 *   fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
 *   playerColor="white"
 *   onMove={(move) => console.log(move)}
 *   disabled={false}
 * />
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';
import { Chess, Square, Move as ChessMove } from 'chess.js';

interface ChessBoardProps {
  fen?: string;
  onMove?: (move: { from: string; to: string; san: string; fen: string; promotion?: string }) => void;
  playerColor?: 'white' | 'black';
  disabled?: boolean;
  showCoordinates?: boolean;
}

const ChessPieceSVG = ({ piece, size = 40 }: { piece: string; size?: number }) => {
  const isWhite = piece === piece.toUpperCase();
  const fill = isWhite ? '#ffffff' : '#1a1a1a';
  const stroke = '#000000';
  const strokeWidth = isWhite ? 1.5 : 0.5;
  
  const pieceType = piece.toLowerCase();
  
  const renderPiece = () => {
    switch (pieceType) {
      case 'k':
        return (
          <G>
            <Path d="M22.5 11.63V6M20 8h5" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round"/>
            <Path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
            <Path d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>
            <Path d="M12.5 30c5.5-3 14.5-3 20 0M12.5 33.5c5.5-3 14.5-3 20 0M12.5 37c5.5-3 14.5-3 20 0" stroke={stroke} strokeWidth={strokeWidth}/>
          </G>
        );
      case 'q':
        return (
          <G>
            <Circle cx="6" cy="12" r="2.5" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>
            <Circle cx="14" cy="9" r="2.5" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>
            <Circle cx="22.5" cy="8" r="2.5" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>
            <Circle cx="31" cy="9" r="2.5" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>
            <Circle cx="39" cy="12" r="2.5" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>
            <Path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-3.5-7-5 7-5-7-3.5 7-7.5-12.5L9 26z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
            <Path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
            <Path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" stroke={stroke} strokeWidth={strokeWidth}/>
          </G>
        );
      case 'r':
        return (
          <G>
            <Path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
            <Path d="M34 14l-3 3H14l-3-3" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
            <Path d="M31 17v12.5H14V17" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
            <Path d="M31 29.5l1.5 2.5h-20l1.5-2.5" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
            <Path d="M11 14h23" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
          </G>
        );
      case 'b':
        return (
          <G>
            <Path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
            <Path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
            <Path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
            <Path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
          </G>
        );
      case 'n':
        return (
          <G>
            <Path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>
            <Path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>
            <Circle cx="19" cy="15.5" r="1" fill={stroke}/>
            <Circle cx="13" cy="15.5" r="1" fill={stroke}/>
          </G>
        );
      case 'p':
        return (
          <G>
            <Path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round"/>
          </G>
        );
      default:
        return null;
    }
  };
  
  return (
    <Svg viewBox="0 0 45 45" width={size} height={size}>
      {renderPiece()}
    </Svg>
  );
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

const { width: screenWidth } = Dimensions.get('window');
const BOARD_SIZE = Math.min(screenWidth - 32, 400);
const SQUARE_SIZE = BOARD_SIZE / 8;

export function ChessBoardRN({ 
  fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  onMove,
  playerColor = 'white',
  disabled = false,
  showCoordinates = true 
}: ChessBoardProps) {
  const [game, setGame] = useState(() => new Chess(fen));
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const lastFenRef = useRef<string>(fen);
  const pendingMoveRef = useRef<boolean>(false);
  
  useEffect(() => {
    if (pendingMoveRef.current) {
      pendingMoveRef.current = false;
      lastFenRef.current = fen;
      const newGame = new Chess(fen);
      setGame(newGame);
      return;
    }
    
    if (fen !== lastFenRef.current) {
      lastFenRef.current = fen;
      const newGame = new Chess(fen);
      setGame(newGame);
      setSelectedSquare(null);
      setValidMoves([]);
    }
  }, [fen]);
  
  const isFlipped = playerColor === 'black';
  
  const getSquareColor = (file: number, rank: number): string => {
    return (file + rank) % 2 === 0 ? '#b58863' : '#f0d9b5';
  };
  
  const getPieceAt = (square: Square): string | null => {
    const piece = game.get(square);
    if (!piece) return null;
    return piece.color === 'w' ? piece.type.toUpperCase() : piece.type.toLowerCase();
  };
  
  const handleSquarePress = useCallback((square: Square) => {
    if (disabled) return;
    
    const currentTurn = game.turn();
    const playerTurn = playerColor === 'white' ? 'w' : 'b';
    
    if (selectedSquare) {
      if (validMoves.includes(square)) {
        try {
          const move = game.move({ from: selectedSquare, to: square, promotion: 'q' });
          if (move) {
            setLastMove({ from: selectedSquare, to: square });
            setSelectedSquare(null);
            setValidMoves([]);
            pendingMoveRef.current = true;
            
            if (onMove) {
              onMove({
                from: selectedSquare,
                to: square,
                san: move.san,
                fen: game.fen(),
                promotion: move.promotion,
              });
            }
          }
        } catch {
          // Move failed but keep piece selected (touch-move)
        }
      }
      // Invalid tap - piece stays selected (touch-move rule enforced)
    } else {
      const piece = game.get(square);
      if (piece && piece.color === playerTurn && currentTurn === playerTurn) {
        setSelectedSquare(square);
        const moves = game.moves({ square, verbose: true }) as ChessMove[];
        setValidMoves(moves.map(m => m.to as Square));
      }
    }
  }, [game, selectedSquare, validMoves, disabled, playerColor, onMove]);
  
  const gameStatus = () => {
    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'Black' : 'White';
      return `Checkmate! ${winner} wins!`;
    }
    if (game.isDraw()) return 'Draw!';
    if (game.isStalemate()) return 'Stalemate!';
    if (game.isCheck()) return 'Check!';
    return game.turn() === 'w' ? "White's turn" : "Black's turn";
  };
  
  const renderSquare = (index: number) => {
    const file = index % 8;
    const rank = Math.floor(index / 8);
    const actualFile = isFlipped ? 7 - file : file;
    const actualRank = isFlipped ? 7 - rank : rank;
    const square = `${FILES[actualFile]}${RANKS[actualRank]}` as Square;
    const piece = getPieceAt(square);
    
    const isSelected = selectedSquare === square;
    const isValidMove = validMoves.includes(square);
    const isLastMoveFrom = lastMove?.from === square;
    const isLastMoveTo = lastMove?.to === square;
    const isInCheck = game.inCheck() && piece && 
      ((piece === 'K' && game.turn() === 'w') || (piece === 'k' && game.turn() === 'b'));
    
    let backgroundColor = getSquareColor(actualFile, actualRank);
    if (isLastMoveFrom || isLastMoveTo) {
      backgroundColor = '#cdd26a';
    }
    if (isInCheck) {
      backgroundColor = 'rgba(239, 68, 68, 0.6)';
    }
    
    return (
      <TouchableOpacity
        key={square}
        testID={`square-${square}`}
        style={[
          styles.square,
          { 
            backgroundColor,
            width: SQUARE_SIZE,
            height: SQUARE_SIZE,
          },
          isSelected && styles.selectedSquare,
        ]}
        onPress={() => handleSquarePress(square)}
        activeOpacity={0.8}
      >
        {piece && (
          <View style={styles.pieceContainer}>
            <ChessPieceSVG piece={piece} size={SQUARE_SIZE * 0.8} />
          </View>
        )}
        
        {isValidMove && !piece && (
          <View style={styles.validMoveIndicator} />
        )}
        
        {isValidMove && piece && (
          <View style={styles.captureIndicator} />
        )}
        
        {showCoordinates && rank === 7 && (
          <Text style={[
            styles.fileLabel,
            { color: (actualFile + actualRank) % 2 === 0 ? '#f0d9b5' : '#b58863' }
          ]}>
            {FILES[actualFile]}
          </Text>
        )}
        
        {showCoordinates && file === 0 && (
          <Text style={[
            styles.rankLabel,
            { color: (actualFile + actualRank) % 2 === 0 ? '#f0d9b5' : '#b58863' }
          ]}>
            {RANKS[actualRank]}
          </Text>
        )}
      </TouchableOpacity>
    );
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.statusText} testID="game-status">
        {gameStatus()}
      </Text>
      
      <View style={[styles.board, { width: BOARD_SIZE, height: BOARD_SIZE }]}>
        {Array.from({ length: 64 }).map((_, i) => renderSquare(i))}
      </View>
      
      {game.isGameOver() && (
        <View style={styles.gameOverBanner}>
          <Text style={styles.gameOverText}>Game Over!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    color: '#f0c850',
    fontWeight: 'bold',
    fontSize: 18,
  },
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 4,
    borderColor: '#3b2418',
    borderRadius: 8,
    overflow: 'hidden',
  },
  square: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  selectedSquare: {
    borderWidth: 4,
    borderColor: '#f0c850',
  },
  pieceContainer: {
    width: '80%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  validMoveIndicator: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(240, 200, 80, 0.5)',
  },
  captureIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 4,
    borderColor: 'rgba(240, 200, 80, 0.5)',
    borderRadius: 2,
  },
  fileLabel: {
    position: 'absolute',
    bottom: 2,
    left: 4,
    fontSize: 10,
    fontWeight: 'bold',
  },
  rankLabel: {
    position: 'absolute',
    top: 2,
    right: 4,
    fontSize: 10,
    fontWeight: 'bold',
  },
  gameOverBanner: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#1e1109',
    borderWidth: 1,
    borderColor: '#3b2418',
    borderRadius: 8,
  },
  gameOverText: {
    color: '#f0c850',
    fontWeight: 'bold',
  },
});

export default ChessBoardRN;
