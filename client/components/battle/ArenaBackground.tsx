import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const PARTICLE_COUNT = 12;

interface Particle {
  x: number;
  y: number;
  size: number;
  opacity: Animated.Value;
  delay: number;
}

export function ArenaBackground() {
  const particles = useRef<Particle[]>(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * SCREEN_WIDTH,
      y: Math.random() * SCREEN_HEIGHT,
      size: 2 + Math.random() * 4,
      opacity: new Animated.Value(0.1 + Math.random() * 0.3),
      delay: Math.random() * 2000,
    }))
  ).current;

  useEffect(() => {
    particles.forEach((particle) => {
      const animate = () => {
        Animated.sequence([
          Animated.timing(particle.opacity, {
            toValue: 0.05,
            duration: 2000 + Math.random() * 2000,
            useNativeDriver: true,
          }),
          Animated.timing(particle.opacity, {
            toValue: 0.4,
            duration: 2000 + Math.random() * 2000,
            useNativeDriver: true,
          }),
        ]).start(() => animate());
      };
      setTimeout(animate, particle.delay);
    });
  }, [particles]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0D0D0D", "#1A1510", "#0D0D0D"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.baseGradient}
      />

      <View style={styles.midLayer}>
        <View style={[styles.blurredShape, styles.shape1]} />
        <View style={[styles.blurredShape, styles.shape2]} />
        <View style={[styles.blurredShape, styles.shape3]} />
      </View>

      <View style={styles.particleLayer}>
        {particles.map((particle, index) => (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                left: particle.x,
                top: particle.y,
                width: particle.size,
                height: particle.size,
                borderRadius: particle.size / 2,
                opacity: particle.opacity,
              },
            ]}
          />
        ))}
      </View>

      <LinearGradient
        colors={["rgba(0,0,0,0.8)", "transparent", "transparent", "rgba(0,0,0,0.8)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.vignetteHorizontal}
      />
      <LinearGradient
        colors={["rgba(0,0,0,0.6)", "transparent", "transparent", "rgba(0,0,0,0.6)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.vignetteVertical}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  baseGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  midLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  blurredShape: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.08,
  },
  shape1: {
    width: 200,
    height: 200,
    backgroundColor: "#F5C04D",
    top: "20%",
    left: "10%",
  },
  shape2: {
    width: 150,
    height: 150,
    backgroundColor: "#4CAF50",
    bottom: "25%",
    right: "15%",
  },
  shape3: {
    width: 180,
    height: 180,
    backgroundColor: "#E53935",
    top: "50%",
    left: "40%",
  },
  particleLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  particle: {
    position: "absolute",
    backgroundColor: "#F5C04D",
  },
  vignetteHorizontal: {
    ...StyleSheet.absoluteFillObject,
  },
  vignetteVertical: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default ArenaBackground;
