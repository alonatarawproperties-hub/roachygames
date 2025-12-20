import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChessSkin, ChessBoard, CHESS_SKINS, CHESS_BOARDS, getSkinById, getBoardById, getAllSkins, getAllBoards } from './index';
import { useAuth } from '@/context/AuthContext';

const GOD_ACCOUNTS = [
  'zajkcomshop@gmail.com',
];

interface SkinContextType {
  currentSkin: ChessSkin;
  setCurrentSkin: (skinId: string) => void;
  currentBoard: ChessBoard;
  setCurrentBoard: (boardId: string) => void;
  ownedSkins: string[];
  ownedBoards: string[];
  addOwnedSkin: (skinId: string) => void;
  addOwnedBoard: (boardId: string) => void;
  isGodAccount: boolean;
}

const SkinContext = createContext<SkinContextType | null>(null);

const SKIN_STORAGE_KEY = '@chess_skin';
const BOARD_STORAGE_KEY = '@chess_board';
const OWNED_SKINS_KEY = '@owned_chess_skins';
const OWNED_BOARDS_KEY = '@owned_chess_boards';

export function SkinProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentSkin, setCurrentSkinState] = useState<ChessSkin>(CHESS_SKINS.default);
  const [currentBoard, setCurrentBoardState] = useState<ChessBoard>(CHESS_BOARDS.default);
  const [storedOwnedSkins, setStoredOwnedSkins] = useState<string[]>(['default']);
  const [storedOwnedBoards, setStoredOwnedBoards] = useState<string[]>(['default']);
  
  const isGodAccount = useMemo(() => {
    const email = user?.email?.toLowerCase();
    return email ? GOD_ACCOUNTS.includes(email) : false;
  }, [user?.email]);
  
  const ownedSkins = useMemo(() => {
    if (isGodAccount) {
      return getAllSkins().map(skin => skin.id);
    }
    return storedOwnedSkins;
  }, [isGodAccount, storedOwnedSkins]);

  const ownedBoards = useMemo(() => {
    if (isGodAccount) {
      return getAllBoards().map(board => board.id);
    }
    return storedOwnedBoards;
  }, [isGodAccount, storedOwnedBoards]);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const [savedSkinId, savedBoardId, savedOwnedSkins, savedOwnedBoards] = await Promise.all([
        AsyncStorage.getItem(SKIN_STORAGE_KEY),
        AsyncStorage.getItem(BOARD_STORAGE_KEY),
        AsyncStorage.getItem(OWNED_SKINS_KEY),
        AsyncStorage.getItem(OWNED_BOARDS_KEY),
      ]);
      
      if (savedSkinId) {
        const skin = getSkinById(savedSkinId);
        if (skin) setCurrentSkinState(skin);
      }
      if (savedBoardId) {
        const board = getBoardById(savedBoardId);
        if (board) setCurrentBoardState(board);
      }
      if (savedOwnedSkins) {
        setStoredOwnedSkins(JSON.parse(savedOwnedSkins));
      }
      if (savedOwnedBoards) {
        setStoredOwnedBoards(JSON.parse(savedOwnedBoards));
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const setCurrentSkin = async (skinId: string) => {
    const skin = getSkinById(skinId);
    if (skin && (isGodAccount || ownedSkins.includes(skinId))) {
      setCurrentSkinState(skin);
      try {
        await AsyncStorage.setItem(SKIN_STORAGE_KEY, skinId);
      } catch (error) {
        console.error('Failed to save skin preference:', error);
      }
    }
  };

  const setCurrentBoard = async (boardId: string) => {
    const board = getBoardById(boardId);
    if (board && (isGodAccount || ownedBoards.includes(boardId))) {
      setCurrentBoardState(board);
      try {
        await AsyncStorage.setItem(BOARD_STORAGE_KEY, boardId);
      } catch (error) {
        console.error('Failed to save board preference:', error);
      }
    }
  };

  const addOwnedSkin = async (skinId: string) => {
    if (!storedOwnedSkins.includes(skinId)) {
      const newOwned = [...storedOwnedSkins, skinId];
      setStoredOwnedSkins(newOwned);
      try {
        await AsyncStorage.setItem(OWNED_SKINS_KEY, JSON.stringify(newOwned));
      } catch (error) {
        console.error('Failed to save owned skins:', error);
      }
    }
  };

  const addOwnedBoard = async (boardId: string) => {
    if (!storedOwnedBoards.includes(boardId)) {
      const newOwned = [...storedOwnedBoards, boardId];
      setStoredOwnedBoards(newOwned);
      try {
        await AsyncStorage.setItem(OWNED_BOARDS_KEY, JSON.stringify(newOwned));
      } catch (error) {
        console.error('Failed to save owned boards:', error);
      }
    }
  };

  return (
    <SkinContext.Provider value={{ 
      currentSkin, 
      setCurrentSkin, 
      currentBoard, 
      setCurrentBoard, 
      ownedSkins, 
      ownedBoards, 
      addOwnedSkin, 
      addOwnedBoard, 
      isGodAccount 
    }}>
      {children}
    </SkinContext.Provider>
  );
}

export function useChessSkin() {
  const context = useContext(SkinContext);
  if (!context) {
    return {
      currentSkin: CHESS_SKINS.default,
      setCurrentSkin: () => {},
      currentBoard: CHESS_BOARDS.default,
      setCurrentBoard: () => {},
      ownedSkins: ['default'],
      ownedBoards: ['default'],
      addOwnedSkin: () => {},
      addOwnedBoard: () => {},
      isGodAccount: false,
    };
  }
  return context;
}
