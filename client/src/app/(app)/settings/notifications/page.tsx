"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  BellOff,
  CheckCheck,
  Loader2,
  MessageCircle,
  UserPlus,
  Settings as SettingsIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllRead,
} from "@/features/notifications/hooks";
import { useIsDesktop } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, typeof Bell> = {
  message: MessageCircle,
  follow: UserPlus,
  system: SettingsIcon,
};

function NotificationIcon({ type }: { type: string }) {
  const Icon = ICON_MAP[type] ?? Bell;
  return <Icon className="text-muted-foreground h-4 w-4" />;
}

function formatNotificationTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function NotificationsPage() {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const { data: notifications, isLoading, isError } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b p-3">
        {!isDesktop && (
          <button
            type="button"
            aria-label="Back"
            onClick={() => router.push("/settings")}
            className="p-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}      
        <span className="text-sm font-medium">Notifications</span>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-xs"
            disabled={markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            <CheckCheck className="mr-1 h-3 w-3" />
            Mark all read
          </Button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex justify-center p-6">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          </div>
        )}

        {isError && (
          <div className="text-destructive p-6 text-center text-sm">
            Couldn&apos;t load notifications. Check the API.
          </div>
        )}

        {!isLoading && !isError && notifications?.length === 0 && (
          <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 p-6 text-center">
            <BellOff className="h-8 w-8" />
            <p className="text-sm">No notifications yet</p>
          </div>
        )}

        {notifications?.map((notification) => (
          <button
            key={notification.id}
            type="button"
            onClick={() => {
              if (!notification.read) markRead.mutate(notification.id);
              if (notification.link) router.push(notification.link);
            }}
            className={cn(
              "hover:bg-accent flex w-full items-start gap-3 px-3 py-3 text-left transition-colors",
              !notification.read && "bg-accent/50"
            )}
          >
            <div className="mt-0.5 shrink-0">
              <NotificationIcon type={notification.type} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{notification.title}</p>
              {notification.body && (
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {notification.body}
                </p>
              )}
              <p className="text-muted-foreground mt-1 text-[11px]">
                {formatNotificationTime(notification.createdAt)}
              </p>
            </div>
            {!notification.read && (
              <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
