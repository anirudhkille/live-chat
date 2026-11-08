import { useMemo, useState } from "react";
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
import { useAppTheme } from "@/theme/use-app-theme";
import type { Message } from "@/types/api";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
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
        <ActivityIndicator style={{ marginTop: 24 }} color={palette.text} />
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

const createStyles = (palette: ReturnType<typeof useAppTheme>["palette"]) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    list: { padding: 12 },
    bubble: {
      padding: 10,
      backgroundColor: palette.surface,
      borderRadius: 8,
      marginBottom: 8,
      alignSelf: "flex-start",
      maxWidth: "80%",
    },
    content: { fontSize: 14, color: palette.text },
    inputRow: {
      flexDirection: "row",
      padding: 8,
      borderTopWidth: 1,
      borderTopColor: palette.divider,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 8,
      padding: 10,
      marginRight: 8,
      color: palette.text,
      backgroundColor: palette.surfaceMuted,
    },
    sendBtn: {
      backgroundColor: palette.primary,
      paddingHorizontal: 16,
      borderRadius: 8,
      justifyContent: "center",
    },
    sendText: { color: palette.primaryText, fontWeight: "600" },
  });
