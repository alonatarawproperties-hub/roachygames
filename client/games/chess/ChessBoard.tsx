import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Chess, Square, Move as ChessMove } from 'chess.js';
import { LinearGradient } from 'expo-linear-gradient';

const PIECE_CHARS: Record<string, { char: string; isWhite: boolean }> = {
  'K': { char: '\u265A', isWhite: true },
  'Q': { char: '\u265B', isWhite: true },
  'R': { char: '\u265C', isWhite: true },
  'B': { char: '\u265D', isWhite: true },
  'N': { char: '\u265E', isWhite: true },
  'P': { char: '\u265F', isWhite: true },
  'k': { char: '\u265A', isWhite: false },
  'q': { char: '\u265B', isWhite: false },
  'r': { char: '\u265C', isWhite: false },
  'b': { char: '\u265D', isWhite: false },
  'n': { char: '\u265E', isWhite: false },
  'p': { char: '\u265F', isWhite: false },
};

interface ChessBoardProps {
  fen?: string;
  onMove?: (move: { from: string; to: string; san: string; fen: string; promotion?: string }) => void;
  playerColor?: 'white' | 'black';
  disabled?: boolean;
  showCoordinates?: boolean;
  size?: number;
}

const ChessPiece = ({ piece, size = 40 }: { piece: string; size?: number }) => {
  const pieceData = PIECE_CHARS[piece];
  if (!pieceData) return null;
  
  const { char, isWhite } = pieceData;
  
  return (
    <View style={[styles.pieceWrapper, { width: size, height: size }]}>
      <Text style={[
        styles.pieceText,
        { 
          fontSize: size * 0.78,
          lineHeight: size,
          color: isWhite ? '#FFFFFF' : '#1a1a1a',
          textShadowColor: isWhite ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.3)',
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: isWhite ? 3 : 2,
        }
      ]}>
        {char}
      </Text>
    </View>
  );
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

const LIGHT_SQUARE = '#E8D4B8';
const DARK_SQUARE = '#B58863';
const SELECTED_COLOR = 'rgba(240, 200, 80, 0.7)';
const LAST_MOVE_COLOR = 'rgba(240, 200, 80, 0.4)';
const CHECK_COLOR = 'rgba(239, 68, 68, 0.7)';
const VALID_MOVE_COLOR = 'rgba(100, 200, 100, 0.6)';

export function ChessBoard({ 
  fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  onMove,
  playerColor = 'white',
  disabled = false,
  showCoordinates = true,
  size,
}: ChessBoardProps) {
  const [game, setGame] = useState(() => new Chess(fen));
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const lastFenRef = useRef<string>(fen);
  const pendingMoveRef = useRef<boolean>(false);
  
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const boardSize = size || Math.min(screenWidth - 16, screenHeight * 0.55, 500);
  const squareSize = boardSize / 8;
  
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
    return (file + rank) % 2 === 0 ? DARK_SQUARE : LIGHT_SQUARE;
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
          setSelectedSquare(null);
          setValidMoves([]);
        }
      } else {
        const piece = game.get(square);
        if (piece && piece.color === playerTurn && currentTurn === playerTurn) {
          setSelectedSquare(square);
          const moves = game.moves({ square, verbose: true }) as ChessMove[];
          setValidMoves(moves.map(m => m.to as Square));
        } else {
          setSelectedSquare(null);
          setValidMoves([]);
        }
      }
    } else {
      const piece = game.get(square);
      if (piece && piece.color === playerTurn && currentTurn === playerTurn) {
        setSelectedSquare(square);
        const moves = game.moves({ square, verbose: true }) as ChessMove[];
        setValidMoves(moves.map(m => m.to as Square));
      }
    }
  }, [game, selectedSquare, validMoves, disabled, playerColor, onMove]);
  
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
    let overlayColor: string | null = null;
    
    if (isLastMoveFrom || isLastMoveTo) {
      overlayColor = LAST_MOVE_COLOR;
    }
    if (isSelected) {
      overlayColor = SELECTED_COLOR;
    }
    if (isInCheck) {
      overlayColor = CHECK_COLOR;
    }
    
    const showFileLabel = showCoordinates && rank === 7;
    const showRankLabel = showCoordinates && file === 0;
    const labelColor = (actualFile + actualRank) % 2 === 0 ? LIGHT_SQUARE : DARK_SQUARE;
    
    return (
      <TouchableOpacity
        key={square}
        testID={`square-${square}`}
        style={[
          styles.square,
          { 
            backgroundColor,
            width: squareSize,
            height: squareSize,
          },
        ]}
        onPress={() => handleSquarePress(square)}
        activeOpacity={0.9}
      >
        {overlayColor ? (
          <View style={[styles.squareOverlay, { backgroundColor: overlayColor }]} />
        ) : null}
        
        {piece ? (
          <ChessPiece piece={piece} size={squareSize * 0.92} />
        ) : null}
        
        {isValidMove && !piece ? (
          <View style={[styles.validMoveIndicator, { 
            width: squareSize * 0.32, 
            height: squareSize * 0.32,
            borderRadius: squareSize * 0.16,
            backgroundColor: VALID_MOVE_COLOR,
          }]} />
        ) : null}
        
        {isValidMove && piece ? (
          <View style={[styles.captureIndicator, {
            borderWidth: squareSize * 0.08,
            borderColor: VALID_MOVE_COLOR,
          }]} />
        ) : null}
        
        {showFileLabel ? (
          <Text style={[styles.fileLabel, { color: labelColor, fontSize: squareSize * 0.22 }]}>
            {FILES[actualFile]}
          </Text>
        ) : null}
        
        {showRankLabel ? (
          <Text style={[styles.rankLabel, { color: labelColor, fontSize: squareSize * 0.22 }]}>
            {RANKS[actualRank]}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };
  
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#D4A84B', '#8B6914', '#D4A84B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.boardFrame, { width: boardSize + 12, height: boardSize + 12 }]}
      >
        <View style={[styles.boardInner, { width: boardSize + 4, height: boardSize + 4 }]}>
          <View style={[styles.board, { width: boardSize, height: boardSize }]}>
            {Array.from({ length: 64 }).map((_, i) => renderSquare(i))}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  boardFrame: {
    borderRadius: 8,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  boardInner: {
    backgroundColor: '#2a1a0a',
    borderRadius: 4,
    padding: 2,
  },
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 2,
    overflow: 'hidden',
  },
  square: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  squareOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  pieceWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pieceText: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
  validMoveIndicator: {
    position: 'absolute',
  },
  captureIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 4,
  },
  fileLabel: {
    position: 'absolute',
    bottom: 1,
    right: 3,
    fontWeight: '700',
  },
  rankLabel: {
    position: 'absolute',
    top: 1,
    left: 3,
    fontWeight: '700',
  },
});

export default ChessBoard;
