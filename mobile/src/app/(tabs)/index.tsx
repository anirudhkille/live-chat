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
import {
  DECRYPTION_FAILED_TEXT,
  DECRYPTION_PENDING_TEXT,
} from "@/features/e2e/hooks/use-decrypted-messages";
import { useDecryptedPreview } from "@/features/e2e/hooks/use-decrypted-preview";
import { useAppTheme } from "@/theme/use-app-theme";
import type { Conversation, Message } from "@/types/api";

type Styles = ReturnType<typeof createStyles>;

function getLastMessagePreview(
  lastMessage: Message | null,
  decryptedPreview: string | null,
  isEncrypted: boolean,
  isPreparing: boolean,
) {
  if (!lastMessage) return null;
  if (lastMessage.deletedAt) return "This message was deleted";

  if (isEncrypted) {
    if (isPreparing) return DECRYPTION_PENDING_TEXT;
    return decryptedPreview ?? DECRYPTION_FAILED_TEXT;
  }

  if (lastMessage.content?.trim()) return lastMessage.content;

  const attachments = lastMessage.attachments ?? [];
  const audioOnly =
    attachments.length > 0 &&
    attachments.every((attachment) => attachment.type === "AUDIO");

  if (audioOnly) return "Voice message";
  if (attachments.length > 0) return "Photo or file";
  return null;
}

function ConversationRow({
  conversation,
  styles,
  onPress,
}: {
  conversation: Conversation;
  styles: Styles;
  onPress: () => void;
}) {
  const peerId = conversation.isGroup ? null : conversation.otherUserId;
  const { preview, isEncrypted, isPreparing } = useDecryptedPreview(
    conversation.lastMessage,
    peerId,
  );
  const lastMessagePreview = getLastMessagePreview(
    conversation.lastMessage,
    preview,
    isEncrypted,
    isPreparing,
  );

  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <Text style={styles.name}>
        {conversation.name ?? conversation.email ?? "Chat"}
      </Text>
      {lastMessagePreview ? (
        <Text style={styles.preview} numberOfLines={1}>
          {lastMessagePreview}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

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

  return (
    <FlatList
      data={data ?? []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ConversationRow
          conversation={item}
          styles={styles}
          onPress={() => router.push(`/chat/${item.id}`)}
        />
      )}
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
