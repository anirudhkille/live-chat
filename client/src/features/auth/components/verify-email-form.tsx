"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { getApiErrorMessage } from "@/types/api";
import type { ApiResponse } from "@/types/api";
import type { AuthPayload } from "../api/auth-api";
import {
  verifyEmailSchema,
  type VerifyEmailValues,
} from "../schemas/verify-email-schema";
import { useVerifyLoginOtp } from "../hooks/use-verify-email";

interface VerifyEmailFormProps {
  email: string;
  onSuccess: (result: ApiResponse<AuthPayload>) => void;
  onResend: () => void;
}

export function VerifyEmailForm({
  email,
  onSuccess,
  onResend,
}: VerifyEmailFormProps) {
  const [countdown, setCountdown] = useState(30);

  const { mutate: verifyOtp, isPending, isError, error } = useVerifyLoginOtp();

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<VerifyEmailValues>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { email, otp: "" },
  });

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const submitWithCurrentOtp = () => {
    verifyOtp({ email, otp: getValues("otp") }, { onSuccess });
  };

  const handleResend = () => {
    if (countdown > 0) return;
    onResend();
    setCountdown(30);
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit(() => submitWithCurrentOtp())}
        className="space-y-4"
      >
        <Controller
          control={control}
          name="otp"
          render={({ field }) => (
            <InputOTP
              maxLength={6}
              value={field.value}
              onChange={(value) => {
                field.onChange(value);
                if (value.length === 6 && !isPending) {
                  // auto-submit once all six digits are entered
                  setTimeout(submitWithCurrentOtp, 0);
                }
              }}
              disabled={isPending}
            >
              <InputOTPGroup className="gap-2">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <InputOTPSlot key={index} index={index} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          )}
        />
        {errors.otp && (
          <p role="alert" className="text-destructive text-sm">
            {errors.otp.message}
          </p>
        )}

        {isError && (
          <p role="alert" className="text-destructive text-center text-sm">
            {getApiErrorMessage(error, "Invalid OTP")}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Verifying..." : "Continue"}
        </Button>
      </form>

      <button
        type="button"
        className="text-muted-foreground hover:text-foreground w-full text-sm transition-colors disabled:opacity-50"
        onClick={handleResend}
        disabled={countdown > 0}
      >
        {countdown > 0
          ? `Resend code in 0:${String(countdown).padStart(2, "0")}`
          : "Resend code"}
      </button>
    </div>
  );
}
