import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Chess, Square, Move as ChessMove } from 'chess.js';

const PIECE_SYMBOLS: Record<string, string> = {
  'K': '\u2654', 'Q': '\u2655', 'R': '\u2656', 'B': '\u2657', 'N': '\u2658', 'P': '\u2659',
  'k': '\u265A', 'q': '\u265B', 'r': '\u265C', 'b': '\u265D', 'n': '\u265E', 'p': '\u265F',
};

interface ChessBoardProps {
  fen?: string;
  onMove?: (move: { from: string; to: string; san: string; fen: string; promotion?: string }) => void;
  playerColor?: 'white' | 'black';
  disabled?: boolean;
  showCoordinates?: boolean;
}

const ChessPiece = ({ piece, size = 40 }: { piece: string; size?: number }) => {
  const symbol = PIECE_SYMBOLS[piece];
  if (!symbol) return null;
  
  return (
    <Text style={{ 
      fontSize: size * 0.85, 
      lineHeight: size,
      textAlign: 'center',
      textShadowColor: 'rgba(0,0,0,0.3)',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
    }}>
      {symbol}
    </Text>
  );
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

const { width: screenWidth } = Dimensions.get('window');
const BOARD_SIZE = Math.min(screenWidth - 32, 400);
const SQUARE_SIZE = BOARD_SIZE / 8;

export function ChessBoard({ 
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
        {piece ? (
          <View style={styles.pieceContainer}>
            <ChessPiece piece={piece} size={SQUARE_SIZE * 0.9} />
          </View>
        ) : null}
        
        {isValidMove && !piece ? (
          <View style={styles.validMoveIndicator} />
        ) : null}
        
        {isValidMove && piece ? (
          <View style={styles.captureIndicator} />
        ) : null}
        
        {showCoordinates && rank === 7 ? (
          <Text style={[
            styles.fileLabel,
            { color: (actualFile + actualRank) % 2 === 0 ? '#f0d9b5' : '#b58863' }
          ]}>
            {FILES[actualFile]}
          </Text>
        ) : null}
        
        {showCoordinates && file === 0 ? (
          <Text style={[
            styles.rankLabel,
            { color: (actualFile + actualRank) % 2 === 0 ? '#f0d9b5' : '#b58863' }
          ]}>
            {RANKS[actualRank]}
          </Text>
        ) : null}
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
      
      {game.isGameOver() ? (
        <View style={styles.gameOverBanner}>
          <Text style={styles.gameOverText}>Game Over!</Text>
        </View>
      ) : null}
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
    borderColor: 'rgba(240, 200, 80, 0.8)',
  },
  pieceContainer: {
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

export default ChessBoard;
