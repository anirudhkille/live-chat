"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { useIsDesktop } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

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
        <p className="text-sm font-medium">{label}</p>
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
            "bg-background pointer-events-none inline-block h-5 w-5 rounded-full shadow-lg ring-0 transition-transform",
            enabled ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}

export default function PrivacyPage() {
  const router = useRouter();
  const isDesktop = useIsDesktop();

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
        <span className="text-sm font-medium">Privacy</span>
      </header>

      <div className="flex-1 overflow-y-auto px-4">
        <div className="border-b py-1">
          <ToggleOption
            label="Online status"
            description="Show when you're online to other users"
            enabled={true}
            disabled
          />
          <ToggleOption
            label="Read receipts"
            description="Let others see when you've read their messages"
            enabled={true}
            disabled
          />
        </div>

        <div className="border-b py-1">
          <ToggleOption
            label="Profile visibility"
            description="Allow anyone with your email to find you"
            enabled={true}
            disabled
          />
          <ToggleOption
            label="Phone number visibility"
            description="Show your phone number to contacts"
            enabled={false}
            disabled
          />
        </div>

        <div className="py-1">
          <ToggleOption
            label="Typing indicators"
            description="Show when you're typing a message"
            enabled={true}
            disabled
          />
        </div>

        <p className="text-muted-foreground px-0 pt-4 pb-6 text-center text-xs">
          Toggle controls will be functional once the backend implements these
          settings.
        </p>
      </div>
    </div>
  );
}
