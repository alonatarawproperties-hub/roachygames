import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";

type RoachyClass = "TANK" | "ASSASSIN" | "MAGE" | "SUPPORT";

interface BattleRoachy {
  id: string;
  name: string;
  class: RoachyClass;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  isAlive: boolean;
}

interface RoachyFighterProps {
  side: "left" | "right";
  roachy: BattleRoachy | null;
  isActive?: boolean;
  hpDeltaTriggerKey?: number;
}

const CLASS_COLORS: Record<RoachyClass, string> = {
  TANK: "#4CAF50",
  ASSASSIN: "#E53935",
  MAGE: "#9C27B0",
  SUPPORT: "#00BCD4",
};

export function RoachyFighter({ side, roachy, isActive, hpDeltaTriggerKey }: RoachyFighterProps) {
  const bobAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const hpWidthAnim = useRef(new Animated.Value(roachy ? (roachy.hp / roachy.maxHp) * 100 : 0)).current;
  const prevHp = useRef(roachy?.hp ?? 0);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, {
          toValue: -6,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(bobAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [bobAnim]);

  useEffect(() => {
    if (!roachy) return;
    
    const hpPercent = (roachy.hp / roachy.maxHp) * 100;
    Animated.timing(hpWidthAnim, {
      toValue: hpPercent,
      duration: 400,
      useNativeDriver: false,
    }).start();

    if (roachy.hp < prevHp.current) {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(flashOpacity, { toValue: 0.5, duration: 100, useNativeDriver: true }),
          Animated.timing(flashOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
      ]).start();
    }
    
    prevHp.current = roachy.hp;
  }, [roachy?.hp, hpDeltaTriggerKey, hpWidthAnim, shakeAnim, flashOpacity, roachy]);

  if (!roachy) {
    return <View style={styles.placeholder} />;
  }

  const classColor = CLASS_COLORS[roachy.class] || GameColors.primary;
  const monogram = roachy.name.charAt(0).toUpperCase();

  return (
    <Animated.View
      style={[
        styles.container,
        side === "right" && styles.containerRight,
        {
          transform: [
            { translateY: bobAnim },
            { translateX: shakeAnim },
          ],
        },
      ]}
    >
      <View style={styles.hpBarContainer}>
        <Animated.View
          style={[
            styles.hpBarFill,
            {
              width: hpWidthAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ["0%", "100%"],
              }),
              backgroundColor: roachy.hp > roachy.maxHp * 0.3 ? "#4CAF50" : "#E53935",
            },
          ]}
        />
        <Text style={styles.hpText}>
          {roachy.hp}/{roachy.maxHp}
        </Text>
      </View>

      <View style={[styles.portrait, { borderColor: classColor }]}>
        <Text style={[styles.monogram, { color: classColor }]}>{monogram}</Text>
        <Animated.View style={[styles.hitFlash, { opacity: flashOpacity }]} />
        {!roachy.isAlive && (
          <View style={styles.koOverlay}>
            <Text style={styles.koText}>KO</Text>
          </View>
        )}
      </View>

      <Text style={styles.nameText} numberOfLines={1}>{roachy.name}</Text>
      
      <View style={styles.statsRow}>
        <Text style={styles.statText}>ATK {roachy.atk}</Text>
        <Text style={styles.statDivider}>|</Text>
        <Text style={styles.statText}>DEF {roachy.def}</Text>
        <Text style={styles.statDivider}>|</Text>
        <Text style={styles.statText}>SPD {roachy.spd}</Text>
      </View>

      <View style={styles.statusRow}>
        <View style={[styles.statusChip, { backgroundColor: roachy.isAlive ? "rgba(76,175,80,0.2)" : "rgba(229,57,53,0.2)" }]}>
          <Text style={[styles.statusText, { color: roachy.isAlive ? "#4CAF50" : "#E53935" }]}>
            {roachy.isAlive ? "ALIVE" : "KO"}
          </Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: `${classColor}20` }]}>
          <Text style={[styles.statusText, { color: classColor }]}>{roachy.class}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: 140,
  },
  containerRight: {
    transform: [{ scaleX: -1 }],
  },
  placeholder: {
    width: 140,
    height: 180,
  },
  hpBarContainer: {
    width: 120,
    height: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 7,
    overflow: "hidden",
    marginBottom: Spacing.xs,
    justifyContent: "center",
  },
  hpBarFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 7,
  },
  hpText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  portrait: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  monogram: {
    fontSize: 48,
    fontWeight: "900",
  },
  hitFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#E53935",
  },
  koOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  koText: {
    color: "#E53935",
    fontSize: 28,
    fontWeight: "900",
  },
  nameText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginTop: Spacing.xs,
    textAlign: "center",
    maxWidth: 120,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  statText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    fontWeight: "600",
  },
  statDivider: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 10,
  },
  statusRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});

export default RoachyFighter;
