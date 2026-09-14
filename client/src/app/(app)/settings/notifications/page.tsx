import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NotificationPreferences } from "./_components/notification-preferences";

export default function NotificationsPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b p-3">
        <Link
          href="/settings"
          aria-label="Back"
          className="inline-flex items-center justify-center p-1 md:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-sm font-medium">Notifications</span>
      </header>

      <div className="flex-1 overflow-y-auto px-4">
        <NotificationPreferences />

        <p className="text-muted-foreground px-0 pt-4 pb-6 text-center text-xs">
          Online status and read receipts are visible to people you chat with.
        </p>
      </div>
    </div>
  );
}
