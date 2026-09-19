"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search as SearchIcon, SearchX } from "lucide-react";

import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";
import { Spinner } from "@/components/ui/spinner";
import { SubPageHeader } from "@/components/ui/sub-page-header";
import { UserRow } from "@/components/ui/user-row";
import { useDebounce } from "@/hooks/use-debounce";
import { useSearchUsers } from "@/features/users/hooks/useSearch";
import { useCreateConversation } from "@/features/conversations/hooks/useCreateConversation";

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 250);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const createConversation = useCreateConversation();

  const {
    data: users,
    isLoading,
    isError,
  } = useSearchUsers(debouncedQuery, 1, 10);

  const handleStartChat = (userId: string) => {
    if (createConversation.isPending) return;
    setCreatingId(userId);
    createConversation.mutate(userId, {
      onSettled: () => setCreatingId(null),
    });
  };

  const showResults = debouncedQuery.trim().length >= 2;
  const isEmpty =
    showResults && !isLoading && !isError && (!users || users.length === 0);

  return (
    <Screen>
      <SubPageHeader onBack={() => router.push("/chats")}>
        <div className="bg-muted flex flex-1 items-center gap-2 rounded-md px-2">
          <SearchIcon className="text-muted-foreground h-4 w-4 shrink-0" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people"
            aria-label="Search people"
            className="border-none bg-transparent shadow-none"
          />
        </div>
      </SubPageHeader>

      <div className="flex-1 overflow-y-auto">
        {!showResults && (
          <EmptyState
            icon={SearchX}
            title="Type at least 2 characters to search"
          />
        )}

        {showResults && isLoading && <Spinner center size="sm" />}

        {showResults && isError && (
          <div className="text-destructive p-6 text-center text-sm">
            Couldn&apos;t search. Check the API.
          </div>
        )}

        {isEmpty && <EmptyState title={`No results for "${query}"`} />}

        {users && users.length > 0 && (
          <>
            <p className="text-muted-foreground mb-1 px-3 pt-3 text-[11px] tracking-wide uppercase">
              People
            </p>
            {users.map((user) => {
              const pending =
                creatingId === user.id || createConversation.isPending;
              return (
                <UserRow
                  key={user.id}
                  name={user.name}
                  email={user.email}
                  avatar={user.avatar}
                  disabled={pending}
                  onClick={() => handleStartChat(user.id)}
                  trailing={
                    pending ? (
                      <Spinner size="sm" className="shrink-0" />
                    ) : undefined
                  }
                />
              );
            })}
          </>
        )}
      </div>
    </Screen>
  );
}
