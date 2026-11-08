import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";

import { authApi } from "@/features/auth/api/auth-api";
import { useAuthStore } from "@/store/auth-store";
import { useAppTheme } from "@/theme/use-app-theme";

export default function VerifyScreen() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    if (!email) {
      router.replace("/(auth)/login");
    }
  }, [email]);

  if (!email) {
    return null;
  }

  const onVerify = async () => {
    if (!email || otp.length !== 6) return;
    setLoading(true);
    try {
      const session = await authApi.verifyOtp(email, otp);
      setSession({
        token: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
      });
      router.replace("/(tabs)");
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify OTP</Text>
      <Text style={styles.subtitle}>Sent to {email}</Text>
      <TextInput
        style={styles.input}
        placeholder="6-digit OTP"
        keyboardType="number-pad"
        maxLength={6}
        value={otp}
        onChangeText={setOtp}
      />
      <TouchableOpacity
        style={styles.button}
        onPress={onVerify}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Verifying..." : "Verify"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (palette: ReturnType<typeof useAppTheme>["palette"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      padding: 24,
      backgroundColor: palette.background,
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: 8,
      color: palette.text,
    },
    subtitle: {
      fontSize: 14,
      color: palette.textMuted,
      textAlign: "center",
      marginBottom: 24,
    },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      textAlign: "center",
      fontSize: 20,
      letterSpacing: 8,
      color: palette.text,
      backgroundColor: palette.surfaceMuted,
    },
    button: {
      backgroundColor: palette.primary,
      padding: 14,
      borderRadius: 8,
      alignItems: "center",
    },
    buttonText: { color: palette.primaryText, fontWeight: "600" },
  });
