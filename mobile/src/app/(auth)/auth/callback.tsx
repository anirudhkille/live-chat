import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { authApi } from "@/features/auth/api/auth-api";
import { useAuthStore } from "@/store/auth-store";
import { useAppTheme } from "@/theme/use-app-theme";
import { getApiErrorMessage } from "@/types/api";

/**
 * Target of `livechat://auth/callback?code=...`. OAuth hands the app a
 * single-use code; exchanging it here returns the native access/refresh pair.
 */
export default function AuthCallbackScreen() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { code, error } = useLocalSearchParams<{
    code?: string;
    error?: string;
  }>();
  const setSession = useAuthStore((state) => state.setSession);
  const handledRef = useRef(false);
  const [exchangeError, setExchangeError] = useState<string | null>(null);

  const immediateError = error
    ? "Google sign-in was cancelled or failed."
    : !code
      ? "Sign-in link is missing an authorization code."
      : null;
  const errorMessage = immediateError ?? exchangeError;

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    if (error || !code) return;

    void (async () => {
      try {
        const session = await authApi.exchangeGoogleCode(code);
        setSession({
          token: session.accessToken,
          refreshToken: session.refreshToken,
          user: session.user,
        });
        router.replace("/(tabs)");
      } catch (exchangeFailure) {
        setExchangeError(
          getApiErrorMessage(exchangeFailure, "Could not complete sign-in."),
        );
      }
    })();
  }, [code, error, setSession]);

  return (
    <View style={styles.container}>
      {errorMessage ? (
        <>
          <Text style={styles.title}>Sign-in failed</Text>
          <Text style={styles.message}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace("/(auth)/login")}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Back to sign in</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <ActivityIndicator color={palette.primary} />
          <Text style={styles.message}>Completing sign-in…</Text>
        </>
      )}
    </View>
  );
}

const createStyles = (palette: ReturnType<typeof useAppTheme>["palette"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      padding: 24,
      backgroundColor: palette.background,
    },
    title: { color: palette.text, fontSize: 20, fontWeight: "700" },
    message: {
      color: palette.textMuted,
      fontSize: 14,
      textAlign: "center",
      lineHeight: 20,
    },
    button: {
      marginTop: 8,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: palette.primary,
    },
    buttonText: {
      color: palette.primaryText,
      fontSize: 14,
      fontWeight: "600",
    },
  });
