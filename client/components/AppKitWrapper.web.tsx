import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';

interface AppKitWrapperProps {
  children: ReactNode;
}

export function AppKitWrapper({ children }: AppKitWrapperProps) {
  return <View style={styles.container}>{children}</View>;
}

export function useAppKitWallet() {
  return {
    address: null,
    isConnected: false,
    isLoading: false,
    openModal: () => {
      console.log('[AppKit] Web platform - wallet connection not available');
    },
  };
}

export const AppKitButton = () => null;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
