"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Search, Settings } from "lucide-react";

import { cn } from "@/lib/utils";

const TABS = [
  { to: "/chats", label: "Chats", icon: MessageCircle },
  { to: "/search", label: "Search", icon: Search },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-card flex h-14 shrink-0 items-center justify-around border-t md:hidden">
      {TABS.map(({ to, label, icon: Icon }) => {
        const active =
          to === "/chats" ? pathname === "/chats" : pathname === to;
        return (
          <Link
            key={to}
            href={to}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-0.5 px-4 text-[11px] transition-colors",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
