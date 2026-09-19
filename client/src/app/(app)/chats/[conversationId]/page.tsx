"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Info, Users } from "lucide-react";
import { socket } from "@/lib/socket";
import { useSocketEvents } from "@/hooks/useSocketEvents";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Avatar } from "@/components/ui/avatar";
import { MessageList } from "@/features/conversations/components/message-list";
import { MessageInput } from "@/features/conversations/components/message-input";
import { useConversationWithMessages } from "@/features/conversations/hooks/useConversationWithMessages";
import { CallButtons } from "@/features/calls/call-buttons";
import { useCalls } from "@/features/calls/use-calls";
import { useCallStore } from "@/features/calls/call-store";
import dynamic from "next/dynamic";
import { formatRelativeTime as formatLastSeen } from "@/lib/datetime";
import type { Conversation } from "@/types/api";

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
    return () => {
      socket.emit("leave-conversation", conversationId);
    };
  }, [conversationId, conversation?.otherUserId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const acceptId = params.get("accept-call");
    const declineId = params.get("decline-call");
    if (!acceptId && !declineId) return;

    const url = new URL(window.location.href);
    url.searchParams.delete("accept-call");
    url.searchParams.delete("decline-call");
    window.history.replaceState(
      {},
      "",
      url.pathname + (url.search ? url.search : "")
    );

    if (acceptId) {
      useCallStore
        .getState()
        .setAutoAction({ callId: acceptId, action: "accept" });
    } else if (declineId) {
      useCallStore
        .getState()
        .setAutoAction({ callId: declineId, action: "decline" });
    }
  }, []);

  useSocketEvents({
    "user-typing": (payload: {
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
    },
    "user-online": (payload: { userId: string }) => {
      if (
        !conversation?.otherUserId ||
        payload.userId !== conversation.otherUserId
      )
        return;
      setLiveStatus("online");
    },
    "user-offline": (payload: { userId: string }) => {
      if (
        !conversation?.otherUserId ||
        payload.userId !== conversation.otherUserId
      )
        return;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setLiveStatus("last seen just now");
    },
    "online-users": (userIds: string[]) => {
      if (
        conversation?.otherUserId &&
        userIds.includes(conversation.otherUserId)
      ) {
        setLiveStatus("online");
      }
    },
  });

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [conversationId]);

  return (
    <div className="bg-background flex h-full min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-2 border-b p-3">
        <Link
          href="/chats"
          aria-label="Back"
          className="text-foreground hover:bg-accent inline-flex items-center justify-center rounded-md p-1"
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
              <Spinner size="xs" className="text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-foreground truncate text-sm font-medium">
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
