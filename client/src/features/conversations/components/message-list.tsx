"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Spinner } from "@/components/ui/spinner";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useSocketEvents } from "@/hooks/useSocketEvents";
import { useGetMessages } from "@/features/conversations/hooks/useGetMessages";
import { useMarkConversationRead } from "@/features/conversations/hooks/useMarkConversationRead";
import { useUserPreferences } from "@/features/users/hooks/useUserPreferences";
import { safeImageUrl } from "@/lib/safe-url";
import { dayKey, dayLabel } from "@/lib/datetime";
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
  const { data: preferences } = useUserPreferences();

  const wallpaperStyle = useMemo<CSSProperties | undefined>(() => {
    const url = safeImageUrl(preferences?.chatWallpaperUrl);
    const color = preferences?.chatWallpaperColor ?? null;
    if (!url && !color) return undefined;
    return {
      backgroundColor: color ?? undefined,
      ...(url
        ? {
            backgroundImage: `url(${url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }
        : {}),
    };
  }, [preferences?.chatWallpaperUrl, preferences?.chatWallpaperColor]);

  if (conversationId !== prevConversationId) {
    setPrevConversationId(conversationId);
    setSocketMessages([]);
    setAtBottom(true);
  }

  const historyMessages = useMemo(() => (data ? data.flat() : []), [data]);

  const messages = useMemo(() => {
    const history = [...historyMessages].reverse();
    const seen = new Set(history.map((message) => message.id));
    const live = socketMessages.filter((message) => {
      if (seen.has(message.id)) return false;
      seen.add(message.id);
      return true;
    });
    return history.concat(live);
  }, [historyMessages, socketMessages]);

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

  useSocketEvents({
    "new-message": (newMessage: Message) => {
      if (newMessage.conversationId !== conversationId) return;
      setSocketMessages((prev) => [...prev, newMessage]);
      markConversationRead(conversationId);
    },
    "messages-read": (payload: {
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
    },
    "message-updated": (payload: {
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
    },
    "message-deleted": (payload: {
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
    },
    "message-reacted": (payload: {
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
    },
  });

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
        <Spinner size="sm" className="text-muted-foreground h-5 w-5" />
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
      <div
        style={wallpaperStyle}
        className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-1 p-6 text-center"
      >
        <p className="text-xs">No messages yet.</p>
        <p className="text-[11px]">Send the first message to get started.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={wallpaperStyle}
      className="relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto p-4"
    >
      {isFetchingNextPage && (
        <div className="pointer-events-none absolute top-0 right-0 left-0 z-10 flex justify-center py-2">
          <Spinner size="sm" className="text-muted-foreground" />
        </div>
      )}

      <div
        style={{ height: `${virtualizer.getTotalSize()}px` }}
        className="relative w-full flex-1"
      >
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
