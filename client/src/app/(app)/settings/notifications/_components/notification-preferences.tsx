"use client";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUserPreferences, useUpdateUserPreferences } from "@/features/users/hooks/useUserPreferences";
import { usePushNotifications } from "@/features/push-notifications/usePushNotifications";
import type { UserPreferences } from "@/types/api";

type ToggleOptionProps = {
  label: string;
  description?: string;
  enabled: boolean;
  disabled?: boolean;
  onChange?: (enabled: boolean) => void;
};

function ToggleOption({
  label,
  description,
  enabled,
  disabled,
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
        disabled={disabled}
        onClick={() => onChange?.(!enabled)}
        className={cn(
          "focus-visible:ring-ring focus-visible:ring-offset-background relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          enabled ? "bg-primary" : "bg-input"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
            enabled ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}

export function NotificationPreferences() {
  const { data: preferences, isLoading } = useUserPreferences();
  const updatePreferences = useUpdateUserPreferences();
  const { supported, permission, enabled, isLoading: pushLoading, enable, disable } =
    usePushNotifications();

  const handlePreferenceChange = (
    key: keyof UserPreferences,
    value: boolean
  ) => {
    if (!preferences) return;
    updatePreferences.mutate(
      { [key]: value },
      {
        onSuccess: () => toast.success(`${key} updated`),
        onError: () => toast.error(`Could not update ${key}`),
      }
    );
  };

  const handlePushChange = async (next: boolean) => {
    try {
      if (next) {
        await enable();
        toast.success("Push notifications enabled");
      } else {
        await disable();
        toast.success("Push notifications disabled");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn't update push notifications"
      );
    }
  };

  let pushDescription = "Get notified about new messages when you're offline.";
  if (!supported) {
    pushDescription = "Push notifications aren't supported in this browser.";
  } else if (permission === "denied") {
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
          onChange={(value) => handlePreferenceChange("showOnline", value)}
        />
        <ToggleOption
          label="Read receipts"
          description="Let others see when you've read their messages"
          enabled={preferences.readReceipts}
          onChange={(value) => handlePreferenceChange("readReceipts", value)}
        />
      </div>

      <div className="border-b py-1">
        <ToggleOption
          label="Profile visibility"
          description="Allow anyone with your email to find you"
          enabled={preferences.profileVisible}
          onChange={(value) => handlePreferenceChange("profileVisible", value)}
        />
        <ToggleOption
          label="Phone number visibility"
          description="Show your phone number to contacts"
          enabled={preferences.phoneVisible}
          onChange={(value) => handlePreferenceChange("phoneVisible", value)}
        />
      </div>

      <div className="border-b py-1">
        <ToggleOption
          label="Typing indicators"
          description="Show when you're typing a message"
          enabled={preferences.typingIndicators}
          onChange={(value) => handlePreferenceChange("typingIndicators", value)}
        />
      </div>

      <div className="border-b py-1">
        <ToggleOption
          label="Push notifications"
          description={pushDescription}
          enabled={enabled}
          disabled={pushLoading || !supported}
          onChange={handlePushChange}
        />
      </div>
    </>
  );
}
