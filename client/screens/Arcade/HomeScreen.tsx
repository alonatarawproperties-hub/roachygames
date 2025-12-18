import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Alert, Pressable, ActivityIndicator, Image, FlatList, Platform, useWindowDimensions } from "react-native";
import { useNavigation, CommonActions } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { getMarketplaceUrl } from "@/lib/query-client";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import {
  ArcadeHeader,
  FeaturedGameHero,
  GameListItem,
  ArcadeTabBar,
  TokenBalanceCard,
  EarningsTracker,
  OnboardingFlow,
  ActivityHistory,
  WebCTABanner,
} from "@/components/arcade";
import { DailyBonusCard } from "@/components/arcade/DailyBonusCard";
import { AnimatedFilterChip } from "@/components/arcade/AnimatedFilterChip";
import { GAMES_CATALOG } from "@/constants/gamesCatalog";
import { GameColors, Spacing, BorderRadius, getResponsiveSize, ResponsiveLayout } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useArcadeInventory } from "@/context/ArcadeInventoryContext";
import { useHunt } from "@/context/HuntContext";
import type { ArcadeInventoryItem, InventoryFilter, InventoryItemType, ItemTypeMetadata } from "@/types/inventory";
import { ITEM_TYPE_REGISTRY, getItemTypeMetadata } from "@/types/inventory";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import Animated, { 
  FadeInDown, 
  useSharedValue, 
  useAnimatedStyle, 
  withSequence, 
  withTiming, 
  withSpring,
  withRepeat,
  Easing,
} from "react-native-reanimated";
import { getCreatureDefinition } from "@/constants/creatures";
import { useFlappySkin, RoachySkin } from "@/context/FlappySkinContext";
import { useFlappyTrail, RoachyTrail } from "@/context/FlappyTrailContext";
import { FLAPPY_SKINS } from "@/games/flappy/FlappyGame";
import { FLAPPY_TRAILS } from "@/games/flappy/flappyTrails";
import { Image as ExpoImage } from "expo-image";
import { useWebappBalances } from "@/hooks/useWebappBalances";
import { useUserNfts } from "@/hooks/useUserNfts";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const EGGS_REQUIRED = 10;

const ONBOARDING_KEY = "@roachy_games_onboarding_complete";

/**
 * Premium NFT Badge with gold crest design and shimmer animation
 */
function PremiumNFTBadge() {
  const shimmerPosition = useSharedValue(0);

  useEffect(() => {
    shimmerPosition.value = withRepeat(
      withTiming(1, { duration: 2500, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + shimmerPosition.value * 0.4,
    transform: [
      { translateX: -20 + shimmerPosition.value * 40 },
      { skewX: '-20deg' },
    ],
  }));

  return (
    <View style={nftBadgeStyles.container}>
      <LinearGradient
        colors={['#C9941F', '#FFD700', '#E8B923', '#C9941F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={nftBadgeStyles.gradient}
      >
        <View style={nftBadgeStyles.innerBorder}>
          <Animated.View style={[nftBadgeStyles.shimmer, shimmerStyle]} />
          <View style={nftBadgeStyles.iconRow}>
            <Feather name="star" size={8} color="#1A1A0F" style={nftBadgeStyles.star} />
            <ThemedText style={nftBadgeStyles.text}>NFT</ThemedText>
          </View>
        </View>
      </LinearGradient>
      <View style={nftBadgeStyles.glow} />
    </View>
  );
}

const nftBadgeStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 10,
  },
  gradient: {
    borderRadius: 6,
    padding: 1.5,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 6,
  },
  innerBorder: {
    backgroundColor: 'rgba(26, 26, 15, 0.85)',
    borderRadius: 4.5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: -10,
    bottom: -10,
    width: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.5)',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  star: {
    opacity: 0.9,
  },
  text: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFD700',
    letterSpacing: 1.2,
    textShadowColor: 'rgba(255, 215, 0, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  glow: {
    position: 'absolute',
    top: -4,
    right: -4,
    bottom: -4,
    left: -4,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    zIndex: -1,
  },
});

/**
 * Debug Panel to diagnose balance issues
 */
function DebugPanel() {
  const { user, isGuest, updateUserData } = useAuth();
  const { diamonds, chy, isLoading, isError, error, refetch } = useWebappBalances();
  const [apiTestResult, setApiTestResult] = useState<string | null>(null);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const testApiDirectly = async () => {
    setIsTestingApi(true);
    try {
      const webappUserId = user?.webappUserId;
      if (!webappUserId) {
        setApiTestResult("ERROR: webappUserId is null/undefined");
        return;
      }
      
      const url = `https://roachy.games/api/web/users/${webappUserId}/balances`;
      const secret = process.env.EXPO_PUBLIC_MOBILE_APP_SECRET;
      
      const response = await fetch(url, {
        headers: secret ? { "x-api-secret": secret } : {},
      });
      
      const text = await response.text();
      setApiTestResult(`Status: ${response.status}\nResponse: ${text}`);
    } catch (err: any) {
      setApiTestResult(`EXCEPTION: ${err.message}`);
    } finally {
      setIsTestingApi(false);
    }
  };

  const forceResync = async () => {
    setIsSyncing(true);
    try {
      const googleId = user?.googleId;
      const email = user?.email;
      
      if (!googleId || !email) {
        setApiTestResult(`RESYNC ERROR: Missing googleId (${googleId}) or email (${email})`);
        return;
      }
      
      const secret = process.env.EXPO_PUBLIC_MOBILE_APP_SECRET;
      const response = await fetch("https://roachy.games/api/web/oauth/exchange", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(secret ? { "x-api-secret": secret } : {}),
        },
        body: JSON.stringify({
          googleId,
          email,
          displayName: user?.displayName || email.split("@")[0],
        }),
      });
      
      const text = await response.text();
      setApiTestResult(`RESYNC Status: ${response.status}\n${text}`);
      
      if (response.ok) {
        try {
          const result = JSON.parse(text);
          if (result.success && result.user?.id && updateUserData) {
            await updateUserData({ webappUserId: result.user.id });
            setApiTestResult(`SUCCESS! webappUserId set to: ${result.user.id}`);
          }
        } catch (e) {}
      }
    } catch (err: any) {
      setApiTestResult(`RESYNC EXCEPTION: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <View style={debugStyles.container}>
      <ThemedText style={debugStyles.title}>DEBUG PANEL (Build 146)</ThemedText>
      
      <View style={debugStyles.row}>
        <ThemedText style={debugStyles.label}>user.id:</ThemedText>
        <ThemedText style={debugStyles.value}>{user?.id || "null"}</ThemedText>
      </View>
      
      <View style={debugStyles.row}>
        <ThemedText style={debugStyles.label}>googleId:</ThemedText>
        <ThemedText style={debugStyles.value}>{user?.googleId ? `${user.googleId.slice(0, 10)}...` : "null"}</ThemedText>
      </View>
      
      <View style={debugStyles.row}>
        <ThemedText style={debugStyles.label}>webappUserId:</ThemedText>
        <ThemedText style={[debugStyles.value, { color: user?.webappUserId ? "#00ff00" : "#ff0000" }]}>
          {user?.webappUserId || "null (PROBLEM!)"}
        </ThemedText>
      </View>
      
      <View style={debugStyles.row}>
        <ThemedText style={debugStyles.label}>isGuest:</ThemedText>
        <ThemedText style={debugStyles.value}>{isGuest ? "true" : "false"}</ThemedText>
      </View>
      
      <View style={debugStyles.row}>
        <ThemedText style={debugStyles.label}>chy (from hook):</ThemedText>
        <ThemedText style={debugStyles.valueHighlight}>{chy}</ThemedText>
      </View>
      
      <View style={debugStyles.row}>
        <ThemedText style={debugStyles.label}>hasSecret:</ThemedText>
        <ThemedText style={debugStyles.value}>
          {process.env.EXPO_PUBLIC_MOBILE_APP_SECRET ? `yes (${process.env.EXPO_PUBLIC_MOBILE_APP_SECRET.length} chars)` : "no"}
        </ThemedText>
      </View>
      
      <View style={debugStyles.buttonRow}>
        <Pressable style={debugStyles.button} onPress={() => refetch()}>
          <ThemedText style={debugStyles.buttonText}>Refetch</ThemedText>
        </Pressable>
        
        <Pressable style={debugStyles.button} onPress={testApiDirectly} disabled={isTestingApi}>
          <ThemedText style={debugStyles.buttonText}>{isTestingApi ? "..." : "Test API"}</ThemedText>
        </Pressable>
        
        <Pressable style={[debugStyles.button, { backgroundColor: "#6b4a8a" }]} onPress={forceResync} disabled={isSyncing}>
          <ThemedText style={debugStyles.buttonText}>{isSyncing ? "..." : "Force Resync"}</ThemedText>
        </Pressable>
      </View>
      
      {apiTestResult ? (
        <View style={debugStyles.apiResult}>
          <ThemedText style={debugStyles.apiResultText}>{apiTestResult}</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const debugStyles = StyleSheet.create({
  container: {
    backgroundColor: "#1a1a2e",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#ff6b6b",
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ff6b6b",
    marginBottom: 8,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    color: "#888",
  },
  value: {
    fontSize: 11,
    color: "#fff",
    maxWidth: "60%",
  },
  valueHighlight: {
    fontSize: 14,
    color: "#00ff00",
    fontWeight: "700",
  },
  errorValue: {
    fontSize: 10,
    color: "#ff6b6b",
    maxWidth: "60%",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  button: {
    flex: 1,
    backgroundColor: "#4a4a6a",
    padding: 8,
    borderRadius: 4,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
  apiResult: {
    marginTop: 8,
    backgroundColor: "#0d0d1a",
    padding: 8,
    borderRadius: 4,
  },
  apiResultText: {
    fontSize: 10,
    color: "#aaa",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
});

/**
 * Token Balance Card with webapp balances integration
 */
function TokenBalanceCardWithWebapp() {
  const { user, isGuest, logout } = useAuth();
  const { diamonds, chy, isLoading } = useWebappBalances();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const handleGuestSignIn = () => {
    Alert.alert(
      "Sign In Required",
      "Sign in to track your CHY and Diamond balances.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign In",
          onPress: () => {
            logout();
          },
        },
      ]
    );
  };

  return (
    <>
      <DebugPanel />
      <TokenBalanceCard
        chyCoinsBalance={chy || 0}
        isConnected={!!user && !isGuest}
        isLoading={isLoading}
        isGuest={isGuest}
        onPress={isGuest ? handleGuestSignIn : undefined}
      />
    </>
  );
}

/**
 * Egg Hatching Section for centralized inventory
 */
function EggHatchSection({ 
  eggCount, 
  onHatch, 
  isHatching 
}: { 
  eggCount: number; 
  onHatch: () => void; 
  isHatching: boolean;
}) {
  const canHatch = eggCount >= EGGS_REQUIRED;
  const progress = Math.min(eggCount / EGGS_REQUIRED, 1);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (canHatch && !isHatching) {
      scale.value = withSequence(
        withTiming(0.95, { duration: 100 }),
        withSpring(1)
      );
      onHatch();
    }
  };

  if (eggCount === 0) return null;

  return (
    <Animated.View entering={FadeInDown.springify()} style={eggStyles.container}>
      <View style={eggStyles.header}>
        <View style={eggStyles.iconContainer}>
          <Feather name="gift" size={24} color={GameColors.gold} />
        </View>
        <View style={eggStyles.info}>
          <ThemedText style={eggStyles.title}>Collected Eggs</ThemedText>
          <ThemedText style={eggStyles.count}>
            {eggCount} / {EGGS_REQUIRED}
          </ThemedText>
        </View>
      </View>

      <View style={eggStyles.progressContainer}>
        <View style={eggStyles.progressBar}>
          <View style={[eggStyles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      <AnimatedPressable
        style={[
          eggStyles.hatchButton,
          animatedStyle,
          !canHatch && eggStyles.hatchButtonDisabled,
        ]}
        onPress={handlePress}
        disabled={!canHatch || isHatching}
      >
        {isHatching ? (
          <ThemedText style={eggStyles.hatchButtonText}>Hatching...</ThemedText>
        ) : (
          <>
            <Feather name="zap" size={18} color={canHatch ? GameColors.background : GameColors.textSecondary} />
            <ThemedText style={[eggStyles.hatchButtonText, !canHatch && eggStyles.hatchButtonTextDisabled]}>
              {canHatch ? "HATCH NOW" : `Need ${EGGS_REQUIRED - eggCount} more`}
            </ThemedText>
          </>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}

const eggStyles = StyleSheet.create({
  container: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: GameColors.gold + "30",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: GameColors.gold + "20",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  count: {
    fontSize: 14,
    color: GameColors.gold,
    fontWeight: "500",
  },
  progressContainer: {
    marginBottom: Spacing.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: GameColors.background,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: GameColors.gold,
    borderRadius: 4,
  },
  hatchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: GameColors.gold,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  hatchButtonDisabled: {
    backgroundColor: GameColors.surface,
    borderWidth: 1,
    borderColor: GameColors.textTertiary,
  },
  hatchButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: GameColors.background,
  },
  hatchButtonTextDisabled: {
    color: GameColors.textSecondary,
  },
});

/**
 * Flappy Roachy Skins Section
 */
function FlappySkinsSection() {
  const { equippedSkin, setEquippedSkin, isLoading } = useFlappySkin();
  const { width: screenWidth } = useWindowDimensions();
  const { isGuest } = useAuth();
  const { nfts } = useUserNfts();
  
  // Get owned skin names from NFTs
  const ownedSkinNames = nfts
    .filter((nft) => nft.game.toLowerCase() === "flappy_roachy" && nft.type === "skin")
    .map((nft) => nft.name.toLowerCase().replace(/\s+/g, "_"));
  
  // Filter skins: show non-NFT skins always, show NFT skins only if owned
  const allSkins = Object.entries(FLAPPY_SKINS) as [RoachySkin, typeof FLAPPY_SKINS.default][];
  const skinEntries = allSkins.filter(([skinId, skin]) => {
    if (!skin.isNFT) return true;
    if (isGuest) return false;
    const nftName = skin.name.toLowerCase().replace(/\s+/g, "_");
    return ownedSkinNames.includes(nftName);
  });
  
  const containerPadding = Spacing.lg * 2;
  const gap = Spacing.sm;
  const columns = screenWidth >= 768 ? 4 : screenWidth >= 414 ? 3 : 3;
  const cardWidth = (screenWidth - containerPadding - gap * (columns + 1)) / columns;
  const imageSize = getResponsiveSize(56);

  return (
    <Animated.View entering={FadeInDown.springify()} style={flappyStyles.container}>
      <View style={flappyStyles.header}>
        <View style={flappyStyles.iconContainer}>
          <Feather name="feather" size={getResponsiveSize(24)} color={GameColors.gold} />
        </View>
        <View style={flappyStyles.info}>
          <ThemedText style={flappyStyles.title}>Flappy Skins</ThemedText>
          <ThemedText style={flappyStyles.subtitle}>Tap to equip for Flappy Roachy</ThemedText>
        </View>
      </View>

      <View style={flappyStyles.skinsRow}>
        {skinEntries.map(([skinId, skin]) => {
          const isEquipped = !isLoading && equippedSkin === skinId;
          return (
            <Pressable
              key={skinId}
              style={[
                flappyStyles.skinCard,
                { width: cardWidth },
                isEquipped && flappyStyles.skinCardEquipped,
                isLoading && flappyStyles.skinCardDisabled,
              ]}
              onPress={() => !isLoading && setEquippedSkin(skinId)}
              disabled={isLoading}
            >
              <View style={flappyStyles.cardHeader}>
                {skin.isNFT ? (
                  <View style={flappyStyles.nftBadge}>
                    <ThemedText style={flappyStyles.nftBadgeText}>NFT</ThemedText>
                  </View>
                ) : <View style={flappyStyles.nftBadgePlaceholder} />}
              </View>
              <ExpoImage source={skin.frames[1]} style={[flappyStyles.skinImage, { width: imageSize, height: imageSize }]} contentFit="contain" />
              <ThemedText style={flappyStyles.skinName} numberOfLines={1}>{skin.name}</ThemedText>
              {isEquipped ? (
                <View style={flappyStyles.equippedBadge}>
                  <ThemedText style={flappyStyles.equippedBadgeText}>EQUIPPED</ThemedText>
                </View>
              ) : <View style={flappyStyles.equippedPlaceholder} />}
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

const flappyStyles = StyleSheet.create({
  container: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: GameColors.gold + "30",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: GameColors.gold + "20",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: GameColors.textSecondary,
  },
  skinsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  skinCard: {
    backgroundColor: GameColors.background,
    borderRadius: BorderRadius.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  skinCardEquipped: {
    borderColor: GameColors.gold,
    backgroundColor: GameColors.gold + "15",
  },
  skinCardDisabled: {
    opacity: 0.5,
  },
  cardHeader: {
    width: "100%",
    height: 20,
    alignItems: "flex-end",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  skinImage: {
    marginBottom: Spacing.xs,
  },
  skinName: {
    fontSize: 11,
    fontWeight: "600",
    color: GameColors.textPrimary,
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  nftBadge: {
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  nftBadgePlaceholder: {
    height: 16,
  },
  nftBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#fff",
  },
  equippedBadge: {
    backgroundColor: GameColors.gold,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginTop: Spacing.xs,
  },
  equippedPlaceholder: {
    height: 24,
  },
  equippedBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#1A1A0F",
    letterSpacing: 0.5,
  },
});

/**
 * Generic Inventory Item Section
 * Renders items from ANY game in a consistent, game-agnostic way
 */
interface InventoryItemSectionProps {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  items: ArcadeInventoryItem[];
  getGameInfo: (gameId: string) => { id: string; name: string; icon: string; color: string } | null;
  onItemPress: (item: ArcadeInventoryItem) => void;
  emptyMessage?: string;
  emptyHint?: string;
  onPlayPress?: () => void;
}

function InventoryItemSection({
  title,
  icon,
  items,
  getGameInfo,
  onItemPress,
  emptyMessage,
  emptyHint,
  onPlayPress,
}: InventoryItemSectionProps) {
  const groupedByGame = items.reduce((acc, item) => {
    if (!acc[item.gameId]) acc[item.gameId] = [];
    acc[item.gameId].push(item);
    return acc;
  }, {} as Record<string, ArcadeInventoryItem[]>);

  const gameIds = Object.keys(groupedByGame);

  return (
    <View style={sectionStyles.container}>
      <View style={sectionStyles.header}>
        <Feather name={icon} size={18} color={GameColors.gold} />
        <ThemedText style={sectionStyles.title}>{title}</ThemedText>
        <ThemedText style={sectionStyles.count}>({items.length})</ThemedText>
      </View>
      
      {items.length > 0 ? (
        <>
          {gameIds.map((gameId) => {
            const gameInfo = getGameInfo(gameId);
            const gameItems = groupedByGame[gameId];
            
            return (
              <View key={gameId} style={sectionStyles.gameGroup}>
                <View style={sectionStyles.gameBadge}>
                  <Feather 
                    name={gameInfo?.icon as keyof typeof Feather.glyphMap || "grid"} 
                    size={12} 
                    color={GameColors.primary} 
                  />
                  <ThemedText style={sectionStyles.gameBadgeText}>
                    {gameInfo?.name || gameId}
                  </ThemedText>
                </View>
                
                <View style={sectionStyles.itemGrid}>
                  {gameItems.map((item) => (
                    <Pressable
                      key={item.id}
                      style={sectionStyles.itemCard}
                      onPress={() => onItemPress(item)}
                    >
                      <View 
                        style={[
                          sectionStyles.itemGlow, 
                          { backgroundColor: item.media.color || GameColors.gold }
                        ]} 
                      />
                      
                      {item.media.image ? (
                        <Image 
                          source={item.media.image} 
                          style={sectionStyles.itemImage} 
                        />
                      ) : (
                        <View style={sectionStyles.itemIconContainer}>
                          <Feather 
                            name={(item.media.icon || (item.itemType === "egg" ? "package" : "hexagon")) as keyof typeof Feather.glyphMap} 
                            size={28} 
                            color={item.media.color || GameColors.gold} 
                          />
                        </View>
                      )}
                      
                      
                      {item.status === "incubating" && item.progress ? (
                        <View style={sectionStyles.progressBadge}>
                          <Feather name="clock" size={10} color={GameColors.primary} />
                        </View>
                      ) : null}
                      
                      <View 
                        style={[
                          sectionStyles.rarityDot, 
                          { backgroundColor: item.media.color || GameColors.textSecondary }
                        ]} 
                      />
                      <ThemedText style={sectionStyles.itemName} numberOfLines={1}>
                        {item.displayName}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          })}
        </>
      ) : (
        <View style={sectionStyles.emptyState}>
          <Feather name="inbox" size={40} color={GameColors.textTertiary} />
          <ThemedText style={sectionStyles.emptyText}>{emptyMessage || "No items"}</ThemedText>
          {emptyHint ? (
            <ThemedText style={sectionStyles.emptyHint}>{emptyHint}</ThemedText>
          ) : null}
          {onPlayPress ? (
            <Button onPress={onPlayPress} style={sectionStyles.playButton}>
              Play Now
            </Button>
          ) : null}
        </View>
      )}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  count: {
    fontSize: 14,
    color: GameColors.textSecondary,
  },
  gameGroup: {
    marginBottom: Spacing.md,
  },
  gameBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: GameColors.primary + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    alignSelf: "flex-start",
    marginBottom: Spacing.sm,
  },
  gameBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: GameColors.primary,
  },
  itemGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  itemCard: {
    width: "30%",
    aspectRatio: 0.9,
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xs,
    position: "relative",
    overflow: "hidden",
  },
  itemGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: BorderRadius.md,
    borderTopRightRadius: BorderRadius.md,
  },
  itemImage: {
    width: 48,
    height: 48,
    marginBottom: Spacing.xs,
  },
  itemIconContainer: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  nftBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: GameColors.gold + "30",
    borderRadius: 10,
    padding: 3,
  },
  progressBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: GameColors.primary + "30",
    borderRadius: 10,
    padding: 3,
  },
  rarityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: Spacing.xs,
  },
  itemName: {
    fontSize: 10,
    fontWeight: "600",
    color: GameColors.textPrimary,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
  },
  emptyText: {
    fontSize: 14,
    color: GameColors.textSecondary,
    marginTop: Spacing.sm,
  },
  emptyHint: {
    fontSize: 12,
    color: GameColors.textTertiary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  playButton: {
    paddingHorizontal: Spacing.xl,
  },
});

export function ArcadeHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("Home");
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [showWebBanner, setShowWebBanner] = useState(true);
  const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter>("all");
  const [isHatching, setIsHatching] = useState(false);
  const [selectedGameTab, setSelectedGameTab] = useState<string | null>(null);
  const { user, logout, isGuest } = useAuth();
  const { collectedEggs, hatchEggs, refreshEconomy, collection: huntCollection } = useHunt();
  const { equippedSkin, setEquippedSkin, isLoading: isSkinLoading } = useFlappySkin();
  const { equippedTrail, setEquippedTrail, isLoading: isTrailLoading } = useFlappyTrail();
  const { nfts } = useUserNfts();
  const {
    items: inventoryItems,
    isLoading: isLoadingInventory,
    getFilteredItems,
    getGameInfo,
    getCountByType,
    getMintableCount,
    getActiveItemTypes,
    getTypeMetadata,
    refetch: refetchInventory,
  } = useArcadeInventory();

  // Fetch live player counts for games
  const { data: playerCountsData } = useQuery<{ success: boolean; counts: Record<string, number> }>({
    queryKey: ["/api/games/player-counts"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });
  const playerCounts = playerCountsData?.counts || {};

  // Get unique item types that exist in inventory for dynamic filters
  const activeItemTypes = getActiveItemTypes();

  // Get owned skin names from NFTs for filtering
  const ownedSkinNames = nfts
    .filter((nft) => nft.game.toLowerCase() === "flappy_roachy" && nft.type === "skin")
    .map((nft) => nft.name.toLowerCase().replace(/\s+/g, "_"));

  // Filter skins: show non-NFT always, show NFT only if owned
  const allSkins = Object.entries(FLAPPY_SKINS) as [RoachySkin, typeof FLAPPY_SKINS.default][];
  const skinEntries = allSkins.filter(([skinId, skin]) => {
    if (!skin.isNFT) return true;
    if (isGuest) return false;
    const nftName = skin.name.toLowerCase().replace(/\s+/g, "_");
    return ownedSkinNames.includes(nftName);
  });
  
  const trailEntries = Object.entries(FLAPPY_TRAILS) as [RoachyTrail, typeof FLAPPY_TRAILS.none][];
  const gameInventories = [
    {
      id: "flappy-roach",
      name: "Flappy Roachy",
      icon: "wind" as keyof typeof Feather.glyphMap,
      route: "FlappyTab",
      categories: [
        {
          id: "skins",
          name: "Skins",
          icon: "feather" as keyof typeof Feather.glyphMap,
          items: skinEntries.map(([skinId, skin]) => ({
            id: skinId,
            name: skin.name,
            image: skin.frames[1],
            isNFT: skin.isNFT,
            isEquipped: !isSkinLoading && equippedSkin === skinId,
          })),
        },
        {
          id: "trails",
          name: "Trails",
          icon: "wind" as keyof typeof Feather.glyphMap,
          items: trailEntries.map(([trailId, trail]) => ({
            id: trailId,
            name: trail.name,
            asset: trail.asset,
            isNFT: trail.isNFT,
            rarity: trail.rarity,
            isEquipped: !isTrailLoading && equippedTrail === trailId,
          })),
        },
      ],
      totalItems: skinEntries.length + trailEntries.length,
    },
    {
      id: "roachy-hunt",
      name: "Roachy Hunt",
      icon: "map-pin" as keyof typeof Feather.glyphMap,
      route: "HuntTab",
      categories: [
        {
          id: "creatures",
          name: "Creatures",
          icon: "hexagon" as keyof typeof Feather.glyphMap,
          items: huntCollection.map((creature) => {
            const rarityColors: Record<string, string> = {
              common: "#9CA3AF",
              uncommon: "#22C55E",
              rare: "#3B82F6",
              epic: "#A855F7",
              legendary: "#F59E0B",
            };
            return {
              id: creature.id,
              name: creature.name,
              rarity: creature.rarity,
              level: creature.level,
              color: rarityColors[creature.rarity] || GameColors.gold,
            };
          }),
        },
        {
          id: "eggs",
          name: "Eggs",
          icon: "gift" as keyof typeof Feather.glyphMap,
          items: collectedEggs > 0 ? [{ id: "collected-eggs", name: `${collectedEggs} Eggs`, count: collectedEggs }] : [],
        },
      ],
      totalItems: huntCollection.length + (collectedEggs > 0 ? 1 : 0),
    },
  ].filter(game => game.totalItems > 0 || game.id === "flappy-roach"); // Always show Flappy (has skins)

  // Auto-select first game if none selected
  const effectiveGameTab = selectedGameTab || (gameInventories.length > 0 ? gameInventories[0].id : null);
  const selectedGame = gameInventories.find(g => g.id === effectiveGameTab);

  // Handle egg hatching from centralized inventory
  const handleHatch = async () => {
    setIsHatching(true);
    try {
      const result = await hatchEggs();
      if (result.success && result.creature) {
        const def = getCreatureDefinition(result.creature.templateId);
        await refreshEconomy();
        refetchInventory();
        if (user?.id) {
          queryClient.invalidateQueries({ queryKey: ["/api/hunt/collection", user.id] });
          queryClient.invalidateQueries({ queryKey: ["/api/hunt/eggs", user.id] });
          queryClient.invalidateQueries({ queryKey: ["/api/hunt/economy", user.id] });
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "Egg Hatched!",
          `You got a ${def?.rarity || 'common'} ${def?.name || 'Roachy'}!`,
          [{ text: "Awesome!" }]
        );
      } else {
        Alert.alert("Hatch Failed", result.error || "Something went wrong");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to hatch eggs");
    } finally {
      setIsHatching(false);
    }
  };

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
      setShowOnboarding(completed !== "true");
    } catch {
      setShowOnboarding(false);
    }
  };

  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
      setShowOnboarding(false);
    } catch {
      setShowOnboarding(false);
    }
  };

  const featuredGame = GAMES_CATALOG[0];
  const gamesList = GAMES_CATALOG;

  const handleLogout = async () => {
    console.log("[HomeScreen] handleLogout called, Platform:", Platform.OS);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      console.log("[HomeScreen] Haptics not available");
    }
    
    const performLogout = async () => {
      console.log("[HomeScreen] Logging out...");
      await logout();
      console.log("[HomeScreen] Logout complete, resetting navigation...");
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Auth" }],
        })
      );
    };
    
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to sign out?")) {
        performLogout();
      }
    } else {
      Alert.alert(
        "Sign Out",
        "Are you sure you want to sign out?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Sign Out", 
            style: "destructive", 
            onPress: performLogout
          },
        ]
      );
    }
  };

  const getUserDisplayName = (): string => {
    // Don't show wallet addresses
    if (user?.displayName && !user.displayName.toLowerCase().includes('wallet')) {
      return user.displayName;
    }
    if (user?.email) return user.email.split("@")[0];
    return "Guest Player";
  };

  const getAccountType = (): string => {
    if (user?.authProvider === "google" || user?.googleId) return "Google Account";
    if (user?.authProvider === "email" || user?.email) return "Email Account";
    return "Guest";
  };

  const getAccountIcon = (): keyof typeof Feather.glyphMap => {
    if (user?.authProvider === "google" || user?.googleId) return "globe";
    if (user?.authProvider === "email" || user?.email) return "mail";
    return "user";
  };

  const filteredGames = searchQuery
    ? gamesList.filter((game) =>
        game.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : gamesList;

  const handleGamePress = (routeName: string) => {
    navigation.navigate(routeName);
  };

  const handleGuestSignIn = async () => {
    await logout();
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Auth" }],
      })
    );
  };

  const handleNotificationPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Notifications", "Coming soon!");
  };

  if (showOnboarding === null) {
    return (
      <ThemedView style={styles.container}>
        <LinearGradient
          colors={[GameColors.background, "#150C06"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GameColors.gold} />
        </View>
      </ThemedView>
    );
  }

  if (showOnboarding) {
    return (
      <OnboardingFlow
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingComplete}
      />
    );
  }

  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={[GameColors.background, "#150C06"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <ArcadeHeader
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onNotificationPress={handleNotificationPress}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {(activeTab === "Home" || activeTab === "Games") && (
          <>
            {activeTab === "Home" && (
              <>
                <TokenBalanceCardWithWebapp />
                <View style={styles.livePlayersRow}>
                  <View style={styles.livePlayersBadge}>
                    <View style={styles.livePlayersDot} />
                    <ThemedText style={styles.livePlayersText}>247 players online</ThemedText>
                  </View>
                </View>
                <FeaturedGameHero
                  game={featuredGame}
                  onPress={() => handleGamePress(featuredGame.routeName)}
                  viewerCount={`${playerCounts[featuredGame.id] || 0} playing`}
                />
                <View style={styles.sectionSpacer} />
                <EarningsTracker />
              </>
            )}

            {activeTab === "Games" && (
              <View style={styles.sectionHeader}>
                <ThemedText style={styles.sectionTitle}>All Games</ThemedText>
                <ThemedText style={styles.sectionCount}>{filteredGames.length} games</ThemedText>
              </View>
            )}

            <View style={styles.gamesList}>
              {filteredGames.map((game, index) => (
                <GameListItem
                  key={game.id}
                  game={game}
                  onPress={() => handleGamePress(game.routeName)}
                  playTime={index === 0 ? "20:30" : index === 1 ? "00:15" : index === 2 ? "22:00" : "18:00"}
                />
              ))}
            </View>

            {filteredGames.length === 0 && (
              <View style={styles.emptyState}>
                <ThemedText style={styles.emptyText}>
                  No games found for &quot;{searchQuery}&quot;
                </ThemedText>
              </View>
            )}

            {activeTab === "Home" && (
              <>
                <View style={styles.sectionSpacer} />
                {showWebBanner ? <WebCTABanner onDismiss={() => setShowWebBanner(false)} /> : null}
                <View style={styles.moreSection}>
                  <ThemedText style={styles.moreText}>More games coming soon</ThemedText>
                </View>
              </>
            )}
          </>
        )}

        {activeTab === "Inventory" && (
          <View style={styles.tabContent}>
            <View style={styles.inventoryBanner}>
              <Feather name="briefcase" size={48} color={GameColors.gold} />
              <ThemedText style={styles.inventoryTitle}>Your Collection</ThemedText>
              <ThemedText style={styles.inventorySubtitle}>
                Items organized by game
              </ThemedText>
            </View>

            {/* Game Tabs - Horizontal selector */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.gameTabsContainer}
              contentContainerStyle={styles.gameTabsContent}
            >
              {gameInventories.map((game) => {
                const isActive = effectiveGameTab === game.id;
                return (
                  <Pressable
                    key={game.id}
                    style={[styles.gameTab, isActive && styles.gameTabActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedGameTab(game.id);
                    }}
                  >
                    <Feather 
                      name={game.icon} 
                      size={20} 
                      color={isActive ? GameColors.background : GameColors.textSecondary} 
                    />
                    <ThemedText style={[styles.gameTabText, isActive && styles.gameTabTextActive]}>
                      {game.name}
                    </ThemedText>
                    <View style={[styles.gameTabBadge, isActive && styles.gameTabBadgeActive]}>
                      <ThemedText style={[styles.gameTabBadgeText, isActive && styles.gameTabBadgeTextActive]}>
                        {game.totalItems}
                      </ThemedText>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Selected Game Categories */}
            {selectedGame ? (
              <View style={styles.gameCategoriesContainer}>
                {/* Egg Hatching - Show when Roachy Hunt is selected and has eggs */}
                {selectedGame.id === "roachy-hunt" && collectedEggs > 0 ? (
                  <EggHatchSection 
                    eggCount={collectedEggs} 
                    onHatch={handleHatch}
                    isHatching={isHatching}
                  />
                ) : null}

                {selectedGame.categories.map((category) => {
                  const filteredItems = (isGuest && (category.id === "skins" || category.id === "trails"))
                    ? category.items.filter((item: any) => !item.isNFT)
                    : category.items;
                  return (
                  <View key={category.id} style={styles.categorySection}>
                    <View style={styles.categoryHeader}>
                      <Feather name={category.icon} size={18} color={GameColors.gold} />
                      <ThemedText style={styles.categoryTitle}>{category.name}</ThemedText>
                      <ThemedText style={styles.categoryCount}>({filteredItems.length})</ThemedText>
                    </View>

                    {filteredItems.length > 0 ? (
                      <View style={styles.categoryItems}>
                        {category.id === "skins" ? (
                          /* Flappy Skins with equip functionality */
                          <View style={styles.skinsGrid}>
                            {filteredItems.map((item: any) => (
                              <Pressable
                                key={item.id}
                                style={[
                                  styles.skinCard,
                                  item.isEquipped && styles.skinCardEquipped,
                                  isSkinLoading && styles.skinCardDisabled,
                                ]}
                                onPress={() => {
                                  if (!isSkinLoading) {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setEquippedSkin(item.id as RoachySkin);
                                  }
                                }}
                                disabled={isSkinLoading}
                              >
                                <View style={styles.skinCardHeader}>
                                  {item.isNFT ? <PremiumNFTBadge /> : <View style={styles.nftBadgePlaceholder} />}
                                </View>
                                <ExpoImage source={item.image} style={styles.skinImage} contentFit="contain" />
                                <ThemedText style={styles.skinName}>{item.name}</ThemedText>
                                {item.isEquipped ? (
                                  <View style={styles.equippedBadge}>
                                    <ThemedText style={styles.equippedBadgeText}>EQUIPPED</ThemedText>
                                  </View>
                                ) : <View style={styles.equippedPlaceholder} />}
                              </Pressable>
                            ))}
                          </View>
                        ) : category.id === "trails" ? (
                          /* Flappy Trails with equip functionality */
                          <View style={styles.skinsGrid}>
                            {filteredItems.map((item: any) => (
                              <Pressable
                                key={item.id}
                                style={[
                                  styles.skinCard,
                                  item.isEquipped && styles.skinCardEquipped,
                                  isTrailLoading && styles.skinCardDisabled,
                                ]}
                                onPress={() => {
                                  if (!isTrailLoading) {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setEquippedTrail(item.id as RoachyTrail);
                                  }
                                }}
                                disabled={isTrailLoading}
                              >
                                <View style={styles.skinCardHeader}>
                                  {item.isNFT ? <PremiumNFTBadge /> : <View style={styles.nftBadgePlaceholder} />}
                                </View>
                                {item.asset ? (
                                  <ExpoImage source={item.asset} style={styles.skinImage} contentFit="contain" />
                                ) : (
                                  <View style={styles.trailIconContainer}>
                                    <Feather name="minus" size={32} color={GameColors.textTertiary} />
                                  </View>
                                )}
                                <ThemedText style={styles.skinName}>{item.name}</ThemedText>
                                {item.isEquipped ? (
                                  <View style={styles.equippedBadge}>
                                    <ThemedText style={styles.equippedBadgeText}>EQUIPPED</ThemedText>
                                  </View>
                                ) : <View style={styles.equippedPlaceholder} />}
                              </Pressable>
                            ))}
                          </View>
                        ) : category.id === "creatures" ? (
                          /* Creature cards */
                          <View style={styles.creaturesGrid}>
                            {category.items.map((item: any) => (
                              <Pressable
                                key={item.id}
                                style={styles.creatureCard}
                                onPress={() => {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  handleGamePress("HuntTab");
                                }}
                              >
                                <View style={[styles.creatureGlow, { backgroundColor: item.color }]} />
                                <View style={styles.creatureIconContainer}>
                                  <Feather name="hexagon" size={32} color={item.color} />
                                </View>
                                <View style={[styles.rarityDot, { backgroundColor: item.color }]} />
                                <ThemedText style={styles.creatureName} numberOfLines={1}>{item.name}</ThemedText>
                                <ThemedText style={styles.creatureLevel}>Lv.{item.level}</ThemedText>
                              </Pressable>
                            ))}
                          </View>
                        ) : category.id === "eggs" ? (
                          /* Eggs display */
                          <View style={styles.eggsInfo}>
                            <ThemedText style={styles.eggsText}>
                              {collectedEggs} eggs collected
                            </ThemedText>
                            <ThemedText style={styles.eggsHint}>
                              Collect 10 to hatch a creature
                            </ThemedText>
                          </View>
                        ) : null}
                      </View>
                    ) : (
                      <View style={styles.categoryEmpty}>
                        <Feather name="inbox" size={32} color={GameColors.textTertiary} />
                        <ThemedText style={styles.categoryEmptyText}>
                          No {category.name.toLowerCase()} yet
                        </ThemedText>
                        <Button
                          onPress={() => handleGamePress(selectedGame.route)}
                          style={styles.playGameButton}
                        >
                          Play {selectedGame.name}
                        </Button>
                      </View>
                    )}
                  </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyInventory}>
                <Feather name="inbox" size={48} color={GameColors.textTertiary} />
                <ThemedText style={styles.emptyText}>No games with items yet</ThemedText>
                <ThemedText style={styles.emptyHint}>
                  Play games to start collecting
                </ThemedText>
                <Button
                  onPress={() => handleGamePress("HuntTab")}
                  style={styles.playButton}
                >
                  Start Playing
                </Button>
              </View>
            )}
          </View>
        )}

        {activeTab === "Rewards" && (
          <View style={styles.tabContent}>
            <View style={styles.rewardsBanner}>
              <Feather name="award" size={48} color={GameColors.gold} />
              <ThemedText style={styles.rewardsTitle}>Rewards Center</ThemedText>
              <ThemedText style={styles.rewardsSubtitle}>
                Earn rewards by playing games across the arcade
              </ThemedText>
            </View>

            <DailyBonusCard 
              userId={user?.id ?? null}
              isConnected={!!user && !isGuest}
              isGuest={isGuest}
              onSignIn={handleGuestSignIn}
            />

            <View style={styles.rewardsSection}>
              <EarningsTracker />
            </View>

            <View style={styles.rewardsSection}>
              <ThemedText style={styles.sectionTitle}>Your Games</ThemedText>
              <ThemedText style={styles.rewardsHint}>
                View leaderboards and achievements inside each game
              </ThemedText>
              <View style={styles.gameShortcuts}>
                {GAMES_CATALOG.filter(g => !g.isLocked).map((game) => (
                  <Pressable
                    key={game.id}
                    style={styles.gameShortcut}
                    onPress={() => handleGamePress(game.routeName)}
                  >
                    <View style={styles.gameShortcutIcon}>
                      <Feather name={game.iconName as any} size={24} color={GameColors.gold} />
                    </View>
                    <ThemedText style={styles.gameShortcutTitle}>{game.title}</ThemedText>
                    <Feather name="chevron-right" size={16} color={GameColors.textSecondary} />
                  </Pressable>
                ))}
              </View>
            </View>

          </View>
        )}

        {activeTab === "Profile" && (
          <View style={styles.tabContent}>
            <View style={styles.profileHeader}>
              <View style={styles.avatar}>
                <Feather name={getAccountIcon()} size={40} color={GameColors.textPrimary} />
              </View>
              <ThemedText style={styles.profileName}>
                {getUserDisplayName()}
              </ThemedText>
              <View style={styles.accountTypeBadge}>
                <Feather name={getAccountIcon()} size={12} color={GameColors.gold} />
                <ThemedText style={styles.accountTypeText}>{getAccountType()}</ThemedText>
              </View>
            </View>

            <View style={styles.rewardsSection}>
              <ThemedText style={styles.sectionTitle}>Rewards</ThemedText>
              <Pressable 
                style={styles.rewardsCard}
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  await WebBrowser.openBrowserAsync(getMarketplaceUrl() + "/rewards");
                }}
              >
                <View style={styles.rewardsCardContent}>
                  <View style={styles.rewardsCardIcon}>
                    <Feather name="gift" size={32} color={GameColors.gold} />
                  </View>
                  <View style={styles.rewardsCardInfo}>
                    <ThemedText style={styles.rewardsCardTitle}>
                      Claim Rewards on Web
                    </ThemedText>
                    <ThemedText style={styles.rewardsCardDescription}>
                      Visit roachy.games to claim your rewards
                    </ThemedText>
                  </View>
                  <Feather name="external-link" size={24} color={GameColors.gold} />
                </View>
              </Pressable>
            </View>

            <View style={styles.transactionSection}>
              <ActivityHistory />
            </View>

            <View style={styles.webLinksSection}>
              <ThemedText style={styles.sectionTitle}>Web App</ThemedText>
              <Pressable 
                style={[styles.marketplaceButton, styles.disabledLink]}
                onPress={() => Alert.alert("Coming Soon", "Marketplace will be available in a future update!")}
              >
                <View style={styles.marketplaceIcon}>
                  <Feather name="shopping-bag" size={24} color={GameColors.textTertiary} />
                </View>
                <View style={styles.marketplaceInfo}>
                  <ThemedText style={[styles.marketplaceTitle, styles.disabledText]}>Open Marketplace</ThemedText>
                  <ThemedText style={styles.marketplaceSubtitle}>Trade Roachies and items</ThemedText>
                </View>
                <View style={styles.comingSoonBadge}>
                  <Feather name="lock" size={12} color={GameColors.textTertiary} />
                  <ThemedText style={styles.comingSoonText}>Soon</ThemedText>
                </View>
              </Pressable>
            </View>

            <View style={styles.settingsSection}>
              <ThemedText style={styles.sectionTitle}>Settings</ThemedText>
              {[
                { icon: "bell", title: "Notifications", subtitle: "Coming soon" },
                { icon: "shield", title: "Privacy", subtitle: "Coming soon" },
                { icon: "help-circle", title: "Help & Support", subtitle: "Coming soon" },
              ].map((item, index) => (
                <Pressable key={index} style={styles.settingsItem}>
                  <View style={styles.settingsIcon}>
                    <Feather name={item.icon as any} size={20} color={GameColors.textSecondary} />
                  </View>
                  <View style={styles.settingsInfo}>
                    <ThemedText style={styles.settingsTitle}>{item.title}</ThemedText>
                    <ThemedText style={styles.settingsSubtitle}>{item.subtitle}</ThemedText>
                  </View>
                  <Feather name="chevron-right" size={20} color={GameColors.textTertiary} />
                </Pressable>
              ))}
              
              <Pressable style={styles.logoutButton} onPress={handleLogout}>
                <View style={[styles.settingsIcon, styles.logoutIcon]}>
                  <Feather name="log-out" size={20} color={GameColors.error} />
                </View>
                <View style={styles.settingsInfo}>
                  <ThemedText style={styles.logoutText}>Sign Out</ThemedText>
                </View>
              </Pressable>
            </View>

          </View>
        )}
      </ScrollView>

      <ArcadeTabBar activeTab={activeTab} onTabPress={setActiveTab} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 160,
  },
  gamesList: {
    marginTop: Spacing.sm,
  },
  emptyState: {
    paddingVertical: Spacing["3xl"],
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: GameColors.textSecondary,
  },
  moreSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl,
  },
  moreText: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.textTertiary,
  },
  sectionSpacer: {
    height: Spacing.lg,
  },
  achievementsSection: {
    marginBottom: Spacing.xl,
  },
  nftSection: {
    marginBottom: Spacing.xl,
  },
  transactionSection: {
    marginBottom: Spacing.xl,
  },
  livePlayersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  livePlayersBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  livePlayersDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GameColors.success,
  },
  livePlayersText: {
    fontSize: 13,
    fontWeight: "600",
    color: GameColors.success,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: GameColors.textPrimary,
    marginBottom: Spacing.md,
  },
  sectionCount: {
    fontSize: 14,
    color: GameColors.textSecondary,
  },
  tabContent: {
    paddingTop: Spacing.lg,
  },
  rewardsBanner: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    marginBottom: Spacing.xl,
  },
  rewardsTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: GameColors.gold,
    marginTop: Spacing.md,
  },
  rewardsSubtitle: {
    fontSize: 14,
    color: GameColors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  rewardsSection: {
    marginBottom: Spacing.xl,
  },
  rewardsCard: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  rewardsCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  rewardsCardIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: GameColors.gold + "20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  rewardsCardInfo: {
    flex: 1,
  },
  rewardsCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.textPrimary,
    marginBottom: Spacing.xs,
  },
  rewardsCardDescription: {
    fontSize: 13,
    color: GameColors.textSecondary,
    lineHeight: 18,
  },
  dailyBonusContainer: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: GameColors.gold + "30",
  },
  dailyBonusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  dailyBonusHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  dailyBonusTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: GameColors.gold + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streakText: {
    fontSize: 12,
    fontWeight: "600",
    color: GameColors.gold,
  },
  dailyRewardsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.xs,
  },
  dailyRewardCard: {
    flex: 1,
    minWidth: 44,
    maxWidth: 52,
    paddingVertical: Spacing.sm,
    paddingHorizontal: 4,
    backgroundColor: GameColors.surfaceLight,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "transparent",
  },
  dailyRewardCurrent: {
    backgroundColor: GameColors.gold + "15",
    borderColor: GameColors.gold,
    borderWidth: 2,
  },
  dailyRewardCompleted: {
    backgroundColor: GameColors.success + "10",
    opacity: 0.7,
  },
  dailyRewardLocked: {
    opacity: 0.5,
  },
  dailyRewardGrand: {
    backgroundColor: GameColors.gold + "20",
    borderColor: GameColors.gold + "50",
    borderWidth: 1,
  },
  dayLabel: {
    fontSize: 10,
    color: GameColors.textSecondary,
    fontWeight: "600",
    textAlign: "center",
  },
  dayLabelCurrent: {
    color: GameColors.gold,
  },
  dayLabelCompleted: {
    color: GameColors.success,
  },
  rewardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: GameColors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  rewardIconCurrent: {
    backgroundColor: GameColors.gold + "30",
  },
  rewardIconGrand: {
    backgroundColor: GameColors.gold + "40",
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  rewardAmount: {
    fontSize: 12,
    fontWeight: "700",
    color: GameColors.textSecondary,
  },
  rewardAmountCurrent: {
    color: GameColors.gold,
  },
  rewardAmountGrand: {
    color: GameColors.gold,
    fontSize: 14,
  },
  dailyBonusFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: GameColors.surfaceLight,
  },
  dailyBonusHint: {
    fontSize: 12,
    color: GameColors.textSecondary,
    flex: 1,
  },
  achievementCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: GameColors.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  achievementComplete: {
    backgroundColor: GameColors.gold + "20",
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  achievementDesc: {
    fontSize: 12,
    color: GameColors.textSecondary,
    marginTop: 2,
  },
  progressBar: {
    height: 4,
    backgroundColor: GameColors.surfaceLight,
    borderRadius: 2,
    marginTop: Spacing.sm,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: GameColors.gold,
    borderRadius: 2,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: GameColors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: GameColors.gold,
    marginBottom: Spacing.md,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  profileSubtitle: {
    fontSize: 14,
    color: GameColors.textSecondary,
    marginTop: Spacing.xs,
  },
  accountTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.gold + "20",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  accountTypeText: {
    fontSize: 12,
    fontWeight: "600",
    color: GameColors.gold,
  },
  walletSection: {
    marginBottom: Spacing.xl,
  },
  walletCard: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  walletConnected: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  walletStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  walletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GameColors.success,
  },
  walletStatusText: {
    color: GameColors.success,
    fontWeight: "600",
  },
  addressContainer: {
    backgroundColor: GameColors.surfaceLight,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
  },
  addressLabel: {
    fontSize: 12,
    color: GameColors.textSecondary,
    marginBottom: 4,
  },
  addressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  address: {
    fontFamily: "monospace",
    color: GameColors.textPrimary,
  },
  walletNotConnected: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  walletIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: GameColors.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  walletTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: GameColors.textPrimary,
    marginBottom: Spacing.xs,
  },
  walletDescription: {
    textAlign: "center",
    color: GameColors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  connectButton: {
    width: "100%",
  },
  settingsSection: {
    marginBottom: Spacing.xl,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GameColors.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  settingsInfo: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  settingsSubtitle: {
    fontSize: 12,
    color: GameColors.textSecondary,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.error + "15",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: GameColors.error + "30",
  },
  logoutIcon: {
    backgroundColor: GameColors.error + "20",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.error,
  },
  webLinksSection: {
    marginBottom: Spacing.xl,
  },
  marketplaceButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: GameColors.gold + "40",
  },
  marketplaceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: GameColors.gold + "20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  marketplaceInfo: {
    flex: 1,
  },
  marketplaceTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: GameColors.gold,
  },
  marketplaceSubtitle: {
    fontSize: 13,
    color: GameColors.textSecondary,
    marginTop: 2,
  },
  webLinksRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  webLinkItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: GameColors.surfaceGlow,
  },
  webLinkText: {
    fontSize: 13,
    fontWeight: "600",
    color: GameColors.textSecondary,
  },
  disabledLink: {
    opacity: 0.6,
  },
  disabledText: {
    color: GameColors.textTertiary,
  },
  comingSoonBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: GameColors.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: "600",
    color: GameColors.textTertiary,
  },
  rewardsHint: {
    fontSize: 13,
    color: GameColors.textTertiary,
    marginBottom: Spacing.md,
  },
  gameShortcuts: {
    gap: Spacing.sm,
  },
  gameShortcut: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  gameShortcutIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GameColors.gold + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  gameShortcutTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.textPrimary,
  },
  inventoryBanner: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    marginBottom: Spacing.lg,
  },
  inventoryTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: GameColors.gold,
    marginTop: Spacing.md,
  },
  inventorySubtitle: {
    fontSize: 14,
    color: GameColors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  inventoryFilters: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: GameColors.surfaceGlow,
  },
  filterChipActive: {
    backgroundColor: GameColors.gold + "20",
    borderColor: GameColors.gold,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: GameColors.textSecondary,
  },
  filterChipTextActive: {
    color: GameColors.gold,
  },
  inventoryStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  statBox: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "700",
    color: GameColors.gold,
  },
  statLabel: {
    fontSize: 12,
    color: GameColors.textSecondary,
    marginTop: Spacing.xs,
  },
  gameTabsContainer: {
    marginBottom: Spacing.lg,
  },
  gameTabsContent: {
    paddingHorizontal: Spacing.xs,
    gap: Spacing.sm,
  },
  gameTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: GameColors.surfaceGlow,
  },
  gameTabActive: {
    backgroundColor: GameColors.gold,
    borderColor: GameColors.gold,
  },
  gameTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: GameColors.textSecondary,
  },
  gameTabTextActive: {
    color: GameColors.background,
  },
  gameTabBadge: {
    backgroundColor: GameColors.surfaceGlow,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  gameTabBadgeActive: {
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  gameTabBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: GameColors.textSecondary,
  },
  gameTabBadgeTextActive: {
    color: GameColors.background,
  },
  gameCategoriesContainer: {
    gap: Spacing.lg,
  },
  categorySection: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: GameColors.surfaceGlow,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: GameColors.textPrimary,
  },
  categoryCount: {
    fontSize: 14,
    color: GameColors.textSecondary,
  },
  categoryItems: {},
  categoryEmpty: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  categoryEmptyText: {
    fontSize: 14,
    color: GameColors.textSecondary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  playGameButton: {
    paddingHorizontal: Spacing.xl,
  },
  skinsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  skinCard: {
    width: 75,
    backgroundColor: GameColors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  skinCardEquipped: {
    borderColor: GameColors.gold,
    backgroundColor: GameColors.gold + "15",
  },
  skinCardDisabled: {
    opacity: 0.5,
  },
  skinCardHeader: {
    width: "100%",
    height: 22,
    alignItems: "flex-end",
    marginBottom: Spacing.xs,
  },
  nftBadgePlaceholder: {
    height: 18,
  },
  skinImage: {
    width: 56,
    height: 56,
    marginBottom: Spacing.xs,
  },
  trailIconContainer: {
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  skinName: {
    fontSize: 12,
    fontWeight: "600",
    color: GameColors.textPrimary,
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  nftBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#fff",
  },
  equippedBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    backgroundColor: GameColors.gold,
    marginTop: Spacing.xs,
  },
  equippedPlaceholder: {
    height: 24,
  },
  equippedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1A1A0F",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  creaturesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  creatureIconContainer: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  creatureName: {
    fontSize: 10,
    fontWeight: "600",
    color: GameColors.textPrimary,
    textAlign: "center",
  },
  creatureLevel: {
    fontSize: 9,
    color: GameColors.textSecondary,
  },
  eggsInfo: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  eggsText: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.gold,
  },
  eggsHint: {
    fontSize: 12,
    color: GameColors.textSecondary,
    marginTop: Spacing.xs,
  },
  loadingText: {
    marginTop: Spacing.md,
    color: GameColors.textSecondary,
  },
  inventorySection: {
    marginBottom: Spacing.xl,
  },
  gameBadge: {
    marginLeft: "auto",
    backgroundColor: GameColors.primary + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  gameBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: GameColors.primary,
  },
  creatureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  creatureCard: {
    width: "30%",
    aspectRatio: 0.9,
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xs,
    position: "relative",
    overflow: "hidden",
  },
  creatureGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: BorderRadius.md,
    borderTopRightRadius: BorderRadius.md,
  },
  creatureImage: {
    width: 48,
    height: 48,
    marginBottom: Spacing.xs,
  },
  nftBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: GameColors.gold + "30",
    borderRadius: 10,
    padding: 3,
  },
  rarityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: Spacing.xs,
  },
  creatureCardName: {
    fontSize: 10,
    fontWeight: "600",
    color: GameColors.textPrimary,
    textAlign: "center",
  },
  emptyInventory: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
  },
  emptyHint: {
    fontSize: 12,
    color: GameColors.textTertiary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  eggHintContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.gold + "15",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  eggHintText: {
    fontSize: 12,
    color: GameColors.gold,
    flex: 1,
  },
  playButton: {
    paddingHorizontal: Spacing.xl,
  },
  eggGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  eggCard: {
    width: 80,
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    padding: Spacing.md,
  },
  eggIcon: {
    marginBottom: Spacing.xs,
  },
  eggType: {
    fontSize: 11,
    fontWeight: "600",
    color: GameColors.textPrimary,
    textTransform: "capitalize",
  },
  incubatingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: Spacing.xs,
    backgroundColor: GameColors.primary + "20",
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  incubatingText: {
    fontSize: 8,
    fontWeight: "600",
    color: GameColors.primary,
  },
  emptyInventorySmall: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.md,
  },
  emptyTextSmall: {
    fontSize: 12,
    color: GameColors.textTertiary,
  },
  nftInfo: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
  },
  nftInfoText: {
    fontSize: 14,
    color: GameColors.textSecondary,
    marginBottom: Spacing.md,
  },
  mintButton: {
    paddingHorizontal: Spacing.xl,
  },
});
