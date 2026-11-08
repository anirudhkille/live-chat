import { useMemo, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";

import { authApi } from "@/features/auth/api/auth-api";
import { useAuthStore } from "@/store/auth-store";
import { useAppTheme } from "@/theme/use-app-theme";
import { API_BASE_URL } from "@/lib/env";

export default function LoginScreen() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const onSend = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await authApi.sendOtp(email.trim());
      router.push({
        pathname: "/(auth)/verify",
        params: { email: email.trim() },
      });
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setLoading(true);
    try {
      const base = API_BASE_URL || "http://localhost:8080";
      const redirect = "livechat://auth/callback";
      const authUrl = `${base}/auth/google?redirect=${encodeURIComponent(
        redirect,
      )}`;
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        "livechat://",
      );
      if (result.type === "success" && result.url) {
        const url = new URL(result.url);
        const accessToken = url.searchParams.get("accessToken");
        const refreshToken = url.searchParams.get("refreshToken");
        const userParam = url.searchParams.get("user");
        const user = userParam ? JSON.parse(userParam) : null;
        if (user && !user.id && user._id) user.id = user._id;
        if (accessToken) {
          useAuthStore.getState().setSession({
            token: accessToken,
            refreshToken: refreshToken ?? undefined,
            user,
          });
          router.replace("/(tabs)");
          return;
        }
      }
      if (result.type !== "cancel") {
        Alert.alert("Error", "Google sign-in failed");
      }
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Live Chat</Text>
      <Text style={styles.subtitle}>Log in with your email</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TouchableOpacity
        style={styles.button}
        onPress={onSend}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Sending..." : "Send OTP"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.googleButton]}
        onPress={onGoogle}
        disabled={loading}
      >
        <Text style={styles.googleButtonText}>Continue with Google</Text>
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
    googleButton: {
      backgroundColor: palette.background,
      borderWidth: 1,
      borderColor: palette.border,
      marginTop: 12,
    },
    googleButtonText: { color: palette.text, fontWeight: "600" },
  });
