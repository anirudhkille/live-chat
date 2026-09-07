"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Mic,
  Pause,
  Play,
  Send,
  Square,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSendMessage } from "../hooks/useSendMessage";
import {
  formatDuration,
  uploadVoiceMessage,
} from "@/features/attachments/api/attachment-api";

const MAX_RECORDING_SECONDS = 5 * 60;

function pickSupportedMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
    "audio/aac",
    "audio/mpeg",
    "audio/wav",
  ];
  if (typeof MediaRecorder === "undefined") return "";
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  // Default to the empty mime type; the browser picks a default.
  return "";
}

type VoiceRecorderProps = {
  conversationId: string;
  replyToId?: string;
  onClose: () => void;
};

export function VoiceRecorder({
  conversationId,
  replyToId,
  onClose,
}: VoiceRecorderProps) {
  const sendMessage = useSendMessage();

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [mimeType, setMimeType] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const supported = useMemo(
    () => typeof MediaRecorder !== "undefined" && !!pickSupportedMimeType(),
    []
  );

  const stopRecorder = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    stopRecorder();
  }, [stopRecorder]);

  // Start recording on mount.
  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      if (!cancelled) {
        setError(null);
      }
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Audio recording isn't supported in this browser");
        }
        const type = pickSupportedMimeType();
        if (!type && typeof MediaRecorder !== "undefined") {
          setMimeType("");
        } else {
          setMimeType(type);
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const recorder = new MediaRecorder(
          stream,
          type ? { mimeType: type } : undefined
        );
        recorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };

        recorder.onstop = () => {
          if (cancelled) return;
          const mime = type || chunksRef.current[0]?.type || "audio/webm";
          const blob = new Blob(chunksRef.current, { type: mime });
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
          setCurrentTime(0);
          setIsRecording(false);
          setIsPreview(true);
        };

        recorder.onerror = () => {
          if (cancelled) return;
          setError("Recording failed. Please try again.");
          setIsRecording(false);
        };

        recorder.start();
        setIsRecording(true);

        const startedAt = Date.now();
        timerRef.current = setInterval(() => {
          const seconds = Math.floor((Date.now() - startedAt) / 1000);
          setElapsed(seconds);
          if (seconds >= MAX_RECORDING_SECONDS) {
            stopRecorder();
          }
        }, 250);
      } catch (err) {
        if (cancelled) return;
        setError(
          (err as Error)?.name === "NotAllowedError"
            ? "Microphone access was denied. Allow mic access and try again."
            : (err as Error)?.message || "Couldn't access the microphone."
        );
        setIsRecording(false);
      }
    };

    start();

    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      recorderRef.current?.stop();
      chunksRef.current = [];
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [stopRecorder]);

  const handleCancel = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    cleanup();
    onClose();
  };

  const handleDiscard = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    cleanup();
    onClose();
  };

  const handleSend = async () => {
    if (!previewUrl || isSending) return;
    const blob = await fetch(previewUrl).then((r) => r.blob());
    const contentType = blob.type || mimeType || "audio/webm";
    setIsSending(true);
    setError(null);
    try {
      const attachment = await uploadVoiceMessage(
        blob,
        contentType,
        elapsed || 0
      );
      await sendMessage.mutateAsync({
        conversationId,
        content: "",
        attachmentIds: [attachment.id],
        ...(replyToId ? { replyToId } : {}),
      });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      cleanup();
      onClose();
    } catch (err) {
      setError(
        (err as Error)?.message || "Failed to send voice message. Try again."
      );
      setIsSending(false);
    }
  };

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  };

  if (!supported && !isPreview) {
    return (
      <div className="flex w-full items-center gap-2 p-3">
        <span className="text-muted-foreground flex-1 text-xs">
          Voice messages aren&apos;t supported in this browser.
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full items-center gap-2 p-3">
      {isRecording && (
        <>
          <span
            className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red-500"
            aria-hidden="true"
          />
          <span className="text-sm font-medium tabular-nums">
            {formatDuration(elapsed)}
          </span>
          <span className="text-muted-foreground flex-1 truncate text-xs">
            Recording…
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={stopRecorder}
          >
            <Square className="mr-1.5 h-3.5 w-3.5 fill-current" /> Stop
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Cancel recording"
            onClick={handleCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </>
      )}

      {isPreview && previewUrl && (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={isPlaying ? "Pause" : "Play"}
            onClick={handlePlayPause}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          <div className="flex flex-1 items-center gap-2">
            <audio
              ref={audioRef}
              src={previewUrl}
              className="hidden"
              preload="metadata"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            />
            <input
              type="range"
              min={0}
              max={elapsed || 1}
              step={0.1}
              value={Math.min(currentTime, elapsed || 1)}
              onChange={(e) => {
                const audio = audioRef.current;
                if (!audio) return;
                audio.currentTime = Number(e.target.value);
                setCurrentTime(Number(e.target.value));
              }}
              aria-label="Seek voice message"
              className="accent-primary flex-1"
            />
            <span className="text-muted-foreground text-xs tabular-nums">
              {formatDuration(currentTime)} / {formatDuration(elapsed)}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Discard recording"
            onClick={handleDiscard}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            aria-label="Send voice message"
            disabled={isSending}
            onClick={handleSend}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </>
      )}

      {error && (
        <p
          role="alert"
          className="text-destructive relative w-full flex-1 truncate text-xs"
        >
          {error}
        </p>
      )}

      {!isRecording && !isPreview && (
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Mic className="h-4 w-4" aria-hidden="true" />
          {error ?? "No recording available"}
        </span>
      )}
    </div>
  );
}
