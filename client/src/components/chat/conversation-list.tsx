"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useConversations } from "@/features/conversations/hooks/useConversations";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/api";

function initials(name: string) {
  return (
    name
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function formatTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function ConversationItem({
  conversation,
  isActive,
  currentUserId,
}: {
  conversation: Conversation;
  isActive: boolean;
  currentUserId: string | undefined;
}) {
  const { name, lastMessage, unreadCount } = conversation;
  const sender = lastMessage?.sender;
  const senderName = sender?.id === currentUserId ? "You" : sender?.name;

  return (
    <Link
      href={`/chats/${conversation.id}`}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "hover:bg-accent flex items-center gap-3 px-3 py-2.5 text-sm transition-colors",
        isActive && "bg-accent"
      )}
    >
      <div className="relative shrink-0">
        <div className="bg-muted text-muted-foreground flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium">
          {initials(name)}
        </div>
        {/* Online status dot — placeholder for presence event wiring */}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-medium">{name}</p>
          {lastMessage && (
            <span className="text-muted-foreground shrink-0 text-[11px]">
              {formatTime(lastMessage?.createdAt)}
            </span>
          )}
        </div>
        {lastMessage && (
          <p className="text-muted-foreground truncate text-xs">
            {senderName}: {lastMessage.content}
          </p>
        )}
      </div>

      {unreadCount > 0 && (
        <span className="bg-primary text-primary-foreground flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-[11px] font-medium">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}

export function ConversationList() {
  const pathname = usePathname();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { data: conversations, isLoading, isError } = useConversations();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
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
