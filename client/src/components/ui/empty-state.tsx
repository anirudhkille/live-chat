import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ElementType;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "text-muted-foreground flex flex-col items-center justify-center gap-2 p-6 text-center",
        className
      )}
    >
      {Icon && <Icon className="h-8 w-8" />}
      {title && <p className="text-sm">{title}</p>}
      {description && <p className="text-xs">{description}</p>}
      {children}
    </div>
  );
}
