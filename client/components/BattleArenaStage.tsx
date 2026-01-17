import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { GameColors, Spacing } from "@/constants/theme";

export function BattleArenaStage({
  playerActive,
  opponentActive,
  finisherReady,
  isLocked,
}: {
  playerActive: any;
  opponentActive: any;
  finisherReady: boolean;
  isLocked: boolean;
}) {
  const playerHpPct = useMemo(() => {
    if (!playerActive) return 0;
    return Math.max(
      0,
      Math.min(1, (playerActive.hp ?? 0) / (playerActive.maxHp ?? 1))
    );
  }, [playerActive]);

  const oppHpPct = useMemo(() => {
    if (!opponentActive) return 0;
    return Math.max(
      0,
      Math.min(1, (opponentActive.hp ?? 0) / (opponentActive.maxHp ?? 1))
    );
  }, [opponentActive]);

  return (
    <View style={styles.stage}>
      <View style={styles.arenaBg} />

      <View style={styles.centerHud}>
        <View style={styles.vsIcon}>
          <Feather name="target" size={44} color={GameColors.gold} />
        </View>

        {finisherReady && (
          <View style={styles.finisherBadge}>
            <Text style={styles.finisherText}>FINISHER READY</Text>
          </View>
        )}

        {isLocked && (
          <View style={styles.waitBadge}>
            <Feather name="lock" size={14} color={GameColors.textTertiary} />
            <Text style={styles.waitText}>Resolving...</Text>
          </View>
        )}
      </View>

      <View style={styles.leftFighter}>
        <View style={styles.portrait}>
          <Text style={styles.portraitName}>{playerActive?.name ?? "—"}</Text>
          <Text style={styles.portraitClass}>
            {playerActive?.class ?? playerActive?.roachyClass ?? ""}
          </Text>
        </View>

        <View style={styles.hpBarOuter}>
          <View style={[styles.hpBarFill, { width: `${playerHpPct * 100}%` }]} />
        </View>

        <Text style={styles.smallStats}>
          ATK {playerActive?.atk ?? "-"} DEF {playerActive?.def ?? "-"} SPD{" "}
          {playerActive?.spd ?? "-"}
        </Text>
      </View>

      <View style={styles.rightFighter}>
        <View style={styles.portrait}>
          <Text style={styles.portraitName}>{opponentActive?.name ?? "—"}</Text>
          <Text style={styles.portraitClass}>
            {opponentActive?.class ?? opponentActive?.roachyClass ?? ""}
          </Text>
        </View>

        <View style={styles.hpBarOuter}>
          <View style={[styles.hpBarFill, { width: `${oppHpPct * 100}%` }]} />
        </View>

        <Text style={styles.smallStats}>
          ATK {opponentActive?.atk ?? "-"} DEF {opponentActive?.def ?? "-"} SPD{" "}
          {opponentActive?.spd ?? "-"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    minWidth: 260,
    marginHorizontal: Spacing.sm,
    borderRadius: 18,
    overflow: "hidden",
    justifyContent: "center",
  },
  arenaBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  centerHud: {
    position: "absolute",
    alignSelf: "center",
    alignItems: "center",
    gap: 8,
  },
  vsIcon: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 2,
    borderColor: "rgba(255,200,80,0.55)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  finisherBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,200,80,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,200,80,0.35)",
  },
  finisherText: {
    color: GameColors.gold,
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  waitBadge: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  waitText: { color: GameColors.textTertiary, fontWeight: "700", fontSize: 12 },

  leftFighter: {
    position: "absolute",
    left: 14,
    alignItems: "flex-start",
  },
  rightFighter: {
    position: "absolute",
    right: 14,
    alignItems: "flex-end",
  },

  portrait: {
    width: 150,
    height: 96,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  portraitName: { color: "white", fontWeight: "900", fontSize: 14 },
  portraitClass: {
    color: "rgba(255,255,255,0.65)",
    fontWeight: "700",
    marginTop: 4,
    fontSize: 12,
  },

  hpBarOuter: {
    width: 150,
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginTop: 8,
    overflow: "hidden",
  },
  hpBarFill: { height: "100%", backgroundColor: "rgba(80,220,130,0.95)" },

  smallStats: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 11,
    marginTop: 6,
    fontWeight: "700",
  },
});

export default BattleArenaStage;
