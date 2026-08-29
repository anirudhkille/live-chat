"use client";

import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/api";

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ReadReceipt({ readAt }: { readAt: string | null }) {
  if (!readAt) return null;
  return (
    <span
      className="ml-1 text-[10px] text-blue-500 dark:text-blue-400"
      title={`Seen ${formatMessageTime(readAt)}`}
    >
      ✓✓
    </span>
  );
}

export function MessageBubble({ message }: { message: Message }) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isOwn =
    message.senderId === currentUserId ||
    message.senderId === "__current_user__";
  const isOptimistic = message.id.startsWith("temp-");

  return (
    <div
      className={cn(
        "animate-message-in mb-3 flex max-w-[75%] flex-col gap-0.5 rounded-md px-3 py-2 text-sm",
        isOwn ? "bg-primary text-primary-foreground ml-auto" : "bg-muted",
        isOptimistic && "opacity-70"
      )}
    >
      {(message.attachments ?? []).map((attachment) =>
        attachment.type === "IMAGE" ? (
          <a
            key={attachment.id}
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attachment.url}
              alt={attachment.fileName}
              className="max-h-64 w-full max-w-56 rounded-md object-contain"
            />
          </a>
        ) : (
          <a
            key={attachment.id}
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs underline"
          >
            {attachment.fileName}
          </a>
        )
      )}
      {message.content ? (
        <p className="break-words whitespace-pre-wrap">{message.content}</p>
      ) : null}
      <span
        className={cn(
          "text-[10px] leading-tight",
          isOwn ? "text-primary-foreground/70" : "text-muted-foreground/70"
        )}
      >
        {formatMessageTime(message.createdAt)}
        {isOwn && <ReadReceipt readAt={message.readAt} />}
      </span>
    </div>
  );
}
