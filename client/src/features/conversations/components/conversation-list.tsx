"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { memo, useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useConversations } from "@/features/conversations/hooks/useConversations";
import { useAuthStore } from "@/store/auth-store";
import { useSocketEvents } from "@/hooks/useSocketEvents";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { useDecryptedPreview } from "@/features/e2e/hooks/useDecryptedPreview";
import type { Conversation } from "@/types/api";
import {
  formatListTime as formatTime,
  formatRelativeTime as formatLastSeen,
} from "@/lib/datetime";

function presenceLabel(conversation: Conversation) {
  if (conversation.isGroup) {
    return `${conversation.participants?.length ?? 0} members`;
  }
  if (conversation.isOnline) return "online";
  if (conversation.lastOnlineAt) {
    return `last seen ${formatLastSeen(conversation.lastOnlineAt)}`;
  }
  return null;
}

const ConversationItem = memo(function ConversationItem({
  conversation,
  isActive,
  currentUserId,
}: {
  conversation: Conversation;
  isActive: boolean;
  currentUserId: string | undefined;
}) {
  const { name, email, photoUrl, lastMessage, unreadCount, isGroup } =
    conversation;
  const sender = lastMessage?.sender;
  const senderName = sender?.id === currentUserId ? "You" : sender?.name;
  const peerId = isGroup ? null : conversation.otherUserId;
  const { data: decryptedPreview } = useDecryptedPreview(lastMessage, peerId);

  const lastMessagePreview = (() => {
    if (!lastMessage) return null;
    if (lastMessage.deletedAt) return "This message was deleted";
    if (lastMessage.cipherMeta) return decryptedPreview ?? null;
    if (lastMessage.content?.trim()) return lastMessage.content;
    const audioOnly =
      (lastMessage.attachments?.length ?? 0) > 0 &&
      (lastMessage.attachments ?? []).every((a) => a.type === "AUDIO");
    if (audioOnly) return "Voice message";
    if ((lastMessage.attachments?.length ?? 0) > 0) return "Photo or file";
    return null;
  })();

  return (
    <Link
      href={`/chats/${conversation.id}`}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "hover:bg-accent flex items-center gap-3 px-3 py-2.5 text-sm transition-colors duration-150 ease-out",
        isActive && "bg-accent"
      )}
    >
      <div className="relative shrink-0">
        <Avatar name={name} email={email} src={photoUrl} size="sm" />
        {!isGroup && conversation.isOnline && (
          <span className="border-background absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 bg-green-500" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-foreground truncate font-medium">{name}</p>
          {lastMessage && (
            <span className="text-muted-foreground shrink-0 text-[11px]">
              {formatTime(lastMessage?.createdAt)}
            </span>
          )}
        </div>
        {lastMessagePreview ? (
          <p className="text-muted-foreground truncate text-xs">
            {senderName}: {lastMessagePreview}
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">
            {presenceLabel(conversation)}
          </p>
        )}
      </div>

      {unreadCount > 0 && (
        <span className="bg-primary text-primary-foreground flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md px-1 text-[11px] font-medium">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
});

function ConversationListSkeleton() {
  return (
    <div className="flex-1" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3.5 w-2/5" />
              <Skeleton className="h-2.5 w-8 shrink-0" />
            </div>
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ConversationList() {
  const pathname = usePathname();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { data: conversations, isLoading, isError } = useConversations();
  const queryClient = useQueryClient();

  const invalidateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // The server emits conversation-updated per message send, so a short trailing
  // window collapses a burst into a single refetch.
  const handleConversationChanged = useCallback(() => {
    if (invalidateTimeoutRef.current)
      clearTimeout(invalidateTimeoutRef.current);
    invalidateTimeoutRef.current = setTimeout(() => {
      invalidateTimeoutRef.current = null;
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }, 300);
  }, [queryClient]);

  useEffect(() => {
    return () => {
      if (invalidateTimeoutRef.current)
        clearTimeout(invalidateTimeoutRef.current);
    };
  }, []);

  useSocketEvents({
    "conversation-updated": handleConversationChanged,
    "new-conversation": handleConversationChanged,
    "group-deleted": handleConversationChanged,
    "removed-from-group": handleConversationChanged,
  });

  if (isLoading) {
    return <ConversationListSkeleton />;
  }

  if (isError) {
    return (
      <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-1 p-6 text-center">
        <p className="text-xs">Couldn&apos;t load conversations.</p>
        <p className="text-[11px]">Check that the API is running.</p>
      </div>
    );
  }

  if (!conversations?.length) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center p-6 text-center text-xs">
        No conversations yet.
        <br />
        Start one with the new chat button.
      </div>
    );
  }

  return (
    <nav aria-label="Conversations" className="flex-1 overflow-y-auto">
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          isActive={pathname === `/chats/${conversation.id}`}
          currentUserId={currentUserId}
        />
      ))}
    </nav>
  );
}
