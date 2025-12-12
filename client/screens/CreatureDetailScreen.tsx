import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import Animated, {
  FadeIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { useGame } from "@/context/GameContext";
import { useHunt } from "@/context/HuntContext";
import {
  getCreatureDefinition,
  getRarityColor,
  getTypeColor,
  CREATURE_IMAGES,
} from "@/constants/creatures";
import { InventoryStackParamList } from "@/navigation/InventoryStackNavigator";

type RouteProps = RouteProp<InventoryStackParamList, "CreatureDetail">;

interface StatBarProps {
  label: string;
  value: number;
  maxValue?: number;
  color: string;
  delay: number;
}

function StatBar({ label, value, maxValue = 100, color, delay }: StatBarProps) {
  const width = useSharedValue(0);
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      width.value = withSpring((value / maxValue) * 100, {
        damping: 15,
        stiffness: 80,
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View style={styles.statRow}>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
      <View style={styles.statBarContainer}>
        <Animated.View
          style={[styles.statBarFill, { backgroundColor: color }, animatedStyle]}
        />
      </View>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
    </View>
  );
}

export default function CreatureDetailScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const route = useRoute<RouteProps>();
  const { state, mintCreatureNFT } = useGame();
  const { collection: huntCollection } = useHunt();
  const [minting, setMinting] = useState(false);
  const [copied, setCopied] = useState(false);

  const gameCreature = state.inventory.find(c => c.uniqueId === route.params.uniqueId);
  const huntCreature = huntCollection.find(c => c.id === route.params.uniqueId);
  
  const isHuntCreature = !gameCreature && !!huntCreature;
  
  const definition = isHuntCreature && huntCreature 
    ? getCreatureDefinition(huntCreature.templateId)
    : gameCreature ? getCreatureDefinition(gameCreature.id) : null;
    
  const creature = gameCreature || (huntCreature ? {
    id: huntCreature.templateId,
    uniqueId: huntCreature.id,
    caughtAt: new Date(),
    level: huntCreature.level,
    blockchainMinted: false,
    txHash: undefined,
    catchLocation: undefined,
  } : null);

  const glowScale = useSharedValue(1);

  React.useEffect(() => {
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 2000 }),
        withTiming(1, { duration: 2000 })
      ),
      -1,
      true
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
  }));

  if (!creature || !definition) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ThemedText>Creature not found</ThemedText>
      </View>
    );
  }

  const rarityColor = getRarityColor(definition.rarity);
  const typeColor = getTypeColor(definition.type);

  const handleMint = async () => {
    setMinting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    await mintCreatureNFT(creature.uniqueId);
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setMinting(false);
  };

  const handleCopyTxHash = async () => {
    if (creature.txHash) {
      await Clipboard.setStringAsync(creature.txHash);
      setCopied(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: insets.bottom + Spacing["3xl"] + 60,
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeIn.duration(400)} style={styles.heroSection}>
        <Animated.View style={[styles.heroGlow, { backgroundColor: rarityColor }, glowStyle]} />
        <Image source={CREATURE_IMAGES[creature.id]} style={styles.heroImage} />
        
        <View style={styles.badges}>
          <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
            <ThemedText style={styles.badgeText}>
              {definition.type.charAt(0).toUpperCase() + definition.type.slice(1)}
            </ThemedText>
          </View>
          <View style={[styles.rarityBadgeHero, { backgroundColor: rarityColor }]}>
            <ThemedText style={styles.badgeText}>
              {definition.rarity.charAt(0).toUpperCase() + definition.rarity.slice(1)}
            </ThemedText>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(100).springify()}>
        <ThemedText type="h2" style={styles.creatureName}>
          {definition.name}
        </ThemedText>
        <ThemedText style={styles.levelBadge}>
          Level {creature.level}
        </ThemedText>
        <ThemedText style={styles.description}>
          {definition.description}
        </ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>Stats</ThemedText>
        <View style={styles.statsCard}>
          {isHuntCreature && huntCreature ? (
            <>
              <StatBar label="HP" value={huntCreature.baseHp + huntCreature.ivHp} color="#FF6B6B" delay={300} />
              <StatBar label="Attack" value={huntCreature.baseAtk + huntCreature.ivAtk} color="#FFD93D" delay={400} />
              <StatBar label="Defense" value={huntCreature.baseDef + huntCreature.ivDef} color="#4ECDC4" delay={500} />
              <StatBar label="Speed" value={huntCreature.baseSpd + huntCreature.ivSpd} color="#9B59B6" delay={600} />
            </>
          ) : (
            <>
              <StatBar label="HP" value={definition.baseStats.hp} color="#FF6B6B" delay={300} />
              <StatBar label="Attack" value={definition.baseStats.attack} color="#FFD93D" delay={400} />
              <StatBar label="Defense" value={definition.baseStats.defense} color="#4ECDC4" delay={500} />
              <StatBar label="Speed" value={definition.baseStats.speed} color="#9B59B6" delay={600} />
            </>
          )}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>Blockchain</ThemedText>
        <View style={styles.blockchainCard}>
          {creature.blockchainMinted ? (
            <>
              <View style={styles.mintedBadge}>
                <Feather name="check-circle" size={20} color="#4ECDC4" />
                <ThemedText style={styles.mintedText}>Minted as NFT</ThemedText>
              </View>
              
              <Pressable style={styles.txHashRow} onPress={handleCopyTxHash}>
                <View>
                  <ThemedText style={styles.txLabel}>Transaction Hash</ThemedText>
                  <ThemedText style={styles.txHash}>
                    {truncateHash(creature.txHash || "")}
                  </ThemedText>
                </View>
                <Feather 
                  name={copied ? "check" : "copy"} 
                  size={18} 
                  color={copied ? "#4ECDC4" : GameColors.textSecondary} 
                />
              </Pressable>
            </>
          ) : (
            <View style={styles.notMintedSection}>
              <View style={styles.notMintedIcon}>
                <Feather name="hexagon" size={32} color={GameColors.textSecondary} />
              </View>
              <ThemedText style={styles.notMintedTitle}>
                Not yet on blockchain
              </ThemedText>
              <ThemedText style={styles.notMintedText}>
                Mint this creature as an NFT to prove ownership on the blockchain.
              </ThemedText>
            </View>
          )}
        </View>
      </Animated.View>

      {!isHuntCreature ? (
        <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>Catch Info</ThemedText>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Feather name="calendar" size={18} color={GameColors.textSecondary} />
              <ThemedText style={styles.infoText}>
                Caught on {formatDate(creature.caughtAt)}
              </ThemedText>
            </View>
            {creature.catchLocation ? (
              <View style={styles.infoRow}>
                <Feather name="map-pin" size={18} color={GameColors.textSecondary} />
                <ThemedText style={styles.infoText}>
                  {creature.catchLocation.latitude.toFixed(4)}, {creature.catchLocation.longitude.toFixed(4)}
                </ThemedText>
              </View>
            ) : null}
          </View>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>Creature Info</ThemedText>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Feather name="award" size={18} color={GameColors.textSecondary} />
              <ThemedText style={styles.infoText}>
                {huntCreature?.catchQuality || "Standard"} catch quality
              </ThemedText>
            </View>
            <View style={styles.infoRow}>
              <Feather name="star" size={18} color={huntCreature?.isPerfect ? GameColors.primary : GameColors.textSecondary} />
              <ThemedText style={styles.infoText}>
                {huntCreature?.isPerfect ? "Perfect IVs" : "Standard IVs"}
              </ThemedText>
            </View>
          </View>
        </Animated.View>
      )}

      {!isHuntCreature && !creature.blockchainMinted ? (
        <View style={[styles.mintButtonContainer, { paddingBottom: insets.bottom }]}>
          <Button
            onPress={handleMint}
            disabled={minting}
            style={styles.mintButton}
          >
            {minting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              "Mint as NFT"
            )}
          </Button>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  heroSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  heroGlow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.3,
  },
  heroImage: {
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  badges: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  typeBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  rarityBadgeHero: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  creatureName: {
    textAlign: "center",
    color: GameColors.textPrimary,
  },
  levelBadge: {
    textAlign: "center",
    color: GameColors.textSecondary,
    marginTop: Spacing.xs,
    fontSize: 16,
  },
  description: {
    textAlign: "center",
    color: GameColors.textSecondary,
    marginTop: Spacing.md,
    lineHeight: 22,
  },
  section: {
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    color: GameColors.textPrimary,
    marginBottom: Spacing.md,
  },
  statsCard: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statLabel: {
    width: 70,
    color: GameColors.textSecondary,
    fontSize: 14,
  },
  statBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: GameColors.surfaceLight,
    borderRadius: 4,
    overflow: "hidden",
    marginHorizontal: Spacing.md,
  },
  statBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  statValue: {
    width: 30,
    textAlign: "right",
    color: GameColors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  blockchainCard: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  mintedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  mintedText: {
    color: "#4ECDC4",
    fontWeight: "600",
  },
  txHashRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: GameColors.surfaceLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  txLabel: {
    fontSize: 12,
    color: GameColors.textSecondary,
    marginBottom: 2,
  },
  txHash: {
    fontSize: 14,
    color: GameColors.textPrimary,
    fontFamily: "monospace",
  },
  notMintedSection: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  notMintedIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: GameColors.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  notMintedTitle: {
    color: GameColors.textPrimary,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  notMintedText: {
    color: GameColors.textSecondary,
    textAlign: "center",
    fontSize: 14,
  },
  infoCard: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  infoText: {
    color: GameColors.textSecondary,
    fontSize: 14,
  },
  mintButtonContainer: {
    marginTop: Spacing.xl,
  },
  mintButton: {
    backgroundColor: GameColors.secondary,
  },
});
