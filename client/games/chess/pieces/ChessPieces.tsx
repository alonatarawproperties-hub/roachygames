import React from 'react';
import { Platform, Text, View, StyleSheet, Image } from 'react-native';
import Svg, { Path, Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { ChessSkin } from '../skins';
import {
  IceKingSvg, FireKingSvg,
  IceQueenSvg, FireQueenSvg,
  IceRookSvg, FireRookSvg,
  IceBishopSvg, FireBishopSvg,
  IceKnightSvg, FireKnightSvg,
  IcePawnSvg, FirePawnSvg,
} from './CelestialPieces';

interface PieceProps {
  size: number;
  isWhite: boolean;
  uniqueId: string;
}

const UNICODE_PIECES: Record<string, string> = {
  K: '\u2654', k: '\u265A',
  Q: '\u2655', q: '\u265B',
  R: '\u2656', r: '\u265C',
  B: '\u2657', b: '\u265D',
  N: '\u2658', n: '\u265E',
  P: '\u2659', p: '\u265F',
};

const WebPiece: React.FC<{ piece: string; size: number }> = ({ piece, size }) => {
  const isWhite = piece === piece.toUpperCase();
  const symbol = UNICODE_PIECES[piece] || '';
  
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{
        fontSize: size * 0.85,
        color: isWhite ? '#F5E6D3' : '#2B1810',
        textShadowColor: isWhite ? '#8B7355' : '#8B5E34',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
        lineHeight: size,
        textAlign: 'center',
      }}>
        {symbol}
      </Text>
    </View>
  );
};

const WHITE_FILL = '#F5E6D3';
const WHITE_STROKE = '#C9A86C';
const WHITE_HIGHLIGHT = '#FFF8EE';
const WHITE_SHADOW = '#8B7355';

const BLACK_FILL = '#2B1810';
const BLACK_STROKE = '#8B5E34';
const BLACK_HIGHLIGHT = '#5C3D2E';
const BLACK_SHADOW = '#1A0F0A';

export const KingSvg: React.FC<PieceProps> = ({ size, isWhite, uniqueId }) => {
  const fill = isWhite ? WHITE_FILL : BLACK_FILL;
  const stroke = isWhite ? WHITE_STROKE : BLACK_STROKE;
  const highlight = isWhite ? WHITE_HIGHLIGHT : BLACK_HIGHLIGHT;
  const shadow = isWhite ? WHITE_SHADOW : BLACK_SHADOW;
  const gradId = `kingGrad_${uniqueId}`;
  
  return (
    <Svg width={size} height={size} viewBox="0 0 45 45">
      <Defs>
        <LinearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={highlight} />
          <Stop offset="50%" stopColor={fill} />
          <Stop offset="100%" stopColor={shadow} />
        </LinearGradient>
      </Defs>
      <G fill={`url(#${gradId})`} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M22.5 11.63V6M20 8h5" strokeWidth="1.5" />
        <Path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" />
        <Path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7" />
        <Path d="M11.5 30c5.5-3 15.5-3 21 0" />
        <Path d="M11.5 33.5c5.5-3 15.5-3 21 0" />
        <Path d="M11.5 37c5.5-3 15.5-3 21 0" />
      </G>
    </Svg>
  );
};

export const QueenSvg: React.FC<PieceProps> = ({ size, isWhite, uniqueId }) => {
  const fill = isWhite ? WHITE_FILL : BLACK_FILL;
  const stroke = isWhite ? WHITE_STROKE : BLACK_STROKE;
  const highlight = isWhite ? WHITE_HIGHLIGHT : BLACK_HIGHLIGHT;
  const shadow = isWhite ? WHITE_SHADOW : BLACK_SHADOW;
  const gradId = `queenGrad_${uniqueId}`;
  
  return (
    <Svg width={size} height={size} viewBox="0 0 45 45">
      <Defs>
        <LinearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={highlight} />
          <Stop offset="50%" stopColor={fill} />
          <Stop offset="100%" stopColor={shadow} />
        </LinearGradient>
      </Defs>
      <G fill={`url(#${gradId})`} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="6" cy="12" r="2.75" />
        <Circle cx="14" cy="9" r="2.75" />
        <Circle cx="22.5" cy="8" r="2.75" />
        <Circle cx="31" cy="9" r="2.75" />
        <Circle cx="39" cy="12" r="2.75" />
        <Path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-3.5-7-5.5 9-5.5-9-3.5 7-7.5-12.5L9 26z" />
        <Path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" />
        <Path d="M11.5 30c3.5-1 18.5-1 22 0" />
        <Path d="M12 33.5c6-1 15-1 21 0" />
      </G>
    </Svg>
  );
};

export const RookSvg: React.FC<PieceProps> = ({ size, isWhite, uniqueId }) => {
  const fill = isWhite ? WHITE_FILL : BLACK_FILL;
  const stroke = isWhite ? WHITE_STROKE : BLACK_STROKE;
  const highlight = isWhite ? WHITE_HIGHLIGHT : BLACK_HIGHLIGHT;
  const shadow = isWhite ? WHITE_SHADOW : BLACK_SHADOW;
  const gradId = `rookGrad_${uniqueId}`;
  
  return (
    <Svg width={size} height={size} viewBox="0 0 45 45">
      <Defs>
        <LinearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={highlight} />
          <Stop offset="50%" stopColor={fill} />
          <Stop offset="100%" stopColor={shadow} />
        </LinearGradient>
      </Defs>
      <G fill={`url(#${gradId})`} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" />
        <Path d="M34 14l-3 3H14l-3-3" />
        <Path d="M31 17v12.5H14V17" />
        <Path d="M31 29.5l1.5 2.5h-20l1.5-2.5" />
        <Path d="M11 14h23" />
      </G>
    </Svg>
  );
};

export const BishopSvg: React.FC<PieceProps> = ({ size, isWhite, uniqueId }) => {
  const fill = isWhite ? WHITE_FILL : BLACK_FILL;
  const stroke = isWhite ? WHITE_STROKE : BLACK_STROKE;
  const highlight = isWhite ? WHITE_HIGHLIGHT : BLACK_HIGHLIGHT;
  const shadow = isWhite ? WHITE_SHADOW : BLACK_SHADOW;
  const gradId = `bishopGrad_${uniqueId}`;
  
  return (
    <Svg width={size} height={size} viewBox="0 0 45 45">
      <Defs>
        <LinearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={highlight} />
          <Stop offset="50%" stopColor={fill} />
          <Stop offset="100%" stopColor={shadow} />
        </LinearGradient>
      </Defs>
      <G fill={`url(#${gradId})`} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <G strokeLinecap="butt">
          <Path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z" />
          <Path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" />
          <Path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" />
        </G>
        <Path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke={stroke} strokeLinejoin="miter" />
      </G>
    </Svg>
  );
};

export const KnightSvg: React.FC<PieceProps> = ({ size, isWhite, uniqueId }) => {
  const fill = isWhite ? WHITE_FILL : BLACK_FILL;
  const stroke = isWhite ? WHITE_STROKE : BLACK_STROKE;
  const highlight = isWhite ? WHITE_HIGHLIGHT : BLACK_HIGHLIGHT;
  const shadow = isWhite ? WHITE_SHADOW : BLACK_SHADOW;
  const gradId = `knightGrad_${uniqueId}`;
  
  return (
    <Svg width={size} height={size} viewBox="0 0 45 45">
      <Defs>
        <LinearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={highlight} />
          <Stop offset="50%" stopColor={fill} />
          <Stop offset="100%" stopColor={shadow} />
        </LinearGradient>
      </Defs>
      <G fill={`url(#${gradId})`} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" />
        <Path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" />
        <Circle cx="19" cy="16" r="2" fill={isWhite ? BLACK_FILL : WHITE_FILL} />
        <Path d="M12.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-17-4-3 6 7 10.5 7 10.5v7" fill="none" />
      </G>
    </Svg>
  );
};

export const PawnSvg: React.FC<PieceProps> = ({ size, isWhite, uniqueId }) => {
  const fill = isWhite ? WHITE_FILL : BLACK_FILL;
  const stroke = isWhite ? WHITE_STROKE : BLACK_STROKE;
  const highlight = isWhite ? WHITE_HIGHLIGHT : BLACK_HIGHLIGHT;
  const shadow = isWhite ? WHITE_SHADOW : BLACK_SHADOW;
  const gradId = `pawnGrad_${uniqueId}`;
  
  return (
    <Svg width={size} height={size} viewBox="0 0 45 45">
      <Defs>
        <LinearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={highlight} />
          <Stop offset="50%" stopColor={fill} />
          <Stop offset="100%" stopColor={shadow} />
        </LinearGradient>
      </Defs>
      <Path
        d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
        fill={`url(#${gradId})`}
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </Svg>
  );
};

interface PieceSpriteProps {
  piece: string;
  size: number;
  square: string;
  skin?: ChessSkin | null;
}

const PIECE_TYPE_MAP: Record<string, 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn'> = {
  k: 'king',
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
  p: 'pawn',
};

const SvgFallback: React.FC<{ pieceType: string; pieceSize: number; isWhite: boolean; uniqueId: string }> = ({ 
  pieceType, pieceSize, isWhite, uniqueId 
}) => {
  switch (pieceType) {
    case 'k':
      return <KingSvg size={pieceSize} isWhite={isWhite} uniqueId={uniqueId} />;
    case 'q':
      return <QueenSvg size={pieceSize} isWhite={isWhite} uniqueId={uniqueId} />;
    case 'r':
      return <RookSvg size={pieceSize} isWhite={isWhite} uniqueId={uniqueId} />;
    case 'b':
      return <BishopSvg size={pieceSize} isWhite={isWhite} uniqueId={uniqueId} />;
    case 'n':
      return <KnightSvg size={pieceSize} isWhite={isWhite} uniqueId={uniqueId} />;
    case 'p':
      return <PawnSvg size={pieceSize} isWhite={isWhite} uniqueId={uniqueId} />;
    default:
      return null;
  }
};

const CelestialPiece: React.FC<{ pieceType: string; pieceSize: number; isWhite: boolean; uniqueId: string }> = ({ 
  pieceType, pieceSize, isWhite, uniqueId 
}) => {
  if (isWhite) {
    switch (pieceType) {
      case 'k':
        return <IceKingSvg size={pieceSize} uniqueId={uniqueId} />;
      case 'q':
        return <IceQueenSvg size={pieceSize} uniqueId={uniqueId} />;
      case 'r':
        return <IceRookSvg size={pieceSize} uniqueId={uniqueId} />;
      case 'b':
        return <IceBishopSvg size={pieceSize} uniqueId={uniqueId} />;
      case 'n':
        return <IceKnightSvg size={pieceSize} uniqueId={uniqueId} />;
      case 'p':
        return <IcePawnSvg size={pieceSize} uniqueId={uniqueId} />;
      default:
        return null;
    }
  } else {
    switch (pieceType) {
      case 'k':
        return <FireKingSvg size={pieceSize} uniqueId={uniqueId} />;
      case 'q':
        return <FireQueenSvg size={pieceSize} uniqueId={uniqueId} />;
      case 'r':
        return <FireRookSvg size={pieceSize} uniqueId={uniqueId} />;
      case 'b':
        return <FireBishopSvg size={pieceSize} uniqueId={uniqueId} />;
      case 'n':
        return <FireKnightSvg size={pieceSize} uniqueId={uniqueId} />;
      case 'p':
        return <FirePawnSvg size={pieceSize} uniqueId={uniqueId} />;
      default:
        return null;
    }
  }
};

const PieceSpriteInner: React.FC<PieceSpriteProps> = ({ piece, size, square, skin }) => {
  const [imageError, setImageError] = React.useState(false);
  const isWhite = piece === piece.toUpperCase();
  const pieceType = piece.toLowerCase();
  const pieceSize = size * 0.88;
  const uniqueId = `${square}_${piece}`;

  if (skin && skin.id === 'celestial') {
    return <CelestialPiece pieceType={pieceType} pieceSize={pieceSize} isWhite={isWhite} uniqueId={uniqueId} />;
  }

  if (skin && skin.id !== 'default' && !imageError) {
    const pieceName = PIECE_TYPE_MAP[pieceType];
    if (pieceName) {
      const colorSet = isWhite ? skin.pieces.white : skin.pieces.black;
      const imageSource = colorSet[pieceName];
      if (imageSource) {
        return (
          <View style={{ width: pieceSize, height: pieceSize, alignItems: 'center', justifyContent: 'center' }}>
            <Image
              source={imageSource}
              style={{ width: pieceSize, height: pieceSize }}
              resizeMode="contain"
              onError={() => setImageError(true)}
            />
          </View>
        );
      }
    }
  }

  if (Platform.OS === 'web') {
    return <WebPiece piece={piece} size={pieceSize} />;
  }
  
  return <SvgFallback pieceType={pieceType} pieceSize={pieceSize} isWhite={isWhite} uniqueId={uniqueId} />;
};

export const PieceSprite = React.memo(PieceSpriteInner);

export default PieceSprite;
