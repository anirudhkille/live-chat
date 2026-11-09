import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { File, UploadType } from "expo-file-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ParticipantPicker } from "@/features/groups/components/participant-picker";
import { UserAvatar } from "@/features/groups/components/user-avatar";
import { conversationApi } from "@/features/conversations/api/conversation-api";
import { useAuthStore } from "@/store/auth-store";
import { useAppTheme } from "@/theme/use-app-theme";
import {
  getApiErrorMessage,
  type GroupParticipant,
  type User,
} from "@/types/api";

const ALLOWED_GROUP_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_GROUP_PHOTO_SIZE = 5 * 1024 * 1024;

function getGroupPhotoContentType(asset: ImagePicker.ImagePickerAsset) {
  const mimeType = asset.mimeType?.toLowerCase();
  if (mimeType && ALLOWED_GROUP_PHOTO_TYPES.includes(mimeType)) {
    return mimeType;
  }

  const name = (asset.fileName ?? asset.uri).toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export default function GroupDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = id ?? "";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const currentUserId = useAuthStore((state) => state.user?.id);

  const [draftName, setDraftName] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [toAdd, setToAdd] = useState<User[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const initializedId = useRef<string | null>(null);

  const conversationQuery = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => conversationApi.getById(conversationId),
    enabled: !!conversationId,
  });
  const conversation = conversationQuery.data;
  const isGroup = !!conversation?.isGroup;

  const participantsQuery = useQuery({
    queryKey: ["participants", conversationId],
    queryFn: () => conversationApi.getParticipants(conversationId),
    enabled: !!conversationId && isGroup,
  });

  const participants =
    participantsQuery.data ?? conversation?.participants ?? [];
  const isAdmin =
    conversation?.currentUserRole === "admin" ||
    participants.some(
      (participant) =>
        participant.id === currentUserId && participant.role === "admin",
    );

  useEffect(() => {
    if (!conversation || initializedId.current === conversation.id) return;
    initializedId.current = conversation.id;
    setDraftName(conversation.name ?? "");
  }, [conversation]);

  const renameGroup = useMutation({
    mutationFn: (name: string) =>
      conversationApi.updateGroup(conversationId, { name }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["conversation", conversationId], updated);
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setDraftName(updated.name ?? "");
      setActionError(null);
    },
    onError: (error) =>
      setActionError(getApiErrorMessage(error, "Could not rename the group.")),
  });

  const addParticipants = useMutation({
    mutationFn: (participantIds: string[]) =>
      conversationApi.addParticipants(conversationId, participantIds),
    onSuccess: (result) => {
      queryClient.setQueryData(
        ["participants", conversationId],
        result.participants,
      );
      void queryClient.invalidateQueries({
        queryKey: ["conversation", conversationId],
      });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setToAdd([]);
      setAddOpen(false);
      setActionError(null);
    },
    onError: (error) =>
      setActionError(getApiErrorMessage(error, "Could not add members.")),
  });

  const removeParticipant = useMutation({
    mutationFn: (userId: string) =>
      conversationApi.removeParticipant(conversationId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["participants", conversationId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["conversation", conversationId],
      });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setActionError(null);
    },
    onError: (error) =>
      setActionError(getApiErrorMessage(error, "Could not remove the member.")),
  });

  const deleteGroup = useMutation({
    mutationFn: () => conversationApi.deleteGroup(conversationId),
    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: ["conversation", conversationId],
      });
      queryClient.removeQueries({
        queryKey: ["participants", conversationId],
      });
      queryClient.removeQueries({ queryKey: ["messages", conversationId] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      if (router.canGoBack()) {
        router.dismissAll();
      } else {
        router.replace("/(tabs)");
      }
    },
    onError: (error) =>
      Alert.alert(
        "Could not delete group",
        getApiErrorMessage(error, "Please try again."),
      ),
  });

  const toggleAddUser = (user: User) => {
    setActionError(null);
    setToAdd((current) =>
      current.some((item) => item.id === user.id)
        ? current.filter((item) => item.id !== user.id)
        : [...current, user],
    );
  };

  const handleRename = () => {
    const trimmed = draftName.trim();
    if (!trimmed) {
      setActionError("Group name can't be empty.");
      return;
    }
    if (trimmed === conversation?.name) return;
    renameGroup.mutate(trimmed);
  };

  const handleAddMembers = () => {
    if (toAdd.length === 0) return;
    addParticipants.mutate(toAdd.map((user) => user.id));
  };

  const confirmRemove = (participant: GroupParticipant) => {
    if (participant.id === currentUserId) return;
    const label = participant.name ?? participant.email;
    Alert.alert(`Remove ${label}?`, "They will lose access to this group.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removeParticipant.mutate(participant.id),
      },
    ]);
  };

  const confirmDelete = () => {
    Alert.alert(
      "Delete group?",
      "This permanently deletes the conversation and its messages.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteGroup.mutate(),
        },
      ],
    );
  };

  const handlePickPhoto = async () => {
    if (!isAdmin || photoUploading || !conversationId) return;

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Allow photo library access to change the group photo.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset) return;

      let fileSize = asset.fileSize ?? 0;
      try {
        fileSize = new File(asset.uri).size || fileSize;
      } catch {
        // Fall back to the picker-reported size.
      }
      if (fileSize > MAX_GROUP_PHOTO_SIZE) {
        Alert.alert("Photo too large", "Choose an image smaller than 5MB.");
        return;
      }

      setPhotoUploading(true);
      setActionError(null);

      const contentType = getGroupPhotoContentType(asset);
      const { uploadUrl, key } =
        await conversationApi.getGroupPhotoUploadUrl(contentType);
      const file = new File(asset.uri);
      const upload = await file.upload(uploadUrl, {
        httpMethod: "PUT",
        uploadType: UploadType.BINARY_CONTENT,
        mimeType: contentType,
        headers: { "Content-Type": contentType },
      });
      if (upload.status < 200 || upload.status >= 300) {
        throw new Error(`Upload failed with status ${upload.status}`);
      }

      const updated = await conversationApi.updateGroup(conversationId, {
        photoKey: key,
      });
      queryClient.setQueryData(["conversation", conversationId], updated);
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    } catch (error) {
      Alert.alert(
        "Could not update photo",
        getApiErrorMessage(error, "Please try again."),
      );
    } finally {
      setPhotoUploading(false);
    }
  };

  if (conversationQuery.isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: "Group info" }} />
        <View style={styles.center}>
          <ActivityIndicator color={palette.primary} />
        </View>
      </>
    );
  }

  if (conversationQuery.isError || !conversation) {
    return (
      <>
        <Stack.Screen options={{ title: "Group info" }} />
        <View style={styles.center}>
          <Text style={styles.mutedText}>Could not load this group.</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => void conversationQuery.refetch()}
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  if (!conversation.isGroup) {
    return (
      <>
        <Stack.Screen options={{ title: "Conversation info" }} />
        <View style={styles.center}>
          <Text style={styles.mutedText}>
            This conversation is not a group.
          </Text>
        </View>
      </>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: conversation.name ?? "Group info" }} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 16) + 16 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.headerCard}>
          <TouchableOpacity
            style={styles.photoWrapper}
            onPress={() => void handlePickPhoto()}
            disabled={!isAdmin || photoUploading}
            accessibilityLabel={isAdmin ? "Change group photo" : "Group photo"}
          >
            {conversation.photoUrl ? (
              <Image
                source={{ uri: conversation.photoUrl }}
                style={styles.photo}
              />
            ) : (
              <UserAvatar name={conversation.name} size={88} />
            )}
            {isAdmin ? (
              <View style={styles.photoBadge}>
                <Ionicons name="camera" size={14} color={palette.primaryText} />
              </View>
            ) : null}
            {photoUploading ? (
              <View style={styles.photoOverlay}>
                <ActivityIndicator color={palette.primaryText} size="small" />
              </View>
            ) : null}
          </TouchableOpacity>
          <Text style={styles.groupName} numberOfLines={2}>
            {conversation.name ?? "Group"}
          </Text>
          <Text style={styles.groupMeta}>
            {participants.length}{" "}
            {participants.length === 1 ? "member" : "members"}
          </Text>
        </View>

        {actionError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{actionError}</Text>
          </View>
        ) : null}

        {isAdmin ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Group name</Text>
            <View style={styles.renameRow}>
              <TextInput
                style={styles.renameInput}
                value={draftName}
                onChangeText={setDraftName}
                placeholder="Group name"
                placeholderTextColor={palette.textMuted}
                maxLength={100}
                returnKeyType="done"
                onSubmitEditing={handleRename}
              />
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (renameGroup.isPending ||
                    !draftName.trim() ||
                    draftName.trim() === conversation.name) &&
                    styles.disabled,
                ]}
                onPress={handleRename}
                disabled={
                  renameGroup.isPending ||
                  !draftName.trim() ||
                  draftName.trim() === conversation.name
                }
              >
                {renameGroup.isPending ? (
                  <ActivityIndicator color={palette.primaryText} size="small" />
                ) : (
                  <Text style={styles.saveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Members ({participants.length})
            </Text>
            {isAdmin ? (
              <TouchableOpacity
                onPress={() => {
                  setAddOpen((open) => !open);
                  setToAdd([]);
                  setActionError(null);
                }}
                accessibilityRole="button"
              >
                <Text style={styles.link}>
                  {addOpen ? "Cancel" : "Add members"}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {participantsQuery.isLoading && participants.length === 0 ? (
            <ActivityIndicator
              style={styles.sectionLoader}
              color={palette.textMuted}
            />
          ) : participants.length === 0 ? (
            <Text style={styles.mutedText}>No members found.</Text>
          ) : (
            <View style={styles.memberList}>
              {participants.map((participant) => {
                const isSelf = participant.id === currentUserId;
                return (
                  <View key={participant.id} style={styles.memberRow}>
                    <UserAvatar
                      uri={participant.avatar}
                      name={participant.name ?? participant.email}
                      size={42}
                    />
                    <View style={styles.memberBody}>
                      <Text style={styles.memberName} numberOfLines={1}>
                        {participant.name ?? participant.email}
                      </Text>
                      {participant.name ? (
                        <Text style={styles.memberEmail} numberOfLines={1}>
                          {participant.email}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.memberBadges}>
                      {participant.role === "admin" ? (
                        <Text style={styles.adminBadge}>Admin</Text>
                      ) : null}
                      {isSelf ? (
                        <Text style={styles.selfBadge}>You</Text>
                      ) : null}
                    </View>
                    {isAdmin && !isSelf ? (
                      <TouchableOpacity
                        onPress={() => confirmRemove(participant)}
                        hitSlop={8}
                        accessibilityLabel={`Remove ${
                          participant.name ?? participant.email
                        }`}
                      >
                        <Ionicons
                          name="remove-circle-outline"
                          size={22}
                          color={palette.danger}
                        />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}

          {isAdmin && addOpen ? (
            <View style={styles.addPanel}>
              {toAdd.length > 0 ? (
                <Text style={styles.selectedText}>{toAdd.length} selected</Text>
              ) : null}
              <ParticipantPicker
                selectedIds={toAdd.map((user) => user.id)}
                onToggle={toggleAddUser}
                excludedIds={participants.map((participant) => participant.id)}
                autoFocus
              />
              <TouchableOpacity
                style={[
                  styles.addButton,
                  (toAdd.length === 0 || addParticipants.isPending) &&
                    styles.disabled,
                ]}
                onPress={handleAddMembers}
                disabled={toAdd.length === 0 || addParticipants.isPending}
              >
                {addParticipants.isPending ? (
                  <ActivityIndicator color={palette.primaryText} size="small" />
                ) : (
                  <Text style={styles.addButtonText}>
                    Add{" "}
                    {toAdd.length > 0
                      ? `${toAdd.length} ${
                          toAdd.length === 1 ? "member" : "members"
                        }`
                      : "members"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {isAdmin ? (
          <View style={[styles.card, styles.dangerCard]}>
            <Text style={styles.sectionTitle}>Danger zone</Text>
            <Text style={styles.dangerHint}>
              Deleting the group permanently removes it for everyone.
            </Text>
            <TouchableOpacity
              style={[
                styles.deleteButton,
                deleteGroup.isPending && styles.disabled,
              ]}
              onPress={confirmDelete}
              disabled={deleteGroup.isPending}
            >
              {deleteGroup.isPending ? (
                <ActivityIndicator color={palette.primaryText} size="small" />
              ) : (
                <Text style={styles.deleteText}>Delete group</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.adminNote}>
            Only group admins can rename the group, change its photo, or manage
            members.
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (palette: ReturnType<typeof useAppTheme>["palette"]) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    content: { padding: 16, gap: 16 },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      padding: 24,
      backgroundColor: palette.background,
    },
    mutedText: { color: palette.textMuted, fontSize: 14 },
    retryButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: palette.primary,
    },
    retryText: { color: palette.primaryText, fontWeight: "600" },
    headerCard: { alignItems: "center", gap: 8, paddingVertical: 8 },
    photoWrapper: { position: "relative" },
    photo: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: palette.surface,
    },
    photoBadge: {
      position: "absolute",
      right: 0,
      bottom: 0,
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.primary,
      borderWidth: 2,
      borderColor: palette.background,
    },
    photoOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 44,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0, 0, 0, 0.4)",
    },
    groupName: {
      color: palette.text,
      fontSize: 22,
      fontWeight: "700",
      textAlign: "center",
    },
    groupMeta: { color: palette.textMuted, fontSize: 13 },
    errorBanner: {
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.danger,
      backgroundColor: palette.surfaceMuted,
    },
    errorText: { color: palette.danger, fontSize: 13 },
    card: {
      gap: 12,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.divider,
      backgroundColor: palette.surfaceMuted,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sectionTitle: {
      color: palette.text,
      fontSize: 13,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    link: { color: palette.text, fontSize: 13, fontWeight: "600" },
    sectionLoader: { paddingVertical: 12 },
    renameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    renameInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: palette.text,
      backgroundColor: palette.background,
      fontSize: 15,
    },
    saveButton: {
      minWidth: 64,
      minHeight: 42,
      paddingHorizontal: 14,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.primary,
    },
    saveText: { color: palette.primaryText, fontSize: 13, fontWeight: "700" },
    disabled: { opacity: 0.45 },
    memberList: { gap: 4 },
    memberRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.divider,
    },
    memberBody: { flex: 1, gap: 2 },
    memberName: { color: palette.text, fontSize: 15, fontWeight: "600" },
    memberEmail: { color: palette.textMuted, fontSize: 12 },
    memberBadges: { flexDirection: "row", alignItems: "center", gap: 6 },
    adminBadge: {
      color: palette.text,
      fontSize: 10,
      fontWeight: "700",
      textTransform: "uppercase",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.border,
    },
    selfBadge: {
      color: palette.textMuted,
      fontSize: 10,
      fontWeight: "600",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: palette.surface,
    },
    addPanel: {
      gap: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: palette.divider,
    },
    selectedText: { color: palette.textMuted, fontSize: 12 },
    addButton: {
      minHeight: 44,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.primary,
    },
    addButtonText: {
      color: palette.primaryText,
      fontSize: 14,
      fontWeight: "700",
    },
    dangerCard: { borderColor: palette.danger },
    dangerHint: { color: palette.textMuted, fontSize: 12 },
    deleteButton: {
      minHeight: 44,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.danger,
    },
    deleteText: { color: "#fff", fontSize: 14, fontWeight: "700" },
    adminNote: {
      color: palette.textMuted,
      fontSize: 12,
      textAlign: "center",
      paddingHorizontal: 8,
    },
  });
