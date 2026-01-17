import React, { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";

export type CombatFloatKind = "DMG" | "HEAL" | "BUFF" | "DEBUFF" | "KO";
export type CombatFloatSide = "left" | "right";

export type CombatFloatEvent = {
  id: string;
  text: string;
  kind: CombatFloatKind;
  side: CombatFloatSide;
  ts: number;
};

type Props = {
  event: CombatFloatEvent;
  onDone?: (id: string) => void;
  anchor?: { topPct?: number; leftPct?: number; rightPct?: number };
};

function colorFor(kind: CombatFloatKind) {
  switch (kind) {
    case "DMG":
      return "#FF6A2E";
    case "HEAL":
      return "#32D583";
    case "BUFF":
      return "#F9D66D";
    case "DEBUFF":
      return "#B58CFF";
    case "KO":
      return "#FFFFFF";
    default:
      return "#FFFFFF";
  }
}

function fontSizeFor(kind: CombatFloatKind) {
  if (kind === "KO") return 26;
  return 18;
}

export default function FloatingCombatText({ event, onDone, anchor }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  const sideOffset = useMemo(() => {
    return event.side === "left" ? -18 : 18;
  }, [event.side]);

  useEffect(() => {
    translateY.setValue(0);
    translateX.setValue(0);
    opacity.setValue(0);
    scale.setValue(0.9);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 90, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 650, useNativeDriver: true }),
      ]),
      Animated.timing(translateY, { toValue: -34, duration: 820, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: sideOffset, duration: 820, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.08, duration: 120, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.0, duration: 700, useNativeDriver: true }),
      ]),
    ]).start(({ finished }) => {
      if (finished) onDone?.(event.id);
    });
  }, [event.id, event.kind, event.side, event.text, onDone, opacity, scale, translateX, translateY, sideOffset]);

  const color = colorFor(event.kind);

  const topPct = anchor?.topPct ?? 46;
  const leftPct = anchor?.leftPct;
  const rightPct = anchor?.rightPct;

  const absStyle = [
    styles.abs,
    { top: `${topPct}%` as any },
    event.side === "left"
      ? { left: `${leftPct ?? 16}%` as any }
      : { right: `${rightPct ?? 16}%` as any },
  ];

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        absStyle,
        {
          opacity,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color,
            fontSize: fontSizeFor(event.kind),
          },
          event.kind === "KO" ? styles.koText : null,
        ]}
      >
        {event.text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  abs: {
    position: "absolute",
    zIndex: 9999,
  },
  text: {
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.65)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    letterSpacing: 0.2,
  },
  koText: {
    textTransform: "uppercase",
  },
});
