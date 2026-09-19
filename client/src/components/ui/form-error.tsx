import { cn } from "@/lib/utils";

interface FormErrorProps {
  children?: React.ReactNode;
  className?: string;
}

export function FormError({ children, className }: FormErrorProps) {
  if (!children) return null;
  return (
    <p role="alert" className={cn("text-destructive text-sm", className)}>
      {children}
    </p>
  );
}
