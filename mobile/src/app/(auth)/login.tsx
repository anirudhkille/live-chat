import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";

import { authApi } from "@/features/auth/api/auth-api";
import { AuthCard } from "@/features/auth/components/auth-card";
import { useAuthStore } from "@/store/auth-store";
import { useAppTheme } from "@/theme/use-app-theme";
import { GOOGLE_WEB_CLIENT_ID } from "@/lib/env";

export default function LoginScreen() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  }, []);

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
    setGoogleLoading(true);
    try {
      if (Platform.OS === "android") {
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
      }

      const response = await GoogleSignin.signIn();
      if (isCancelledResponse(response)) return;

      const idToken = response.data.idToken;
      if (!idToken) {
        Alert.alert("Error", "Google did not return an ID token");
        return;
      }

      const session = await authApi.googleLogin(idToken);
      setSession({
        token: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
      });
      router.replace("/(tabs)");
    } catch (e) {
      if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }
      Alert.alert(
        "Google sign-in failed",
        e instanceof Error ? e.message : "Please try again.",
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const busy = loading || googleLoading;

  return (
    <AuthCard title="Welcome" description="Enter your email to continue">
      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="m@example.com"
          placeholderTextColor={palette.textMuted}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, busy && styles.disabled]}
        onPress={onSend}
        disabled={busy || !email.trim()}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color={palette.primaryText} />
        ) : (
          <Text style={styles.primaryButtonText}>Continue</Text>
        )}
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        style={[styles.googleButton, busy && styles.disabled]}
        onPress={onGoogle}
        disabled={busy}
        activeOpacity={0.8}
      >
        {googleLoading ? (
          <ActivityIndicator color={palette.text} />
        ) : (
          <>
            <View style={styles.googleMark}>
              <Text style={styles.googleMarkText}>G</Text>
            </View>
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </>
        )}
      </TouchableOpacity>
    </AuthCard>
  );
}

const createStyles = (palette: ReturnType<typeof useAppTheme>["palette"]) =>
  StyleSheet.create({
    field: {
      gap: 8,
    },
    label: {
      color: palette.text,
      fontSize: 13,
      fontWeight: "600",
    },
    input: {
      height: 44,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      color: palette.text,
      backgroundColor: palette.surfaceMuted,
      fontSize: 15,
    },
    primaryButton: {
      height: 44,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.primary,
    },
    primaryButtonText: {
      color: palette.primaryText,
      fontSize: 14,
      fontWeight: "600",
    },
    disabled: {
      opacity: 0.5,
    },
    dividerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: palette.divider,
    },
    dividerText: {
      color: palette.textMuted,
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 0.8,
    },
    googleButton: {
      height: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 8,
      backgroundColor: palette.background,
    },
    googleMark: {
      width: 20,
      height: 20,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.border,
    },
    googleMarkText: {
      color: "#4285F4",
      fontSize: 12,
      fontWeight: "700",
    },
    googleButtonText: {
      color: palette.text,
      fontSize: 14,
      fontWeight: "600",
    },
  });
