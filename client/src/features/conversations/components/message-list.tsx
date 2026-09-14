"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Loader2 } from "lucide-react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { socket } from "@/lib/socket";
import { useGetMessages } from "@/features/conversations/hooks/useGetMessages";
import { useMarkConversationRead } from "@/features/conversations/hooks/useMarkConversationRead";
import { useDecryptedMessages } from "@/features/e2e/hooks/useDecryptedMessages";
import { MessageBubble } from "./message-bubble";
import { useAuthStore } from "@/store/auth-store";
import type { ApiResponse, Message } from "@/types/api";

type MessageListProps = {
  conversationId: string;
  peerId?: string | null;
  isGroup?: boolean;
  initialMessages?: Message[];
};

const SCROLL_BOTTOM_THRESHOLD = 80;
const SCROLL_TOP_THRESHOLD = 40;
const LOAD_OLDER_COOLDOWN_MS = 600;

type ListItem =
  | { type: "date"; id: string; label: string }
  | { type: "message"; id: string; message: Message };

function updateCachedMessages(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
  transform: (message: Message) => Message
) {
  queryClient.setQueryData<InfiniteData<ApiResponse<Message[]>>>(
    ["messages", conversationId],
    (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          data: page.data.map(transform),
        })),
      };
    }
  );
}

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (today.getTime() - dateOnly.getTime()) / 86400000
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) {
    return d.toLocaleDateString([], { weekday: "long" });
  }
  return d.toLocaleDateString([], {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function MessageList({
  conversationId,
  peerId = null,
  isGroup = false,
  initialMessages,
}: MessageListProps) {
  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useGetMessages(conversationId, initialMessages);

  const [socketMessages, setSocketMessages] = useState<Message[]>([]);
  const [atBottom, setAtBottom] = useState(true);
  const [prevConversationId, setPrevConversationId] = useState(conversationId);

  const containerRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef(0);
  const lastLoadOlderAtRef = useRef(0);

  const currentUserId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const { mutate: markConversationRead } = useMarkConversationRead();

  if (conversationId !== prevConversationId) {
    setPrevConversationId(conversationId);
    setSocketMessages([]);
    setAtBottom(true);
  }

  const historyMessages = useMemo(() => (data ? data.flat() : []), [data]);

  const messages = useMemo(
    () => [...historyMessages].reverse().concat(socketMessages),
    [historyMessages, socketMessages]
  );

  const displayMessages = useDecryptedMessages(
    conversationId,
    isGroup ? null : peerId,
    messages
  );

  const items = useMemo<ListItem[]>(() => {
    const list: ListItem[] = [];
    displayMessages.forEach((message, index) => {
      if (
        index === 0 ||
        dayKey(message.createdAt) !==
          dayKey(displayMessages[index - 1].createdAt)
      ) {
        list.push({
          type: "date",
          id: `date-${dayKey(message.createdAt)}`,
          label: dayLabel(message.createdAt),
        });
      }
      list.push({ type: "message", id: message.id, message });
    });
    return list;
  }, [displayMessages]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => containerRef.current,
    estimateSize: (index) => (items[index].type === "date" ? 32 : 72),
    overscan: 6,
  });

  const scrollToBottom = useCallback(
    (behavior?: ScrollBehavior) => {
      if (items.length === 0) return;
      virtualizer.scrollToIndex(items.length - 1, {
        align: "end",
        behavior,
      });
    },
    [items.length, virtualizer]
  );

  useEffect(() => {
    const handleNewMessage = (newMessage: Message) => {
      if (newMessage.conversationId !== conversationId) return;
      setSocketMessages((prev) => [...prev, newMessage]);
      markConversationRead(conversationId);
    };
    socket.on("new-message", handleNewMessage);
    return () => {
      socket.off("new-message", handleNewMessage);
    };
  }, [conversationId, markConversationRead]);

  useEffect(() => {
    const handleMessagesRead = (payload: {
      conversationId: string;
      userId: string;
      readAt: string;
    }) => {
      if (payload.conversationId !== conversationId || !currentUserId) return;

      setSocketMessages((prev) =>
        prev.map((message) =>
          message.senderId === currentUserId
            ? { ...message, readAt: payload.readAt }
            : message
        )
      );
      updateCachedMessages(queryClient, conversationId, (message) =>
        message.senderId === currentUserId
          ? { ...message, readAt: payload.readAt }
          : message
      );
    };
    socket.on("messages-read", handleMessagesRead);
    return () => {
      socket.off("messages-read", handleMessagesRead);
    };
  }, [conversationId, currentUserId, queryClient]);

  useEffect(() => {
    const handleMessageUpdated = (payload: {
      conversationId: string;
      message: Message;
    }) => {
      if (payload.conversationId !== conversationId) return;
      const updated = payload.message;
      setSocketMessages((prev) =>
        prev.map((message) => (message.id === updated.id ? updated : message))
      );
      updateCachedMessages(queryClient, conversationId, (message) =>
        message.id === updated.id ? updated : message
      );
    };

    const handleMessageDeleted = (payload: {
      conversationId: string;
      message: Message;
    }) => {
      if (payload.conversationId !== conversationId) return;
      const deleted = payload.message;
      setSocketMessages((prev) =>
        prev.map((message) => (message.id === deleted.id ? deleted : message))
      );
      updateCachedMessages(queryClient, conversationId, (message) =>
        message.id === deleted.id ? deleted : message
      );
    };

    socket.on("message-updated", handleMessageUpdated);
    socket.on("message-deleted", handleMessageDeleted);
    return () => {
      socket.off("message-updated", handleMessageUpdated);
      socket.off("message-deleted", handleMessageDeleted);
    };
  }, [conversationId, queryClient]);

  useEffect(() => {
    const handleMessageReacted = (payload: {
      conversationId: string;
      message: Message;
    }) => {
      if (payload.conversationId !== conversationId) return;
      const reacted = payload.message;
      setSocketMessages((prev) =>
        prev.map((message) => (message.id === reacted.id ? reacted : message))
      );
      updateCachedMessages(queryClient, conversationId, (message) =>
        message.id === reacted.id ? reacted : message
      );
    };

    socket.on("message-reacted", handleMessageReacted);
    return () => {
      socket.off("message-reacted", handleMessageReacted);
    };
  }, [conversationId, queryClient]);

  useEffect(() => {
    if (!conversationId || isLoading) return;
    markConversationRead(conversationId);
  }, [conversationId, isLoading, markConversationRead]);

  useEffect(() => {
    if (isLoading || displayMessages.length === 0) return;
    scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, isLoading]);

  useEffect(() => {
    if (!socketMessages.length || !atBottom) return;
    scrollToBottom("smooth");
  }, [socketMessages, atBottom, scrollToBottom]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !prevScrollHeightRef.current) return;
    container.scrollTop += container.scrollHeight - prevScrollHeightRef.current;
    lastLoadOlderAtRef.current = Date.now();
    prevScrollHeightRef.current = 0;
  }, [historyMessages]);

  const loadOlder = useCallback(() => {
    const now = Date.now();
    if (now - lastLoadOlderAtRef.current < LOAD_OLDER_COOLDOWN_MS) return;

    const container = containerRef.current;
    if (!container || !hasNextPage || isFetchingNextPage) return;

    prevScrollHeightRef.current = container.scrollHeight;
    lastLoadOlderAtRef.current = now;
    fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const distanceToBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    setAtBottom(distanceToBottom < SCROLL_BOTTOM_THRESHOLD);

    if (container.scrollTop < SCROLL_TOP_THRESHOLD) {
      loadOlder();
    }
  }, [loadOlder]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-1 p-6 text-center">
        <p className="text-xs">Couldn&apos;t load messages.</p>
        <p className="text-[11px]">Check that the API is running.</p>
      </div>
    );
  }

  if (!displayMessages.length) {
    return (
      <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-1 p-6 text-center">
        <p className="text-xs">No messages yet.</p>
        <p className="text-[11px]">Send the first message to get started.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto p-4"
    >
      {isFetchingNextPage && (
        <div className="pointer-events-none absolute top-0 right-0 left-0 z-10 flex justify-center py-2">
          <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
        </div>
      )}

      <div style={{ height: `${virtualizer.getTotalSize()}px` }} className="relative w-full flex-1">
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          return (
            <div
              key={item.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {item.type === "date" ? (
                <div className="mt-1 mb-3 flex shrink-0 justify-center">
                  <span className="bg-muted text-muted-foreground rounded px-2.5 py-1 text-[11px] font-medium shadow-sm">
                    {item.label}
                  </span>
                </div>
              ) : (
                <MessageBubble
                  message={item.message}
                  isGroup={isGroup}
                  conversationId={conversationId}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
