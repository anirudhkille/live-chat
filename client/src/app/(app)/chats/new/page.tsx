"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, MessageSquarePlus, Users, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useIsDesktop } from "@/hooks/use-media-query";
import { useSearchUsers } from "@/features/users/hooks/useSearch";
import { useCreateConversation } from "@/features/conversations/hooks/useCreateConversation";
import { useCreateGroup } from "@/features/conversations/hooks/useCreateGroup";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/types/api";
import type { User } from "@/types/api";

type Mode = "chat" | "group";

export default function NewChatPage() {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [mode, setMode] = useState<Mode>("chat");
  const [query, setQuery] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState<User[]>([]);

  const {
    data: users,
    isLoading,
    isError,
    error,
  } = useSearchUsers(query, 1, 10);
  const createConversation = useCreateConversation();
  const createGroup = useCreateGroup();

  const toggleSelect = (user: User) => {
    setSelected((prev) =>
      prev.some((item) => item.id === user.id)
        ? prev.filter((item) => item.id !== user.id)
        : [...prev, user]
    );
  };

  const handleClickUser = (user: User) => {
    if (mode === "group") {
      toggleSelect(user);
      return;
    }
    createConversation.mutate(user.id);
  };

  const handleCreateGroup = () => {
    if (!groupName.trim() || selected.length < 2) return;
    createGroup.mutate({
      name: groupName.trim(),
      participantIds: selected.map((user) => user.id),
    });
  };

  const canCreateGroup =
    groupName.trim().length > 0 && selected.length >= 2;

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
        <div className="flex items-center gap-2">
          {mode === "group" && (
            <Users className="text-muted-foreground h-4 w-4" />
          )}
          <span className="text-sm font-medium">
            {mode === "group" ? "New group" : "New chat"}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-1 p-3 pb-0">
        <button
          type="button"
          onClick={() => {
            setMode("chat");
            setQuery("");
            setSelected([]);
          }}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            mode === "chat"
              ? "bg-accent"
              : "text-muted-foreground hover:bg-accent/50"
          )}
        >
          New chat
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("group");
            setQuery("");
            setSelected([]);
          }}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            mode === "group"
              ? "bg-accent"
              : "text-muted-foreground hover:bg-accent/50"
          )}
        >
          New group
        </button>
      </div>

      {mode === "group" && (
        <div className="p-3 pb-0">
          <Input
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            placeholder="Group name"
            aria-label="Group name"
          />
        </div>
      )}

      {mode === "group" && selected.length > 0 && (
        <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto p-3 pb-0">
          {selected.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => toggleSelect(user)}
              className="hover:bg-accent flex items-center gap-1.5 rounded-full bg-muted py-1 pr-2 pl-1 text-xs transition-colors"
              aria-label={`Remove ${user.name ?? user.email}`}
            >
              <Avatar
                name={user.name}
                email={user.email}
                src={user.avatar}
                size="xs"
                className="h-5 w-5 text-[9px]"
              />
              <span className="max-w-28 truncate">
                {user.name ?? user.email}
              </span>
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}

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
            <p className="text-sm">
              {mode === "group"
                ? "Search for people to add to the group"
                : "Search for a user to start chatting"}
            </p>
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

        {mode === "group" &&
          query.trim().length >= 2 &&
          !isLoading &&
          !isError &&
          users &&
          users.length > 0 &&
          users.every((user) =>
            selected.some((item) => item.id === user.id)
          ) && (
            <div className="text-muted-foreground p-6 text-center text-sm">
              Everyone matching is already selected.
            </div>
          )}

        {users?.map((user) => {
          const isSelected =
            mode === "group" && selected.some((item) => item.id === user.id);
          return (
            <button
              key={user.id}
              type="button"
              disabled={createConversation.isPending || createGroup.isPending}
              onClick={() => handleClickUser(user)}
              className={cn(
                "hover:bg-accent flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-50",
                isSelected && "bg-accent"
              )}
            >
              <Avatar
                name={user.name}
                email={user.email}
                src={user.avatar}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{user.name ?? "Unnamed"}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {user.email}
                </p>
              </div>
              {isSelected && (
                <span className="bg-primary text-primary-foreground flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px]">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {mode === "group" && (
        <div className="border-t p-3">
          <Button
            className="w-full"
            disabled={!canCreateGroup || createGroup.isPending}
            onClick={handleCreateGroup}
          >
            {createGroup.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Create group"
            )}
          </Button>
          {!canCreateGroup && (
            <p className="text-muted-foreground mt-1.5 text-center text-xs">
              Pick at least 2 people and a group name
            </p>
          )}
        </div>
      )}
    </div>
  );
}