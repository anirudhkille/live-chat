"use client";

import { useEffect, useState } from "react";
import {
  Mic,
  MicOff,
  PhoneOff,
  Phone,
  Video,
  VideoOff,
  X,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/auth-store";
import { useCallStore, type RemoteParticipant } from "./call-store";

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

function useElapsed(startedAt: number | null): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAt == null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  if (startedAt == null) return "00:00";
  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function VideoTile({
  stream,
  name,
  muted,
  cameraOff,
  local,
}: {
  stream: MediaStream | null;
  name: string | null;
  muted: boolean;
  cameraOff: boolean;
  local?: boolean;
}) {
  return (
    <div className="bg-muted relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl">
      {stream && !cameraOff ? (
        <video
          autoPlay
          playsInline
          muted={local}
          ref={(node) => {
            if (node) node.srcObject = stream;
          }}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Avatar name={name ?? ""} size="lg" />
          <span className="text-foreground text-sm font-medium">
            {local ? "You" : (name ?? "...")}
          </span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/60 to-transparent p-2">
        <span className="truncate text-xs font-medium text-white">
          {local ? "You" : (name ?? "...")}
        </span>
        {muted && (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/50">
            <MicOff className="h-3 w-3 text-white" />
          </span>
        )}
      </div>
    </div>
  );
}

function VoiceStage({
  title,
  subtitle,
  remotes,
  isGroup,
  localName,
  localMuted,
}: {
  title: string;
  subtitle: string;
  remotes: RemoteParticipant[];
  isGroup: boolean;
  localName: string | null;
  localMuted: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 p-6">
      <Avatar name={title} size="lg" />
      <div className="flex flex-col items-center gap-1 text-center">
        <h2 className="text-foreground text-xl font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm">{subtitle}</p>
      </div>

      {isGroup && remotes.length > 0 && (
        <div className="flex max-h-40 flex-wrap items-center justify-center gap-2 overflow-y-auto">
          <span className="bg-muted text-foreground flex items-center gap-2 rounded-full px-3 py-1.5 text-sm">
            {localName ?? "You"}
            {localMuted && <MicOff className="h-3.5 w-3.5" />}
          </span>
          {remotes.map((participant) => (
            <span
              key={participant.userId}
              className="bg-muted text-foreground flex items-center gap-2 rounded-full px-3 py-1.5 text-sm"
            >
              {participant.name ?? "Guest"}
              {participant.muted && <MicOff className="h-3.5 w-3.5" />}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function CallOverlay({
  onAccept,
  onDecline,
  onCancel,
  onHangup,
  onToggleMute,
  onToggleCamera,
  onClose,
}: {
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
  onHangup: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onClose: () => void;
}) {
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
  const remoteParticipants = useCallStore((s) => s.remoteParticipants);
  const localName = useAuthStore((s) => s.user?.name ?? null);
  const elapsed = useElapsed(status === "active" ? startedAt : null);

  useEffect(() => {
    if (status !== "ended") return;
    const id = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(id);
  }, [status, onClose]);

  if (status === "idle") return null;

  const isVideo = type === "video";
  const remotes = Object.values(remoteParticipants);
  const title = isGroup
    ? (conversationName ?? "Group call")
    : (peerName ?? remotes[0]?.name ?? peerId ?? "");
  const participantCount = remotes.length + 1;
  const showGrid = isGroup || remotes.length !== 1;
  const gridClass =
    remotes.length + 1 <= 2
      ? "grid-cols-1 sm:grid-cols-2"
      : remotes.length + 1 <= 4
        ? "grid-cols-2"
        : "grid-cols-2 sm:grid-cols-3";

  const statusLine = (() => {
    if (status === "outgoing") {
      if (pending) return `Waiting for ${peerName ?? "them"} to answer...`;
      return isGroup ? "Calling group..." : "Calling...";
    }
    if (status === "incoming") {
      return isGroup
        ? `Incoming group ${isVideo ? "video" : "voice"} call`
        : `${isVideo ? "Video" : "Voice"} incoming call`;
    }
    if (status === "active") return isConnecting ? "Connecting..." : elapsed;
    return endReason ? (ENDED_LABELS[endReason] ?? "Call ended") : "Call ended";
  })();

  return (
    <div className="bg-background/95 fixed inset-0 z-50 flex flex-col backdrop-blur-sm">
      {(status === "active" || status === "incoming") && (
        <div className="flex items-center justify-center gap-2 px-4 pt-4">
          {isGroup && (
            <span className="bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
              <Users className="h-3.5 w-3.5" />
              {status === "active"
                ? `${participantCount} in call`
                : "Group call"}
            </span>
          )}
          {status === "active" && !isConnecting && (
            <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-xs font-medium tabular-nums">
              {elapsed}
            </span>
          )}
        </div>
      )}

      {status === "active" && isVideo ? (
        showGrid ? (
          <div
            className={`grid min-h-0 flex-1 auto-rows-fr gap-2 p-2 ${gridClass}`}
          >
            <VideoTile
              local
              stream={localStream}
              name={localName}
              muted={localMuted}
              cameraOff={cameraOff}
            />
            {remotes.map((participant) => (
              <VideoTile
                key={participant.userId}
                stream={participant.stream}
                name={participant.name}
                muted={participant.muted}
                cameraOff={participant.cameraOff}
              />
            ))}
          </div>
        ) : (
          <div className="relative flex-1 overflow-hidden">
            {remotes[0]?.stream && !remotes[0].cameraOff ? (
              <video
                autoPlay
                playsInline
                ref={(node) => {
                  if (node) node.srcObject = remotes[0].stream;
                }}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="bg-muted flex h-full w-full flex-col items-center justify-center gap-3">
                <Avatar name={remotes[0]?.name ?? title} size="lg" />
                <span className="text-muted-foreground text-sm">
                  {remotes[0]?.cameraOff
                    ? `${remotes[0]?.name ?? "They"} turned off their camera`
                    : "Connecting video..."}
                </span>
              </div>
            )}
            {localStream && (
              <video
                autoPlay
                playsInline
                muted
                ref={(node) => {
                  if (node) node.srcObject = localStream;
                }}
                className="absolute right-4 bottom-4 h-32 w-24 rounded-lg object-cover shadow-lg"
              />
            )}
            {remotes[0]?.muted && (
              <div className="absolute top-4 left-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/50">
                <MicOff className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
        )
      ) : status === "active" ? (
        <VoiceStage
          title={title}
          subtitle={statusLine}
          remotes={remotes}
          isGroup={isGroup}
          localName={localName}
          localMuted={localMuted}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <Avatar name={title} size="lg" />
          <h2 className="text-foreground text-xl font-semibold">{title}</h2>
          <p className="text-muted-foreground text-sm">{statusLine}</p>
        </div>
      )}

      <div className="flex items-center justify-center gap-4 p-8 pb-16">
        {status === "incoming" && (
          <>
            <Button
              variant="destructive"
              size="icon"
              className="h-14 w-14 rounded-full"
              aria-label="Decline call"
              onClick={onDecline}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            <Button
              size="icon"
              className="h-14 w-14 rounded-full bg-green-600 text-white hover:bg-green-700"
              aria-label="Accept call"
              onClick={onAccept}
            >
              <Phone className="h-6 w-6" />
            </Button>
          </>
        )}

        {status === "outgoing" && (
          <Button
            variant="destructive"
            size="icon"
            className="h-14 w-14 rounded-full"
            aria-label="Cancel call"
            onClick={onCancel}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        )}

        {status === "active" && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="h-14 w-14 rounded-full"
              aria-label={localMuted ? "Unmute" : "Mute"}
              onClick={onToggleMute}
            >
              {localMuted ? (
                <MicOff className="h-6 w-6" />
              ) : (
                <Mic className="h-6 w-6" />
              )}
            </Button>
            {isVideo && (
              <Button
                variant="secondary"
                size="icon"
                className="h-14 w-14 rounded-full"
                aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}
                onClick={onToggleCamera}
              >
                {cameraOff ? (
                  <VideoOff className="h-6 w-6" />
                ) : (
                  <Video className="h-6 w-6" />
                )}
              </Button>
            )}
            <Button
              variant="destructive"
              size="icon"
              className="h-14 w-14 rounded-full"
              aria-label="Hang up"
              onClick={onHangup}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </>
        )}

        {status === "ended" && (
          <Button
            size="icon"
            className="h-14 w-14 rounded-full"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </Button>
        )}
      </div>
    </div>
  );
}
