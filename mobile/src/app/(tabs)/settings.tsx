import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

import { useAuthStore } from "@/store/auth-store";
import { useAppTheme } from "@/theme/use-app-theme";

export default function SettingsScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const clearSession = useAuthStore((s) => s.clearSession);

  const onLogout = () => {
    clearSession();
    router.replace("/(auth)/login");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <TouchableOpacity style={styles.button} onPress={onLogout}>
        <Text style={styles.buttonText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (palette: ReturnType<typeof useAppTheme>["palette"]) =>
  StyleSheet.create({
    container: { flex: 1, padding: 24, backgroundColor: palette.background },
    title: {
      fontSize: 24,
      fontWeight: "700",
      marginBottom: 24,
      color: palette.text,
    },
    button: {
      backgroundColor: palette.danger,
      padding: 14,
      borderRadius: 8,
      alignItems: "center",
    },
    buttonText: { color: palette.primaryText, fontWeight: "600" },
  });
