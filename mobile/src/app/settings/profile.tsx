import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { authApi } from "@/features/auth/api/auth-api";
import { userApi } from "@/features/users/api/user-api";
import { UserAvatar } from "@/features/groups/components/user-avatar";
import { useAuthStore } from "@/store/auth-store";
import { useAppTheme } from "@/theme/use-app-theme";
import { getApiErrorMessage } from "@/types/api";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

type PendingAvatar = {
  uri: string;
  contentType: string;
};

function getImageContentType(asset: ImagePicker.ImagePickerAsset) {
  const mimeType = asset.mimeType?.toLowerCase();
  if (mimeType === "image/jpg") return "image/jpeg";
  if (mimeType && ALLOWED_AVATAR_TYPES.includes(mimeType)) return mimeType;

  const name = (asset.fileName ?? asset.uri).toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".heic") || name.endsWith(".heif")) return "image/heic";
  return "image/jpeg";
}

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const [name, setName] = useState(user?.name ?? "");
  const [pendingAvatar, setPendingAvatar] = useState<PendingAvatar | null>(
    null,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const previousUserName = useRef(user?.name ?? null);

  useEffect(() => {
    const nextName = user?.name ?? null;
    if (nextName === previousUserName.current) return;
    previousUserName.current = nextName;
    setName(nextName ?? "");
  }, [user?.name]);

  const trimmedName = name.trim();
  const nameChanged = trimmedName !== (user?.name ?? "");
  const dirty = nameChanged || pendingAvatar !== null;
  const avatarUri = pendingAvatar?.uri ?? user?.avatar ?? null;

  const pickAvatar = async () => {
    setFormError(null);
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Allow photo library access to change your avatar.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset) return;

      if (asset.fileSize && asset.fileSize > MAX_AVATAR_SIZE) {
        setFormError("Choose an image that is 5MB or smaller.");
        return;
      }

      const contentType = getImageContentType(asset);
      if (!ALLOWED_AVATAR_TYPES.includes(contentType)) {
        setFormError("Choose a JPEG, PNG, or WebP image.");
        return;
      }

      setPendingAvatar({ uri: asset.uri, contentType });
    } catch {
      setFormError("Could not open the photo library.");
    }
  };

  const handleSave = async () => {
    if (saving) return;

    if (!trimmedName) {
      setFormError("Name can't be empty.");
      return;
    }
    if (trimmedName.length < 2) {
      setFormError("Name must be at least 2 characters.");
      return;
    }
    if (!dirty) return;

    setSaving(true);
    setFormError(null);

    try {
      let updatedUser = user;

      if (nameChanged) {
        updatedUser = await authApi.updateProfile(trimmedName);
      }
      if (pendingAvatar) {
        updatedUser = await userApi.uploadAvatar(pendingAvatar);
      }

      if (updatedUser) {
        setUser(updatedUser);
      }

      setPendingAvatar(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["conversations"] }),
        queryClient.invalidateQueries({ queryKey: ["conversation"] }),
        queryClient.invalidateQueries({ queryKey: ["messages"] }),
      ]);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/settings");
      }
    } catch (error) {
      setFormError(getApiErrorMessage(error, "Could not update your profile."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: "Edit profile" }} />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={() => {
              void pickAvatar();
            }}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            activeOpacity={0.8}
          >
            <UserAvatar
              uri={avatarUri}
              name={user?.name ?? user?.email}
              size={96}
            />
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={16} color={palette.primaryText} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              void pickAvatar();
            }}
            accessibilityRole="button"
          >
            <Text style={styles.changePhoto}>Change photo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Display name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={(value) => {
              setName(value);
              setFormError(null);
            }}
            placeholder="Your name"
            placeholderTextColor={palette.textMuted}
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={60}
            returnKeyType="done"
          />
          <Text style={styles.counter}>{trimmedName.length}/60</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyText} numberOfLines={1}>
              {user?.email ?? ""}
            </Text>
            <Ionicons name="lock-closed" size={14} color={palette.textMuted} />
          </View>
          <Text style={styles.hint}>Email can&apos;t be changed.</Text>
        </View>

        {formError ? <Text style={styles.error}>{formError}</Text> : null}
      </ScrollView>

      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}
      >
        <TouchableOpacity
          style={[styles.saveButton, (!dirty || saving) && styles.disabled]}
          onPress={() => {
            void handleSave();
          }}
          disabled={!dirty || saving}
          accessibilityRole="button"
          accessibilityLabel="Save changes"
        >
          {saving ? (
            <ActivityIndicator color={palette.primaryText} size="small" />
          ) : (
            <Text style={styles.saveText}>Save changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (palette: ReturnType<typeof useAppTheme>["palette"]) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    content: { padding: 16, gap: 24 },
    avatarSection: { alignItems: "center", gap: 10, paddingVertical: 8 },
    cameraBadge: {
      position: "absolute",
      right: 0,
      bottom: 0,
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: palette.background,
      backgroundColor: palette.primary,
    },
    changePhoto: { color: palette.primary, fontSize: 13, fontWeight: "600" },
    field: { gap: 8 },
    label: {
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      color: palette.text,
      backgroundColor: palette.surfaceMuted,
      fontSize: 15,
    },
    counter: { color: palette.textMuted, fontSize: 11, textAlign: "right" },
    readOnlyField: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderColor: palette.divider,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: palette.surface,
    },
    readOnlyText: { flex: 1, color: palette.textMuted, fontSize: 15 },
    hint: { color: palette.textMuted, fontSize: 12 },
    error: { color: palette.danger, fontSize: 13 },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: palette.divider,
      backgroundColor: palette.background,
    },
    saveButton: {
      minHeight: 48,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.primary,
    },
    saveText: { color: palette.primaryText, fontSize: 15, fontWeight: "700" },
    disabled: { opacity: 0.5 },
  });
