import { Screen } from "@/components/ui/screen";
import { SubPageHeader } from "@/components/ui/sub-page-header";
import { NotificationPreferences } from "./_components/notification-preferences";

export default function NotificationsPage() {
  return (
    <Screen>
      <SubPageHeader href="/settings" title="Notifications" />
      <div className="flex-1 overflow-y-auto px-4">
        <NotificationPreferences />

        <p className="text-muted-foreground px-0 pt-4 pb-6 text-center text-xs">
          Online status and read receipts are visible to people you chat with.
        </p>
      </div>
    </Screen>
  );
}
