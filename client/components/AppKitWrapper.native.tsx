import React, { ReactNode } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';

interface AppKitWrapperProps {
  children: ReactNode;
}

export function AppKitWrapper({ children }: AppKitWrapperProps) {
  return (
    <View style={styles.container}>
      {children}
    </View>
  );
}

export function useAppKitWallet() {
  return {
    address: null,
    isConnected: false,
    isLoading: false,
    openModal: () => {
      console.log('[AppKit] Wallet connect temporarily disabled for build testing');
    },
  };
}

export function AppKitButton() {
  return (
    <Pressable style={styles.button}>
      <Text style={styles.buttonText}>Connect Wallet (Coming Soon)</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  button: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#888',
    fontSize: 14,
  },
});
