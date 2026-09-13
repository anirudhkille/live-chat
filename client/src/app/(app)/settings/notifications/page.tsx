import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PushNotificationsToggle } from "./_components/push-notifications-toggle";

function ToggleOption({
  label,
  description,
  enabled,
}: {
  label: string;
  description?: string;
  enabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
        )}
      </div>
      <span
        className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors ${
          enabled ? "bg-primary justify-end" : "bg-input justify-start"
        }`}
        aria-label={label}
      >
        <span className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0" />
      </span>
    </div>
  );
}

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
        <div className="border-b py-1">
          <ToggleOption
            label="Online status"
            description="Show when you're online to other users"
            enabled
          />
          <ToggleOption
            label="Read receipts"
            description="Let others see when you've read their messages"
            enabled
          />
        </div>

        <div className="border-b py-1">
          <ToggleOption
            label="Profile visibility"
            description="Allow anyone with your email to find you"
            enabled
          />
          <ToggleOption
            label="Phone number visibility"
            description="Show your phone number to contacts"
            enabled={false}
          />
        </div>

        <div className="border-b py-1">
          <ToggleOption
            label="Typing indicators"
            description="Show when you're typing a message"
            enabled
          />
        </div>

        <div className="border-b py-1">
          <PushNotificationsToggle />
        </div>

        <p className="text-muted-foreground px-0 pt-4 pb-6 text-center text-xs">
          Toggle controls will be functional once the backend implements these
          settings.
        </p>
      </div>
    </div>
  );
}
