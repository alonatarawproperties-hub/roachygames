import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, G } from 'react-native-svg';

interface FireIceBoardProps {
  size: number;
  children: React.ReactNode;
}

export const FireIceBoard: React.FC<FireIceBoardProps> = ({ size, children }) => {
  const squareSize = size / 8;
  const borderWidth = 3;
  const totalSize = size + borderWidth * 2;

  const renderSquares = () => {
    const squares = [];
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const isLightSquare = (rank + file) % 2 === 0;
        const x = file * squareSize;
        const y = rank * squareSize;
        
        const isFireZone = rank < 4;
        
        let fillId: string;
        if (isFireZone) {
          fillId = isLightSquare ? 'url(#fireLightSquare)' : 'url(#fireDarkSquare)';
        } else {
          fillId = isLightSquare ? 'url(#iceLightSquare)' : 'url(#iceDarkSquare)';
        }
        
        squares.push(
          <Rect
            key={`${file}-${rank}`}
            x={x}
            y={y}
            width={squareSize}
            height={squareSize}
            fill={fillId}
          />
        );
      }
    }
    return squares;
  };

  return (
    <View style={[styles.container, { width: totalSize, height: totalSize }]}>
      <Svg width={totalSize} height={totalSize} style={styles.svg}>
        <Defs>
          <LinearGradient id="fireLightSquare" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#FFD4A8" />
            <Stop offset="50%" stopColor="#FFBB85" />
            <Stop offset="100%" stopColor="#FFA066" />
          </LinearGradient>
          
          <LinearGradient id="fireDarkSquare" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#D84315" />
            <Stop offset="50%" stopColor="#BF360C" />
            <Stop offset="100%" stopColor="#8B2500" />
          </LinearGradient>
          
          <LinearGradient id="iceLightSquare" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#E3F2FD" />
            <Stop offset="50%" stopColor="#BBDEFB" />
            <Stop offset="100%" stopColor="#90CAF9" />
          </LinearGradient>
          
          <LinearGradient id="iceDarkSquare" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#1976D2" />
            <Stop offset="50%" stopColor="#1565C0" />
            <Stop offset="100%" stopColor="#0D47A1" />
          </LinearGradient>
          
          <LinearGradient id="borderGradientTop" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#FF6B00" />
            <Stop offset="50%" stopColor="#FFD700" />
            <Stop offset="100%" stopColor="#FF6B00" />
          </LinearGradient>
          
          <LinearGradient id="borderGradientBottom" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#00B4FF" />
            <Stop offset="50%" stopColor="#00FFFF" />
            <Stop offset="100%" stopColor="#00B4FF" />
          </LinearGradient>
          
          <LinearGradient id="borderGradientLeft" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#FF6B00" />
            <Stop offset="50%" stopColor="#8B4513" />
            <Stop offset="100%" stopColor="#00B4FF" />
          </LinearGradient>
          
          <LinearGradient id="borderGradientRight" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#FF6B00" />
            <Stop offset="50%" stopColor="#8B4513" />
            <Stop offset="100%" stopColor="#00B4FF" />
          </LinearGradient>
        </Defs>
        
        <Rect x={0} y={0} width={totalSize} height={borderWidth} fill="url(#borderGradientTop)" />
        <Rect x={0} y={totalSize - borderWidth} width={totalSize} height={borderWidth} fill="url(#borderGradientBottom)" />
        <Rect x={0} y={0} width={borderWidth} height={totalSize} fill="url(#borderGradientLeft)" />
        <Rect x={totalSize - borderWidth} y={0} width={borderWidth} height={totalSize} fill="url(#borderGradientRight)" />
        
        <G transform={`translate(${borderWidth}, ${borderWidth})`}>
          {renderSquares()}
        </G>
      </Svg>
      
      <View style={[styles.piecesContainer, { 
        top: borderWidth, 
        left: borderWidth, 
        width: size, 
        height: size 
      }]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  piecesContainer: {
    position: 'absolute',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});

export default FireIceBoard;
