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
  board?: ImageSourcePropType;
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
  legendary: {
    id: 'legendary',
    name: 'Legendary Marble',
    rarity: 'legendary',
    description: 'White marble and dark obsidian pieces with glowing cyan circuits',
    pieces: {
      white: {
        king: require('@/assets/chess-skins/legendary/2d_white_king_sprite.png'),
        queen: require('@/assets/chess-skins/legendary/2d_white_queen_sprite.png'),
        rook: require('@/assets/chess-skins/legendary/2d_white_rook_sprite.png'),
        bishop: require('@/assets/chess-skins/legendary/2d_white_bishop_sprite.png'),
        knight: require('@/assets/chess-skins/legendary/2d_white_knight_sprite.png'),
        pawn: require('@/assets/chess-skins/legendary/2d_white_pawn_sprite.png'),
      },
      black: {
        king: require('@/assets/chess-skins/legendary/2d_black_king_sprite.png'),
        queen: require('@/assets/chess-skins/legendary/2d_black_queen_sprite.png'),
        rook: require('@/assets/chess-skins/legendary/2d_black_rook_sprite.png'),
        bishop: require('@/assets/chess-skins/legendary/2d_black_bishop_sprite.png'),
        knight: require('@/assets/chess-skins/legendary/2d_black_knight_sprite.png'),
        pawn: require('@/assets/chess-skins/legendary/2d_black_pawn_sprite.png'),
      },
    },
    board: require('@/assets/chess-skins/legendary/legendary_chess_board.png'),
  },
};

export const RARITY_COLORS: Record<string, string> = {
  common: '#9CA3AF',
  rare: '#3B82F6',
  epic: '#A855F7',
  legendary: '#F59E0B',
};

export function getSkinById(id: string): ChessSkin | null {
  return CHESS_SKINS[id] || null;
}

export function getAllSkins(): ChessSkin[] {
  return Object.values(CHESS_SKINS);
}
