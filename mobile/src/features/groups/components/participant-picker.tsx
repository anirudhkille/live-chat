import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { userApi } from "@/features/users/api/user-api";
import { UserAvatar } from "@/features/groups/components/user-avatar";
import { useAppTheme } from "@/theme/use-app-theme";
import type { User } from "@/types/api";

type ParticipantPickerProps = {
  selectedIds: string[];
  onToggle: (user: User) => void;
  excludedIds?: string[];
  autoFocus?: boolean;
};

export function ParticipantPicker({
  selectedIds,
  onToggle,
  excludedIds,
  autoFocus,
}: ParticipantPickerProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isFetching, isError } = useQuery({
    queryKey: ["users", "search", debouncedQuery],
    queryFn: () => userApi.search(debouncedQuery),
    enabled: debouncedQuery.length > 0,
    staleTime: 30_000,
  });

  const excluded = new Set(excludedIds ?? []);
  const results = (data ?? []).filter((user) => !excluded.has(user.id));

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={palette.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search people by name or email"
          placeholderTextColor={palette.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
          returnKeyType="search"
        />
        {query.length > 0 ? (
          <TouchableOpacity
            onPress={() => setQuery("")}
            hitSlop={8}
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close-circle" size={18} color={palette.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {debouncedQuery.length === 0 ? (
        <Text style={styles.hint}>
          Search for people to add them to the group.
        </Text>
      ) : isFetching ? (
        <View style={styles.statusRow}>
          <ActivityIndicator color={palette.textMuted} size="small" />
          <Text style={styles.hint}>Searching…</Text>
        </View>
      ) : isError ? (
        <Text style={styles.error}>Could not load people. Try again.</Text>
      ) : results.length === 0 ? (
        <Text style={styles.hint}>No people found for “{debouncedQuery}”.</Text>
      ) : (
        <View style={styles.results}>
          {results.map((user) => {
            const selected = selectedIds.includes(user.id);
            return (
              <TouchableOpacity
                key={user.id}
                style={styles.row}
                onPress={() => onToggle(user)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
              >
                <UserAvatar
                  uri={user.avatar}
                  name={user.name ?? user.email}
                  size={40}
                />
                <View style={styles.rowBody}>
                  <Text style={styles.name} numberOfLines={1}>
                    {user.name ?? user.email}
                  </Text>
                  {user.name ? (
                    <Text style={styles.email} numberOfLines={1}>
                      {user.email}
                    </Text>
                  ) : null}
                </View>
                <Ionicons
                  name={selected ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={selected ? palette.primary : palette.textMuted}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const createStyles = (palette: ReturnType<typeof useAppTheme>["palette"]) =>
  StyleSheet.create({
    container: { gap: 10 },
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
    hint: { color: palette.textMuted, fontSize: 13, paddingVertical: 8 },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 8,
    },
    error: { color: palette.danger, fontSize: 13, paddingVertical: 8 },
    results: {
      borderWidth: 1,
      borderColor: palette.divider,
      borderRadius: 10,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.divider,
      backgroundColor: palette.background,
    },
    rowBody: { flex: 1, gap: 2 },
    name: { color: palette.text, fontSize: 15, fontWeight: "600" },
    email: { color: palette.textMuted, fontSize: 12 },
  });
