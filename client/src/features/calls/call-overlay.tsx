"use client";

import { useEffect, useState } from "react";
import { Mic, MicOff, PhoneOff, Phone, Video, VideoOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { useCallStore } from "./call-store";

const ENDED_LABELS: Record<string, string> = {
  ended: "Call ended",
  rejected: "Call declined",
  cancelled: "Call cancelled",
  timedOut: "No answer",
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

export function CallOverlay({
  onAccept,
  onDecline,
  onCancel,
  onHangup,
  onClose,
}: {
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
  onHangup: () => void;
  onClose: () => void;
}) {
  const status = useCallStore((s) => s.status);
  const type = useCallStore((s) => s.type);
  const peerName = useCallStore((s) => s.peerName);
  const peerId = useCallStore((s) => s.peerId);
  const startedAt = useCallStore((s) => s.startedAt);
  const endReason = useCallStore((s) => s.endReason);
  const isConnecting = useCallStore((s) => s.isConnecting);
  const remoteStream = useCallStore((s) => s.remoteStream);
  const localStream = useCallStore((s) => s.localStream);
  const localMuted = useCallStore((s) => s.localMuted);
  const cameraOff = useCallStore((s) => s.cameraOff);
  const toggleLocalMuted = useCallStore((s) => s.toggleLocalMuted);
  const toggleCamera = useCallStore((s) => s.toggleCamera);
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

  return (
    <div className="bg-background/95 fixed inset-0 z-50 flex flex-col backdrop-blur-sm">
      {status === "active" && isVideo ? (
        <div className="relative flex-1 overflow-hidden">
          {remoteStream ? (
            <video
              autoPlay
              playsInline
              ref={(node) => {
                if (node) node.srcObject = remoteStream;
              }}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="bg-muted flex h-full w-full items-center justify-center">
              <span className="text-muted-foreground text-sm">
                Connecting video...
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
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <Avatar name={peerName ?? peerId ?? ""} size="lg" />
          <h2 className="text-xl font-semibold">{peerName ?? "..."}</h2>
          <p className="text-muted-foreground text-sm">
            {status === "outgoing" && "Calling..."}
            {status === "incoming" &&
              `${isVideo ? "Video" : "Voice"} incoming call`}
            {status === "active" && (isConnecting ? "Connecting..." : elapsed)}
            {status === "ended" &&
              (endReason ? ENDED_LABELS[endReason] : "Call ended")}
          </p>
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
              className="h-14 w-14 rounded-full bg-green-600 hover:bg-green-700"
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
              onClick={toggleLocalMuted}
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
                onClick={toggleCamera}
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
