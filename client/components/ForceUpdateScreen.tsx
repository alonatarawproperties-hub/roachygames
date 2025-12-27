import React from 'react';
import { View, StyleSheet, Platform, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { GameColors, Spacing, BorderRadius } from '@/constants/theme';

const AppIcon = require('../../assets/images/icon.png');

interface ForceUpdateScreenProps {
  message: string;
  onUpdate: () => void;
}

export function ForceUpdateScreen({
  message,
  onUpdate,
}: ForceUpdateScreenProps) {
  const insets = useSafeAreaInsets();
  const storeName = Platform.OS === 'ios' ? 'TestFlight' : 'Play Store';

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <LinearGradient
        colors={['#1a0f0a', '#0d0705', '#050302']}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Image source={AppIcon} style={styles.appIcon} contentFit="contain" />
        </View>
        
        <View style={styles.badge}>
          <Feather name="alert-circle" size={16} color={GameColors.gold} />
          <ThemedText style={styles.badgeText}>Update Required</ThemedText>
        </View>
        
        <ThemedText style={styles.title}>New Version Available</ThemedText>
        
        <ThemedText style={styles.message}>{message}</ThemedText>
        
        <Pressable style={styles.updateButton} onPress={onUpdate}>
          <Feather 
            name={Platform.OS === 'ios' ? 'download' : 'external-link'} 
            size={20} 
            color={GameColors.background} 
          />
          <ThemedText style={styles.updateButtonText}>
            Update on {storeName}
          </ThemedText>
        </Pressable>
        
        <ThemedText style={styles.disclaimer}>
          This update includes important improvements and new features.
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  appIcon: {
    width: '100%',
    height: '100%',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: Spacing.md,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: GameColors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  message: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: GameColors.gold,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    minWidth: 220,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: GameColors.background,
  },
  disclaimer: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
});
