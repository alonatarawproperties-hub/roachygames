import React, { useState, useEffect, useMemo } from "react";
import { View, StyleSheet, Image, Pressable, Dimensions } from "react-native";
import Svg, { Circle, Line, Defs, LinearGradient as SvgLinearGradient, Stop, Ellipse } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  withSpring,
  withDelay,
  Easing,
  interpolate,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ObsidianBronzeAR, Spacing, BorderRadius, normalizeRarity, getFusionTheme, FusionRarity } from "@/constants/theme";
import { ROACHY_IMAGES } from "@/constants/creatures";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const STAGE_SIZE = Math.min(SCREEN_WIDTH * 0.8, 320);

interface CaughtCreature {
  id: string;
  templateId: string;
  name: string;
  rarity: string;
  creatureClass: string;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
  ivHp: number;
  ivAtk: number;
  ivDef: number;
  ivSpd: number;
  isPerfect: boolean;
}

interface EggRevealProps {
  creature: CaughtCreature;
  catchQuality: "perfect" | "great" | "good";
  onComplete: () => void;
}

const CLASS_ICONS: Record<string, string> = {
  tank: "shield",
  assassin: "zap",
  mage: "star",
  support: "heart",
};

export function EggReveal({ creature, catchQuality, onComplete }: EggRevealProps) {
  const [phase, setPhase] = useState<"wobble" | "crack" | "hatch" | "reveal" | "stats">("wobble");

  const rarity4 = normalizeRarity(creature.rarity);
  const theme = getFusionTheme(rarity4);

  const eggRotate = useSharedValue(0);
  const eggScale = useSharedValue(1);
  const eggY = useSharedValue(0);
  const crackOpacity = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const creatureScale = useSharedValue(0);
  const creatureOpacity = useSharedValue(0);
  const statsOpacity = useSharedValue(0);
  const statsY = useSharedValue(30);

  const ringRotation = useSharedValue(0);
  const ringPulse = useSharedValue(1);
  const scanSweepX = useSharedValue(-SCREEN_WIDTH);
  const haloOpacity = useSharedValue(0.3);
  const shockwaveScale = useSharedValue(1);
  const shockwaveOpacity = useSharedValue(0);
  const shockwave2Scale = useSharedValue(1);
  const shockwave2Opacity = useSharedValue(0);
  const sparkBurstOpacity = useSharedValue(0);
  const arcFlickerOpacity = useSharedValue(0);
  const circuitShimmerX = useSharedValue(-100);
  const emberStreakOpacity = useSharedValue(0);

  const particleCount = rarity4 === 'legendary' ? 16 : rarity4 === 'epic' ? 14 : rarity4 === 'rare' ? 12 : 10;

  useEffect(() => {
    const timings = {
      wobble: rarity4 === "legendary" ? 2200 : rarity4 === "epic" ? 1800 : 1400,
      crack: 800,
      hatch: 600,
      reveal: 1200,
    };

    ringRotation.value = withRepeat(
      withTiming(360, { duration: 11000, easing: Easing.linear }),
      -1,
      false
    );

    ringPulse.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    scanSweepX.value = withRepeat(
      withSequence(
        withTiming(-SCREEN_WIDTH, { duration: 0 }),
        withTiming(SCREEN_WIDTH * 2, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(SCREEN_WIDTH * 2, { duration: 500 })
      ),
      -1,
      false
    );

    eggRotate.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 80 }),
        withTiming(6, { duration: 80 }),
        withTiming(-4, { duration: 60 }),
        withTiming(4, { duration: 60 }),
        withTiming(0, { duration: 50 })
      ),
      -1
    );
    eggY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 120 }),
        withTiming(0, { duration: 120 })
      ),
      -1
    );

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const timer1 = setTimeout(() => {
      setPhase("crack");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      crackOpacity.value = withTiming(1, { duration: 150 });
      eggScale.value = withSequence(
        withTiming(1.12, { duration: 80 }),
        withTiming(1, { duration: 80 }),
        withTiming(1.15, { duration: 80 }),
        withTiming(1, { duration: 80 })
      );
    }, timings.wobble);

    const timer2 = setTimeout(() => {
      setPhase("hatch");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      flashOpacity.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) })
      );
      eggScale.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) });
    }, timings.wobble + timings.crack);

    const timer3 = setTimeout(() => {
      setPhase("reveal");
      
      shockwaveScale.value = withTiming(1.8, { duration: 350, easing: Easing.out(Easing.cubic) });
      shockwaveOpacity.value = withSequence(
        withTiming(0.8, { duration: 80 }),
        withTiming(0, { duration: 270 })
      );

      if (rarity4 === 'rare' || rarity4 === 'epic' || rarity4 === 'legendary') {
        shockwave2Scale.value = withDelay(120, withTiming(2.0, { duration: 400, easing: Easing.out(Easing.cubic) }));
        shockwave2Opacity.value = withDelay(120, withSequence(
          withTiming(0.5, { duration: 60 }),
          withTiming(0, { duration: 340 })
        ));
      }

      sparkBurstOpacity.value = withSequence(
        withDelay(150, withTiming(1, { duration: 80 })),
        withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) })
      );

      if (rarity4 === 'rare') {
        arcFlickerOpacity.value = withSequence(
          withDelay(100, withTiming(0.7, { duration: 50 })),
          withTiming(0, { duration: 150 })
        );
      }

      if (rarity4 === 'epic') {
        circuitShimmerX.value = withDelay(100, withTiming(STAGE_SIZE + 100, { duration: 400, easing: Easing.out(Easing.cubic) }));
      }

      if (rarity4 === 'legendary') {
        emberStreakOpacity.value = withSequence(
          withDelay(50, withTiming(0.8, { duration: 100 })),
          withTiming(0, { duration: 200 })
        );
        haloOpacity.value = withTiming(0.6, { duration: 400 });
      } else if (rarity4 === 'epic') {
        haloOpacity.value = withRepeat(
          withSequence(
            withTiming(0.5, { duration: 1500 }),
            withTiming(0.35, { duration: 1500 })
          ),
          -1,
          true
        );
      } else {
        haloOpacity.value = withTiming(0.4, { duration: 400 });
      }

      creatureScale.value = withSpring(1, { damping: 10, stiffness: 120 });
      creatureOpacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) });
    }, timings.wobble + timings.crack + timings.hatch);

    const timer4 = setTimeout(() => {
      setPhase("stats");
      statsY.value = withSpring(0, { damping: 14, stiffness: 100 });
      statsOpacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
    }, timings.wobble + timings.crack + timings.hatch + timings.reveal);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [rarity4]);

  const eggStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${eggRotate.value}deg` },
      { scale: eggScale.value },
      { translateY: eggY.value },
    ],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const creatureStyle = useAnimatedStyle(() => ({
    transform: [{ scale: creatureScale.value }],
    opacity: creatureOpacity.value,
  }));

  const statsStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: statsY.value }],
    opacity: statsOpacity.value,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ringRotation.value}deg` }, { scale: ringPulse.value }],
  }));

  const scanSweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: scanSweepX.value }],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
  }));

  const shockwaveStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shockwaveScale.value }],
    opacity: shockwaveOpacity.value,
  }));

  const shockwave2Style = useAnimatedStyle(() => ({
    transform: [{ scale: shockwave2Scale.value }],
    opacity: shockwave2Opacity.value,
  }));

  const sparkBurstStyle = useAnimatedStyle(() => ({
    opacity: sparkBurstOpacity.value,
  }));

  const arcFlickerStyle = useAnimatedStyle(() => ({
    opacity: arcFlickerOpacity.value,
  }));

  const circuitShimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: circuitShimmerX.value }],
  }));

  const emberStreakStyle = useAnimatedStyle(() => ({
    opacity: emberStreakOpacity.value,
  }));

  const dustMotes = useMemo(() => 
    Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * SCREEN_WIDTH,
      y: SCREEN_HEIGHT * 0.3 + Math.random() * SCREEN_HEIGHT * 0.4,
      size: 2 + Math.random() * 2,
      speed: 5000 + Math.random() * 4000,
      delay: Math.random() * 2000,
    })),
    [particleCount]
  );

  const sparkPositions = useMemo(() => {
    const count = rarity4 === 'legendary' ? 18 : rarity4 === 'epic' ? 12 : rarity4 === 'rare' ? 8 : 0;
    return Array.from({ length: count }, (_, i) => ({
      angle: (i / count) * 360,
      distance: 40 + Math.random() * 30,
    }));
  }, [rarity4]);

  const creatureImage = ROACHY_IMAGES[creature.templateId];
  const classIcon = CLASS_ICONS[creature.creatureClass] || "star";

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[ObsidianBronzeAR.obsidian, ObsidianBronzeAR.obsidianBrown, '#0A0705']}
        style={StyleSheet.absoluteFill}
        locations={[0, 0.5, 1]}
      />

      <LinearGradient
        colors={['rgba(11,11,13,0.7)', 'transparent', 'transparent', 'rgba(11,11,13,0.8)']}
        locations={[0, 0.2, 0.8, 1]}
        style={StyleSheet.absoluteFill}
      />

      <LinearGradient
        colors={['rgba(11,11,13,0.5)', 'transparent', 'transparent', 'rgba(11,11,13,0.6)']}
        locations={[0, 0.15, 0.85, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.scanSweep, scanSweepStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(176,122,58,0.06)', 'rgba(176,122,58,0.1)', 'rgba(176,122,58,0.06)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.scanSweepGradient}
        />
      </Animated.View>

      {dustMotes.map((mote) => (
        <DustMote key={mote.id} mote={mote} color={ObsidianBronzeAR.amber} />
      ))}

      <View style={styles.stageContainer}>
        <Animated.View style={[styles.haloContainer, haloStyle]}>
          <LinearGradient
            colors={[theme.accentGlow, 'transparent']}
            style={styles.haloGradient}
          />
        </Animated.View>

        <View style={styles.platformEllipse}>
          <Svg width={STAGE_SIZE} height={60}>
            <Defs>
              <SvgLinearGradient id="platformGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor={ObsidianBronzeAR.bronze} stopOpacity="0.3" />
                <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </SvgLinearGradient>
            </Defs>
            <Ellipse
              cx={STAGE_SIZE / 2}
              cy={30}
              rx={STAGE_SIZE / 2 - 10}
              ry={25}
              fill="url(#platformGrad)"
            />
            <Ellipse
              cx={STAGE_SIZE / 2}
              cy={30}
              rx={STAGE_SIZE / 2 - 10}
              ry={25}
              fill="none"
              stroke={ObsidianBronzeAR.bronze}
              strokeWidth={1.5}
              opacity={0.5}
            />
          </Svg>
        </View>

        <Animated.View style={[styles.ringsContainer, ringStyle]}>
          <Svg width={STAGE_SIZE} height={STAGE_SIZE}>
            <Circle
              cx={STAGE_SIZE / 2}
              cy={STAGE_SIZE / 2}
              r={STAGE_SIZE / 2 - 20}
              fill="none"
              stroke={ObsidianBronzeAR.bronze}
              strokeWidth={1}
              strokeDasharray="10 15"
              opacity={0.35}
            />
            <Circle
              cx={STAGE_SIZE / 2}
              cy={STAGE_SIZE / 2}
              r={STAGE_SIZE / 2 - 45}
              fill="none"
              stroke={theme.accentMain}
              strokeWidth={0.8}
              strokeDasharray="6 18"
              opacity={0.3}
            />
            <Circle
              cx={STAGE_SIZE / 2}
              cy={STAGE_SIZE / 2}
              r={STAGE_SIZE / 2 - 70}
              fill="none"
              stroke={ObsidianBronzeAR.bronze}
              strokeWidth={0.6}
              strokeDasharray="4 20"
              opacity={0.25}
            />

            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
              const rad = (angle * Math.PI) / 180;
              const r = STAGE_SIZE / 2 - 20;
              const cx = STAGE_SIZE / 2;
              const cy = STAGE_SIZE / 2;
              const x1 = cx + Math.cos(rad) * (r - 8);
              const y1 = cy + Math.sin(rad) * (r - 8);
              const x2 = cx + Math.cos(rad) * (r + 2);
              const y2 = cy + Math.sin(rad) * (r + 2);
              return (
                <Line
                  key={angle}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={ObsidianBronzeAR.bronze}
                  strokeWidth={1.5}
                  opacity={0.4}
                />
              );
            })}
          </Svg>
        </Animated.View>

        {rarity4 === 'epic' && (
          <Animated.View style={[styles.circuitShimmer, circuitShimmerStyle]}>
            <View style={[styles.circuitLine, { backgroundColor: theme.accentMain }]} />
          </Animated.View>
        )}

        <View style={styles.centerArea}>
          {(phase === "wobble" || phase === "crack") && (
            <Animated.View style={[styles.eggContainer, eggStyle]}>
              <View style={[styles.egg, { shadowColor: theme.accentMain }]}>
                <LinearGradient
                  colors={[theme.accentMain, ObsidianBronzeAR.bronze, '#4A3020']}
                  style={styles.eggGradient}
                  start={{ x: 0.3, y: 0 }}
                  end={{ x: 0.7, y: 1 }}
                />
                <View style={styles.eggHighlight} />
                {phase === "crack" && (
                  <View style={styles.crackLine} />
                )}
              </View>
            </Animated.View>
          )}

          <Animated.View style={[styles.flash, flashStyle]}>
            <LinearGradient
              colors={['transparent', theme.accentGlow, 'transparent']}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          <Animated.View style={[styles.shockwave, shockwaveStyle]}>
            <View style={[styles.shockwaveRing, { borderColor: ObsidianBronzeAR.bronze }]} />
          </Animated.View>

          {(rarity4 === 'rare' || rarity4 === 'epic' || rarity4 === 'legendary') && (
            <Animated.View style={[styles.shockwave2, shockwave2Style]}>
              <View style={[styles.shockwaveRing, { borderColor: theme.accentMain }]} />
            </Animated.View>
          )}

          {rarity4 === 'rare' && (
            <Animated.View style={[styles.arcFlickerContainer, arcFlickerStyle]}>
              {[0, 120, 240].map((angle) => (
                <View
                  key={angle}
                  style={[
                    styles.arcFlicker,
                    {
                      transform: [{ rotate: `${angle}deg` }],
                      backgroundColor: theme.accentMain,
                    },
                  ]}
                />
              ))}
            </Animated.View>
          )}

          {rarity4 === 'legendary' && (
            <Animated.View style={[styles.emberStreaksContainer, emberStreakStyle]}>
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.emberStreak,
                    {
                      left: STAGE_SIZE / 2 - 40 + i * 40,
                      backgroundColor: theme.accentMain,
                    },
                  ]}
                />
              ))}
            </Animated.View>
          )}

          {sparkPositions.length > 0 && (
            <Animated.View style={[styles.sparkBurst, sparkBurstStyle]}>
              {sparkPositions.map((spark, i) => {
                const rad = (spark.angle * Math.PI) / 180;
                const x = Math.cos(rad) * spark.distance;
                const y = Math.sin(rad) * spark.distance;
                const isAccent = i % 3 === 0;
                return (
                  <View
                    key={i}
                    style={[
                      styles.spark,
                      {
                        transform: [{ translateX: x }, { translateY: y }],
                        backgroundColor: isAccent ? theme.accentMain : ObsidianBronzeAR.amber,
                      },
                    ]}
                  />
                );
              })}
            </Animated.View>
          )}

          {(phase === "reveal" || phase === "stats") && (
            <Animated.View style={[styles.creatureContainer, creatureStyle]}>
              <View style={[styles.creatureFrame, { borderColor: theme.accentMain + '60' }]}>
                {creatureImage ? (
                  <Image source={creatureImage} style={styles.creatureImage} resizeMode="contain" />
                ) : (
                  <View style={styles.creaturePlaceholder}>
                    <Feather name={classIcon as any} size={50} color={theme.accentMain} />
                  </View>
                )}
              </View>
            </Animated.View>
          )}
        </View>
      </View>

      {(phase === "reveal" || phase === "stats") && (
        <View style={styles.infoContainer}>
          <View style={[styles.rarityPill, { borderColor: theme.accentMain + '50' }]}>
            <ThemedText style={[styles.rarityText, { color: theme.accentMain }]}>
              {rarity4.toUpperCase()}
            </ThemedText>
          </View>

          {catchQuality === "perfect" && (
            <View style={styles.perfectBanner}>
              <Feather name="star" size={14} color={ObsidianBronzeAR.amber} />
              <ThemedText style={styles.perfectText}>PERFECT CATCH!</ThemedText>
              <Feather name="star" size={14} color={ObsidianBronzeAR.amber} />
            </View>
          )}

          <ThemedText style={styles.creatureName}>{creature.name}</ThemedText>

          <View style={styles.classBadge}>
            <Feather name={classIcon as any} size={14} color={ObsidianBronzeAR.textMuted} />
            <ThemedText style={styles.classText}>{creature.creatureClass}</ThemedText>
          </View>

          {creature.isPerfect && (
            <View style={[styles.ivBanner, { borderColor: theme.accentMain + '40' }]}>
              <ThemedText style={[styles.ivText, { color: theme.accentMain }]}>PERFECT IVs!</ThemedText>
            </View>
          )}
        </View>
      )}

      {phase === "stats" && (
        <Animated.View style={[styles.statsCard, statsStyle]}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Feather name="heart" size={18} color="#EF4444" />
              <ThemedText style={styles.statValue}>{creature.baseHp + creature.ivHp}</ThemedText>
              <ThemedText style={styles.statLabel}>HP</ThemedText>
            </View>
            <View style={styles.statItem}>
              <Feather name="zap" size={18} color="#F59E0B" />
              <ThemedText style={styles.statValue}>{creature.baseAtk + creature.ivAtk}</ThemedText>
              <ThemedText style={styles.statLabel}>ATK</ThemedText>
            </View>
            <View style={styles.statItem}>
              <Feather name="shield" size={18} color="#3B82F6" />
              <ThemedText style={styles.statValue}>{creature.baseDef + creature.ivDef}</ThemedText>
              <ThemedText style={styles.statLabel}>DEF</ThemedText>
            </View>
            <View style={styles.statItem}>
              <Feather name="wind" size={18} color="#22C55E" />
              <ThemedText style={styles.statValue}>{creature.baseSpd + creature.ivSpd}</ThemedText>
              <ThemedText style={styles.statLabel}>SPD</ThemedText>
            </View>
          </View>

          <Pressable style={styles.continueButton} onPress={onComplete}>
            <LinearGradient
              colors={[ObsidianBronzeAR.bronze, '#8A5A2A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueGradient}
            >
              <ThemedText style={styles.continueText}>Awesome!</ThemedText>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

function DustMote({ mote, color }: { mote: { x: number; y: number; size: number; speed: number; delay: number }; color: string }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(mote.delay, withRepeat(
      withTiming(-50, { duration: mote.speed, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    ));

    opacity.value = withDelay(mote.delay, withRepeat(
      withSequence(
        withTiming(0.4, { duration: mote.speed * 0.2 }),
        withTiming(0.3, { duration: mote.speed * 0.6 }),
        withTiming(0, { duration: mote.speed * 0.2 })
      ),
      -1,
      false
    ));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.dustMote,
        {
          left: mote.x,
          top: mote.y,
          width: mote.size,
          height: mote.size,
          borderRadius: mote.size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ObsidianBronzeAR.obsidian,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanSweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 100,
  },
  scanSweepGradient: {
    flex: 1,
  },
  dustMote: {
    position: 'absolute',
  },
  stageContainer: {
    width: STAGE_SIZE,
    height: STAGE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -SCREEN_HEIGHT * 0.08,
  },
  haloContainer: {
    position: 'absolute',
    width: STAGE_SIZE * 1.3,
    height: STAGE_SIZE * 1.3,
    borderRadius: STAGE_SIZE * 0.65,
    overflow: 'hidden',
  },
  haloGradient: {
    flex: 1,
    borderRadius: STAGE_SIZE * 0.65,
  },
  platformEllipse: {
    position: 'absolute',
    bottom: -10,
  },
  ringsContainer: {
    position: 'absolute',
    width: STAGE_SIZE,
    height: STAGE_SIZE,
  },
  circuitShimmer: {
    position: 'absolute',
    width: 3,
    height: STAGE_SIZE,
    overflow: 'hidden',
  },
  circuitLine: {
    width: 2,
    height: '100%',
    opacity: 0.3,
  },
  centerArea: {
    width: STAGE_SIZE,
    height: STAGE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eggContainer: {
    alignItems: 'center',
  },
  egg: {
    width: 100,
    height: 130,
    borderRadius: 50,
    borderBottomLeftRadius: 42,
    borderBottomRightRadius: 42,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 25,
    elevation: 10,
  },
  eggGradient: {
    flex: 1,
  },
  eggHighlight: {
    position: 'absolute',
    top: 18,
    left: 22,
    width: 35,
    height: 22,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  crackLine: {
    position: 'absolute',
    top: '30%',
    left: '45%',
    width: 3,
    height: '40%',
    backgroundColor: 'rgba(255,255,255,0.7)',
    transform: [{ rotate: '12deg' }],
  },
  flash: {
    position: 'absolute',
    width: STAGE_SIZE,
    height: STAGE_SIZE,
    borderRadius: STAGE_SIZE / 2,
    overflow: 'hidden',
  },
  shockwave: {
    position: 'absolute',
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shockwave2: {
    position: 'absolute',
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shockwaveRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
  },
  arcFlickerContainer: {
    position: 'absolute',
    width: STAGE_SIZE,
    height: STAGE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arcFlicker: {
    position: 'absolute',
    width: 3,
    height: 20,
    borderRadius: 1.5,
    top: 30,
  },
  emberStreaksContainer: {
    position: 'absolute',
    width: STAGE_SIZE,
    height: STAGE_SIZE,
  },
  emberStreak: {
    position: 'absolute',
    width: 3,
    height: 40,
    borderRadius: 1.5,
    bottom: STAGE_SIZE / 2 + 20,
  },
  sparkBurst: {
    position: 'absolute',
    width: 0,
    height: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spark: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  creatureContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatureFrame: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: ObsidianBronzeAR.smokedGlassStrong,
  },
  creatureImage: {
    width: '100%',
    height: '100%',
  },
  creaturePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.28,
    alignItems: 'center',
  },
  rarityPill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: ObsidianBronzeAR.smokedGlassStrong,
    marginBottom: Spacing.sm,
  },
  rarityText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
  },
  perfectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  perfectText: {
    fontSize: 14,
    fontWeight: '700',
    color: ObsidianBronzeAR.amber,
    letterSpacing: 1,
  },
  creatureName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: Spacing.xs,
  },
  classBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  classText: {
    fontSize: 14,
    color: ObsidianBronzeAR.textMuted,
    textTransform: 'capitalize',
  },
  ivBanner: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: ObsidianBronzeAR.smokedGlass,
  },
  ivText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statsCard: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.08,
    backgroundColor: ObsidianBronzeAR.smokedGlassStrong,
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(176,122,58,0.25)',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: 11,
    color: ObsidianBronzeAR.textMuted,
    fontWeight: '600',
  },
  continueButton: {
    borderRadius: 24,
    overflow: 'hidden',
    ...ObsidianBronzeAR.shadows.soft,
  },
  continueGradient: {
    paddingHorizontal: Spacing.xl * 2,
    paddingVertical: Spacing.md,
  },
  continueText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
