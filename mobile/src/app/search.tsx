import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { conversationApi } from "@/features/conversations/api/conversation-api";
import { userApi } from "@/features/users/api/user-api";
import { UserSearchRow } from "@/features/users/components/user-search-row";
import { useAuthStore } from "@/store/auth-store";
import { useAppTheme } from "@/theme/use-app-theme";
import { getApiErrorMessage, type User } from "@/types/api";

export default function NewChatScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const currentUserId = useAuthStore((state) => state.user?.id);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["users", "search", debouncedQuery],
    queryFn: () => userApi.search(debouncedQuery),
    enabled: debouncedQuery.length > 0,
    staleTime: 30_000,
  });

  const createConversation = useMutation({
    mutationFn: (userId: string) => conversationApi.create(userId),
    onSuccess: (conversation) => {
      queryClient.setQueryData(["conversation", conversation.id], conversation);
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      router.replace(`/chat/${conversation.id}`);
    },
    onError: (mutationError) => {
      setSelectingId(null);
      setError(
        getApiErrorMessage(mutationError, "Could not start a conversation."),
      );
    },
  });

  const results = (data ?? []).filter((user) => user.id !== currentUserId);

  const startChat = (user: User) => {
    if (createConversation.isPending) return;
    setError(null);
    setSelectingId(user.id);
    createConversation.mutate(user.id);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "New chat" }} />

      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={palette.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search people by name or email"
            placeholderTextColor={palette.textMuted}
            value={query}
            onChangeText={(value) => {
              setQuery(value);
              setError(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <TouchableOpacity
              onPress={() => setQuery("")}
              hitSlop={8}
              accessibilityLabel="Clear search"
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={palette.textMuted}
              />
            </TouchableOpacity>
          ) : null}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      {debouncedQuery.length === 0 ? (
        <Text style={styles.hint}>
          Search for someone to start a direct conversation.
        </Text>
      ) : isFetching ? (
        <View style={styles.statusRow}>
          <ActivityIndicator color={palette.textMuted} size="small" />
          <Text style={styles.statusText}>Searching…</Text>
        </View>
      ) : isError ? (
        <View style={styles.statusRow}>
          <Text style={styles.error}>Could not load people.</Text>
          <TouchableOpacity
            onPress={() => {
              void refetch();
            }}
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : results.length === 0 ? (
        <Text style={styles.hint}>No people found for “{debouncedQuery}”.</Text>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(user) => user.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <UserSearchRow
              user={item}
              onPress={() => startChat(item)}
              disabled={createConversation.isPending}
              right={
                selectingId === item.id ? (
                  <ActivityIndicator color={palette.primary} size="small" />
                ) : undefined
              }
            />
          )}
        />
      )}
    </View>
  );
}

const createStyles = (palette: ReturnType<typeof useAppTheme>["palette"]) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    searchWrap: { padding: 16, gap: 8 },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 10,
      backgroundColor: palette.surfaceMuted,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 10,
      color: palette.text,
      fontSize: 15,
    },
    hint: { color: palette.textMuted, fontSize: 13, paddingHorizontal: 16 },
    statusText: { color: palette.textMuted, fontSize: 13 },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    error: { color: palette.danger, fontSize: 13 },
    retryText: { color: palette.primary, fontSize: 13, fontWeight: "600" },
    list: {
      marginHorizontal: 16,
      borderWidth: 1,
      borderColor: palette.divider,
      borderRadius: 10,
      overflow: "hidden",
    },
  });
