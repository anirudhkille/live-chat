import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  SettingsSection,
  SettingsSwitchRow,
} from "@/features/settings/components/settings-row";
import { userApi } from "@/features/users/api/user-api";
import { useAppTheme } from "@/theme/use-app-theme";
import { getApiErrorMessage, type UserPreferences } from "@/types/api";

const PREFERENCES_KEY = ["user-preferences"] as const;

type ToggleKey =
  | "pushNotifications"
  | "showOnline"
  | "readReceipts"
  | "profileVisible"
  | "phoneVisible"
  | "typingIndicators";

export default function NotificationPreferencesScreen() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const queryClient = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);

  const {
    data: preferences,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: PREFERENCES_KEY,
    queryFn: userApi.getPreferences,
    staleTime: 5 * 60 * 1000,
  });

  const updatePreferences = useMutation({
    mutationFn: (patch: Partial<UserPreferences>) =>
      userApi.updatePreferences(patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: PREFERENCES_KEY });
      const previous =
        queryClient.getQueryData<UserPreferences>(PREFERENCES_KEY);
      if (previous) {
        queryClient.setQueryData<UserPreferences>(PREFERENCES_KEY, {
          ...previous,
          ...patch,
        });
      }
      setMutationError(null);
      return { previous };
    },
    onError: (error, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData<UserPreferences>(
          PREFERENCES_KEY,
          context.previous,
        );
      }
      setMutationError(
        getApiErrorMessage(error, "Could not update preferences."),
      );
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<UserPreferences>(PREFERENCES_KEY, updated);
    },
  });

  const handleToggle = (key: ToggleKey, value: boolean) => {
    updatePreferences.mutate({ [key]: value } as Partial<UserPreferences>);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  if (isError || !preferences) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Could not load preferences.</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            void refetch();
          }}
          accessibilityRole="button"
        >
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const disabled = updatePreferences.isPending;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: "Notifications" }} />

      {mutationError ? <Text style={styles.error}>{mutationError}</Text> : null}
      {disabled ? <Text style={styles.saving}>Saving…</Text> : null}

      <SettingsSection title="Notifications">
        <SettingsSwitchRow
          icon="notifications-outline"
          label="Push notifications"
          description="Get notified about new messages when you're away."
          value={preferences.pushNotifications}
          onValueChange={(value) => handleToggle("pushNotifications", value)}
          disabled={disabled}
          showDivider={false}
        />
      </SettingsSection>

      <SettingsSection title="Privacy">
        <SettingsSwitchRow
          icon="radio-outline"
          label="Online status"
          description="Show when you're online to other users."
          value={preferences.showOnline}
          onValueChange={(value) => handleToggle("showOnline", value)}
          disabled={disabled}
        />
        <SettingsSwitchRow
          icon="eye-outline"
          label="Profile visibility"
          description="Allow anyone with your email to find you."
          value={preferences.profileVisible}
          onValueChange={(value) => handleToggle("profileVisible", value)}
          disabled={disabled}
        />
        <SettingsSwitchRow
          icon="call-outline"
          label="Phone number visibility"
          description="Show your phone number to contacts."
          value={preferences.phoneVisible}
          onValueChange={(value) => handleToggle("phoneVisible", value)}
          disabled={disabled}
          showDivider={false}
        />
      </SettingsSection>

      <SettingsSection title="Messaging">
        <SettingsSwitchRow
          icon="checkmark-done-outline"
          label="Read receipts"
          description="Let others see when you've read their messages."
          value={preferences.readReceipts}
          onValueChange={(value) => handleToggle("readReceipts", value)}
          disabled={disabled}
        />
        <SettingsSwitchRow
          icon="ellipsis-horizontal-circle-outline"
          label="Typing indicators"
          description="Show when you're typing a message."
          value={preferences.typingIndicators}
          onValueChange={(value) => handleToggle("typingIndicators", value)}
          disabled={disabled}
          showDivider={false}
        />
      </SettingsSection>
    </ScrollView>
  );
}

const createStyles = (palette: ReturnType<typeof useAppTheme>["palette"]) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    content: { padding: 16, paddingBottom: 32, gap: 18 },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      padding: 24,
      backgroundColor: palette.background,
    },
    saving: { color: palette.textMuted, fontSize: 12 },
    error: { color: palette.danger, fontSize: 13 },
    retryButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: palette.primary,
    },
    retryText: { color: palette.primaryText, fontSize: 13, fontWeight: "600" },
  });
