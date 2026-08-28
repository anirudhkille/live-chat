"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  Loader2,
  Lock,
  LogOut,
  User,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useLogout } from "@/hooks/use-logout";
import { useIsDesktop } from "@/hooks/use-media-query";

const ITEMS = [
  { icon: User, label: "Edit profile", to: "/settings/profile", enabled: true },
  {
    icon: Bell,
    label: "Notifications",
    to: "/settings/notifications",
    enabled: true,
  },
  { icon: Lock, label: "Privacy", to: "/settings/privacy", enabled: true },
];

export default function SettingsPage() {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const { user } = useAuth();
  const logout = useLogout();

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b p-3">
        {!isDesktop && (
          <button
            type="button"
            aria-label="Back"
            onClick={() => router.push("/chats")}
            className="p-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <span className="text-sm font-medium">Settings</span>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-col items-center border-b p-6">
        <Avatar
          name={user?.name}
          email={user?.email}
          src={user?.avatar}
          size="md"
          variant="primary"
        />
        <p className="mt-2 text-sm font-medium">{user?.name}</p>
        <p className="text-muted-foreground text-xs">{user?.email}</p>
      </div>

      <div className="flex-1 p-2">
        {ITEMS.map(({ icon: Icon, label, to, enabled }) => (
          <Link
            key={label}
            href={enabled ? to : "#"}
            aria-disabled={!enabled}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
              enabled ? "hover:bg-accent" : "cursor-not-allowed opacity-50"
            }`}
          >
            <Icon className="text-muted-foreground h-4 w-4" />
            <span className="flex-1">{label}</span>
            {enabled && (
              <ChevronRight className="text-muted-foreground h-4 w-4" />
            )}
          </Link>
        ))}

        <button
          type="button"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="text-destructive hover:bg-accent flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-60"
        >
          {logout.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          Log out
        </button>
      </div>
    </div>
  );
}
