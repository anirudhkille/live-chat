import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { UserAvatar } from "@/features/groups/components/user-avatar";
import { useAppTheme } from "@/theme/use-app-theme";
import type { CallLog } from "@/types/api";

import {
  callDirection,
  callStatusLabel,
  callTone,
  formatCallDuration,
  formatCallTime,
} from "../lib/call-meta";
import type { CallType } from "../types";

export function CallItem({
  log,
  currentUserId,
  onCall,
}: {
  log: CallLog;
  currentUserId?: string;
  onCall: (log: CallLog, type: CallType) => void;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const router = useRouter();

  const direction = callDirection(log, currentUserId);
  const tone = callTone(log);
  const statusLabel = callStatusLabel(log);
  const peer = log.callerId === currentUserId ? log.callee : log.caller;
  const toneColor = tone === "danger" ? palette.danger : "#16a34a";
  const icon =
    log.type === "video"
      ? "videocam"
      : direction === "outgoing"
        ? "arrow-up"
        : "arrow-down";

  return (
    <View style={styles.row}>
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.main}
        onPress={() => router.push(`/chat/${log.conversationId}`)}
        accessibilityRole="button"
        accessibilityLabel={`Open conversation with ${peer?.name ?? "unknown"}`}
      >
        <View style={styles.avatarWrap}>
          <UserAvatar uri={peer?.avatar} name={peer?.name} size={42} />
          <View
            style={[styles.directionBadge, { borderColor: palette.background }]}
          >
            <Ionicons name={icon} size={11} color={toneColor} />
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {peer?.name ?? "Unknown"}
            </Text>
            <Text style={styles.time}>{formatCallTime(log.startedAt)}</Text>
          </View>
          {statusLabel ? (
            <Text style={styles.dangerText} numberOfLines={1}>
              {statusLabel}
            </Text>
          ) : (
            <Text style={styles.meta} numberOfLines={1}>
              {log.type === "video" ? "Video" : "Voice"} ·{" "}
              {formatCallDuration(log.durationSeconds)}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.callButton}
        onPress={() => onCall(log, log.type)}
        accessibilityRole="button"
        accessibilityLabel={`Call ${peer?.name ?? "back"}`}
      >
        <Ionicons
          name={log.type === "video" ? "videocam" : "call"}
          size={20}
          color={toneColor}
        />
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (palette: ReturnType<typeof useAppTheme>["palette"]) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingRight: 16,
    },
    main: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingLeft: 16,
      paddingVertical: 10,
    },
    avatarWrap: { position: "relative" },
    directionBadge: {
      position: "absolute",
      right: -2,
      bottom: -2,
      width: 19,
      height: 19,
      borderRadius: 10,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.background,
    },
    body: { flex: 1, gap: 3 },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    name: {
      flex: 1,
      color: palette.text,
      fontSize: 15,
      fontWeight: "600",
    },
    time: { color: palette.textMuted, fontSize: 11 },
    meta: { color: palette.textMuted, fontSize: 12 },
    dangerText: {
      color: palette.danger,
      fontSize: 12,
      fontWeight: "600",
    },
    callButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 20,
      backgroundColor: palette.surfaceMuted,
    },
  });
