"use client";

import {  useRef ,useEffect,useState} from "react";
import { Loader2 } from "lucide-react";
import { socket } from "@/lib/socket";
import { useGetMessages } from "@/features/conversations/hooks/useGetMessages";
import { MessageBubble } from "./message-bubble";

interface MessageListProps {
  conversationId: string;
}

export function MessageList({ conversationId }: MessageListProps) {
  const { data=[], isLoading, isError } = useGetMessages(conversationId);
 const [messages, setMessages] = useState(data);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    setMessages(data)

  },[data])

    useEffect(()=>{
   const handleNewMessage=(newMessage:any)=>{
    console.log("NEW MESSAGE RECEIVED:", newMessage);

    setMessages((prev)=>[...prev,newMessage])
   }

   socket.on("new-message",handleNewMessage)

     return () => {
      socket.off("new-message", handleNewMessage);
    };
  },[])

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

  if (!data.length) {
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
      className="flex flex-1 flex-col-reverse overflow-y-auto p-4"
    >
      <div ref={bottomRef} />
      {[...messages].reverse().map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}
