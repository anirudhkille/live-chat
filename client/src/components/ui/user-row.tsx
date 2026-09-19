import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserRowProps {
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
  subtitle?: string | null;
  trailing?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function UserRow({
  name,
  email,
  avatar,
  subtitle,
  trailing,
  onClick,
  disabled,
  className,
}: UserRowProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "hover:bg-accent text-foreground flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-50",
        className
      )}
    >
      <Avatar name={name} email={email} src={avatar} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate font-medium">
          {name ?? "Unnamed"}
        </p>
        <p className="text-muted-foreground truncate text-xs">
          {subtitle ?? email}
        </p>
      </div>
      {trailing}
    </button>
  );
}
