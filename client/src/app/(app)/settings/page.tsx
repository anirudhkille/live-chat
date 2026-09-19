"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Bell,
  ChevronRight,
  LogOut,
  Palette,
  Shield,
  User,
} from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Screen } from "@/components/ui/screen";
import { Spinner } from "@/components/ui/spinner";
import { SubPageHeader } from "@/components/ui/sub-page-header";
import { useAuth } from "@/hooks/use-auth";
import { useLogout } from "@/hooks/use-logout";

const ITEMS = [
  { icon: User, label: "Edit profile", to: "/settings/profile", enabled: true },
  {
    icon: Bell,
    label: "Notifications",
    to: "/settings/notifications",
    enabled: true,
  },
  {
    icon: Shield,
    label: "Security",
    to: "/settings/security",
    enabled: true,
  },
  {
    icon: Palette,
    label: "Appearance",
    to: "/settings/appearance",
    enabled: true,
  },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const logout = useLogout();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Screen>
      <SubPageHeader href="/chats" title="Settings" />

      <div className="flex flex-col items-center border-b p-6">
        <Avatar
          name={user?.name}
          email={user?.email}
          src={user?.avatar}
          size="md"
          variant="primary"
        />
        <p className="text-foreground mt-2 text-sm font-medium">{user?.name}</p>
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
            <span className="text-foreground flex-1">{label}</span>
            {enabled && (
              <ChevronRight className="text-muted-foreground h-4 w-4" />
            )}
          </Link>
        ))}

        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={logout.isPending}
          className="text-destructive hover:bg-destructive/10 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-60"
        >
          {logout.isPending ? (
            <Spinner size="sm" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          Log out
        </button>
      </div>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Log out?"
        description="You'll need to sign in again to access your chats."
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={logout.isPending}
              onClick={() => {
                setConfirmOpen(false);
                logout.mutate();
              }}
            >
              {logout.isPending ? <Spinner size="sm" /> : "Log out"}
            </Button>
          </>
        }
      />
    </Screen>
  );
}
