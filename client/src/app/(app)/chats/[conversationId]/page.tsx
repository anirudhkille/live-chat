"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Info, Loader2, Lock, Unlock, Users } from "lucide-react";
import { socket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { MessageList } from "@/features/conversations/components/message-list";
import { MessageInput } from "@/features/conversations/components/message-input";
import { GroupMembersDialog } from "@/features/conversations/components/group-members-dialog";
import { useIsDesktop } from "@/hooks/use-media-query";
import { useGetConversationById } from "@/features/conversations/hooks/useConversationById";
import { CallButtons } from "@/features/calls/call-buttons";
import { CallOverlay } from "@/features/calls/call-overlay";
import { useCalls } from "@/features/calls/use-calls";
import { useCallStore } from "@/features/calls/call-store";
import { useE2EIdentity } from "@/features/e2e/hooks/useE2EIdentity";
import { usePeerPublicKey } from "@/features/e2e/hooks/usePeerPublicKey";

export default function ChatThreadPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const [status, setStatus] = useState<null | "typing..." | "online">(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const { conversationId } = use(params);
  const router = useRouter();
  const isDesktop = useIsDesktop();

  const { data: conversation, isLoading: loadingConversation } =
    useGetConversationById(conversationId);

  const calls = useCalls();
  const callStatus = useCallStore((s) => s.status);
  const { keys } = useE2EIdentity();
  const { data: peerPublicKey } = usePeerPublicKey(
    conversation?.isGroup ? null : (conversation?.otherUserId ?? null)
  );
  const isEncrypted = !conversation?.isGroup && !!keys && !!peerPublicKey;

  const otherUserName = conversation?.name ?? conversation?.email ?? "Unknown";
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [prevConversationId, setPrevConversationId] = useState(conversationId);

  if (conversationId !== prevConversationId) {
    setPrevConversationId(conversationId);
    setStatus(null);
  }

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
        setStatus("online");
        return;
      }
      setStatus("typing...");
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setStatus("online");
      }, 3000);
    };

    const handleUserOnline = (payload: { userId: string }) => {
      if (!otherUserId || payload.userId !== otherUserId) return;
      setStatus("online");
    };

    const handleUserOffline = (payload: { userId: string }) => {
      if (!otherUserId || payload.userId !== otherUserId) return;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setStatus(null);
    };

    const handleOnlineUsers = (userIds: string[]) => {
      if (otherUserId && userIds.includes(otherUserId)) setStatus("online");
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
  }, [conversationId, conversation?.otherUserId]);

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-2 border-b p-3">
        {!isDesktop && (
          <button
            type="button"
            aria-label="Back"
            onClick={() => router.push("/chats")}
            className="p-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="flex min-w-0 items-center gap-2">
          {conversation ? (
            <Avatar
              name={conversation.name ?? otherUserName}
              email={conversation.email}
              src={conversation.photoUrl}
              size="xs"
            />
          ) : (
            <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
              <Loader2 className="text-muted-foreground h-3 w-3 animate-spin" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {loadingConversation ? "Loading..." : otherUserName}
            </p>
            <p className="text-muted-foreground flex items-center gap-1 text-xs">
              {conversation?.isGroup
                ? `${conversation.participants?.length ?? 0} members`
                : status}
              {!conversation?.isGroup &&
                (isEncrypted ? (
                  <Lock
                    className="h-3 w-3 text-green-600"
                    aria-label="Encrypted"
                  />
                ) : (
                  <Unlock className="h-3 w-3" aria-label="Not encrypted" />
                ))}
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
          conversationId={conversationId}
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
