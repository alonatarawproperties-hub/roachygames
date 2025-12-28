import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import * as Updates from 'expo-updates';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming,
  runOnJS 
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { GameColors, Spacing, Typography } from '@/constants/theme';

interface UpdateBannerProps {
  visible?: boolean;
}

export function UpdateBanner({ visible = true }: UpdateBannerProps) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  const checkForUpdate = useCallback(async () => {
    if (Platform.OS === 'web' || __DEV__) return;
    
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        setUpdateAvailable(true);
      }
    } catch (error) {
      console.log('[UpdateBanner] Check failed:', error);
    }
  }, []);

  useEffect(() => {
    checkForUpdate();
    const interval = setInterval(checkForUpdate, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkForUpdate]);

  useEffect(() => {
    const shouldShow = visible && updateAvailable && !isUpdating;
    
    if (shouldShow) {
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      opacity.value = withTiming(1, { duration: 200 });
    } else if (!updateAvailable) {
      translateY.value = withSpring(-100, { damping: 15, stiffness: 150 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, updateAvailable, isUpdating]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (error) {
      console.log('[UpdateBanner] Update failed:', error);
      setIsUpdating(false);
    }
  };

  if (!updateAvailable || Platform.OS === 'web' || __DEV__) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.content}>
        <Feather name="download" size={20} color={GameColors.primary} />
        <Text style={styles.text}>
          {isUpdating ? 'Updating...' : 'New update available!'}
        </Text>
        
        {!isUpdating && (
          <Pressable 
            onPress={handleUpdate}
            style={styles.updateButton}
          >
            <Feather name="refresh-cw" size={14} color={GameColors.background} style={{ marginRight: 6 }} />
            <Text style={styles.updateText}>Update Now</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingTop: 50,
    paddingHorizontal: Spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.98)',
    borderRadius: 16,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 2,
    borderColor: GameColors.primary + '60',
  },
  text: {
    flex: 1,
    color: GameColors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
    marginLeft: Spacing.sm,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GameColors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
  },
  updateText: {
    color: GameColors.background,
    fontSize: 15,
    fontWeight: '700',
  },
});
