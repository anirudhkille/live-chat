import { cn } from "@/lib/utils";

const SIZES = {
  xs: "h-3 w-3 border",
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-2",
} as const;

type SpinnerSize = keyof typeof SIZES;

interface SpinnerProps extends React.ComponentProps<"div"> {
  size?: SpinnerSize;
  center?: boolean;
}

function Spinner({
  className,
  size = "md",
  center = false,
  ...props
}: SpinnerProps) {
  const spinner = (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "animate-spin rounded-full border-current border-t-transparent",
        SIZES[size],
        className
      )}
      {...props}
    />
  );

  if (!center) return spinner;

  return (
    <div className="text-muted-foreground flex flex-1 items-center justify-center p-6">
      {spinner}
    </div>
  );
}

export { Spinner };
export type { SpinnerSize };
