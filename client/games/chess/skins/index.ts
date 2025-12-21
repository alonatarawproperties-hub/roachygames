import { ImageSourcePropType } from 'react-native';

export interface ChessSkin {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  description: string;
  pieces: {
    white: {
      king: ImageSourcePropType;
      queen: ImageSourcePropType;
      rook: ImageSourcePropType;
      bishop: ImageSourcePropType;
      knight: ImageSourcePropType;
      pawn: ImageSourcePropType;
    };
    black: {
      king: ImageSourcePropType;
      queen: ImageSourcePropType;
      rook: ImageSourcePropType;
      bishop: ImageSourcePropType;
      knight: ImageSourcePropType;
      pawn: ImageSourcePropType;
    };
  };
}

export interface ChessBoard {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  description: string;
  image: ImageSourcePropType | null;
}

export const CHESS_SKINS: Record<string, ChessSkin> = {
  default: {
    id: 'default',
    name: 'Classic',
    rarity: 'common',
    description: 'The classic chess piece design',
    pieces: {
      white: {
        king: null as any,
        queen: null as any,
        rook: null as any,
        bishop: null as any,
        knight: null as any,
        pawn: null as any,
      },
      black: {
        king: null as any,
        queen: null as any,
        rook: null as any,
        bishop: null as any,
        knight: null as any,
        pawn: null as any,
      },
    },
  },
};

export const CHESS_BOARDS: Record<string, ChessBoard> = {
  default: {
    id: 'default',
    name: 'Classic Wood',
    rarity: 'common',
    description: 'Traditional wooden chess board',
    image: null,
  },
};

export const RARITY_COLORS: Record<string, string> = {
  common: '#9CA3AF',
  rare: '#3B82F6',
  epic: '#A855F7',
  legendary: '#F59E0B',
};

export function getSkinById(id: string): ChessSkin | null {
  return CHESS_SKINS[id] || CHESS_SKINS.default;
}

export function getAllSkins(): ChessSkin[] {
  return Object.values(CHESS_SKINS);
}

export function getBoardById(id: string): ChessBoard | null {
  return CHESS_BOARDS[id] || CHESS_BOARDS.default;
}

export function getAllBoards(): ChessBoard[] {
  return Object.values(CHESS_BOARDS);
}
