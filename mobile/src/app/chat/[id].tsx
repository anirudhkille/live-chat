import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";

import {
  conversationApi,
  messageApi,
} from "@/features/conversations/api/conversation-api";
import { socket } from "@/lib/socket";
import { useAuthStore } from "@/store/auth-store";
import { useAppTheme } from "@/theme/use-app-theme";
import type { Message } from "@/types/api";

const PAGE_SIZE = 30;
const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

type MessagesData = InfiniteData<Message[], string | undefined>;

type MessageEvent = {
  conversationId: string;
  message: Message;
};

type ReadEvent = {
  conversationId: string;
  userId: string;
  readAt: string;
};

type TypingEvent = {
  conversationId: string;
  userId: string;
  isTyping?: boolean;
};

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const currentUserId = currentUser?.id;

  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: conversation } = useQuery({
    queryKey: ["conversation", id],
    queryFn: () => conversationApi.getById(id!),
    enabled: !!id,
  });

  const messagesQuery = useInfiniteQuery({
    queryKey: ["messages", id],
    queryFn: ({ pageParam }) =>
      messageApi.list(id!, { before: pageParam, limit: PAGE_SIZE }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.length < PAGE_SIZE
        ? undefined
        : lastPage[lastPage.length - 1]?.createdAt,
    enabled: !!id,
    staleTime: 30_000,
  });

  const messages = useMemo(
    () => messagesQuery.data?.pages.flatMap((page) => page) ?? [],
    [messagesQuery.data],
  );
  const newestMessageId = messages[0]?.id;

  const addMessageToCache = useCallback(
    (message: Message) => {
      queryClient.setQueryData<MessagesData>(["messages", id], (old) => {
        if (!old?.pages.length) return old;

        const exists = old.pages.some((page) =>
          page.some((item) => item.id === message.id),
        );
        if (exists) return old;

        const [firstPage, ...rest] = old.pages;
        return {
          ...old,
          pages: [[message, ...firstPage], ...rest],
        };
      });
    },
    [id, queryClient],
  );

  const updateMessageInCache = useCallback(
    (message: Message) => {
      queryClient.setQueryData<MessagesData>(["messages", id], (old) => {
        if (!old) return old;

        let changed = false;
        const pages = old.pages.map((page) =>
          page.map((item) => {
            if (item.id !== message.id) return item;
            changed = true;
            return message;
          }),
        );

        return changed ? { ...old, pages } : old;
      });
    },
    [id, queryClient],
  );

  const markRead = useCallback(() => {
    if (!id) return;
    void messageApi.markRead(id).catch(() => undefined);
  }, [id]);

  useEffect(() => {
    if (!id || !newestMessageId) return;
    const timer = setTimeout(markRead, 400);
    return () => clearTimeout(timer);
  }, [id, newestMessageId, markRead]);

  useEffect(() => {
    if (!id) return;

    const join = () => socket.emit("join-conversation", id);

    const onNewMessage = (message: Message) => {
      if (message.conversationId !== id) return;
      addMessageToCache(message);
    };

    const onMessageUpdated = ({ conversationId, message }: MessageEvent) => {
      if (conversationId !== id) return;
      updateMessageInCache(message);
    };

    const onMessageDeleted = ({ conversationId, message }: MessageEvent) => {
      if (conversationId !== id) return;
      updateMessageInCache(message);
    };

    const onMessageReacted = ({ conversationId, message }: MessageEvent) => {
      if (conversationId !== id) return;
      updateMessageInCache(message);
    };

    const onMessagesRead = (payload: ReadEvent) => {
      if (payload.conversationId !== id || !currentUserId) return;

      queryClient.setQueryData<MessagesData>(["messages", id], (old) => {
        if (!old) return old;

        const pages = old.pages.map((page) =>
          page.map((message) =>
            message.senderId === currentUserId && !message.readAt
              ? { ...message, readAt: payload.readAt }
              : message,
          ),
        );

        return { ...old, pages };
      });
    };

    const onTyping = ({ conversationId, userId, isTyping }: TypingEvent) => {
      if (conversationId !== id || userId === currentUserId) return;
      setTypingUsers((users) => {
        const next = { ...users };
        if (isTyping) next[userId] = true;
        else delete next[userId];
        return next;
      });
    };

    socket.on("connect", join);
    socket.on("new-message", onNewMessage);
    socket.on("message-updated", onMessageUpdated);
    socket.on("message-deleted", onMessageDeleted);
    socket.on("message-reacted", onMessageReacted);
    socket.on("messages-read", onMessagesRead);
    socket.on("user-typing", onTyping);
    socket.connect();
    join();

    return () => {
      socket.emit("leave-conversation", id);
      socket.off("connect", join);
      socket.off("new-message", onNewMessage);
      socket.off("message-updated", onMessageUpdated);
      socket.off("message-deleted", onMessageDeleted);
      socket.off("message-reacted", onMessageReacted);
      socket.off("messages-read", onMessagesRead);
      socket.off("user-typing", onTyping);
    };
  }, [addMessageToCache, currentUserId, id, queryClient, updateMessageInCache]);

  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (id) {
        socket.emit("typing-conversation", {
          conversationId: id,
          isTyping: false,
        });
      }
    };
  }, [id]);

  const sendMutation = useMutation({
    mutationFn: (input: { content: string; replyToId?: string }) =>
      messageApi.send(id!, input.content, { replyToId: input.replyToId }),
    onSuccess: (message) => {
      addMessageToCache(message);
      setText("");
      setReplyTo(null);
    },
    onError: () => Alert.alert("Message not sent", "Please try again."),
  });

  const editMutation = useMutation({
    mutationFn: (input: { messageId: string; content: string }) =>
      messageApi.edit(input.messageId, input.content),
    onSuccess: (message) => {
      updateMessageInCache(message);
      setText("");
      setEditing(null);
    },
    onError: () => Alert.alert("Could not edit message", "Please try again."),
  });

  const deleteMutation = useMutation({
    mutationFn: (messageId: string) => messageApi.remove(messageId),
    onSuccess: (message) => {
      updateMessageInCache(message);
      setSelectedId(null);
    },
    onError: () => Alert.alert("Could not delete message", "Please try again."),
  });

  const reactionMutation = useMutation({
    mutationFn: (input: { messageId: string; emoji: string }) =>
      messageApi.toggleReaction(input.messageId, input.emoji),
    onSuccess: (message) => updateMessageInCache(message),
  });

  const handleChangeText = (value: string) => {
    setText(value);

    if (!id || !socket.connected) return;

    socket.emit("typing-conversation", {
      conversationId: id,
      isTyping: value.length > 0,
    });

    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (value.length > 0) {
      typingTimer.current = setTimeout(() => {
        socket.emit("typing-conversation", {
          conversationId: id,
          isTyping: false,
        });
      }, 1500);
    }
  };

  const handleSend = () => {
    const content = text.trim();
    if (!content || !id) return;

    if (editing) {
      editMutation.mutate({ messageId: editing.id, content });
      return;
    }

    sendMutation.mutate({ content, replyToId: replyTo?.id });
  };

  const startReply = (message: Message) => {
    setEditing(null);
    setReplyTo(message);
    setSelectedId(null);
  };

  const startEdit = (message: Message) => {
    setReplyTo(null);
    setEditing(message);
    setSelectedId(null);
    setText(message.content);
  };

  const confirmDelete = (message: Message) => {
    setSelectedId(null);
    Alert.alert("Delete message?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMutation.mutate(message.id),
      },
    ]);
  };

  const cancelComposerContext = () => {
    setEditing(null);
    setReplyTo(null);
    setText("");
  };

  const typingNames = Object.keys(typingUsers)
    .map((userId) => {
      const participant = conversation?.participants?.find(
        (item) => item.id === userId,
      );
      return participant?.name ?? participant?.email;
    })
    .filter((name): name is string => Boolean(name));

  const typingLabel = typingNames.length
    ? `${typingNames.join(", ")} ${typingNames.length === 1 ? "is" : "are"} typing…`
    : null;

  const renderMessage = ({ item }: { item: Message }) => {
    const own = item.senderId === currentUserId;
    const selected = selectedId === item.id;
    const reactionCounts = (item.reactions ?? []).reduce<
      Record<string, { count: number; mine: boolean }>
    >((counts, reaction) => {
      const current = counts[reaction.emoji] ?? { count: 0, mine: false };
      counts[reaction.emoji] = {
        count: current.count + 1,
        mine: current.mine || reaction.userId === currentUserId,
      };
      return counts;
    }, {});
    const edited =
      item.updatedAt && item.updatedAt !== item.createdAt && !item.deletedAt;

    return (
      <View style={[styles.messageRow, own && styles.messageRowOwn]}>
        <View style={styles.messageColumn}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedId(selected ? null : item.id)}
            style={[
              styles.bubble,
              own ? styles.bubbleOwn : styles.bubbleOther,
              selected && styles.bubbleSelected,
            ]}
          >
            {!own && conversation?.isGroup ? (
              <Text style={styles.senderName}>
                {item.sender?.name ?? item.sender?.email ?? "Member"}
              </Text>
            ) : null}

            {item.replyTo ? (
              <View style={styles.replyPreview}>
                <Text style={styles.replyName}>
                  {item.replyTo.senderName ?? "Message"}
                </Text>
                <Text style={styles.replyText} numberOfLines={1}>
                  {item.replyTo.deleted
                    ? "Message deleted"
                    : (item.replyTo.preview ??
                      item.replyTo.content ??
                      "Original message")}
                </Text>
              </View>
            ) : null}

            <Text
              style={[
                styles.content,
                own && styles.contentOwn,
                item.deletedAt && styles.deletedContent,
              ]}
            >
              {item.deletedAt ? "This message was deleted" : item.content}
            </Text>

            <View style={styles.metaRow}>
              {edited ? <Text style={styles.meta}>edited</Text> : null}
              <Text style={styles.meta}>
                {new Date(item.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              {own ? (
                <Text style={styles.meta}>
                  {item.readAt ? "Read ✓✓" : "Sent ✓"}
                </Text>
              ) : null}
            </View>

            {Object.keys(reactionCounts).length > 0 ? (
              <View style={styles.reactions}>
                {Object.entries(reactionCounts).map(([emoji, data]) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.reactionChip,
                      data.mine && styles.reactionChipMine,
                    ]}
                    onPress={() =>
                      reactionMutation.mutate({ messageId: item.id, emoji })
                    }
                  >
                    <Text style={styles.reactionText}>
                      {emoji} {data.count}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </TouchableOpacity>

          {selected ? (
            <View
              style={[
                styles.actions,
                own ? styles.actionsOwn : styles.actionsOther,
              ]}
            >
              <View style={styles.quickReactions}>
                {QUICK_REACTIONS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() =>
                      reactionMutation.mutate({ messageId: item.id, emoji })
                    }
                  >
                    <Text style={styles.quickReaction}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.actionLinks}>
                <TouchableOpacity onPress={() => startReply(item)}>
                  <Text style={styles.actionText}>Reply</Text>
                </TouchableOpacity>
                {own && !item.deletedAt ? (
                  <>
                    <TouchableOpacity onPress={() => startEdit(item)}>
                      <Text style={styles.actionText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDelete(item)}>
                      <Text style={[styles.actionText, styles.danger]}>
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: conversation?.name ?? "Chat" }} />

      {messagesQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={palette.primary} />
        </View>
      ) : (
        <FlatList
          data={messages}
          inverted
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.list}
          onEndReachedThreshold={0.35}
          onEndReached={() => {
            if (
              messagesQuery.hasNextPage &&
              !messagesQuery.isFetchingNextPage
            ) {
              void messagesQuery.fetchNextPage();
            }
          }}
          ListFooterComponent={
            messagesQuery.isFetchingNextPage ? (
              <ActivityIndicator
                style={styles.pageLoader}
                color={palette.textMuted}
              />
            ) : undefined
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No messages yet. Say hello.</Text>
            </View>
          }
        />
      )}

      {typingLabel ? <Text style={styles.typing}>{typingLabel}</Text> : null}

      {editing || replyTo ? (
        <View style={styles.composerContext}>
          <View style={styles.composerContextBody}>
            <Text style={styles.composerContextTitle}>
              {editing
                ? "Editing message"
                : `Replying to ${replyTo?.sender?.name ?? "message"}`}
            </Text>
            {!editing && replyTo ? (
              <Text style={styles.composerContextText} numberOfLines={1}>
                {replyTo.deletedAt ? "Message deleted" : replyTo.content}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity onPress={cancelComposerContext}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={editing ? "Edit message" : "Message"}
          placeholderTextColor={palette.textMuted}
          value={text}
          onChangeText={handleChangeText}
          multiline
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!text.trim() ||
              sendMutation.isPending ||
              editMutation.isPending) &&
              styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={
            !text.trim() || sendMutation.isPending || editMutation.isPending
          }
        >
          <Text style={styles.sendText}>
            {editing ? "Save" : sendMutation.isPending ? "…" : "Send"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

type Palette = ReturnType<typeof useAppTheme>["palette"];

const createStyles = (palette: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    list: { padding: 12, gap: 8 },
    messageRow: { flexDirection: "row", justifyContent: "flex-start" },
    messageRowOwn: { justifyContent: "flex-end" },
    messageColumn: { maxWidth: "82%", gap: 6 },
    bubble: {
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 9,
      gap: 6,
      borderWidth: 1,
      borderColor: "transparent",
    },
    bubbleOther: {
      backgroundColor: palette.surface,
      borderColor: palette.divider,
    },
    bubbleOwn: { backgroundColor: palette.primary },
    bubbleSelected: { borderColor: palette.primary },
    senderName: {
      color: palette.textMuted,
      fontSize: 11,
      fontWeight: "600",
    },
    content: { color: palette.text, fontSize: 15, lineHeight: 20 },
    contentOwn: { color: palette.primaryText },
    deletedContent: { fontStyle: "italic", opacity: 0.7 },
    metaRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 6,
      flexWrap: "wrap",
    },
    meta: { color: palette.textMuted, fontSize: 10 },
    replyPreview: {
      borderLeftWidth: 3,
      borderLeftColor: palette.textMuted,
      paddingLeft: 8,
      gap: 2,
    },
    replyName: {
      color: palette.textMuted,
      fontSize: 11,
      fontWeight: "600",
    },
    replyText: { color: palette.textMuted, fontSize: 12 },
    reactions: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
    reactionChip: {
      backgroundColor: palette.background,
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    reactionChipMine: { borderWidth: 1, borderColor: palette.primary },
    reactionText: { fontSize: 12, color: palette.text },
    actions: {
      backgroundColor: palette.surfaceMuted,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.divider,
      padding: 8,
      gap: 8,
    },
    actionsOwn: { alignSelf: "flex-end" },
    actionsOther: { alignSelf: "flex-start" },
    quickReactions: { flexDirection: "row", gap: 10 },
    quickReaction: { fontSize: 20 },
    actionLinks: { flexDirection: "row", gap: 14 },
    actionText: { color: palette.text, fontSize: 12, fontWeight: "600" },
    danger: { color: palette.danger },
    typing: {
      color: palette.textMuted,
      fontSize: 12,
      paddingHorizontal: 16,
      paddingBottom: 4,
    },
    composerContext: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: palette.divider,
      backgroundColor: palette.surfaceMuted,
    },
    composerContextBody: { flex: 1, gap: 2 },
    composerContextTitle: {
      color: palette.text,
      fontSize: 12,
      fontWeight: "600",
    },
    composerContextText: { color: palette.textMuted, fontSize: 12 },
    cancel: { color: palette.primary, fontSize: 12, fontWeight: "600" },
    inputRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 8,
      padding: 8,
      borderTopWidth: 1,
      borderTopColor: palette.divider,
      backgroundColor: palette.background,
    },
    input: {
      flex: 1,
      maxHeight: 120,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: palette.text,
      backgroundColor: palette.surfaceMuted,
    },
    sendButton: {
      backgroundColor: palette.primary,
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    sendButtonDisabled: { opacity: 0.45 },
    sendText: {
      color: palette.primaryText,
      fontWeight: "600",
    },
    pageLoader: { paddingVertical: 12 },
    empty: {
      transform: [{ scaleY: -1 }],
      alignItems: "center",
      paddingTop: 40,
    },
    emptyText: { color: palette.textMuted, fontSize: 14 },
  });
