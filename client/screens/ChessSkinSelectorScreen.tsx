import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useChessSkin } from '@/games/chess/skins/SkinContext';
import { getAllSkins, RARITY_COLORS, ChessSkin } from '@/games/chess/skins';
import { GameColors, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ThemedText';
import { useHeaderHeight } from '@react-navigation/elements';

function SkinCard({ 
  skin, 
  isSelected, 
  isOwned, 
  onSelect 
}: { 
  skin: ChessSkin; 
  isSelected: boolean; 
  isOwned: boolean;
  onSelect: () => void;
}) {
  const rarityColor = RARITY_COLORS[skin.rarity];
  
  return (
    <Pressable 
      onPress={isOwned ? onSelect : undefined}
      style={[
        styles.skinCard,
        isSelected && styles.skinCardSelected,
        !isOwned && styles.skinCardLocked,
      ]}
    >
      <LinearGradient
        colors={isSelected ? ['#3D2E1A', '#2A1F10'] : ['#2A2A2A', '#1A1A1A']}
        style={styles.cardGradient}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.rarityBadge, { backgroundColor: rarityColor }]}>
            <Text style={styles.rarityText}>{skin.rarity.toUpperCase()}</Text>
          </View>
          {isSelected ? (
            <View style={styles.equippedBadge}>
              <Feather name="check-circle" size={16} color="#4ADE80" />
              <Text style={styles.equippedText}>Equipped</Text>
            </View>
          ) : null}
        </View>
        
        <View style={styles.piecePreview}>
          {skin.id === 'default' ? (
            <View style={styles.defaultPiecesRow}>
              <Text style={styles.unicodePiece}>♔</Text>
              <Text style={styles.unicodePiece}>♕</Text>
              <Text style={styles.unicodePiece}>♖</Text>
            </View>
          ) : (
            <View style={styles.piecesRow}>
              {skin.pieces.white.king ? (
                <Image source={skin.pieces.white.king} style={styles.pieceImage} resizeMode="contain" />
              ) : null}
              {skin.pieces.white.queen ? (
                <Image source={skin.pieces.white.queen} style={styles.pieceImage} resizeMode="contain" />
              ) : null}
              {skin.pieces.black.king ? (
                <Image source={skin.pieces.black.king} style={styles.pieceImage} resizeMode="contain" />
              ) : null}
            </View>
          )}
        </View>
        
        <ThemedText style={styles.skinName}>{skin.name}</ThemedText>
        <ThemedText style={styles.skinDescription}>{skin.description}</ThemedText>
        
        {!isOwned ? (
          <View style={styles.lockedOverlay}>
            <Feather name="lock" size={32} color="#888" />
            <Text style={styles.lockedText}>Purchase on Marketplace</Text>
          </View>
        ) : null}
      </LinearGradient>
    </Pressable>
  );
}

export default function ChessSkinSelectorScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const { currentSkin, setCurrentSkin, ownedSkins } = useChessSkin();
  
  const allSkins = getAllSkins();
  
  const handleSelectSkin = (skinId: string) => {
    setCurrentSkin(skinId);
  };
  
  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight + Spacing.md, paddingBottom: insets.bottom + Spacing.xl }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText style={styles.title}>Chess Piece Skins</ThemedText>
          <ThemedText style={styles.subtitle}>
            Customize your pieces with NFT skins
          </ThemedText>
        </View>
        
        <View style={styles.skinsGrid}>
          {allSkins.map((skin) => (
            <SkinCard
              key={skin.id}
              skin={skin}
              isSelected={currentSkin.id === skin.id}
              isOwned={ownedSkins.includes(skin.id)}
              onSelect={() => handleSelectSkin(skin.id)}
            />
          ))}
        </View>
        
        <View style={styles.infoSection}>
          <Feather name="info" size={16} color="#888" />
          <ThemedText style={styles.infoText}>
            NFT skins can be purchased on the roachy.games marketplace
          </ThemedText>
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
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: GameColors.gold,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: '#AAA',
  },
  skinsGrid: {
    gap: Spacing.md,
  },
  skinCard: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  skinCardSelected: {
    borderColor: GameColors.gold,
  },
  skinCardLocked: {
    opacity: 0.7,
  },
  cardGradient: {
    padding: Spacing.md,
    minHeight: 180,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  rarityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
  },
  equippedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  equippedText: {
    fontSize: 12,
    color: '#4ADE80',
    fontWeight: '600',
  },
  piecePreview: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  defaultPiecesRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  unicodePiece: {
    fontSize: 40,
    color: '#F5E6D3',
  },
  piecesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  pieceImage: {
    width: 50,
    height: 50,
  },
  skinName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  skinDescription: {
    fontSize: 12,
    color: '#AAA',
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedText: {
    fontSize: 12,
    color: '#888',
    marginTop: Spacing.xs,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    padding: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#888',
    flex: 1,
  },
});
