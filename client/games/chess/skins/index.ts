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
  legendary: {
    id: 'legendary',
    name: 'Legendary Marble',
    rarity: 'legendary',
    description: 'White marble and dark obsidian pieces with glowing cyan circuits',
    pieces: {
      white: {
        king: require('@/assets/chess-skins/legendary/2d_white_king_sprite_v3.png'),
        queen: require('@/assets/chess-skins/legendary/2d_white_queen_sprite_v3.png'),
        rook: require('@/assets/chess-skins/legendary/2d_white_rook_sprite_v3.png'),
        bishop: require('@/assets/chess-skins/legendary/2d_white_bishop_sprite_v3.png'),
        knight: require('@/assets/chess-skins/legendary/2d_white_knight_sprite_v3.png'),
        pawn: require('@/assets/chess-skins/legendary/2d_white_pawn_sprite_v3.png'),
      },
      black: {
        king: require('@/assets/chess-skins/legendary/2d_black_king_sprite_v2.png'),
        queen: require('@/assets/chess-skins/legendary/2d_black_queen_sprite_v2.png'),
        rook: require('@/assets/chess-skins/legendary/2d_black_rook_sprite_v2.png'),
        bishop: require('@/assets/chess-skins/legendary/2d_black_bishop_sprite_v2.png'),
        knight: require('@/assets/chess-skins/legendary/2d_black_knight_sprite_v2.png'),
        pawn: require('@/assets/chess-skins/legendary/2d_black_pawn_sprite_v2.png'),
      },
    },
  },
  celestial: {
    id: 'celestial',
    name: 'Fire & Ice',
    rarity: 'legendary',
    description: 'Icy blue pieces clash with fiery orange - elemental warfare',
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
  legendary_marble: {
    id: 'legendary_marble',
    name: 'Legendary Marble',
    rarity: 'legendary',
    description: 'Elegant marble board with glowing cyan circuits',
    image: require('@/assets/chess-skins/legendary/legendary_chess_board.png'),
  },
  celestial_inferno: {
    id: 'celestial_inferno',
    name: 'Celestial Inferno',
    rarity: 'legendary',
    description: 'Heaven meets hell - fire and ice clash on this epic battlefield',
    image: require('@/assets/chess-skins/angelic/celestial_inferno_board.png'),
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

export function getBoardById(id: string): ChessBoard | null {
  return CHESS_BOARDS[id] || null;
}

export function getAllBoards(): ChessBoard[] {
  return Object.values(CHESS_BOARDS);
}
