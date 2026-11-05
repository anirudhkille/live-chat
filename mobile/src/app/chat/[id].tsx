import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { messageApi } from "@/features/conversations/api/conversation-api";
import type { Message } from "@/types/api";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const { data: messages, isLoading } = useQuery({
    queryKey: ["messages", id],
    queryFn: () => messageApi.list(id!),
    enabled: !!id,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => messageApi.send(id!, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages", id] });
      setText("");
    },
  });

  const onSend = () => {
    if (!text.trim()) return;
    sendMutation.mutate(text.trim());
  };

  const renderItem = ({ item }: { item: Message }) => (
    <View style={styles.bubble}>
      <Text style={styles.content}>{item.content}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={[...(messages ?? [])].toReversed()}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          inverted
        />
      )}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Message"
        />
        <TouchableOpacity style={styles.sendBtn} onPress={onSend}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  list: { padding: 12 },
  bubble: {
    padding: 10,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    marginBottom: 8,
    alignSelf: "flex-start",
    maxWidth: "80%",
  },
  content: { fontSize: 14 },
  inputRow: {
    flexDirection: "row",
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginRight: 8,
  },
  sendBtn: {
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: "center",
  },
  sendText: { color: "#fff", fontWeight: "600" },
});
