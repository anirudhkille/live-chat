import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { File } from "expo-file-system";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";

import { attachmentApi } from "@/features/attachments/api/attachment-api";
import {
  conversationApi,
  messageApi,
} from "@/features/conversations/api/conversation-api";
import { socket } from "@/lib/socket";
import { useAuthStore } from "@/store/auth-store";
import { useAppTheme } from "@/theme/use-app-theme";
import { getApiErrorMessage, type Attachment, type Message } from "@/types/api";

const PAGE_SIZE = 30;
const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const MAX_ATTACHMENTS = 4;
const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;
const MAX_IMAGE_WIDTH = 220;
const MAX_IMAGE_HEIGHT = 220;

type PendingAttachment = {
  id: string;
  uri: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  width?: number;
  height?: number;
  duration?: string;
  status: "uploading" | "ready" | "error";
  attachment: Attachment | null;
  error?: string;
};

function createPendingId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getImageContentType(asset: ImagePicker.ImagePickerAsset) {
  if (asset.mimeType) return asset.mimeType;
  const name = (asset.fileName ?? asset.uri).toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".heic") || name.endsWith(".heif")) return "image/heic";
  return "image/jpeg";
}

function getAssetFileSize(asset: ImagePicker.ImagePickerAsset) {
  if (asset.fileSize && asset.fileSize > 0) return asset.fileSize;
  try {
    return new File(asset.uri).size;
  } catch {
    return 0;
  }
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function getAttachmentImageSize(width?: number | null, height?: number | null) {
  const sourceWidth = width && width > 0 ? width : MAX_IMAGE_WIDTH;
  const sourceHeight = height && height > 0 ? height : MAX_IMAGE_HEIGHT;
  const scale = Math.min(
    MAX_IMAGE_WIDTH / sourceWidth,
    MAX_IMAGE_HEIGHT / sourceHeight,
    1,
  );
  return {
    width: Math.round(sourceWidth * scale),
    height: Math.round(sourceHeight * scale),
  };
}

function formatDurationMillis(durationMillis: number) {
  const totalSeconds = Math.max(0, Math.round(durationMillis / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatDurationSeconds(seconds: number) {
  return formatDurationMillis(Math.max(0, seconds) * 1000);
}

function parseDurationLabel(value?: string | null) {
  if (!value) return 0;
  const [minutes, seconds] = value.split(":").map(Number);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return 0;
  return minutes * 60 + seconds;
}

function getVoiceFileInfo(uri: string) {
  const path = uri.split(/[?#]/)[0].toLowerCase();

  if (path.endsWith(".webm")) {
    return { contentType: "audio/webm", extension: "webm" };
  }
  if (path.endsWith(".ogg") || path.endsWith(".opus")) {
    return { contentType: "audio/ogg", extension: "ogg" };
  }
  if (path.endsWith(".mp3") || path.endsWith(".mpeg")) {
    return { contentType: "audio/mpeg", extension: "mp3" };
  }
  if (path.endsWith(".wav")) {
    return { contentType: "audio/wav", extension: "wav" };
  }
  if (path.endsWith(".aac")) {
    return { contentType: "audio/aac", extension: "aac" };
  }
  if (path.endsWith(".m4a") || path.endsWith(".mp4")) {
    return { contentType: "audio/mp4", extension: "m4a" };
  }

  if (Platform.OS === "web") {
    return { contentType: "audio/webm", extension: "webm" };
  }
  return { contentType: "audio/mp4", extension: "m4a" };
}

function deleteRecordingFile(uri?: string | null) {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Cached recordings can be cleaned up by the OS later if this fails.
  }
}

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

function GroupInfoHeaderButton() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { palette } = useAppTheme();

  return (
    <TouchableOpacity
      style={{ paddingHorizontal: 16 }}
      onPress={() => router.push(`/group/${id}`)}
      accessibilityLabel="Group info"
      accessibilityRole="button"
    >
      <Ionicons
        name="information-circle-outline"
        size={24}
        color={palette.text}
      />
    </TouchableOpacity>
  );
}

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
  const [pendingAttachments, setPendingAttachments] = useState<
    PendingAttachment[]
  >([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const voiceRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(voiceRecorder, 250);
  const [recordingActive, setRecordingActive] = useState(false);
  const [startingRecording, setStartingRecording] = useState(false);
  const [finalizingRecording, setFinalizingRecording] = useState(false);

  const uploadingAttachments = pendingAttachments.some(
    (attachment) => attachment.status === "uploading",
  );
  const readyAttachmentIds = useMemo(
    () =>
      pendingAttachments.flatMap((attachment) =>
        attachment.status === "ready" && attachment.attachment
          ? [attachment.attachment.id]
          : [],
      ),
    [pendingAttachments],
  );

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

  useEffect(() => {
    return () => {
      if (voiceRecorder.isRecording) {
        void voiceRecorder.stop().catch(() => undefined);
      }
      void setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
      }).catch(() => undefined);
    };
  }, [voiceRecorder]);

  const sendMutation = useMutation({
    mutationFn: (input: {
      content: string;
      replyToId?: string;
      attachmentIds?: string[];
    }) =>
      messageApi.send(id!, input.content, {
        replyToId: input.replyToId,
        attachmentIds: input.attachmentIds,
      }),
    onSuccess: (message) => {
      addMessageToCache(message);
      setText("");
      setReplyTo(null);
      setPendingAttachments([]);
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

  const removePendingAttachment = (pendingId: string) => {
    setPendingAttachments((attachments) =>
      attachments.filter((attachment) => attachment.id !== pendingId),
    );
  };

  const uploadPendingAttachment = async (pending: PendingAttachment) => {
    try {
      const attachment = await attachmentApi.upload({
        uri: pending.uri,
        contentType: pending.contentType,
        fileName: pending.fileName,
        fileSize: pending.fileSize,
        width: pending.width,
        height: pending.height,
        duration: pending.duration,
      });
      setPendingAttachments((attachments) =>
        attachments.map((item) =>
          item.id === pending.id
            ? { ...item, status: "ready", attachment, error: undefined }
            : item,
        ),
      );
    } catch (error) {
      setPendingAttachments((attachments) =>
        attachments.map((item) =>
          item.id === pending.id
            ? {
                ...item,
                status: "error",
                error: getApiErrorMessage(error, "Upload failed"),
              }
            : item,
        ),
      );
    }
  };

  const pickAttachments = async () => {
    if (!id || editing) return;

    const remaining = MAX_ATTACHMENTS - pendingAttachments.length;
    if (remaining <= 0) {
      Alert.alert(
        "Attachment limit",
        `You can attach up to ${MAX_ATTACHMENTS} files per message.`,
      );
      return;
    }

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Allow photo library access to attach images.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.8,
      });
      if (result.canceled) return;

      const next: PendingAttachment[] = [];
      let skippedForSize = 0;

      for (const asset of result.assets.slice(0, remaining)) {
        const fileSize = getAssetFileSize(asset);
        if (!fileSize || fileSize > MAX_ATTACHMENT_SIZE) {
          skippedForSize += 1;
          continue;
        }

        next.push({
          id: createPendingId(),
          uri: asset.uri,
          fileName: asset.fileName ?? asset.uri.split("/").pop() ?? "image.jpg",
          contentType: getImageContentType(asset),
          fileSize,
          width: asset.width || undefined,
          height: asset.height || undefined,
          status: "uploading",
          attachment: null,
        });
      }

      if (skippedForSize > 0) {
        Alert.alert(
          "File too large",
          `Each attachment must be 5MB or smaller. ${skippedForSize} file${
            skippedForSize === 1 ? " was" : "s were"
          } skipped.`,
        );
      }
      if (!next.length) return;

      setPendingAttachments((attachments) => [...attachments, ...next]);
      next.forEach((pending) => {
        void uploadPendingAttachment(pending);
      });
    } catch {
      Alert.alert("Could not attach image", "Please try again.");
    }
  };

  const startRecording = async () => {
    if (!id || editing || startingRecording || recordingActive) return;

    if (pendingAttachments.length >= MAX_ATTACHMENTS) {
      Alert.alert(
        "Attachment limit",
        `You can attach up to ${MAX_ATTACHMENTS} files per message.`,
      );
      return;
    }

    setStartingRecording(true);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Microphone permission needed",
          "Allow microphone access to record voice notes.",
        );
        return;
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
      await voiceRecorder.prepareToRecordAsync();
      voiceRecorder.record();
      setRecordingActive(true);
    } catch {
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
      }).catch(() => undefined);
      Alert.alert("Could not start recording", "Please try again.");
    } finally {
      setStartingRecording(false);
    }
  };

  const finishRecording = async (shouldAttach: boolean) => {
    if (!recordingActive || finalizingRecording) return;

    setFinalizingRecording(true);
    const recorderStatus = voiceRecorder.getStatus();
    const durationMillis = Math.max(
      recorderStatus.durationMillis,
      recorderState.durationMillis,
    );
    let recordingUri = recorderStatus.url ?? voiceRecorder.uri;

    try {
      await voiceRecorder.stop();
      recordingUri = voiceRecorder.uri ?? recorderStatus.url ?? recordingUri;
    } catch {
      Alert.alert("Recording error", "Could not finish the voice note.");
    }

    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
    }).catch(() => undefined);

    if (!shouldAttach) {
      deleteRecordingFile(recordingUri);
      setRecordingActive(false);
      setFinalizingRecording(false);
      return;
    }

    if (!recordingUri) {
      Alert.alert("Voice note unavailable", "Please try recording again.");
      setRecordingActive(false);
      setFinalizingRecording(false);
      return;
    }

    let fileSize = recorderStatus.fileSize;
    try {
      fileSize = new File(recordingUri).size || fileSize;
    } catch {
      // Fall back to the recorder-reported size.
    }
    const { contentType, extension } = getVoiceFileInfo(recordingUri);
    if (!fileSize) {
      deleteRecordingFile(recordingUri);
      Alert.alert("Voice note unavailable", "The recording could not be read.");
      setRecordingActive(false);
      setFinalizingRecording(false);
      return;
    }

    if (fileSize > MAX_ATTACHMENT_SIZE) {
      deleteRecordingFile(recordingUri);
      Alert.alert(
        "Voice note too large",
        "Voice notes must be 5MB or smaller. Try a shorter recording.",
      );
      setRecordingActive(false);
      setFinalizingRecording(false);
      return;
    }

    if (pendingAttachments.length >= MAX_ATTACHMENTS) {
      deleteRecordingFile(recordingUri);
      Alert.alert(
        "Attachment limit",
        `You can attach up to ${MAX_ATTACHMENTS} files per message.`,
      );
      setRecordingActive(false);
      setFinalizingRecording(false);
      return;
    }

    const pending: PendingAttachment = {
      id: createPendingId(),
      uri: recordingUri,
      fileName: `voice-${Date.now()}.${extension}`,
      contentType,
      fileSize,
      duration: formatDurationMillis(durationMillis),
      status: "uploading",
      attachment: null,
    };

    setPendingAttachments((attachments) => [...attachments, pending]);
    setRecordingActive(false);
    setFinalizingRecording(false);
    void uploadPendingAttachment(pending);
  };

  const handleSend = () => {
    const content = text.trim();
    if (!id) return;

    if (editing) {
      if (!content) return;
      editMutation.mutate({ messageId: editing.id, content });
      return;
    }

    if (uploadingAttachments) return;
    if (!content && readyAttachmentIds.length === 0) return;

    sendMutation.mutate({
      content,
      replyToId: replyTo?.id,
      attachmentIds: readyAttachmentIds,
    });
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
    setPendingAttachments([]);
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

  const sendDisabled = editing
    ? !text.trim() || editMutation.isPending
    : (!text.trim() && readyAttachmentIds.length === 0) ||
      uploadingAttachments ||
      sendMutation.isPending;

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

            {item.attachments?.length ? (
              <View style={styles.attachments}>
                {item.attachments.map((attachment) => {
                  if (attachment.type === "IMAGE") {
                    return (
                      <Image
                        key={attachment.id}
                        source={{ uri: attachment.url }}
                        style={[
                          styles.attachmentImage,
                          getAttachmentImageSize(
                            attachment.width,
                            attachment.height,
                          ),
                        ]}
                        resizeMode="cover"
                      />
                    );
                  }

                  if (attachment.type === "AUDIO") {
                    return (
                      <AudioAttachmentBubble
                        key={attachment.id}
                        attachment={attachment}
                        styles={styles}
                      />
                    );
                  }

                  return (
                    <View key={attachment.id} style={styles.fileAttachment}>
                      <Text style={styles.fileAttachmentIcon}>📄</Text>
                      <View style={styles.fileAttachmentBody}>
                        <Text
                          style={styles.fileAttachmentName}
                          numberOfLines={1}
                        >
                          {attachment.fileName}
                        </Text>
                        {attachment.fileSize > 0 ? (
                          <Text style={styles.fileAttachmentSize}>
                            {formatFileSize(attachment.fileSize)}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}

            {item.deletedAt || item.content ? (
              <Text
                style={[
                  styles.content,
                  own && styles.contentOwn,
                  item.deletedAt && styles.deletedContent,
                ]}
              >
                {item.deletedAt ? "This message was deleted" : item.content}
              </Text>
            ) : null}

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
      <Stack.Screen
        options={{
          title: conversation?.name ?? "Chat",
          headerRight: conversation?.isGroup
            ? GroupInfoHeaderButton
            : undefined,
        }}
      />

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

      {pendingAttachments.length > 0 ? (
        <View style={styles.attachmentStrip}>
          {pendingAttachments.map((attachment) => (
            <View key={attachment.id} style={styles.attachmentChip}>
              {attachment.contentType.startsWith("image/") ? (
                <Image
                  source={{ uri: attachment.uri }}
                  style={styles.attachmentThumb}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.attachmentThumb}>
                  <Text style={styles.attachmentThumbIcon}>
                    {attachment.contentType.startsWith("audio/") ? "🎤" : "📄"}
                  </Text>
                </View>
              )}
              <View style={styles.attachmentChipBody}>
                <Text style={styles.attachmentChipName} numberOfLines={1}>
                  {attachment.fileName}
                </Text>
                <Text
                  style={[
                    styles.attachmentChipStatus,
                    attachment.status === "error" && styles.attachmentChipError,
                  ]}
                  numberOfLines={1}
                >
                  {attachment.status === "uploading"
                    ? "Uploading…"
                    : attachment.status === "ready"
                      ? attachment.duration
                        ? `${attachment.duration} • ${formatFileSize(
                            attachment.fileSize,
                          )}`
                        : formatFileSize(attachment.fileSize)
                      : (attachment.error ?? "Upload failed")}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => removePendingAttachment(attachment.id)}
                hitSlop={8}
                accessibilityLabel={`Remove ${attachment.fileName}`}
              >
                <Text style={styles.attachmentRemove}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}

      {recordingActive ? (
        <View style={styles.recordingBar}>
          <TouchableOpacity
            style={[
              styles.recordingCancelButton,
              finalizingRecording && styles.attachButtonDisabled,
            ]}
            onPress={() => {
              void finishRecording(false);
            }}
            disabled={finalizingRecording}
            accessibilityLabel="Cancel voice note"
          >
            <Text style={styles.recordingCancelText}>Cancel</Text>
          </TouchableOpacity>
          <View style={styles.recordingStatus}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingTime}>
              {formatDurationMillis(recorderState.durationMillis)}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.recordingSendButton,
              finalizingRecording && styles.attachButtonDisabled,
            ]}
            onPress={() => {
              void finishRecording(true);
            }}
            disabled={finalizingRecording}
            accessibilityLabel="Stop and attach voice note"
          >
            {finalizingRecording ? (
              <ActivityIndicator color={palette.primaryText} size="small" />
            ) : (
              <Text style={styles.recordingSendText}>Stop</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.inputRow}>
          <TouchableOpacity
            style={[
              styles.attachButton,
              (editing ||
                startingRecording ||
                sendMutation.isPending ||
                pendingAttachments.length >= MAX_ATTACHMENTS) &&
                styles.attachButtonDisabled,
            ]}
            onPress={() => {
              void pickAttachments();
            }}
            disabled={
              !!editing ||
              startingRecording ||
              sendMutation.isPending ||
              pendingAttachments.length >= MAX_ATTACHMENTS
            }
            accessibilityLabel="Attach image"
          >
            <Text style={styles.attachText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.attachButton,
              (editing ||
                startingRecording ||
                sendMutation.isPending ||
                pendingAttachments.length >= MAX_ATTACHMENTS) &&
                styles.attachButtonDisabled,
            ]}
            onPress={() => {
              void startRecording();
            }}
            disabled={
              !!editing ||
              startingRecording ||
              sendMutation.isPending ||
              pendingAttachments.length >= MAX_ATTACHMENTS
            }
            accessibilityLabel="Record voice note"
          >
            {startingRecording ? (
              <ActivityIndicator color={palette.text} size="small" />
            ) : (
              <Text style={styles.micText}>🎤</Text>
            )}
          </TouchableOpacity>
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
              sendDisabled && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={sendDisabled}
          >
            <Text style={styles.sendText}>
              {editing ? "Save" : sendMutation.isPending ? "…" : "Send"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
    attachments: { gap: 6 },
    attachmentImage: {
      borderRadius: 10,
      backgroundColor: palette.surfaceMuted,
    },
    fileAttachment: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.divider,
      backgroundColor: palette.surfaceMuted,
    },
    fileAttachmentIcon: { fontSize: 18 },
    fileAttachmentBody: { flex: 1, gap: 2 },
    fileAttachmentName: {
      color: palette.text,
      fontSize: 13,
      fontWeight: "600",
    },
    fileAttachmentSize: { color: palette.textMuted, fontSize: 11 },
    audioAttachment: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      minWidth: 200,
      padding: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.divider,
      backgroundColor: palette.surfaceMuted,
    },
    audioPlayButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.primary,
    },
    audioPlayIcon: {
      color: palette.primaryText,
      fontSize: 12,
      fontWeight: "700",
    },
    audioBody: { flex: 1, gap: 4 },
    audioName: { color: palette.text, fontSize: 12, fontWeight: "600" },
    audioProgressTrack: {
      height: 3,
      borderRadius: 2,
      overflow: "hidden",
      backgroundColor: palette.border,
    },
    audioProgressFill: {
      height: 3,
      borderRadius: 2,
      backgroundColor: palette.textMuted,
    },
    audioDuration: { color: palette.textMuted, fontSize: 10 },
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
    attachmentStrip: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      paddingHorizontal: 12,
      paddingTop: 8,
      backgroundColor: palette.background,
      borderTopWidth: 1,
      borderTopColor: palette.divider,
    },
    attachmentChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      maxWidth: "100%",
      padding: 6,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceMuted,
    },
    attachmentThumb: {
      width: 40,
      height: 40,
      borderRadius: 6,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.surface,
    },
    attachmentThumbIcon: { fontSize: 18 },
    attachmentChipBody: { flexShrink: 1, gap: 2 },
    attachmentChipName: {
      color: palette.text,
      fontSize: 12,
      fontWeight: "600",
      maxWidth: 150,
    },
    attachmentChipStatus: { color: palette.textMuted, fontSize: 10 },
    attachmentChipError: { color: palette.danger },
    attachmentRemove: {
      color: palette.textMuted,
      fontSize: 18,
      fontWeight: "600",
      paddingHorizontal: 2,
    },
    attachButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceMuted,
    },
    attachButtonDisabled: { opacity: 0.45 },
    attachText: {
      color: palette.text,
      fontSize: 22,
      fontWeight: "500",
      lineHeight: 26,
    },
    micText: { fontSize: 17 },
    recordingBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: palette.divider,
      backgroundColor: palette.surfaceMuted,
    },
    recordingCancelButton: {
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.background,
    },
    recordingCancelText: {
      color: palette.text,
      fontSize: 13,
      fontWeight: "600",
    },
    recordingStatus: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    recordingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: palette.danger,
    },
    recordingTime: {
      color: palette.text,
      fontSize: 14,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },
    recordingSendButton: {
      minWidth: 68,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.primary,
    },
    recordingSendText: {
      color: palette.primaryText,
      fontSize: 13,
      fontWeight: "600",
    },
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

function AudioAttachmentBubble({
  attachment,
  styles,
}: {
  attachment: Attachment;
  styles: ReturnType<typeof createStyles>;
}) {
  const player = useAudioPlayer(attachment.url, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    return () => {
      try {
        player.pause();
        player.remove();
      } catch {
        // The player may already be released by expo-audio on unmount.
      }
    };
  }, [player]);

  const storedDuration = parseDurationLabel(attachment.duration);
  const duration = status.duration > 0 ? status.duration : storedDuration;
  const position =
    duration > 0 ? Math.min(status.currentTime, duration) : status.currentTime;
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;
  const durationLabel = status.playing
    ? `${formatDurationSeconds(position)} / ${formatDurationSeconds(duration)}`
    : formatDurationSeconds(duration);

  const togglePlayback = () => {
    if (status.playing) {
      player.pause();
      return;
    }

    if (
      status.didJustFinish ||
      (duration > 0 && status.currentTime >= duration - 0.25)
    ) {
      void player
        .seekTo(0)
        .then(() => player.play())
        .catch(() => undefined);
      return;
    }

    player.play();
  };

  return (
    <View style={styles.audioAttachment}>
      <TouchableOpacity
        style={styles.audioPlayButton}
        onPress={togglePlayback}
        accessibilityLabel={
          status.playing ? "Pause voice note" : "Play voice note"
        }
      >
        <Text style={styles.audioPlayIcon}>{status.playing ? "❚❚" : "▶"}</Text>
      </TouchableOpacity>
      <View style={styles.audioBody}>
        <Text style={styles.audioName} numberOfLines={1}>
          {attachment.fileName}
        </Text>
        <View style={styles.audioProgressTrack}>
          <View
            style={[styles.audioProgressFill, { width: `${progress * 100}%` }]}
          />
        </View>
        <Text style={styles.audioDuration}>{durationLabel}</Text>
      </View>
    </View>
  );
}
