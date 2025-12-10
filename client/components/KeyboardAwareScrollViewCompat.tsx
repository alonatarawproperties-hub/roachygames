import { Platform, ScrollView, ScrollViewProps, KeyboardAvoidingView, StyleSheet } from "react-native";

type Props = ScrollViewProps & {
  children: React.ReactNode;
  keyboardShouldPersistTaps?: "handled" | "always" | "never";
};

/**
 * KeyboardAwareScrollView that provides keyboard avoidance.
 * Use this for any screen containing text inputs.
 */
export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = "handled",
  style,
  contentContainerStyle,
  ...props
}: Props) {
  if (Platform.OS === "web") {
    return (
      <ScrollView
        style={style}
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        {...props}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.flex, style as any]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        {...props}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
