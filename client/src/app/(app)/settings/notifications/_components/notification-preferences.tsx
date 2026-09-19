"use client";

import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { ToggleOption } from "@/components/ui/toggle-option";
import {
  useUserPreferences,
  useUpdateUserPreferences,
} from "@/features/users/hooks/useUserPreferences";
import { usePushNotifications } from "@/features/push-notifications/usePushNotifications";
import { getApiErrorMessage, type UserPreferences } from "@/types/api";

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
    updatePreferences.mutate({ [key]: value });
  };

  const handlePushChange = async (next: boolean) => {
    if (!preferences) return;
    try {
      if (next) {
        await enable();
        updatePreferences.mutate({ pushNotifications: true });
      } else {
        await disable();
        updatePreferences.mutate({ pushNotifications: false });
      }
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Couldn't update push notifications")
      );
    }
  };

  const pushEnabled = Boolean(browserEnabled && preferences?.pushNotifications);
  const pushBlocked = permission === "denied";

  let pushDescription = "Get notified about new messages when you're offline.";
  if (!supported) {
    pushDescription = "Push notifications aren't supported in this browser.";
  } else if (pushBlocked) {
    pushDescription = "Notifications are blocked in your browser settings.";
  }

  if (isLoading) {
    return <Spinner center size="sm" className="text-muted-foreground" />;
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
          onChange={(value) =>
            handlePreferenceChange("typingIndicators", value)
          }
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
