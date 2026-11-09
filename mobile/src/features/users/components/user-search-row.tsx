import type { ReactNode } from "react";
import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { UserAvatar } from "@/features/groups/components/user-avatar";
import { useAppTheme } from "@/theme/use-app-theme";
import type { User } from "@/types/api";

type UserSearchRowProps = {
  user: User;
  onPress: () => void;
  selected?: boolean;
  showSelection?: boolean;
  right?: ReactNode;
  disabled?: boolean;
};

export function UserSearchRow({
  user,
  onPress,
  selected = false,
  showSelection = false,
  right,
  disabled = false,
}: UserSearchRowProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <TouchableOpacity
      style={[styles.row, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole={showSelection ? "checkbox" : "button"}
      accessibilityState={showSelection ? { checked: selected } : undefined}
    >
      <UserAvatar uri={user.avatar} name={user.name ?? user.email} size={40} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {user.name ?? user.email}
        </Text>
        {user.name ? (
          <Text style={styles.email} numberOfLines={1}>
            {user.email}
          </Text>
        ) : null}
      </View>
      {right ??
        (showSelection ? (
          <Ionicons
            name={selected ? "checkmark-circle" : "ellipse-outline"}
            size={24}
            color={selected ? palette.primary : palette.textMuted}
          />
        ) : (
          <Ionicons
            name="chevron-forward"
            size={18}
            color={palette.textMuted}
          />
        ))}
    </TouchableOpacity>
  );
}

const createStyles = (palette: ReturnType<typeof useAppTheme>["palette"]) =>
  StyleSheet.create({
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
    disabled: { opacity: 0.6 },
    body: { flex: 1, gap: 2 },
    name: { color: palette.text, fontSize: 15, fontWeight: "600" },
    email: { color: palette.textMuted, fontSize: 12 },
  });
