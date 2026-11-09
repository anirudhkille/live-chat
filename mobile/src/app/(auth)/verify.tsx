import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { authApi } from "@/features/auth/api/auth-api";
import { AuthCard } from "@/features/auth/components/auth-card";
import { useAuthStore } from "@/store/auth-store";
import { useAppTheme } from "@/theme/use-app-theme";

const OTP_LENGTH = 6;

export default function VerifyScreen() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { email } = useLocalSearchParams<{ email: string }>();
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(ComponentRef<typeof TextInput> | null)[]>([]);
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    if (!email) {
      router.replace("/(auth)/login");
    }
  }, [email]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  if (!email) {
    return null;
  }

  const verify = async (code: string) => {
    if (loading || code.length !== OTP_LENGTH) return;
    setLoading(true);
    try {
      const session = await authApi.verifyOtp(email, code);
      setSession({
        token: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
      });
      router.replace("/(tabs)");
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (index: number, value: string) => {
    const incoming = value.replace(/\D/g, "");
    if (!incoming) {
      const next = [...digits];
      next[index] = "";
      setDigits(next);
      return;
    }

    const next = [...digits];
    incoming.split("").forEach((char, offset) => {
      const position = index + offset;
      if (position < OTP_LENGTH) next[position] = char;
    });
    setDigits(next);

    const lastFilled = Math.min(index + incoming.length, OTP_LENGTH - 1);
    inputRefs.current[lastFilled]?.focus();
    setFocusedIndex(lastFilled);

    if (next.every(Boolean)) {
      verify(next.join(""));
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setFocusedIndex(index - 1);
    }
  };

  const resend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    try {
      await authApi.sendOtp(email);
      setDigits(Array(OTP_LENGTH).fill(""));
      setCountdown(30);
      inputRefs.current[0]?.focus();
      setFocusedIndex(0);
      Alert.alert("Code sent", "A new verification code has been sent.");
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthCard title="Verify your email" description={`Code sent to ${email}`}>
      <View style={styles.otpRow}>
        {digits.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              inputRefs.current[index] = ref;
            }}
            style={[
              styles.otpInput,
              focusedIndex === index && styles.otpInputFocused,
              !!digit && styles.otpInputFilled,
            ]}
            value={digit}
            onChangeText={(value) => handleChange(index, value)}
            onKeyPress={({ nativeEvent }) =>
              handleKeyPress(index, nativeEvent.key)
            }
            onFocus={() => setFocusedIndex(index)}
            keyboardType="number-pad"
            maxLength={1}
            textAlign="center"
            autoFocus={index === 0}
            textContentType={index === 0 ? "oneTimeCode" : "none"}
            autoComplete={index === 0 ? "one-time-code" : "off"}
            editable={!loading}
          />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.disabled]}
        onPress={() => verify(digits.join(""))}
        disabled={loading || !digits.every(Boolean)}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color={palette.primaryText} />
        ) : (
          <Text style={styles.buttonText}>Continue</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.resend}
        onPress={resend}
        disabled={countdown > 0 || resending}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.resendText,
            (countdown > 0 || resending) && styles.resendTextDisabled,
          ]}
        >
          {countdown > 0
            ? `Resend code in 0:${String(countdown).padStart(2, "0")}`
            : resending
              ? "Sending..."
              : "Resend code"}
        </Text>
      </TouchableOpacity>
    </AuthCard>
  );
}

const createStyles = (palette: ReturnType<typeof useAppTheme>["palette"]) =>
  StyleSheet.create({
    otpRow: {
      flexDirection: "row",
      gap: 8,
    },
    otpInput: {
      flex: 1,
      height: 48,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 8,
      color: palette.text,
      backgroundColor: palette.surfaceMuted,
      fontSize: 20,
      fontWeight: "600",
    },
    otpInputFocused: {
      borderColor: palette.primary,
    },
    otpInputFilled: {
      borderColor: palette.primary,
    },
    button: {
      height: 44,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.primary,
    },
    buttonText: {
      color: palette.primaryText,
      fontSize: 14,
      fontWeight: "600",
    },
    disabled: {
      opacity: 0.5,
    },
    resend: {
      alignItems: "center",
      paddingVertical: 4,
    },
    resendText: {
      color: palette.primary,
      fontSize: 14,
      fontWeight: "500",
    },
    resendTextDisabled: {
      color: palette.textMuted,
    },
  });
