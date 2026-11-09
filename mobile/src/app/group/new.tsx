import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ParticipantPicker } from "@/features/groups/components/participant-picker";
import { UserAvatar } from "@/features/groups/components/user-avatar";
import { conversationApi } from "@/features/conversations/api/conversation-api";
import { useAppTheme } from "@/theme/use-app-theme";
import { getApiErrorMessage, type User } from "@/types/api";

export default function NewGroupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [name, setName] = useState("");
  const [selected, setSelected] = useState<User[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const createGroup = useMutation({
    mutationFn: (input: { name: string; participantIds: string[] }) =>
      conversationApi.createGroup(input.name, input.participantIds),
    onSuccess: (conversation) => {
      queryClient.setQueryData(["conversation", conversation.id], conversation);
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      router.replace(`/chat/${conversation.id}`);
    },
    onError: (error) => {
      setFormError(getApiErrorMessage(error, "Could not create the group."));
    },
  });

  const toggleParticipant = (user: User) => {
    setFormError(null);
    setSelected((current) =>
      current.some((item) => item.id === user.id)
        ? current.filter((item) => item.id !== user.id)
        : [...current, user],
    );
  };

  const removeParticipant = (userId: string) => {
    setSelected((current) => current.filter((item) => item.id !== userId));
  };

  const handleCreate = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError("Enter a group name.");
      return;
    }
    if (selected.length < 2) {
      setFormError("Select at least 2 members.");
      return;
    }

    setFormError(null);
    createGroup.mutate({
      name: trimmedName,
      participantIds: selected.map((user) => user.id),
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: "New group" }} />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.field}>
          <Text style={styles.label}>Group name</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="e.g. Weekend plans"
            placeholderTextColor={palette.textMuted}
            value={name}
            onChangeText={(value) => {
              setName(value);
              setFormError(null);
            }}
            maxLength={100}
            returnKeyType="done"
          />
          <Text style={styles.counter}>{name.trim().length}/100</Text>
        </View>

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Participants</Text>
            <Text style={styles.selectedCount}>{selected.length} selected</Text>
          </View>

          {selected.length > 0 ? (
            <View style={styles.chips}>
              {selected.map((user) => (
                <View key={user.id} style={styles.chip}>
                  <UserAvatar
                    uri={user.avatar}
                    name={user.name ?? user.email}
                    size={22}
                  />
                  <Text style={styles.chipName} numberOfLines={1}>
                    {user.name ?? user.email}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeParticipant(user.id)}
                    hitSlop={8}
                    accessibilityLabel={`Remove ${user.name ?? user.email}`}
                  >
                    <Ionicons
                      name="close"
                      size={14}
                      color={palette.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}

          <ParticipantPicker
            selectedIds={selected.map((user) => user.id)}
            onToggle={toggleParticipant}
          />
          <Text style={styles.hint}>Groups need at least 2 other members.</Text>
        </View>

        {formError ? <Text style={styles.error}>{formError}</Text> : null}
      </ScrollView>

      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}
      >
        <TouchableOpacity
          style={[
            styles.createButton,
            createGroup.isPending && styles.createButtonDisabled,
          ]}
          onPress={handleCreate}
          disabled={createGroup.isPending}
          accessibilityRole="button"
        >
          {createGroup.isPending ? (
            <ActivityIndicator color={palette.primaryText} size="small" />
          ) : (
            <Text style={styles.createText}>Create group</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (palette: ReturnType<typeof useAppTheme>["palette"]) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    content: { padding: 16, gap: 24 },
    field: { gap: 8 },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    label: {
      color: palette.text,
      fontSize: 13,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    selectedCount: { color: palette.textMuted, fontSize: 12 },
    nameInput: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      color: palette.text,
      backgroundColor: palette.surfaceMuted,
      fontSize: 15,
    },
    counter: {
      color: palette.textMuted,
      fontSize: 11,
      textAlign: "right",
    },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      maxWidth: "100%",
      paddingLeft: 4,
      paddingRight: 8,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
    },
    chipName: { color: palette.text, fontSize: 12, maxWidth: 140 },
    hint: { color: palette.textMuted, fontSize: 12 },
    error: { color: palette.danger, fontSize: 13 },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: palette.divider,
      backgroundColor: palette.background,
    },
    createButton: {
      minHeight: 48,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.primary,
    },
    createButtonDisabled: { opacity: 0.6 },
    createText: { color: palette.primaryText, fontSize: 15, fontWeight: "700" },
  });
