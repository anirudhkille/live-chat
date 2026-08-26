"use client"

import type { FieldError } from "react-hook-form"
import type { UseFormRegisterReturn } from "react-hook-form"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FormFieldProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "id" | "name"
> {
  label: string
  registration: UseFormRegisterReturn
  error?: FieldError
  name: string
}

export function FormField({
  label,
  name,
  registration,
  error,
  className,
  ...inputProps
}: FormFieldProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} aria-invalid={!!error} {...registration} {...inputProps} />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      )}
    </div>
  )
}
