"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  Search as SearchIcon,
  SearchX,
  Loader2,
  MessageCircle,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { useIsDesktop } from "@/hooks/use-media-query";
import { useSearchUsers } from "@/features/users/hooks/useSearch";

export default function SearchPage() {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [query, setQuery] = useState("");

  const { data: users, isLoading, isError } = useSearchUsers(query, 1, 10);

  const showResults = query.trim().length >= 2;
  const isEmpty =
    showResults && !isLoading && !isError && (!users || users.length === 0);

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
        <div className="bg-muted flex flex-1 items-center gap-2 rounded-md px-2">
          <SearchIcon className="text-muted-foreground h-4 w-4 shrink-0" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people"
            aria-label="Search people"
            className="border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {!showResults && (
          <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 p-6 text-center">
            <SearchX className="h-8 w-8" />
            <p className="text-sm">Type at least 2 characters to search</p>
          </div>
        )}

        {showResults && isLoading && (
          <div className="flex justify-center p-6">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          </div>
        )}

        {showResults && isError && (
          <div className="text-destructive p-6 text-center text-sm">
            Couldn&apos;t search. Check the API.
          </div>
        )}

        {isEmpty && (
          <div className="text-muted-foreground p-6 text-center text-sm">
            No results for &ldquo;{query}&rdquo;
          </div>
        )}

        {users && users.length > 0 && (
          <>
            <p className="text-muted-foreground mb-1 px-3 pt-3 text-[11px] tracking-wide uppercase">
              People
            </p>
            {users.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => router.push(`/chats/new`)}
                className="hover:bg-accent flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors"
              >
                <Avatar name={user.name} email={user.email} src={user.avatar} size="sm" />
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {user.name ?? "Unnamed"}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {user.email}
                  </p>
                </div>
                <MessageCircle className="text-muted-foreground ml-auto h-4 w-4 shrink-0" />
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
