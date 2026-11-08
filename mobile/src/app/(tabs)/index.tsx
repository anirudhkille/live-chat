import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { conversationApi } from "@/features/conversations/api/conversation-api";
import { useAppTheme } from "@/theme/use-app-theme";
import type { Conversation } from "@/types/api";

export default function ConversationsScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { data, isLoading, error } = useQuery({
    queryKey: ["conversations"],
    queryFn: conversationApi.list,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={palette.text} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Failed to load conversations</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/chat/${item.id}`)}
    >
      <Text style={styles.name}>{item.name ?? item.email ?? "Chat"}</Text>
      {item.lastMessage?.content ? (
        <Text style={styles.preview} numberOfLines={1}>
          {item.lastMessage.content}
        </Text>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={data ?? []}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      style={styles.container}
    />
  );
}

const createStyles = (palette: ReturnType<typeof useAppTheme>["palette"]) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    list: { padding: 8, backgroundColor: palette.background },
    row: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: palette.divider,
    },
    name: { fontSize: 16, fontWeight: "600", color: palette.text },
    preview: { fontSize: 13, color: palette.textMuted, marginTop: 4 },
    text: { color: palette.textMuted },
  });
