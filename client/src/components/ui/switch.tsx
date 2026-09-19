"use client";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  busy?: boolean;
  label?: string;
  className?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  busy,
  label,
  className,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled || busy}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "focus-visible:ring-ring focus-visible:ring-offset-background border-border relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-input",
        className
      )}
    >
      <span
        className={cn(
          "border-border bg-background pointer-events-none inline-block h-5 w-5 rounded-full border shadow-md ring-0 transition-transform",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      >
        {busy && (
          <Spinner
            size="xs"
            className="text-muted-foreground absolute inset-0 m-auto"
          />
        )}
      </span>
    </button>
  );
}
