import type { PropsWithChildren } from "react";
import { useMemo } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAppTheme } from "@/theme/use-app-theme";

type AuthCardProps = PropsWithChildren<{
  title: string;
  description?: string;
}>;

export function AuthCard({ title, description, children }: AuthCardProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            {description ? (
              <Text style={styles.description}>{description}</Text>
            ) : null}
          </View>
          <View style={styles.content}>{children}</View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (palette: ReturnType<typeof useAppTheme>["palette"]) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: palette.background,
    },
    scroll: {
      flexGrow: 1,
      justifyContent: "center",
      padding: 20,
    },
    card: {
      width: "100%",
      maxWidth: 384,
      alignSelf: "center",
      gap: 20,
      padding: 24,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.divider,
      backgroundColor: palette.card,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 2,
    },
    header: {
      gap: 6,
    },
    title: {
      color: palette.text,
      fontSize: 18,
      fontWeight: "600",
    },
    description: {
      color: palette.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    content: {
      gap: 14,
    },
  });
