import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  Alert,
  Animated,
  Platform,
  Dimensions,
} from "react-native";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import * as ScreenOrientation from "expo-screen-orientation";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl, apiRequest, queryClient } from "@/lib/query-client";
import { useAuth } from "@/context/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type RoachyClass = "TANK" | "ASSASSIN" | "MAGE" | "SUPPORT";
type SkillType = "GUARD" | "PIERCE" | "BURST" | "FOCUS";

interface Skill {
  id: string;
  name: string;
  type: SkillType;
  multiplier: number;
  cooldown: number;
  currentCooldown?: number;
}

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
  skillA: Skill;
  skillB: Skill;
  cooldowns: { skillA: number; skillB: number };
}

interface PlayerState {
  playerId: string;
  team: BattleRoachy[];
  momentum: number;
  knockouts: number;
  isBot: boolean;
}

interface MatchState {
  matchId: string;
  turn: number;
  maxTurns: number;
  phase: "SELECTION" | "RESOLUTION" | "FINISHED";
  player: PlayerState;
  opponent: PlayerState;
  turnTimeLeft: number;
  winner?: string;
  winReason?: string;
  lastTurnEvents?: TurnEvent[];
}

interface TurnEvent {
  type: "DAMAGE" | "HEAL" | "KO" | "COUNTER" | "MOMENTUM";
  source: string;
  target: string;
  value: number;
  counterType?: "ARMOR_BREAK" | "MITIGATE" | "TEMPO";
}

interface RoachyAction {
  roachyId: string;
  actionType: "BASIC_ATTACK" | "SKILL_A" | "SKILL_B" | "GUARD" | "FOCUS" | "FINISHER";
  targetId?: string;
}

type RouteParams = {
  BattleMatch: {
    matchId: string;
    team?: string[];
  };
};

type RawMatchResponse = { success: boolean; match: RawMatch };

type RawMatch = {
  matchId: string;
  status: "team_select" | "active" | "completed";
  currentTurn: number;
  player1: RawPlayerState;
  player2: RawPlayerState;
  maxTurns?: number;
  turnTimeLeft?: number;
  winner?: string;
  winReason?: string;
  isAgainstBot?: boolean;
};

type RawPlayerState = {
  playerId: string;
  momentum: number;
  kos: number;
  team: any[];
  activeIndex: number;
  teamSubmitted?: boolean;
};

function normalizePhase(status: RawMatch["status"]): MatchState["phase"] {
  if (status === "team_select") return "SELECTION";
  if (status === "active") return "SELECTION";
  return "FINISHED";
}

function normalizeRoachy(raw: any): BattleRoachy {
  const stats = raw?.stats ?? raw ?? {};
  const maxHp = stats.maxHp ?? stats.hpMax ?? stats.max_hp ?? stats.hp ?? 100;
  const hp = raw?.hp ?? stats.hp ?? stats.currentHp ?? maxHp;

  const isKO = raw?.isKO ?? raw?.ko ?? raw?.is_ko ?? false;
  const isAlive = raw?.isAlive ?? !isKO;

  return {
    id: raw?.id ?? raw?.roachyId ?? raw?.tokenId ?? "",
    name: raw?.name ?? "Roachy",
    class: raw?.class ?? raw?.roachyClass ?? "TANK",
    hp,
    maxHp,
    atk: raw?.atk ?? stats.atk ?? stats.attack ?? 10,
    def: raw?.def ?? stats.def ?? stats.defense ?? 5,
    spd: raw?.spd ?? stats.spd ?? stats.speed ?? 10,
    isAlive,
    skillA: raw?.skillA ?? { id: "skillA", name: "Skill A", type: "BURST", multiplier: 1.2, cooldown: 2 },
    skillB: raw?.skillB ?? { id: "skillB", name: "Skill B", type: "GUARD", multiplier: 1.0, cooldown: 3 },
    cooldowns: raw?.cooldowns ?? { skillA: 0, skillB: 0 },
  };
}

function normalizePlayer(raw: RawPlayerState, isBot: boolean = false): PlayerState {
  return {
    playerId: raw?.playerId ?? "",
    momentum: raw?.momentum ?? 0,
    knockouts: raw?.kos ?? 0,
    isBot,
    team: (raw?.team ?? []).map(normalizeRoachy),
  };
}

function normalizeMatch(raw: RawMatch, playerId: string): MatchState {
  const isPlayer1 = raw.player1?.playerId === playerId;
  return {
    matchId: raw.matchId,
    phase: normalizePhase(raw.status),
    turn: raw.currentTurn ?? 1,
    maxTurns: raw.maxTurns ?? 8,
    turnTimeLeft: raw.turnTimeLeft ?? 10,
    player: normalizePlayer(isPlayer1 ? raw.player1 : raw.player2, false),
    opponent: normalizePlayer(isPlayer1 ? raw.player2 : raw.player1, raw.isAgainstBot ?? false),
    winner: raw.winner,
    winReason: raw.winReason,
  };
}

const TURN_TIME_SECONDS = 10;
const MAX_MOMENTUM = 100;
const SKILL_A_COOLDOWN = 2;
const SKILL_B_COOLDOWN = 3;

const CLASS_COLORS: Record<RoachyClass, string> = {
  TANK: "#22C55E",
  ASSASSIN: "#EF4444",
  MAGE: "#A855F7",
  SUPPORT: "#06B6D4",
};

const SKILL_TYPE_COLORS: Record<SkillType, string> = {
  BURST: "#EF4444",
  GUARD: "#22C55E",
  PIERCE: "#3B82F6",
  FOCUS: "#A855F7",
};

const CLASS_ICONS: Record<RoachyClass, keyof typeof Feather.glyphMap> = {
  TANK: "shield",
  ASSASSIN: "zap",
  MAGE: "star",
  SUPPORT: "heart",
};

export function BattleMatchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<RouteParams, "BattleMatch">>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { matchId } = route.params;
  const playerId = user?.id || user?.googleId || "";

  const [timeLeft, setTimeLeft] = useState(TURN_TIME_SECONDS);
  const [selectedRoachyIndex, setSelectedRoachyIndex] = useState(0);
  const [selectedTargetIndex, setSelectedTargetIndex] = useState(0);
  const [actions, setActions] = useState<Map<string, RoachyAction>>(new Map());
  const [showPerfectRead, setShowPerfectRead] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const perfectReadAnim = useRef(new Animated.Value(0)).current;
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useFocusEffect(
    useCallback(() => {
      const lockLandscape = async () => {
        try {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        } catch (error) {
          console.warn("[BattleMatch] Failed to lock landscape:", error);
        }
      };

      lockLandscape();

      return () => {
        const restorePortrait = async () => {
          try {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
          } catch (error) {
            console.warn("[BattleMatch] Failed to restore portrait:", error);
          }
        };
        restorePortrait();
      };
    }, [])
  );

  const { data: matchState, refetch: refetchMatch, isLoading, error } = useQuery<MatchState>({
    queryKey: ["/api/battles/match", matchId],
    enabled: !!matchId && !!playerId,
    refetchInterval: false,
    staleTime: 0,
    queryFn: async () => {
      const url = new URL(`/api/battles/match/${matchId}`, getApiUrl());
      url.searchParams.set("playerId", playerId);
      const res = await fetch(url.toString());
      const json = (await res.json()) as RawMatchResponse;
      if (!json?.success || !json?.match) {
        throw new Error("Invalid match response");
      }
      return normalizeMatch(json.match, playerId);
    },
  });

  useEffect(() => {
    if (!matchId) return;

    pollInterval.current = setInterval(() => {
      refetchMatch();
    }, 2000);

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [matchId, refetchMatch]);

  useEffect(() => {
    if (matchState?.phase === "FINISHED") {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
      
      const isVictory = matchState.winner === playerId;
      // TODO: These values should come from the API response once updated
      const rankDelta = isVictory ? 25 : -15;
      const xpGained = 150;
      const warmthGained = isVictory ? 50 : 0;
      
      navigation.replace("BattleResult", {
        matchId,
        result: isVictory ? "win" : "lose",
        rankDelta,
        xpGained,
        warmthGained,
        // dailyBonusProgress: Optional, would be fetched from user stats if available
      });
    }
  }, [matchState?.phase, matchState?.winner, navigation, matchId, playerId]);

  useEffect(() => {
    if (matchState?.lastTurnEvents) {
      const counterEvent = matchState.lastTurnEvents.find(
        (e) => e.type === "COUNTER" && e.counterType
      );
      if (counterEvent) {
        setShowPerfectRead(counterEvent.counterType || null);
        Animated.sequence([
          Animated.timing(perfectReadAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.delay(1500),
          Animated.timing(perfectReadAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => setShowPerfectRead(null));
      }
    }
  }, [matchState?.lastTurnEvents]);

  useEffect(() => {
    if (matchState?.phase === "SELECTION" && !isLocked) {
      setTimeLeft(TURN_TIME_SECONDS);
      timerInterval.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleAutoSubmit();
            return TURN_TIME_SECONDS;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, [matchState?.phase, matchState?.turn, isLocked]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const submitTurnMutation = useMutation({
    mutationFn: async (turnActions: RoachyAction[]) => {
      const response = await apiRequest("POST", "/api/battles/match/submit-turn", {
        matchId,
        playerId,
        actions: turnActions,
      });
      return response.json();
    },
    onSuccess: () => {
      setIsLocked(false);
      setActions(new Map());
      refetchMatch();
    },
    onError: (error) => {
      console.error("[BattleMatch] Failed to submit turn:", error);
      setIsLocked(false);
      Alert.alert("Error", "Failed to submit turn. Please try again.");
    },
  });

  const handleAutoSubmit = useCallback(() => {
    if (!matchState || isLocked) return;

    const autoActions: RoachyAction[] = matchState.player.team
      .filter((r) => r.isAlive)
      .map((roachy) => {
        const existingAction = actions.get(roachy.id);
        if (existingAction) return existingAction;

        const aliveEnemies = matchState.opponent.team.filter((e) => e.isAlive);
        return {
          roachyId: roachy.id,
          actionType: "BASIC_ATTACK" as const,
          targetId: aliveEnemies[0]?.id,
        };
      });

    setIsLocked(true);
    submitTurnMutation.mutate(autoActions);
  }, [matchState, actions, isLocked, submitTurnMutation]);

  const handleLockIn = () => {
    if (!matchState) return;

    const aliveRoachies = matchState.player.team.filter((r) => r.isAlive);
    const missingActions = aliveRoachies.filter((r) => !actions.has(r.id));

    if (missingActions.length > 0) {
      Alert.alert(
        "Missing Actions",
        `You still need to select actions for: ${missingActions.map((r) => r.name).join(", ")}`
      );
      return;
    }

    const turnActions = Array.from(actions.values());
    setIsLocked(true);
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }
    submitTurnMutation.mutate(turnActions);
  };

  const handleActionSelect = (actionType: RoachyAction["actionType"]) => {
    if (!matchState || isLocked) return;

    const selectedRoachy = matchState.player.team[selectedRoachyIndex];
    if (!selectedRoachy || !selectedRoachy.isAlive) return;

    if (actionType === "SKILL_A" && selectedRoachy.cooldowns.skillA > 0) {
      Alert.alert("On Cooldown", `${selectedRoachy.skillA.name} is on cooldown for ${selectedRoachy.cooldowns.skillA} more turns.`);
      return;
    }
    if (actionType === "SKILL_B" && selectedRoachy.cooldowns.skillB > 0) {
      Alert.alert("On Cooldown", `${selectedRoachy.skillB.name} is on cooldown for ${selectedRoachy.cooldowns.skillB} more turns.`);
      return;
    }

    if (actionType === "FINISHER" && matchState.player.momentum < MAX_MOMENTUM) {
      Alert.alert("Not Ready", "You need 100 momentum to use Finisher!");
      return;
    }

    const aliveEnemies = matchState.opponent.team.filter((e) => e.isAlive);
    const targetId = actionType === "FINISHER" ? undefined : aliveEnemies[selectedTargetIndex]?.id;

    const newAction: RoachyAction = {
      roachyId: selectedRoachy.id,
      actionType,
      targetId,
    };

    setActions((prev) => {
      const updated = new Map(prev);
      updated.set(selectedRoachy.id, newAction);
      return updated;
    });
  };

  const handleForfeit = () => {
    Alert.alert(
      "Forfeit Match",
      "Are you sure you want to forfeit? This will count as a loss.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Forfeit",
          style: "destructive",
          onPress: async () => {
            try {
              await apiRequest("POST", "/api/battles/match/forfeit", {
                matchId,
                playerId,
              });
              navigation.replace("BattlesHome");
            } catch (error) {
              console.error("[BattleMatch] Forfeit failed:", error);
              navigation.replace("BattlesHome");
            }
          },
        },
      ]
    );
  };

  const renderHPBar = (hp: number, maxHp: number, color: string) => {
    const percentage = Math.max(0, Math.min(100, (hp / maxHp) * 100));
    const barColor = percentage > 50 ? "#22C55E" : percentage > 25 ? "#F59E0B" : "#EF4444";

    return (
      <View style={styles.hpBarContainer}>
        <View style={styles.hpBarBackground}>
          <View
            style={[styles.hpBarFill, { width: `${percentage}%`, backgroundColor: barColor }]}
          />
        </View>
        <Text style={styles.hpText}>{Math.round(percentage)}%</Text>
      </View>
    );
  };

  const renderMomentumBar = (momentum: number, isPlayer: boolean) => {
    const percentage = Math.min(100, (momentum / MAX_MOMENTUM) * 100);
    const isReady = momentum >= MAX_MOMENTUM;

    return (
      <View style={styles.momentumContainer}>
        <Text style={styles.momentumLabel}>{isPlayer ? "YOUR" : "ENEMY"} MOMENTUM</Text>
        <View style={styles.momentumBarBg}>
          <Animated.View
            style={[
              styles.momentumBarFill,
              {
                width: `${percentage}%`,
                backgroundColor: isReady ? GameColors.gold : GameColors.primary,
                transform: isReady ? [{ scale: pulseAnim }] : [],
              },
            ]}
          />
        </View>
        <Text style={[styles.momentumValue, isReady && styles.momentumReady]}>{momentum}%</Text>
      </View>
    );
  };

  const renderRoachyCard = (
    roachy: BattleRoachy,
    index: number,
    isPlayer: boolean,
    isSelected: boolean,
    onPress: () => void
  ) => {
    const hasAction = actions.has(roachy.id);
    const classColor = CLASS_COLORS[roachy.class];

    return (
      <Pressable
        key={roachy.id}
        style={[
          styles.roachyCard,
          isSelected && styles.roachyCardSelected,
          !roachy.isAlive && styles.roachyCardKO,
          { borderColor: isSelected ? GameColors.gold : classColor },
        ]}
        onPress={onPress}
        disabled={!roachy.isAlive}
      >
        {!roachy.isAlive && (
          <View style={styles.koOverlay}>
            <Text style={styles.koText}>KO</Text>
          </View>
        )}
        <View style={styles.roachyCardHeader}>
          <View style={[styles.classIcon, { backgroundColor: classColor }]}>
            <Feather name={CLASS_ICONS[roachy.class]} size={14} color="#FFFFFF" />
          </View>
          <Text style={styles.roachyName} numberOfLines={1}>{roachy.name}</Text>
          {hasAction && isPlayer && (
            <Feather name="check-circle" size={14} color={GameColors.success} />
          )}
        </View>
        {renderHPBar(roachy.hp, roachy.maxHp, classColor)}
        <View style={styles.statsRow}>
          <Text style={styles.statText}>ATK {roachy.atk}</Text>
          <Text style={styles.statText}>DEF {roachy.def}</Text>
        </View>
      </Pressable>
    );
  };

  const renderActionButton = (
    label: string,
    actionType: RoachyAction["actionType"],
    skillType?: SkillType,
    cooldown?: number,
    disabled?: boolean
  ) => {
    const selectedRoachy = matchState?.player.team[selectedRoachyIndex];
    const currentAction = selectedRoachy ? actions.get(selectedRoachy.id) : null;
    const isSelected = currentAction?.actionType === actionType;
    const isOnCooldown = cooldown !== undefined && cooldown > 0;
    const isDisabled = disabled || isOnCooldown || isLocked || !selectedRoachy?.isAlive;

    return (
      <Pressable
        style={[
          styles.actionButton,
          isSelected && styles.actionButtonSelected,
          isDisabled && styles.actionButtonDisabled,
          skillType && { borderColor: SKILL_TYPE_COLORS[skillType] },
        ]}
        onPress={() => handleActionSelect(actionType)}
        disabled={isDisabled}
      >
        <Text
          style={[
            styles.actionButtonText,
            isSelected && styles.actionButtonTextSelected,
            isDisabled && styles.actionButtonTextDisabled,
          ]}
        >
          {label}
        </Text>
        {skillType && (
          <View style={[styles.skillTag, { backgroundColor: SKILL_TYPE_COLORS[skillType] }]}>
            <Text style={styles.skillTagText}>{skillType}</Text>
          </View>
        )}
        {isOnCooldown && (
          <View style={styles.cooldownOverlay}>
            <Text style={styles.cooldownText}>{cooldown}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  if (isLoading || !matchState) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <Feather name="loader" size={48} color={GameColors.primary} />
        <ThemedText type="h4" style={styles.loadingText}>Loading Battle...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <Feather name="alert-circle" size={48} color={GameColors.error} />
        <ThemedText type="h4" style={styles.errorText}>Failed to load match</ThemedText>
        <Pressable style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </Pressable>
      </ThemedView>
    );
  }

  const selectedRoachy = matchState.player.team[selectedRoachyIndex];
  const alivePlayerRoachies = matchState.player.team.filter((r) => r.isAlive);
  const aliveEnemyRoachies = matchState.opponent.team.filter((r) => r.isAlive);
  const allActionsSelected = alivePlayerRoachies.every((r) => actions.has(r.id));
  const finisherReady = matchState.player.momentum >= MAX_MOMENTUM;

  return (
    <View style={[styles.container, { paddingLeft: insets.left, paddingRight: insets.right }]}>
      {showPerfectRead && (
        <Animated.View style={[styles.perfectReadPopup, { opacity: perfectReadAnim }]}>
          <Text style={styles.perfectReadText}>PERFECT READ!</Text>
          <Text style={styles.perfectReadSubtext}>{showPerfectRead}</Text>
        </Animated.View>
      )}

      <View style={styles.topBar}>
        <Pressable style={styles.forfeitButton} onPress={handleForfeit}>
          <Feather name="flag" size={16} color={GameColors.error} />
          <Text style={styles.forfeitText}>Forfeit</Text>
        </Pressable>

        <View style={styles.turnInfo}>
          <Text style={styles.turnText}>Turn {matchState.turn}/{matchState.maxTurns}</Text>
          <View style={styles.timerContainer}>
            <Feather name="clock" size={16} color={timeLeft <= 3 ? GameColors.error : GameColors.textPrimary} />
            <Text style={[styles.timerText, timeLeft <= 3 && styles.timerCritical]}>{timeLeft}s</Text>
          </View>
        </View>

        <View style={styles.scoreBoard}>
          <Text style={styles.scoreText}>
            <Text style={styles.scoreYou}>{matchState.player.knockouts}</Text>
            {" - "}
            <Text style={styles.scoreEnemy}>{matchState.opponent.knockouts}</Text>
          </Text>
          <Text style={styles.scoreLabel}>KOs (First to 2)</Text>
        </View>
      </View>

      <View style={styles.momentumRow}>
        {renderMomentumBar(matchState.player.momentum, true)}
        {renderMomentumBar(matchState.opponent.momentum, false)}
      </View>

      <View style={styles.battleArea}>
        <View style={styles.playerSide}>
          <Text style={styles.sideLabel}>YOUR TEAM</Text>
          <View style={styles.roachyList}>
            {matchState.player.team.map((roachy, index) =>
              renderRoachyCard(
                roachy,
                index,
                true,
                index === selectedRoachyIndex,
                () => setSelectedRoachyIndex(index)
              )
            )}
          </View>

          {selectedRoachy && selectedRoachy.isAlive && (
            <View style={styles.actionsPanel}>
              <Text style={styles.actionLabel}>Actions for {selectedRoachy.name}</Text>
              <View style={styles.actionButtons}>
                {renderActionButton("Basic Attack", "BASIC_ATTACK", "PIERCE")}
                {renderActionButton(
                  selectedRoachy.skillA.name,
                  "SKILL_A",
                  selectedRoachy.skillA.type,
                  selectedRoachy.cooldowns.skillA
                )}
                {renderActionButton(
                  selectedRoachy.skillB.name,
                  "SKILL_B",
                  selectedRoachy.skillB.type,
                  selectedRoachy.cooldowns.skillB
                )}
                {renderActionButton("Guard", "GUARD", "GUARD")}
                {renderActionButton("Focus", "FOCUS", "FOCUS")}
                {finisherReady && renderActionButton("FINISHER", "FINISHER", "BURST")}
              </View>
            </View>
          )}
        </View>

        <View style={styles.arenaCenter}>
          <View style={styles.arenaIcon}>
            <Feather name="target" size={48} color={GameColors.gold} />
          </View>
          {finisherReady && (
            <Animated.View style={[styles.finisherBadge, { transform: [{ scale: pulseAnim }] }]}>
              <Text style={styles.finisherBadgeText}>FINISHER READY!</Text>
            </Animated.View>
          )}
          {isLocked && (
            <View style={styles.lockedBadge}>
              <Feather name="lock" size={20} color={GameColors.textPrimary} />
              <Text style={styles.lockedText}>Waiting...</Text>
            </View>
          )}
        </View>

        <View style={styles.enemySide}>
          <Text style={styles.sideLabel}>
            {matchState.opponent.isBot ? "BOT" : "ENEMY"} TEAM
          </Text>
          <View style={styles.roachyList}>
            {matchState.opponent.team.map((roachy, index) =>
              renderRoachyCard(
                roachy,
                index,
                false,
                index === selectedTargetIndex && roachy.isAlive,
                () => {
                  if (roachy.isAlive) setSelectedTargetIndex(index);
                }
              )
            )}
          </View>
          <Text style={styles.targetHint}>Tap to select target</Text>
        </View>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
        <View style={styles.actionsSummary}>
          <Text style={styles.summaryText}>
            {actions.size}/{alivePlayerRoachies.length} Actions Selected
          </Text>
        </View>
        <Pressable
          style={[
            styles.lockInButton,
            (!allActionsSelected || isLocked) && styles.lockInButtonDisabled,
          ]}
          onPress={handleLockIn}
          disabled={!allActionsSelected || isLocked || submitTurnMutation.isPending}
        >
          {submitTurnMutation.isPending ? (
            <Feather name="loader" size={20} color={GameColors.background} />
          ) : (
            <Feather name="check" size={20} color={GameColors.background} />
          )}
          <Text style={styles.lockInText}>
            {isLocked ? "Locked" : "Lock In"}
          </Text>
        </Pressable>
      </View>
    </View>
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
    gap: Spacing.lg,
  },
  loadingText: {
    color: GameColors.textPrimary,
  },
  errorText: {
    color: GameColors.error,
  },
  retryButton: {
    backgroundColor: GameColors.surface,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: GameColors.textPrimary,
    fontWeight: "600",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: GameColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: GameColors.surfaceElevated,
  },
  forfeitButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: GameColors.surfaceElevated,
    borderRadius: BorderRadius.sm,
  },
  forfeitText: {
    color: GameColors.error,
    fontSize: 12,
    fontWeight: "600",
  },
  turnInfo: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  turnText: {
    color: GameColors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  timerText: {
    color: GameColors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  timerCritical: {
    color: GameColors.error,
  },
  scoreBoard: {
    alignItems: "center",
  },
  scoreText: {
    fontSize: 20,
    fontWeight: "700",
  },
  scoreYou: {
    color: GameColors.success,
  },
  scoreEnemy: {
    color: GameColors.error,
  },
  scoreLabel: {
    color: GameColors.textSecondary,
    fontSize: 10,
  },
  momentumRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: GameColors.surfaceElevated,
  },
  momentumContainer: {
    flex: 1,
    marginHorizontal: Spacing.sm,
  },
  momentumLabel: {
    color: GameColors.textSecondary,
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 2,
  },
  momentumBarBg: {
    height: 8,
    backgroundColor: GameColors.surface,
    borderRadius: 4,
    overflow: "hidden",
  },
  momentumBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  momentumValue: {
    color: GameColors.textPrimary,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
    textAlign: "right",
  },
  momentumReady: {
    color: GameColors.gold,
  },
  battleArea: {
    flex: 1,
    flexDirection: "row",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  playerSide: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  enemySide: {
    flex: 1,
    marginLeft: Spacing.sm,
    alignItems: "flex-end",
  },
  sideLabel: {
    color: GameColors.gold,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: Spacing.xs,
    letterSpacing: 1,
  },
  roachyList: {
    gap: Spacing.xs,
  },
  roachyCard: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    borderWidth: 2,
    borderColor: GameColors.surfaceElevated,
    minWidth: 120,
  },
  roachyCardSelected: {
    borderColor: GameColors.gold,
    shadowColor: GameColors.gold,
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  roachyCardKO: {
    opacity: 0.5,
  },
  koOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: BorderRadius.sm,
    zIndex: 10,
  },
  koText: {
    color: GameColors.error,
    fontSize: 20,
    fontWeight: "900",
  },
  roachyCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  classIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  roachyName: {
    flex: 1,
    color: GameColors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  hpBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  hpBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: GameColors.surfaceElevated,
    borderRadius: 3,
    overflow: "hidden",
  },
  hpBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  hpText: {
    color: GameColors.textSecondary,
    fontSize: 10,
    fontWeight: "600",
    minWidth: 32,
    textAlign: "right",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statText: {
    color: GameColors.textSecondary,
    fontSize: 9,
  },
  actionsPanel: {
    marginTop: Spacing.sm,
    backgroundColor: GameColors.surfaceElevated,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
  },
  actionLabel: {
    color: GameColors.textSecondary,
    fontSize: 10,
    marginBottom: Spacing.xs,
  },
  actionButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  actionButton: {
    backgroundColor: GameColors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    borderColor: GameColors.surfaceLight,
    position: "relative",
    minWidth: 60,
  },
  actionButtonSelected: {
    backgroundColor: GameColors.primary,
    borderColor: GameColors.primary,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: GameColors.textPrimary,
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  actionButtonTextSelected: {
    color: GameColors.background,
  },
  actionButtonTextDisabled: {
    color: GameColors.textTertiary,
  },
  skillTag: {
    position: "absolute",
    top: -4,
    right: -4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  skillTagText: {
    color: "#FFFFFF",
    fontSize: 7,
    fontWeight: "700",
  },
  cooldownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: BorderRadius.xs,
  },
  cooldownText: {
    color: GameColors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  arenaCenter: {
    width: 100,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  arenaIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: GameColors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: GameColors.gold,
  },
  finisherBadge: {
    backgroundColor: GameColors.gold,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  finisherBadgeText: {
    color: GameColors.background,
    fontSize: 10,
    fontWeight: "700",
  },
  lockedBadge: {
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: GameColors.surfaceElevated,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  lockedText: {
    color: GameColors.textSecondary,
    fontSize: 10,
  },
  targetHint: {
    color: GameColors.textTertiary,
    fontSize: 10,
    marginTop: Spacing.xs,
  },
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    backgroundColor: GameColors.surface,
    borderTopWidth: 1,
    borderTopColor: GameColors.surfaceElevated,
  },
  actionsSummary: {
    flex: 1,
  },
  summaryText: {
    color: GameColors.textSecondary,
    fontSize: 12,
  },
  lockInButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: GameColors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  lockInButtonDisabled: {
    backgroundColor: GameColors.surfaceElevated,
    opacity: 0.6,
  },
  lockInText: {
    color: GameColors.background,
    fontSize: 14,
    fontWeight: "700",
  },
  perfectReadPopup: {
    position: "absolute",
    top: "40%",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 100,
  },
  perfectReadText: {
    color: GameColors.gold,
    fontSize: 28,
    fontWeight: "900",
    textShadowColor: GameColors.background,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  perfectReadSubtext: {
    color: GameColors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default BattleMatchScreen;
