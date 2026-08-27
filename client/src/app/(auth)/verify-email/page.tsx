"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Spinner } from "@/components/ui/spinner";
import AuthLayout from "@/features/auth/components/auth-layout";
import { VerifyEmailForm } from "@/features/auth/components/verify-email-form";
import { useSendLoginOtp } from "@/features/auth/hooks/use-login";
import { normalizeUser, type ApiResponse } from "@/types/api";
import type { AuthPayload } from "@/features/auth/api/auth-api";
import { useAuthStore } from "@/store/auth-store";

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const setSession = useAuthStore((state) => state.setSession);
  const { mutate: resendOtp } = useSendLoginOtp();

  useEffect(() => {
    if (!email) router.replace("/login");
  }, [email, router]);

  if (!email) return null;

  const handleSuccess = (result: ApiResponse<AuthPayload>) => {
    const user = normalizeUser(result.data.user);
    if (!result.data.accessToken || !user) {
      router.replace("/login?error=google_auth_failed");
      return;
    }
    setSession({ token: result.data.accessToken, user });
    router.replace(user.name ? "/chats" : "/complete-profile");
  };

  return (
    <AuthLayout title="Verify your email" description={`Code sent to ${email}`}>
      <VerifyEmailForm
        email={email}
        onSuccess={handleSuccess}
        onResend={() => resendOtp(email)}
      />
    </AuthLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
