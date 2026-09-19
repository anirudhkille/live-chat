"use client";

import { Switch } from "@/components/ui/switch";

interface ToggleOptionProps {
  label: string;
  description?: string;
  enabled: boolean;
  disabled?: boolean;
  busy?: boolean;
  onChange?: (enabled: boolean) => void;
}

export function ToggleOption({
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
        <p className="text-foreground text-sm font-medium">{label}</p>
        {description && (
          <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
        )}
      </div>
      <Switch
        checked={enabled}
        label={label}
        disabled={disabled}
        busy={busy}
        onCheckedChange={onChange}
      />
    </div>
  );
}
