import React, { useEffect, useMemo } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Svg, { Circle, Line, Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { LinearGradient as ExpoLinearGradient } from "expo-linear-gradient";
import { ObsidianBronzeAR } from "@/constants/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CENTER_X = SCREEN_WIDTH / 2;
const CENTER_Y = SCREEN_HEIGHT / 2.3;

interface DustMote {
  id: number;
  startX: number;
  startY: number;
  size: number;
  speed: number;
  delay: number;
}

interface RadialDot {
  angle: number;
  radius: number;
}

const DUST_MOTE_COUNT = 15;
const RADIAL_DOT_COUNT = 8;
const CATCH_ZONE_RADIUS = 80;

export function ARVFXLayer() {
  const scanSweepX = useSharedValue(-SCREEN_WIDTH);
  const catchZonePulse = useSharedValue(1);
  const catchZoneOpacity = useSharedValue(0.3);

  const dustMotes: DustMote[] = useMemo(() => 
    Array.from({ length: DUST_MOTE_COUNT }, (_, i) => ({
      id: i,
      startX: Math.random() * SCREEN_WIDTH,
      startY: Math.random() * SCREEN_HEIGHT * 0.7 + SCREEN_HEIGHT * 0.15,
      size: 2 + Math.random() * 2,
      speed: 8000 + Math.random() * 6000,
      delay: Math.random() * 3000,
    })),
    []
  );

  const radialDots: RadialDot[] = useMemo(() =>
    Array.from({ length: RADIAL_DOT_COUNT }, (_, i) => ({
      angle: (i / RADIAL_DOT_COUNT) * 360,
      radius: CATCH_ZONE_RADIUS + 20,
    })),
    []
  );

  useEffect(() => {
    scanSweepX.value = withRepeat(
      withSequence(
        withTiming(-SCREEN_WIDTH, { duration: 0 }),
        withTiming(SCREEN_WIDTH * 2, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(SCREEN_WIDTH * 2, { duration: 500 })
      ),
      -1,
      false
    );

    catchZonePulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    catchZoneOpacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 1200 }),
        withTiming(0.25, { duration: 1200 })
      ),
      -1,
      true
    );
  }, []);

  const scanSweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: scanSweepX.value }],
  }));

  const catchZoneStyle = useAnimatedStyle(() => ({
    transform: [{ scale: catchZonePulse.value }],
    opacity: catchZoneOpacity.value,
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Edge Vignette */}
      <ExpoLinearGradient
        colors={["rgba(11,11,13,0.7)", "transparent", "transparent", "rgba(11,11,13,0.7)"]}
        locations={[0, 0.2, 0.8, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <ExpoLinearGradient
        colors={["rgba(11,11,13,0.5)", "transparent", "transparent", "rgba(11,11,13,0.6)"]}
        locations={[0, 0.15, 0.85, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Corner Brackets with Micro Ticks */}
      <View style={[styles.cornerBracket, styles.topLeft]}>
        <View style={[styles.bracketLine, styles.bracketHorizontal]} />
        <View style={[styles.bracketLine, styles.bracketVertical]} />
        <View style={[styles.microTick, { top: 8, left: 0 }]} />
        <View style={[styles.microTick, { top: 0, left: 8 }]} />
      </View>
      <View style={[styles.cornerBracket, styles.topRight]}>
        <View style={[styles.bracketLine, styles.bracketHorizontal, { right: 0, left: undefined }]} />
        <View style={[styles.bracketLine, styles.bracketVertical, { right: 0, left: undefined }]} />
        <View style={[styles.microTick, { top: 8, right: 0, left: undefined }]} />
        <View style={[styles.microTick, { top: 0, right: 8, left: undefined }]} />
      </View>
      <View style={[styles.cornerBracket, styles.bottomLeft]}>
        <View style={[styles.bracketLine, styles.bracketHorizontal, { bottom: 0, top: undefined }]} />
        <View style={[styles.bracketLine, styles.bracketVertical, { bottom: 0, top: undefined }]} />
        <View style={[styles.microTick, { bottom: 8, left: 0, top: undefined }]} />
        <View style={[styles.microTick, { bottom: 0, left: 8, top: undefined }]} />
      </View>
      <View style={[styles.cornerBracket, styles.bottomRight]}>
        <View style={[styles.bracketLine, styles.bracketHorizontal, { bottom: 0, top: undefined, right: 0, left: undefined }]} />
        <View style={[styles.bracketLine, styles.bracketVertical, { bottom: 0, top: undefined, right: 0, left: undefined }]} />
        <View style={[styles.microTick, { bottom: 8, right: 0, left: undefined, top: undefined }]} />
        <View style={[styles.microTick, { bottom: 0, right: 8, left: undefined, top: undefined }]} />
      </View>

      {/* Scan Sweep */}
      <Animated.View style={[styles.scanSweep, scanSweepStyle]}>
        <ExpoLinearGradient
          colors={["transparent", "rgba(176,122,58,0.08)", "rgba(224,161,90,0.12)", "rgba(176,122,58,0.08)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.scanSweepGradient}
        />
      </Animated.View>

      {/* Center Catch Zone */}
      <Animated.View style={[styles.catchZone, catchZoneStyle]}>
        <Svg width={CATCH_ZONE_RADIUS * 2 + 60} height={CATCH_ZONE_RADIUS * 2 + 60}>
          <Defs>
            <LinearGradient id="catchZoneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={ObsidianBronzeAR.bronze} stopOpacity="0.6" />
              <Stop offset="100%" stopColor={ObsidianBronzeAR.amber} stopOpacity="0.4" />
            </LinearGradient>
          </Defs>
          <Circle
            cx={CATCH_ZONE_RADIUS + 30}
            cy={CATCH_ZONE_RADIUS + 30}
            r={CATCH_ZONE_RADIUS}
            stroke="url(#catchZoneGrad)"
            strokeWidth={1.5}
            strokeDasharray="12 8"
            fill="none"
          />
          <Circle
            cx={CATCH_ZONE_RADIUS + 30}
            cy={CATCH_ZONE_RADIUS + 30}
            r={CATCH_ZONE_RADIUS - 15}
            stroke={ObsidianBronzeAR.bronze}
            strokeWidth={1}
            strokeDasharray="4 12"
            fill="none"
            opacity={0.4}
          />
        </Svg>
      </Animated.View>

      {/* Radial Particle Ring */}
      <View style={styles.radialRing}>
        {radialDots.map((dot, i) => {
          const rad = (dot.angle * Math.PI) / 180;
          const x = Math.cos(rad) * dot.radius;
          const y = Math.sin(rad) * dot.radius;
          return (
            <View
              key={i}
              style={[
                styles.radialDot,
                {
                  transform: [{ translateX: x }, { translateY: y }],
                },
              ]}
            />
          );
        })}
      </View>

      {/* Drifting Dust Motes */}
      {dustMotes.map((mote) => (
        <DustMoteParticle key={mote.id} mote={mote} />
      ))}

      {/* Ember Specks near HUD (top area) */}
      <EmberSpeck x={SCREEN_WIDTH - 60} y={80} delay={0} />
      <EmberSpeck x={SCREEN_WIDTH - 40} y={95} delay={1500} />
      <EmberSpeck x={50} y={70} delay={800} />
      <EmberSpeck x={30} y={90} delay={2200} />
    </View>
  );
}

function DustMoteParticle({ mote }: { mote: DustMote }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const driftX = 40 + Math.random() * 30;
    const driftY = -60 - Math.random() * 40;

    translateX.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(driftX, { duration: mote.speed, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    translateY.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(driftY, { duration: mote.speed, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(0.5, { duration: mote.speed * 0.2 }),
        withTiming(0.4, { duration: mote.speed * 0.6 }),
        withTiming(0, { duration: mote.speed * 0.2 })
      ),
      -1,
      false
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.dustMote,
        {
          left: mote.startX,
          top: mote.startY,
          width: mote.size,
          height: mote.size,
          borderRadius: mote.size / 2,
        },
        style,
      ]}
    />
  );
}

function EmberSpeck({ x, y, delay }: { x: number; y: number; delay: number }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay }),
        withTiming(0.7, { duration: 400 }),
        withTiming(0.5, { duration: 1500 }),
        withTiming(0, { duration: 400 }),
        withTiming(0, { duration: 1200 })
      ),
      -1,
      false
    );

    scale.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: delay }),
        withTiming(1, { duration: 400 }),
        withTiming(0.8, { duration: 1500 }),
        withTiming(0.3, { duration: 400 }),
        withTiming(0.5, { duration: 1200 })
      ),
      -1,
      false
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.emberSpeck,
        { left: x, top: y },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  cornerBracket: {
    position: "absolute",
    width: 35,
    height: 35,
  },
  topLeft: {
    top: "18%",
    left: "8%",
  },
  topRight: {
    top: "18%",
    right: "8%",
  },
  bottomLeft: {
    bottom: "28%",
    left: "8%",
  },
  bottomRight: {
    bottom: "28%",
    right: "8%",
  },
  bracketLine: {
    position: "absolute",
    backgroundColor: ObsidianBronzeAR.bronze,
    opacity: 0.6,
  },
  bracketHorizontal: {
    width: 20,
    height: 1.5,
    top: 0,
    left: 0,
  },
  bracketVertical: {
    width: 1.5,
    height: 20,
    top: 0,
    left: 0,
  },
  microTick: {
    position: "absolute",
    width: 4,
    height: 1,
    backgroundColor: ObsidianBronzeAR.amber,
    opacity: 0.5,
  },
  scanSweep: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 120,
  },
  scanSweepGradient: {
    flex: 1,
  },
  catchZone: {
    position: "absolute",
    top: CENTER_Y - CATCH_ZONE_RADIUS - 30,
    left: CENTER_X - CATCH_ZONE_RADIUS - 30,
  },
  radialRing: {
    position: "absolute",
    top: CENTER_Y,
    left: CENTER_X,
    width: 0,
    height: 0,
  },
  radialDot: {
    position: "absolute",
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: ObsidianBronzeAR.bronze,
    opacity: 0.35,
  },
  dustMote: {
    position: "absolute",
    backgroundColor: ObsidianBronzeAR.amber,
  },
  emberSpeck: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: ObsidianBronzeAR.amber,
    ...ObsidianBronzeAR.shadows.glow,
  },
});
