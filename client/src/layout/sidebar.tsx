"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, SquarePen, Settings } from "lucide-react";

import { ConversationList } from "@/features/conversations/components/conversation-list";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <aside
      className={cn("bg-card flex h-full w-full flex-col border-r", className)}
    >
      <div className="flex items-center gap-2 border-b p-3">
        <Avatar
          name={user?.name}
          email={user?.email}
          src={user?.avatar}
          size="xs"
          variant="primary"
        />
        <span className="truncate text-sm font-medium">
          {user?.name ?? "Account"}
        </span>
        <Link
          href="/search"
          aria-label="Search"
          className="text-muted-foreground hover:bg-accent ml-auto rounded-md p-1.5 transition-colors"
        >
          <Search className="h-4 w-4" />
        </Link>
        <Link
          href="/chats/new"
          aria-label="New chat"
          className="text-muted-foreground hover:bg-accent rounded-md p-1.5 transition-colors"
        >
          <SquarePen className="h-4 w-4" />
        </Link>
      </div>

      <ConversationList />

      <div className="hidden items-center gap-1 border-t p-2 md:flex">
        <ThemeToggle />
        <Link
          href="/settings"
          aria-current={pathname.startsWith("/settings") ? "page" : undefined}
          className={cn(
            "text-muted-foreground hover:bg-accent flex flex-1 items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
            pathname.startsWith("/settings") && "bg-accent"
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
