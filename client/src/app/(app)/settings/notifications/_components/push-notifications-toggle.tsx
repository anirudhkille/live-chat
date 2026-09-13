"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePushNotifications } from "@/features/push-notifications/usePushNotifications";

export function PushNotificationsToggle() {
  const { supported, permission, enabled, isLoading, enable, disable } =
    usePushNotifications();
  const [optimisticEnabled, setOptimisticEnabled] = useState(enabled);

  const handleChange = async (next: boolean) => {
    if (isLoading || !supported) return;
    setOptimisticEnabled(next);
    try {
      if (next) {
        await enable();
        toast.success("Push notifications enabled");
      } else {
        await disable();
        toast.success("Push notifications disabled");
      }
    } catch (error) {
      setOptimisticEnabled(!next);
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn't update push notifications"
      );
    }
  };

  const active = isLoading ? optimisticEnabled : enabled;

  let description = "Get notified about new messages when you're offline.";
  if (!supported) {
    description = "Push notifications aren't supported in this browser.";
  } else if (permission === "denied") {
    description = "Notifications are blocked in your browser settings.";
  }

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Push notifications</p>
        <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label="Push notifications"
        disabled={isLoading || !supported}
        onClick={() => handleChange(!active)}
        className={cn(
          "focus-visible:ring-ring focus-visible:ring-offset-background relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          active ? "bg-primary" : "bg-input"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
            active ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}
