"use client";

import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useUserPreferences,
  useUpdateUserPreferences,
} from "@/features/users/hooks/useUserPreferences";
import { usePushNotifications } from "@/features/push-notifications/usePushNotifications";
import type { UserPreferences } from "@/types/api";

type ToggleOptionProps = {
  label: string;
  description?: string;
  enabled: boolean;
  disabled?: boolean;
  busy?: boolean;
  onChange?: (enabled: boolean) => void;
};

function ToggleOption({
  label,
  description,
  enabled,
  disabled,
  busy,
  onChange,
}: ToggleOptionProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        disabled={disabled || busy}
        onClick={() => onChange?.(!enabled)}
        className={cn(
          "focus-visible:ring-ring focus-visible:ring-offset-background relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-border transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          enabled ? "bg-primary" : "bg-input"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 rounded-full border border-border bg-background shadow-md ring-0 transition-transform",
            enabled ? "translate-x-5" : "translate-x-0"
          )}
        >
          {busy && (
            <Loader2 className="text-muted-foreground absolute inset-0 m-auto h-3 w-3 animate-spin" />
          )}
        </span>
      </button>
    </div>
  );
}

export function NotificationPreferences() {
  const { data: preferences, isLoading } = useUserPreferences();
  const updatePreferences = useUpdateUserPreferences();
  const {
    supported,
    permission,
    enabled: browserEnabled,
    isLoading: pushLoading,
    enable,
    disable,
  } = usePushNotifications();

  const handlePreferenceChange = (
    key: keyof UserPreferences,
    value: boolean
  ) => {
    if (!preferences) return;
    updatePreferences.mutate(
      { [key]: value },
      {
        onSuccess: () => toast.success(`${labelForKey(key)} updated`),
        onError: () => toast.error(`Could not update ${labelForKey(key)}`),
      }
    );
  };

  const handlePushChange = async (next: boolean) => {
    if (!preferences) return;
    try {
      if (next) {
        await enable();
        updatePreferences.mutate(
          { pushNotifications: true },
          {
            onSuccess: () => toast.success("Push notifications enabled"),
            onError: () => toast.error("Push enabled locally but not saved"),
          }
        );
      } else {
        await disable();
        updatePreferences.mutate(
          { pushNotifications: false },
          {
            onSuccess: () => toast.success("Push notifications disabled"),
            onError: () => toast.error("Push disabled locally but not saved"),
          }
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn't update push notifications"
      );
    }
  };

  const pushEnabled = Boolean(
    browserEnabled && preferences?.pushNotifications
  );
  const pushBlocked = permission === "denied";

  let pushDescription = "Get notified about new messages when you're offline.";
  if (!supported) {
    pushDescription = "Push notifications aren't supported in this browser.";
  } else if (pushBlocked) {
    pushDescription = "Notifications are blocked in your browser settings.";
  }

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center p-6 text-xs">
        Loading preferences…
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="text-destructive flex flex-1 items-center justify-center p-6 text-xs">
        Could not load preferences.
      </div>
    );
  }

  return (
    <>
      <div className="border-b py-1">
        <ToggleOption
          label="Online status"
          description="Show when you're online to other users"
          enabled={preferences.showOnline}
          busy={updatePreferences.isPending}
          onChange={(value) => handlePreferenceChange("showOnline", value)}
        />
        <ToggleOption
          label="Read receipts"
          description="Let others see when you've read their messages"
          enabled={preferences.readReceipts}
          busy={updatePreferences.isPending}
          onChange={(value) => handlePreferenceChange("readReceipts", value)}
        />
      </div>

      <div className="border-b py-1">
        <ToggleOption
          label="Profile visibility"
          description="Allow anyone with your email to find you"
          enabled={preferences.profileVisible}
          busy={updatePreferences.isPending}
          onChange={(value) => handlePreferenceChange("profileVisible", value)}
        />
        <ToggleOption
          label="Phone number visibility"
          description="Show your phone number to contacts"
          enabled={preferences.phoneVisible}
          busy={updatePreferences.isPending}
          onChange={(value) => handlePreferenceChange("phoneVisible", value)}
        />
      </div>

      <div className="border-b py-1">
        <ToggleOption
          label="Typing indicators"
          description="Show when you're typing a message"
          enabled={preferences.typingIndicators}
          busy={updatePreferences.isPending}
          onChange={(value) => handlePreferenceChange("typingIndicators", value)}
        />
      </div>

      <div className="border-b py-1">
        <ToggleOption
          label="Push notifications"
          description={pushDescription}
          enabled={pushEnabled}
          disabled={pushLoading || !supported || pushBlocked}
          busy={pushLoading || updatePreferences.isPending}
          onChange={handlePushChange}
        />
      </div>
    </>
  );
}

function labelForKey(key: keyof UserPreferences) {
  const labels: Record<keyof UserPreferences, string> = {
    showOnline: "Online status",
    readReceipts: "Read receipts",
    profileVisible: "Profile visibility",
    phoneVisible: "Phone number visibility",
    typingIndicators: "Typing indicators",
    pushNotifications: "Push notifications",
  };
  return labels[key];
}
