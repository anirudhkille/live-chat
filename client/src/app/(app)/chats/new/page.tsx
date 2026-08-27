"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, MessageSquarePlus } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useIsDesktop } from "@/hooks/use-media-query";
import { useSearchUsers } from "@/features/users/hooks/useSearch";
import { useCreateConversation } from "@/features/conversations/hooks/useCreateConversation";
import { getApiErrorMessage } from "@/types/api";

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

export default function NewChatPage() {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [query, setQuery] = useState("");

  const {
    data: users,
    isLoading,
    isError,
    error,
  } = useSearchUsers(query, 1, 10);
  const createConversation = useCreateConversation();

  const handleStartChat = (userId: string) => {
    createConversation.mutate(userId);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b p-3">
        {!isDesktop && (
          <button
            type="button"
            aria-label="Back"
            onClick={() => router.back()}
            className="p-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <span className="text-sm font-medium">New chat</span>
      </header>

      <div className="p-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or email"
          aria-label="Search users"
          autoFocus
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {query.trim().length < 2 && (
          <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 p-6 text-center">
            <MessageSquarePlus className="h-8 w-8" />
            <p className="text-sm">Search for a user to start chatting</p>
          </div>
        )}

        {query.trim().length >= 2 && isLoading && (
          <div className="flex justify-center p-6">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          </div>
        )}

        {query.trim().length >= 2 && isError && (
          <div className="text-destructive px-3 text-center text-sm">
            {getApiErrorMessage(error)}
          </div>
        )}

        {query.trim().length >= 2 &&
          !isLoading &&
          !isError &&
          users?.length === 0 && (
            <div className="text-muted-foreground p-6 text-center text-sm">
              No users found for &ldquo;{query}&rdquo;
            </div>
          )}

        {users?.map((user) => (
          <button
            key={user.id}
            type="button"
            disabled={createConversation.isPending}
            onClick={() => handleStartChat(user.id)}
            className="hover:bg-accent flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-50"
          >
            <div className="bg-muted text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-medium">
              {initials(user.name ?? user.email)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{user.name ?? "Unnamed"}</p>
              <p className="text-muted-foreground truncate text-xs">
                {user.email}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
