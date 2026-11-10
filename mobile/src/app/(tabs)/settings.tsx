import { useMemo } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import {
  SettingsRow,
  SettingsSection,
} from "@/features/settings/components/settings-row";
import { useE2EIdentity } from "@/features/e2e/hooks/use-e2e-identity";
import { UserAvatar } from "@/features/groups/components/user-avatar";
import { useAuthStore } from "@/store/auth-store";
import { useAppTheme, type ThemePreference } from "@/theme/use-app-theme";

const THEME_LABELS: Record<ThemePreference, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

export default function SettingsScreen() {
  const router = useRouter();
  const { palette, preference } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const { status: e2eStatus } = useE2EIdentity();

  const e2eDescription =
    e2eStatus === "ready"
      ? "End-to-end encryption is active for direct messages on this device."
      : e2eStatus === "loading"
        ? "Checking encryption keys…"
        : e2eStatus === "server-key-missing-local"
          ? "Your encryption keys exist on another device. Direct messages stay unencrypted here until you restore them from the web app."
          : "Encryption setup is unavailable. Messages will continue to send unencrypted.";

  const e2eValue =
    e2eStatus === "ready"
      ? "Active"
      : e2eStatus === "loading"
        ? "Checking"
        : "Plaintext";

  const onLogout = () => {
    Alert.alert(
      "Log out?",
      "You'll need to log in again to access your chats.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log out",
          style: "destructive",
          onPress: () => {
            clearSession();
            router.replace("/(auth)/login");
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity
        style={styles.profileCard}
        onPress={() => router.push("/settings/profile")}
        accessibilityRole="button"
        accessibilityLabel="Edit profile"
        activeOpacity={0.7}
      >
        <UserAvatar
          uri={user?.avatar}
          name={user?.name ?? user?.email}
          size={60}
        />
        <View style={styles.profileBody}>
          <Text style={styles.profileName} numberOfLines={1}>
            {user?.name ?? "Your profile"}
          </Text>
          <Text style={styles.profileEmail} numberOfLines={1}>
            {user?.email ?? ""}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={palette.textMuted} />
      </TouchableOpacity>

      <SettingsSection title="Preferences">
        <SettingsRow
          icon="color-palette-outline"
          label="Appearance"
          description="Choose a light, dark, or system theme"
          value={THEME_LABELS[preference]}
          onPress={() => router.push("/settings/appearance")}
        />
        <SettingsRow
          icon="notifications-outline"
          label="Notifications"
          description="Push notifications and privacy"
          onPress={() => router.push("/settings/notifications")}
          showDivider={false}
        />
      </SettingsSection>

      <SettingsSection title="Privacy & security">
        <SettingsRow
          icon="shield-checkmark-outline"
          label="Security & encryption"
          description={e2eDescription}
          value={e2eValue}
          showDivider={false}
        />
      </SettingsSection>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={onLogout}
        accessibilityRole="button"
        accessibilityLabel="Log out"
        activeOpacity={0.7}
      >
        <Ionicons name="log-out-outline" size={18} color={palette.danger} />
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (palette: ReturnType<typeof useAppTheme>["palette"]) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    content: { padding: 16, paddingBottom: 32, gap: 20 },
    profileCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.divider,
      backgroundColor: palette.card,
    },
    profileBody: { flex: 1, gap: 3 },
    profileName: { color: palette.text, fontSize: 17, fontWeight: "600" },
    profileEmail: { color: palette.textMuted, fontSize: 13 },
    logoutButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      minHeight: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.danger,
      backgroundColor: palette.card,
    },
    logoutText: { color: palette.danger, fontSize: 15, fontWeight: "600" },
  });
