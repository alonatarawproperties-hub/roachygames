import React from "react";
import { View, StyleSheet, Modal, Pressable } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";

interface ThemedAlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

interface ThemedAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: ThemedAlertButton[];
  onDismiss?: () => void;
}

export function ThemedAlert({
  visible,
  title,
  message,
  buttons = [{ text: "OK" }],
  onDismiss,
}: ThemedAlertProps) {
  const handlePress = (button: ThemedAlertButton) => {
    button.onPress?.();
    onDismiss?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          {message ? (
            <ThemedText style={styles.message}>{message}</ThemedText>
          ) : null}
          <View style={styles.buttonContainer}>
            {buttons.map((button, index) => (
              <Pressable
                key={index}
                style={[
                  styles.button,
                  button.style === "destructive" && styles.destructiveButton,
                  button.style === "cancel" && styles.cancelButton,
                  index < buttons.length - 1 && styles.buttonBorder,
                ]}
                onPress={() => handlePress(button)}
              >
                <ThemedText
                  style={[
                    styles.buttonText,
                    button.style === "destructive" && styles.destructiveText,
                    button.style === "cancel" && styles.cancelText,
                  ]}
                >
                  {button.text}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Helper hook for using themed alerts
import { useState, useCallback } from "react";

interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: ThemedAlertButton[];
}

export function useThemedAlert() {
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    title: "",
    message: undefined,
    buttons: undefined,
  });

  const showAlert = useCallback(
    (title: string, message?: string, buttons?: ThemedAlertButton[]) => {
      setAlertState({
        visible: true,
        title,
        message,
        buttons: buttons || [{ text: "OK" }],
      });
    },
    []
  );

  const hideAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, visible: false }));
  }, []);

  const AlertComponent = useCallback(
    () => (
      <ThemedAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onDismiss={hideAlert}
      />
    ),
    [alertState, hideAlert]
  );

  return { showAlert, hideAlert, AlertComponent };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  container: {
    backgroundColor: GameColors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: GameColors.gold + "30",
    width: "100%",
    maxWidth: 320,
    overflow: "hidden",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: GameColors.textPrimary,
    textAlign: "center",
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  message: {
    fontSize: 14,
    color: GameColors.textSecondary,
    textAlign: "center",
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  buttonContainer: {
    borderTopWidth: 1,
    borderTopColor: GameColors.surfaceGlow,
    flexDirection: "row",
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonBorder: {
    borderRightWidth: 1,
    borderRightColor: GameColors.surfaceGlow,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: GameColors.gold,
  },
  destructiveButton: {},
  destructiveText: {
    color: GameColors.error,
  },
  cancelButton: {},
  cancelText: {
    color: GameColors.textSecondary,
  },
});
