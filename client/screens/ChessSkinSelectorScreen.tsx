import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { 
  FadeInDown, 
  FadeIn,
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useChessSkin } from '@/games/chess/skins/SkinContext';
import { getAllSkins, getAllBoards, RARITY_COLORS, ChessSkin, ChessBoard } from '@/games/chess/skins';
import { GameColors, Spacing, BorderRadius } from '@/constants/theme';
import { ThemedText } from '@/components/ThemedText';
import { useHeaderHeight } from '@react-navigation/elements';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.md * 3) / 2;

type RarityFilter = 'all' | 'legendary' | 'epic' | 'rare' | 'common';
type CategoryTab = 'pieces' | 'boards';

const RARITY_ORDER: RarityFilter[] = ['all', 'legendary', 'epic', 'rare', 'common'];

const RARITY_LABELS: Record<RarityFilter, string> = {
  all: 'All',
  legendary: 'Legendary',
  epic: 'Epic',
  rare: 'Rare',
  common: 'Common',
};

const ENHANCED_RARITY_COLORS: Record<string, { bg: string; glow: string; text: string }> = {
  common: { bg: '#4A4A4A', glow: '#6B6B6B', text: '#CCCCCC' },
  rare: { bg: '#1E40AF', glow: '#3B82F6', text: '#93C5FD' },
  epic: { bg: '#6B21A8', glow: '#A855F7', text: '#D8B4FE' },
  legendary: { bg: '#B45309', glow: '#F59E0B', text: '#FDE68A' },
};

function HeroBanner({ 
  currentSkin, 
  currentBoard 
}: { 
  currentSkin: ChessSkin; 
  currentBoard: ChessBoard;
}) {
  const glowOpacity = useSharedValue(0.4);
  
  React.useEffect(() => {
    glowOpacity.value = withRepeat(
      withTiming(0.8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <Animated.View entering={FadeIn.duration(600)} style={styles.heroBanner}>
      <LinearGradient
        colors={['#2D1810', '#1A0F08', '#0A0604']}
        style={styles.heroGradient}
      >
        <Animated.View style={[styles.heroGlow, glowStyle]} />
        
        <View style={styles.heroContent}>
          <View style={styles.heroLeft}>
            <ThemedText style={styles.heroLabel}>CURRENTLY EQUIPPED</ThemedText>
            <ThemedText style={styles.heroTitle}>{currentSkin.name}</ThemedText>
            <View style={styles.heroRarityRow}>
              <View style={[styles.heroRarityBadge, { backgroundColor: RARITY_COLORS[currentSkin.rarity] }]}>
                <Text style={styles.heroRarityText}>{currentSkin.rarity.toUpperCase()}</Text>
              </View>
              <ThemedText style={styles.heroPlus}>+</ThemedText>
              <View style={[styles.heroRarityBadge, { backgroundColor: RARITY_COLORS[currentBoard.rarity] }]}>
                <Text style={styles.heroRarityText}>{currentBoard.rarity.toUpperCase()}</Text>
              </View>
            </View>
            <ThemedText style={styles.heroBoardName}>{currentBoard.name} Board</ThemedText>
          </View>
          
          <View style={styles.heroPreview}>
            {currentSkin.id === 'default' ? (
              <View style={styles.heroDefaultPieces}>
                <Text style={styles.heroUnicodePiece}>♔</Text>
                <Text style={styles.heroUnicodePiece}>♕</Text>
              </View>
            ) : currentSkin.pieces.white.king ? (
              <View style={styles.heroPiecesStack}>
                <Image 
                  source={currentSkin.pieces.white.king} 
                  style={styles.heroImage} 
                  resizeMode="contain" 
                />
              </View>
            ) : null}
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

function RarityFilterBar({ 
  selected, 
  onSelect 
}: { 
  selected: RarityFilter; 
  onSelect: (r: RarityFilter) => void;
}) {
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterBar}
    >
      {RARITY_ORDER.map((rarity) => {
        const isSelected = selected === rarity;
        const colors = rarity === 'all' ? null : ENHANCED_RARITY_COLORS[rarity];
        
        return (
          <Pressable
            key={rarity}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync();
              onSelect(rarity);
            }}
            style={[
              styles.filterChip,
              isSelected && styles.filterChipActive,
              isSelected && colors && { backgroundColor: colors.bg, borderColor: colors.glow },
            ]}
          >
            {rarity === 'legendary' && isSelected ? (
              <Feather name="star" size={12} color="#FDE68A" style={{ marginRight: 4 }} />
            ) : null}
            <Text style={[
              styles.filterChipText,
              isSelected && styles.filterChipTextActive,
              isSelected && colors && { color: colors.text },
            ]}>
              {RARITY_LABELS[rarity]}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function CategoryTabs({ 
  selected, 
  onSelect 
}: { 
  selected: CategoryTab; 
  onSelect: (c: CategoryTab) => void;
}) {
  return (
    <View style={styles.categoryTabs}>
      <Pressable
        onPress={() => {
          if (Platform.OS !== 'web') Haptics.selectionAsync();
          onSelect('pieces');
        }}
        style={[styles.categoryTab, selected === 'pieces' && styles.categoryTabActive]}
      >
        <Feather 
          name="grid" 
          size={18} 
          color={selected === 'pieces' ? GameColors.gold : '#666'} 
        />
        <Text style={[styles.categoryTabText, selected === 'pieces' && styles.categoryTabTextActive]}>
          Pieces
        </Text>
      </Pressable>
      <Pressable
        onPress={() => {
          if (Platform.OS !== 'web') Haptics.selectionAsync();
          onSelect('boards');
        }}
        style={[styles.categoryTab, selected === 'boards' && styles.categoryTabActive]}
      >
        <Feather 
          name="square" 
          size={18} 
          color={selected === 'boards' ? GameColors.gold : '#666'} 
        />
        <Text style={[styles.categoryTabText, selected === 'boards' && styles.categoryTabTextActive]}>
          Boards
        </Text>
      </Pressable>
    </View>
  );
}

function PieceCard({ 
  skin, 
  isSelected, 
  isOwned, 
  onSelect,
  index,
}: { 
  skin: ChessSkin; 
  isSelected: boolean; 
  isOwned: boolean;
  onSelect: () => void;
  index: number;
}) {
  const scale = useSharedValue(1);
  const colors = ENHANCED_RARITY_COLORS[skin.rarity];
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, { damping: 15 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15 });
  }, []);

  const handlePress = useCallback(() => {
    if (isOwned) {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSelect();
    }
  }, [isOwned, onSelect]);

  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 80).springify()}
      style={[styles.cardWrapper, animatedStyle]}
    >
      <Pressable 
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={[
          styles.card,
          isSelected && { borderColor: colors.glow, borderWidth: 2 },
          !isOwned && styles.cardLocked,
        ]}
      >
        <LinearGradient
          colors={isSelected 
            ? [colors.bg + '40', '#1A0F08'] 
            : ['#252525', '#1A1A1A']
          }
          style={styles.cardGradient}
        >
          {skin.rarity === 'legendary' ? (
            <View style={[styles.holoOverlay, { borderColor: colors.glow }]} />
          ) : null}
          
          <View style={styles.cardHeader}>
            <View style={[styles.rarityBadge, { backgroundColor: colors.bg }]}>
              {skin.rarity === 'legendary' ? (
                <Feather name="star" size={10} color={colors.text} style={{ marginRight: 2 }} />
              ) : null}
              <Text style={[styles.rarityText, { color: colors.text }]}>
                {skin.rarity.toUpperCase()}
              </Text>
            </View>
            {isSelected ? (
              <View style={styles.equippedBadge}>
                <Feather name="check-circle" size={14} color="#4ADE80" />
              </View>
            ) : null}
          </View>
          
          <View style={styles.piecePreview}>
            {skin.id === 'default' ? (
              <View style={styles.defaultPiecesRow}>
                <Text style={styles.unicodePiece}>♔</Text>
                <Text style={styles.unicodePieceSmall}>♕</Text>
              </View>
            ) : skin.pieces.white.king ? (
              <View style={styles.piecesRow}>
                <Image source={skin.pieces.white.king} style={styles.pieceImage} resizeMode="contain" />
                {skin.pieces.black.king ? (
                  <Image source={skin.pieces.black.king} style={styles.pieceImageSmall} resizeMode="contain" />
                ) : null}
              </View>
            ) : (
              <View style={styles.defaultPiecesRow}>
                <Text style={styles.unicodePiece}>♔</Text>
              </View>
            )}
          </View>
          
          <ThemedText style={styles.cardName} numberOfLines={1}>{skin.name}</ThemedText>
          <ThemedText style={styles.cardDescription} numberOfLines={2}>{skin.description}</ThemedText>
          
          {!isOwned ? (
            <View style={styles.lockedOverlay}>
              <Feather name="shopping-cart" size={24} color="#AAA" />
              <Text style={styles.lockedText}>Marketplace</Text>
            </View>
          ) : null}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

function BoardCard({ 
  board, 
  isSelected, 
  isOwned, 
  onSelect,
  index,
}: { 
  board: ChessBoard; 
  isSelected: boolean; 
  isOwned: boolean;
  onSelect: () => void;
  index: number;
}) {
  const scale = useSharedValue(1);
  const colors = ENHANCED_RARITY_COLORS[board.rarity];
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, { damping: 15 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15 });
  }, []);

  const handlePress = useCallback(() => {
    if (isOwned) {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSelect();
    }
  }, [isOwned, onSelect]);

  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 80).springify()}
      style={[styles.cardWrapper, animatedStyle]}
    >
      <Pressable 
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={[
          styles.card,
          isSelected && { borderColor: colors.glow, borderWidth: 2 },
          !isOwned && styles.cardLocked,
        ]}
      >
        <LinearGradient
          colors={isSelected 
            ? [colors.bg + '40', '#1A0F08'] 
            : ['#252525', '#1A1A1A']
          }
          style={styles.cardGradient}
        >
          {board.rarity === 'legendary' ? (
            <View style={[styles.holoOverlay, { borderColor: colors.glow }]} />
          ) : null}
          
          <View style={styles.cardHeader}>
            <View style={[styles.rarityBadge, { backgroundColor: colors.bg }]}>
              {board.rarity === 'legendary' ? (
                <Feather name="star" size={10} color={colors.text} style={{ marginRight: 2 }} />
              ) : null}
              <Text style={[styles.rarityText, { color: colors.text }]}>
                {board.rarity.toUpperCase()}
              </Text>
            </View>
            {isSelected ? (
              <View style={styles.equippedBadge}>
                <Feather name="check-circle" size={14} color="#4ADE80" />
              </View>
            ) : null}
          </View>
          
          <View style={styles.boardPreview}>
            {board.image ? (
              <Image 
                source={board.image} 
                style={styles.boardImage} 
                resizeMode="cover" 
              />
            ) : (
              <View style={styles.miniBoard}>
                {[0,1,2,3].map(row => (
                  <View key={row} style={styles.miniBoardRow}>
                    {[0,1,2,3].map(col => (
                      <View 
                        key={col} 
                        style={[
                          styles.miniBoardSquare,
                          { backgroundColor: (row + col) % 2 === 0 ? '#F0D9B5' : '#B58863' }
                        ]} 
                      />
                    ))}
                  </View>
                ))}
              </View>
            )}
          </View>
          
          <ThemedText style={styles.cardName} numberOfLines={1}>{board.name}</ThemedText>
          <ThemedText style={styles.cardDescription} numberOfLines={2}>{board.description}</ThemedText>
          
          {!isOwned ? (
            <View style={styles.lockedOverlay}>
              <Feather name="shopping-cart" size={24} color="#AAA" />
              <Text style={styles.lockedText}>Marketplace</Text>
            </View>
          ) : null}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

export default function ChessSkinSelectorScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { currentSkin, setCurrentSkin, currentBoard, setCurrentBoard, ownedSkins, ownedBoards } = useChessSkin();
  
  const [categoryTab, setCategoryTab] = useState<CategoryTab>('pieces');
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all');
  
  const allSkins = getAllSkins();
  const allBoards = getAllBoards();
  
  const filteredSkins = rarityFilter === 'all' 
    ? allSkins 
    : allSkins.filter(s => s.rarity === rarityFilter);
    
  const filteredBoards = rarityFilter === 'all'
    ? allBoards
    : allBoards.filter(b => b.rarity === rarityFilter);

  const sortByRarity = <T extends { rarity: string }>(items: T[]): T[] => {
    const order = ['legendary', 'epic', 'rare', 'common'];
    return [...items].sort((a, b) => order.indexOf(a.rarity) - order.indexOf(b.rarity));
  };

  const sortedSkins = sortByRarity(filteredSkins);
  const sortedBoards = sortByRarity(filteredBoards);
  
  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight + Spacing.sm, paddingBottom: insets.bottom + Spacing.xl }
        ]}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[2]}
      >
        <HeroBanner currentSkin={currentSkin} currentBoard={currentBoard} />
        
        <CategoryTabs selected={categoryTab} onSelect={setCategoryTab} />
        
        <View style={styles.stickyHeader}>
          <RarityFilterBar selected={rarityFilter} onSelect={setRarityFilter} />
        </View>
        
        <View style={styles.collectionStats}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>
              {categoryTab === 'pieces' ? ownedSkins.length : ownedBoards.length}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Owned</ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>
              {categoryTab === 'pieces' ? allSkins.length : allBoards.length}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Total</ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: ENHANCED_RARITY_COLORS.legendary.glow }]}>
              {categoryTab === 'pieces' 
                ? allSkins.filter(s => s.rarity === 'legendary').length
                : allBoards.filter(b => b.rarity === 'legendary').length}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Legendary</ThemedText>
          </View>
        </View>
        
        {categoryTab === 'pieces' ? (
          <View style={styles.grid}>
            {sortedSkins.map((skin, index) => (
              <PieceCard
                key={skin.id}
                skin={skin}
                isSelected={currentSkin.id === skin.id}
                isOwned={ownedSkins.includes(skin.id)}
                onSelect={() => setCurrentSkin(skin.id)}
                index={index}
              />
            ))}
          </View>
        ) : (
          <View style={styles.grid}>
            {sortedBoards.map((board, index) => (
              <BoardCard
                key={board.id}
                board={board}
                isSelected={currentBoard.id === board.id}
                isOwned={ownedBoards.includes(board.id)}
                onSelect={() => setCurrentBoard(board.id)}
                index={index}
              />
            ))}
          </View>
        )}
        
        {(categoryTab === 'pieces' ? sortedSkins : sortedBoards).length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={48} color="#444" />
            <ThemedText style={styles.emptyText}>No {rarityFilter} items found</ThemedText>
          </View>
        ) : null}
        
        <View style={styles.marketplacePromo}>
          <LinearGradient
            colors={['#2D1810', '#1A0F08']}
            style={styles.promoGradient}
          >
            <Feather name="external-link" size={20} color={GameColors.gold} />
            <View style={styles.promoText}>
              <ThemedText style={styles.promoTitle}>Get More NFTs</ThemedText>
              <ThemedText style={styles.promoSubtitle}>
                Visit roachy.games marketplace to expand your collection
              </ThemedText>
            </View>
          </LinearGradient>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },
  heroBanner: {
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  heroGradient: {
    padding: Spacing.lg,
    minHeight: 120,
  },
  heroGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: GameColors.gold,
    opacity: 0.1,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLeft: {
    flex: 1,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#888',
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: GameColors.gold,
    marginBottom: 8,
  },
  heroRarityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  heroRarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  heroRarityText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFF',
  },
  heroPlus: {
    fontSize: 14,
    color: '#666',
  },
  heroBoardName: {
    fontSize: 13,
    color: '#AAA',
  },
  heroPreview: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroDefaultPieces: {
    flexDirection: 'row',
    gap: 4,
  },
  heroUnicodePiece: {
    fontSize: 36,
    color: '#F5E6D3',
  },
  heroPiecesStack: {
    alignItems: 'center',
  },
  heroImage: {
    width: 70,
    height: 70,
  },
  categoryTabs: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: Spacing.md,
  },
  categoryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  categoryTabActive: {
    backgroundColor: '#2D2D2D',
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  categoryTabTextActive: {
    color: GameColors.gold,
  },
  stickyHeader: {
    backgroundColor: GameColors.background,
    paddingVertical: Spacing.sm,
    marginHorizontal: -Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  filterBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: 2,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#1A1A1A',
  },
  filterChipActive: {
    borderColor: GameColors.gold,
    backgroundColor: '#2D1810',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#888',
  },
  filterChipTextActive: {
    color: GameColors.gold,
  },
  collectionStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#333',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
  card: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  cardLocked: {
    opacity: 0.6,
  },
  cardGradient: {
    padding: Spacing.sm,
    minHeight: 200,
  },
  holoOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    opacity: 0.3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  rarityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  rarityText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  equippedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  piecePreview: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  defaultPiecesRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  unicodePiece: {
    fontSize: 50,
    color: '#F5E6D3',
  },
  unicodePieceSmall: {
    fontSize: 36,
    color: '#D4C4B0',
  },
  piecesRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  pieceImage: {
    width: 60,
    height: 60,
  },
  pieceImageSmall: {
    width: 45,
    height: 45,
  },
  boardPreview: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  boardImage: {
    width: 75,
    height: 75,
    borderRadius: 6,
  },
  miniBoard: {
    borderRadius: 4,
    overflow: 'hidden',
  },
  miniBoardRow: {
    flexDirection: 'row',
  },
  miniBoardSquare: {
    width: 18,
    height: 18,
  },
  cardName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 11,
    color: '#888',
    lineHeight: 14,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  lockedText: {
    fontSize: 11,
    color: '#AAA',
    marginTop: 6,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
  },
  marketplacePromo: {
    marginTop: Spacing.xl,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  promoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  promoText: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: GameColors.gold,
    marginBottom: 2,
  },
  promoSubtitle: {
    fontSize: 12,
    color: '#888',
  },
});
