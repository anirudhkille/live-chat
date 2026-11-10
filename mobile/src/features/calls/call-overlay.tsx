import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RTCView } from "react-native-webrtc";
import { SafeAreaView } from "react-native-safe-area-context";

import { UserAvatar } from "@/features/groups/components/user-avatar";
import { useAuthStore } from "@/store/auth-store";
import { useAppTheme } from "@/theme/use-app-theme";

import { useCallStore } from "./call-store";
import type { RemoteParticipant } from "./types";

const ENDED_LABELS: Record<string, string> = {
  ended: "Call ended",
  rejected: "Call declined",
  cancelled: "Call cancelled",
  timedOut: "No answer",
  pendingTimedOut: "No answer",
  busy: "You're already in a call",
  offline: "No one is available",
  tooMany: "Too many participants",
  unavailable: "Call unavailable",
  error: "Call failed",
};

const ACCEPT_GREEN = "#16a34a";

function useElapsed(startedAt: number | null): string {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (startedAt == null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  if (startedAt == null) return "00:00";
  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getStreamURL(stream: RemoteParticipant["stream"]): string | null {
  if (!stream) return null;
  try {
    return stream.toURL();
  } catch {
    return null;
  }
}

function VideoTile({
  stream,
  name,
  muted,
  cameraOff,
  local,
  compact,
  style,
}: {
  stream: RemoteParticipant["stream"];
  name: string | null;
  muted: boolean;
  cameraOff: boolean;
  local?: boolean;
  compact?: boolean;
  style?: ViewStyle;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const url = cameraOff ? null : getStreamURL(stream);

  return (
    <View style={[styles.videoTile, style]}>
      {url ? (
        <RTCView
          streamURL={url}
          style={styles.video}
          objectFit="cover"
          mirror={local}
          zOrder={local ? 1 : 0}
        />
      ) : (
        <View style={styles.videoPlaceholder}>
          <UserAvatar name={name} size={compact ? 48 : 72} />
          <Text style={styles.videoPlaceholderText} numberOfLines={1}>
            {local
              ? "Camera off"
              : cameraOff
                ? `${name ?? "They"} turned off their camera`
                : "Connecting video…"}
          </Text>
        </View>
      )}

      <View style={styles.videoLabelRow}>
        <Text style={styles.videoLabel} numberOfLines={1}>
          {local ? "You" : (name ?? "Guest")}
        </Text>
        {muted ? <Ionicons name="mic-off" size={13} color="#fff" /> : null}
      </View>
    </View>
  );
}

function ParticipantChip({
  name,
  muted,
}: {
  name: string | null;
  muted: boolean;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <View style={styles.participantChip}>
      <Text style={styles.participantChipText} numberOfLines={1}>
        {name || "Guest"}
      </Text>
      {muted ? (
        <Ionicons name="mic-off" size={13} color={palette.textMuted} />
      ) : null}
    </View>
  );
}

function CallControl({
  icon,
  label,
  color,
  onPress,
  variant = "default",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
  onPress: () => void;
  variant?: "default" | "danger" | "accept";
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const backgroundColor =
    variant === "danger"
      ? palette.danger
      : variant === "accept"
        ? ACCEPT_GREEN
        : palette.surface;
  const tint = color ?? (variant === "default" ? palette.text : "#fff");

  return (
    <View style={styles.controlItem}>
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.controlButton, { backgroundColor }]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Ionicons
          name={icon}
          size={24}
          color={tint}
          style={variant === "danger" ? styles.declineIcon : undefined}
        />
      </TouchableOpacity>
      <Text style={styles.controlLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export type CallOverlayProps = {
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
  onHangup: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleSpeaker: () => void;
  onClose: () => void;
};

export function CallOverlay({
  onAccept,
  onDecline,
  onCancel,
  onHangup,
  onToggleMute,
  onToggleCamera,
  onToggleSpeaker,
  onClose,
}: CallOverlayProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const status = useCallStore((s) => s.status);
  const type = useCallStore((s) => s.type);
  const pending = useCallStore((s) => s.pending);
  const peerName = useCallStore((s) => s.peerName);
  const peerId = useCallStore((s) => s.peerId);
  const isGroup = useCallStore((s) => s.isGroup);
  const conversationName = useCallStore((s) => s.conversationName);
  const startedAt = useCallStore((s) => s.startedAt);
  const endReason = useCallStore((s) => s.endReason);
  const isConnecting = useCallStore((s) => s.isConnecting);
  const localStream = useCallStore((s) => s.localStream);
  const localMuted = useCallStore((s) => s.localMuted);
  const cameraOff = useCallStore((s) => s.cameraOff);
  const speakerOn = useCallStore((s) => s.speakerOn);
  const remoteParticipants = useCallStore((s) => s.remoteParticipants);
  const localName = useAuthStore((s) => s.user?.name ?? null);
  const elapsed = useElapsed(status === "active" ? startedAt : null);

  useEffect(() => {
    if (status !== "ended") return;
    const id = setTimeout(onClose, 3000);
    return () => clearTimeout(id);
  }, [onClose, status]);

  if (status === "idle") return null;

  const isVideo = type === "video";
  const remotes = Object.values(remoteParticipants);
  const title = isGroup
    ? (conversationName ?? "Group call")
    : (peerName ?? remotes[0]?.name ?? peerId ?? "Unknown");
  const participantCount = remotes.length + 1;
  const showGrid = isGroup || remotes.length > 1;
  const mediaConnecting =
    status === "active" &&
    (isConnecting ||
      (remotes.length > 0 && remotes.every((remote) => !remote.stream)));

  const statusLine = (() => {
    if (status === "outgoing") {
      if (pending) return `Waiting for ${peerName ?? "them"} to answer…`;
      return isGroup ? "Calling group…" : "Calling…";
    }
    if (status === "incoming") {
      if (isGroup) {
        return peerName
          ? `${peerName} is inviting you to a group ${isVideo ? "video" : "voice"} call`
          : `Incoming group ${isVideo ? "video" : "voice"} call`;
      }
      return `${isVideo ? "Video" : "Voice"} incoming call`;
    }
    if (status === "active") return mediaConnecting ? "Connecting…" : elapsed;
    return endReason ? (ENDED_LABELS[endReason] ?? "Call ended") : "Call ended";
  })();

  const handleRequestClose = () => {
    if (status === "incoming") onDecline();
    else if (status === "outgoing") onCancel();
    else if (status === "active") onHangup();
    else onClose();
  };

  const renderActiveBody = () => {
    if (isVideo) {
      if (showGrid) {
        return (
          <ScrollView
            contentContainerStyle={styles.videoGrid}
            showsVerticalScrollIndicator={false}
          >
            <VideoTile
              local
              compact
              stream={localStream}
              name={localName}
              muted={localMuted}
              cameraOff={cameraOff}
              style={styles.videoTileGroup}
            />
            {remotes.map((participant) => (
              <VideoTile
                key={participant.userId}
                compact
                stream={participant.stream}
                name={participant.name}
                muted={participant.muted}
                cameraOff={participant.cameraOff}
                style={styles.videoTileGroup}
              />
            ))}
          </ScrollView>
        );
      }

      const remote = remotes[0];
      return (
        <View style={styles.videoStage}>
          <VideoTile
            stream={remote?.stream ?? null}
            name={remote?.name ?? title}
            muted={remote?.muted ?? false}
            cameraOff={remote?.cameraOff ?? false}
            style={styles.videoTileSolo}
          />
          <VideoTile
            local
            compact
            stream={localStream}
            name={localName}
            muted={localMuted}
            cameraOff={cameraOff}
            style={styles.videoPip}
          />
        </View>
      );
    }

    return (
      <View style={styles.voiceStage}>
        <UserAvatar name={title} size={96} />
        <View style={styles.stageText}>
          <Text style={styles.stageTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.stageSubtitle}>{statusLine}</Text>
        </View>

        {isGroup ? (
          <View style={styles.participantList}>
            <ParticipantChip name={localName ?? "You"} muted={localMuted} />
            {remotes.map((participant) => (
              <ParticipantChip
                key={participant.userId}
                name={participant.name}
                muted={participant.muted}
              />
            ))}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={handleRequestClose}
    >
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.topBar}>
          {isGroup ? (
            <View style={styles.badge}>
              <Ionicons name="people" size={14} color={palette.textMuted} />
              <Text style={styles.badgeText}>
                {status === "active"
                  ? `${participantCount} in call`
                  : "Group call"}
              </Text>
            </View>
          ) : (
            <View />
          )}
          {status === "active" && !mediaConnecting ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{elapsed}</Text>
            </View>
          ) : null}
        </View>

        {status === "active" ? (
          renderActiveBody()
        ) : (
          <View style={styles.preStage}>
            <UserAvatar name={title} size={96} />
            <Text style={styles.stageTitle} numberOfLines={2}>
              {title}
            </Text>
            <Text style={styles.stageSubtitle}>{statusLine}</Text>
          </View>
        )}

        <View style={styles.controls}>
          {status === "incoming" ? (
            <>
              <CallControl
                icon="call"
                label="Decline"
                variant="danger"
                onPress={onDecline}
              />
              <CallControl
                icon="call"
                label="Accept"
                variant="accept"
                onPress={onAccept}
              />
            </>
          ) : null}

          {status === "outgoing" ? (
            <CallControl
              icon="call"
              label="Cancel"
              variant="danger"
              onPress={onCancel}
            />
          ) : null}

          {status === "active" ? (
            <>
              <CallControl
                icon={localMuted ? "mic-off" : "mic"}
                label={localMuted ? "Unmute" : "Mute"}
                onPress={onToggleMute}
              />
              <CallControl
                icon={speakerOn ? "volume-high" : "volume-low"}
                label={speakerOn ? "Speaker" : "Earpiece"}
                onPress={onToggleSpeaker}
              />
              {isVideo ? (
                <CallControl
                  icon={cameraOff ? "videocam-off" : "videocam"}
                  label={cameraOff ? "Camera on" : "Camera off"}
                  onPress={onToggleCamera}
                />
              ) : null}
              <CallControl
                icon="call"
                label="End"
                variant="danger"
                onPress={onHangup}
              />
            </>
          ) : null}

          {status === "ended" ? (
            <CallControl icon="close" label="Close" onPress={onClose} />
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

type Palette = ReturnType<typeof useAppTheme>["palette"];

const createStyles = (palette: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
      paddingHorizontal: 16,
    },
    topBar: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: palette.surface,
    },
    badgeText: {
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },
    preStage: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      padding: 24,
    },
    voiceStage: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      padding: 24,
    },
    stageText: { alignItems: "center", gap: 6 },
    stageTitle: {
      color: palette.text,
      fontSize: 22,
      fontWeight: "700",
      textAlign: "center",
    },
    stageSubtitle: {
      color: palette.textMuted,
      fontSize: 14,
      textAlign: "center",
    },
    participantList: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 8,
      maxHeight: 140,
      marginTop: 8,
    },
    participantChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: palette.surface,
      maxWidth: "90%",
    },
    participantChipText: {
      color: palette.text,
      fontSize: 13,
      fontWeight: "600",
      flexShrink: 1,
    },
    videoStage: { flex: 1, marginVertical: 8 },
    videoGrid: {
      flexGrow: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      alignContent: "center",
      justifyContent: "center",
      gap: 8,
      marginVertical: 8,
    },
    videoTile: {
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor: palette.surface,
      minHeight: 120,
    },
    videoTileSolo: { flex: 1, borderRadius: 16 },
    videoTileGroup: {
      width: "48%",
      height: 150,
    },
    videoPip: {
      position: "absolute",
      right: 4,
      bottom: 4,
      width: 104,
      height: 148,
      borderWidth: 2,
      borderColor: palette.background,
    },
    video: { flex: 1 },
    videoPlaceholder: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: 12,
      backgroundColor: palette.surface,
    },
    videoPlaceholderText: {
      color: palette.textMuted,
      fontSize: 12,
      textAlign: "center",
    },
    videoLabelRow: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    videoLabel: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "600",
      flexShrink: 1,
    },
    controls: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "center",
      flexWrap: "wrap",
      gap: 24,
      paddingVertical: 20,
      paddingHorizontal: 8,
    },
    controlItem: {
      alignItems: "center",
      gap: 7,
      minWidth: 64,
    },
    controlButton: {
      width: 58,
      height: 58,
      borderRadius: 29,
      alignItems: "center",
      justifyContent: "center",
    },
    controlLabel: {
      color: palette.textMuted,
      fontSize: 11,
      fontWeight: "600",
      textAlign: "center",
    },
    declineIcon: { transform: [{ rotate: "135deg" }] },
  });
