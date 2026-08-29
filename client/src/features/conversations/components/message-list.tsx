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
import { socket } from "@/lib/socket";
import { useGetMessages } from "@/features/conversations/hooks/useGetMessages";
import { MessageBubble } from "./message-bubble";
import type { Message } from "@/types/api";

type MessageListProps = {
  conversationId: string;
};

const SCROLL_BOTTOM_THRESHOLD = 80;
const SCROLL_TOP_THRESHOLD = 40;
const LOAD_OLDER_COOLDOWN_MS = 600;

export function MessageList({ conversationId }: MessageListProps) {
  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useGetMessages(conversationId);

  const [socketMessages, setSocketMessages] = useState<Message[]>([]);
  const [atBottom, setAtBottom] = useState(true);
  const [prevConversationId, setPrevConversationId] = useState(conversationId);

  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef(0);
  const lastLoadOlderAtRef = useRef(0);

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

  const hasMessages = messages.length > 0;

  useEffect(() => {
    const handleNewMessage = (newMessage: Message) => {
      if (newMessage.conversationId !== conversationId) return;
      setSocketMessages((prev) => [...prev, newMessage]);
    };
    socket.on("new-message", handleNewMessage);
    return () => {
      socket.off("new-message", handleNewMessage);
    };
  }, [conversationId]);

  const scrollToBottom = useCallback((behavior?: ScrollBehavior) => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    if (isLoading || !hasMessages) return;
    scrollToBottom();
  }, [conversationId, isLoading, hasMessages, scrollToBottom]);

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

  if (!messages.length) {
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
      className="flex flex-1 flex-col overflow-y-auto p-4"
    >
      <div className="flex-1" />
      {isFetchingNextPage && (
        <div className="flex justify-center py-2">
          <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
        </div>
      )}
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
