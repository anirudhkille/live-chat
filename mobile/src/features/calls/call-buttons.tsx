import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "@/theme/use-app-theme";

import type { CallType } from "./types";

export function CallButtons({
  disabled,
  onStart,
}: {
  disabled?: boolean;
  onStart: (type: CallType) => void;
}) {
  const { palette } = useAppTheme();

  return (
    <View style={styles.row}>
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.button, disabled && styles.disabled]}
        onPress={() => onStart("voice")}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Voice call"
      >
        <Ionicons name="call-outline" size={22} color={palette.text} />
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.button, disabled && styles.disabled]}
        onPress={() => onStart("video")}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Video call"
      >
        <Ionicons name="videocam-outline" size={22} color={palette.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
  },
  button: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
  },
  disabled: { opacity: 0.45 },
});
