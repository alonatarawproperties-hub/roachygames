import React from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { ThemedText } from './ThemedText';
import { GameColors, Spacing } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

export function AppLoadingScreen() {
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  React.useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Animated.View style={[styles.glowRing, glowStyle]} />
          <Animated.View style={logoStyle}>
            <Image
              source={require('../../assets/images/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        <ThemedText style={styles.title}>Roachy Games</ThemedText>
        <ThemedText style={styles.subtitle}>Loading your adventure...</ThemedText>

        <View style={styles.dotsContainer}>
          <LoadingDots />
        </View>
      </View>
    </View>
  );
}

function LoadingDots() {
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  React.useEffect(() => {
    const duration = 400;
    const delay = 200;

    dot1.value = withRepeat(
      withSequence(
        withTiming(1, { duration }),
        withTiming(0.3, { duration })
      ),
      -1
    );

    setTimeout(() => {
      dot2.value = withRepeat(
        withSequence(
          withTiming(1, { duration }),
          withTiming(0.3, { duration })
        ),
        -1
      );
    }, delay);

    setTimeout(() => {
      dot3.value = withRepeat(
        withSequence(
          withTiming(1, { duration }),
          withTiming(0.3, { duration })
        ),
        -1
      );
    }, delay * 2);
  }, []);

  const dotStyle1 = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const dotStyle2 = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const dotStyle3 = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <View style={styles.dots}>
      <Animated.View style={[styles.dot, dotStyle1]} />
      <Animated.View style={[styles.dot, dotStyle2]} />
      <Animated.View style={[styles.dot, dotStyle3]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  glowRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: GameColors.primary,
    shadowColor: GameColors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
  },
  logo: {
    width: 160,
    height: 160,
    borderRadius: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: GameColors.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    textShadowColor: GameColors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 16,
    color: GameColors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  dotsContainer: {
    height: 20,
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GameColors.primary,
  },
});
