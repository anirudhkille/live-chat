import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { conversationApi } from "@/features/conversations/api/conversation-api";
import type { Conversation } from "@/types/api";

export default function ConversationsScreen() {
  const router = useRouter();
  const { data, isLoading, error } = useQuery({
    queryKey: ["conversations"],
    queryFn: conversationApi.list,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text>Failed to load conversations</Text>
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
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 8 },
  row: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#eee" },
  name: { fontSize: 16, fontWeight: "600" },
  preview: { fontSize: 13, color: "#666", marginTop: 4 },
});