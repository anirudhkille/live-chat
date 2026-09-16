"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Info, Loader2, Users } from "lucide-react";
import { socket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { MessageList } from "@/features/conversations/components/message-list";
import { MessageInput } from "@/features/conversations/components/message-input";
import { useConversationWithMessages } from "@/features/conversations/hooks/useConversationWithMessages";
import { CallButtons } from "@/features/calls/call-buttons";
import { useCalls } from "@/features/calls/use-calls";
import { useCallStore } from "@/features/calls/call-store";
import dynamic from "next/dynamic";
import type { Conversation } from "@/types/api";

function formatLastSeen(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function initialStatus(conversation: Conversation | undefined) {
  if (!conversation || conversation.isGroup) return null;
  if (conversation.isOnline) return "online";
  if (conversation.lastOnlineAt) {
    return `last seen ${formatLastSeen(conversation.lastOnlineAt)}`;
  }
  return null;
}

const CallOverlay = dynamic(
  () => import("@/features/calls/call-overlay").then((m) => m.CallOverlay),
  { ssr: false }
);

const GroupMembersDialog = dynamic(
  () =>
    import("@/features/conversations/components/group-members-dialog").then(
      (m) => m.GroupMembersDialog
    ),
  { ssr: false }
);

export default function ChatThreadPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const [membersOpen, setMembersOpen] = useState(false);
  const { conversationId } = use(params);

  const { data: conversationData, isLoading: loadingConversation } =
    useConversationWithMessages(conversationId);
  const conversation = conversationData?.conversation;

  const baseStatus = useMemo(() => initialStatus(conversation), [conversation]);
  const [liveStatusByConversation, setLiveStatusByConversation] = useState<
    Record<string, string>
  >({});
  const status = liveStatusByConversation[conversationId] ?? baseStatus;

  const setLiveStatus = useCallback(
    (next: string) => {
      setLiveStatusByConversation((prev) => ({
        ...prev,
        [conversationId]: next,
      }));
    },
    [conversationId]
  );

  const calls = useCalls();
  const callStatus = useCallStore((s) => s.status);

  const otherUserName = conversation?.name ?? conversation?.email ?? "Unknown";
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    socket.connect();
    socket.emit("join-conversation", conversationId);
  }, [conversationId, conversation?.otherUserId]);

  useEffect(() => {
    const otherUserId = conversation?.otherUserId;

    const handleUserTyping = (payload: {
      conversationId: string;
      userId: string;
      isTyping?: boolean;
    }) => {
      if (payload.conversationId !== conversationId) return;
      if (payload.isTyping === false) {
        setLiveStatus("online");
        return;
      }
      setLiveStatus("typing...");
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setLiveStatus("online");
      }, 3000);
    };

    const handleUserOnline = (payload: { userId: string }) => {
      if (!otherUserId || payload.userId !== otherUserId) return;
      setLiveStatus("online");
    };

    const handleUserOffline = (payload: { userId: string }) => {
      if (!otherUserId || payload.userId !== otherUserId) return;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setLiveStatus("last seen just now");
    };

    const handleOnlineUsers = (userIds: string[]) => {
      if (otherUserId && userIds.includes(otherUserId)) setLiveStatus("online");
    };

    socket.on("user-typing", handleUserTyping);
    socket.on("user-online", handleUserOnline);
    socket.on("user-offline", handleUserOffline);
    socket.on("online-users", handleOnlineUsers);

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket.off("user-typing", handleUserTyping);
      socket.off("user-online", handleUserOnline);
      socket.off("user-offline", handleUserOffline);
      socket.off("online-users", handleOnlineUsers);
    };
  }, [conversationId, conversation?.otherUserId, setLiveStatus]);

  return (
    <div className="bg-background flex h-full min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-2 border-b p-3">
        <Link
          href="/chats"
          aria-label="Back"
          className="inline-flex items-center justify-center p-1 md:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          {conversation ? (
            <Avatar
              name={conversation.name ?? otherUserName}
              email={conversation.email}
              src={conversation.photoUrl}
              size="xs"
            />
          ) : (
            <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-md">
              <Loader2 className="text-muted-foreground h-3 w-3 animate-spin" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {loadingConversation ? "Loading..." : otherUserName}
            </p>
            <p className="text-muted-foreground text-xs">
              {conversation?.isGroup
                ? `${conversation.participants?.length ?? 0} members`
                : status}
            </p>
          </div>
        </div>
        {conversation?.isGroup ? (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            aria-label="Group members"
            onClick={() => setMembersOpen(true)}
          >
            <Users className="h-4 w-4" />
          </Button>
        ) : (
          <div className="ml-auto flex items-center gap-1">
            <CallButtons
              disabled={callStatus !== "idle"}
              onStart={(type) =>
                calls.startCall({
                  type,
                  conversationId,
                  peerId: conversation?.otherUserId ?? "",
                  peerName: conversation?.name ?? null,
                })
              }
            />
            <Button variant="ghost" size="icon" aria-label="Chat info" disabled>
              <Info className="h-4 w-4" />
            </Button>
          </div>
        )}
      </header>

      <MessageList
        conversationId={conversationId}
        peerId={conversation?.otherUserId ?? null}
        isGroup={conversation?.isGroup ?? false}
        initialMessages={conversationData?.messages}
      />

      <MessageInput
        conversationId={conversationId}
        peerId={conversation?.otherUserId ?? null}
        isGroup={conversation?.isGroup ?? false}
      />

      {conversation?.isGroup && (
        <GroupMembersDialog
          open={membersOpen}
          onClose={() => setMembersOpen(false)}
          conversation={conversation}
        />
      )}

      <CallOverlay
        onAccept={calls.acceptCall}
        onDecline={calls.rejectCall}
        onCancel={calls.cancelOutgoing}
        onHangup={calls.hangup}
        onClose={() => useCallStore.getState().reset()}
      />
    </div>
  );
}
