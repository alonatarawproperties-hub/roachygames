import React, { ReactNode } from 'react';
import { View } from 'react-native';

interface AppKitWrapperProps {
  children: ReactNode;
}

export function AppKitWrapper({ children }: AppKitWrapperProps) {
  return <View style={{ flex: 1 }}>{children}</View>;
}

export const AppKitButton = () => null;
