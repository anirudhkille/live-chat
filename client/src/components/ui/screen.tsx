import { cn } from "@/lib/utils";

export function Screen({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("bg-background flex h-full flex-col", className)}
      {...props}
    />
  );
}
