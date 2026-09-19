"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { memo } from "react";
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
    if (lastMessage.cipherMeta) return decryptedPreview ?? "Message";
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

export function ConversationList() {
  const pathname = usePathname();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { data: conversations, isLoading, isError } = useConversations();
  const queryClient = useQueryClient();

  const handleConversationChanged = () => {
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };

  useSocketEvents({
    "conversation-updated": handleConversationChanged,
    "new-conversation": handleConversationChanged,
    "group-deleted": handleConversationChanged,
    "removed-from-group": handleConversationChanged,
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Spinner size="sm" className="text-muted-foreground h-5 w-5" />
      </div>
    );
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
