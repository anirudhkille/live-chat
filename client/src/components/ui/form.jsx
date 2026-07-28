import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function FormField({ label, name, register, error, className, ...inputProps }) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} aria-invalid={!!error} {...register(name)} {...inputProps} />
      {error && <p className="text-sm text-destructive">{error.message}</p>}
    </div>
  );
}