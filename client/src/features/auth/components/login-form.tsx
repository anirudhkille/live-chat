"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { getApiErrorMessage } from "@/types/api";
import { loginSchema, type LoginValues } from "../schemas/login-schema";
import { useSendLoginOtp } from "../hooks/use-login";

export function LoginForm() {
  const router = useRouter();
  const { mutate, isPending, isError, error } = useSendLoginOtp();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = (values: LoginValues) => {
    mutate(values.email, {
      onSuccess: () => {
        router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField
        label="Email"
        name="email"
        type="email"
        placeholder="m@example.com"
        autoComplete="email"
        registration={register("email")}
        error={errors.email}
      />
      {isError && (
        <p role="alert" className="text-destructive text-sm">
          {getApiErrorMessage(error)}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Sending..." : "Continue"}
      </Button>
    </form>
  );
}
