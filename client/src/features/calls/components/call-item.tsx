"use client";

import Link from "next/link";
import { Phone, PhoneIncoming, PhoneOutgoing, Video } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCallDuration, formatListTime } from "@/lib/datetime";
import type { CallLog } from "@/types/api";
import type { CallType } from "../call-store";
import type { CallDirection } from "../lib/call-meta";
import { callDirection, callStatusLabel, callTone } from "../lib/call-meta";

function CallDirectionIcon({
  type,
  direction,
  className,
}: {
  type: CallLog["type"];
  direction: CallDirection;
  className?: string;
}) {
  if (type === "video") return <Video className={className} />;
  return direction === "outgoing" ? (
    <PhoneOutgoing className={className} />
  ) : (
    <PhoneIncoming className={className} />
  );
}

export function CallItem({
  log,
  currentUserId,
  onCall,
}: {
  log: CallLog;
  currentUserId?: string;
  onCall: (log: CallLog, type: CallType) => void;
}) {
  const direction = callDirection(log, currentUserId);
  const tone = callTone(log);
  const statusLabel = callStatusLabel(log);
  const peer = log.callerId === currentUserId ? log.callee : log.caller;
  const iconClass = tone === "danger" ? "text-red-500" : "text-green-500";

  return (
    <Link
      href={`/chats/${log.conversationId}`}
      className="hover:bg-accent flex items-center gap-3 px-3 py-2.5 text-sm transition-colors duration-150 ease-out"
    >
      <div className="relative shrink-0">
        <Avatar name={peer?.name} src={peer?.avatar} size="sm" />
        <span
          className={cn(
            "bg-background border-background absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full border-2",
            iconClass
          )}
        >
          <CallDirectionIcon
            type={log.type}
            direction={direction}
            className="h-3 w-3"
          />
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-foreground truncate font-medium">
            {peer?.name ?? "Unknown"}
          </p>
          <span className="text-muted-foreground shrink-0 text-[11px]">
            {formatListTime(log.startedAt)}
          </span>
        </div>
        {statusLabel ? (
          <p className="truncate text-xs text-red-500">{statusLabel}</p>
        ) : (
          <p className="text-muted-foreground text-xs">
            {formatCallDuration(log.durationSeconds)}
          </p>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        aria-label={`Call ${peer?.name ?? "back"}`}
        className="shrink-0"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onCall(log, log.type);
        }}
      >
        {log.type === "video" ? (
          <Video className={cn("h-4 w-4", iconClass)} />
        ) : (
          <Phone className={cn("h-4 w-4", iconClass)} />
        )}
      </Button>
    </Link>
  );
}
