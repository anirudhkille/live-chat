import type { Metadata } from "next";

import AuthLayout from "@/features/auth/components/auth-layout";
import { GoogleLogin } from "@/features/auth/components/google-login";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Sign in · Live Chat" };

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <AuthLayout title="Welcome" description="Enter your email to continue">
      <div className="space-y-3">
        {error === "google_auth_failed" && (
          <p role="alert" className="text-destructive text-center text-sm">
            Google login failed. Please try again.
          </p>
        )}

        <LoginForm />

        <div className="flex items-center gap-3">
          <hr className="flex-1" />
          <span className="text-muted-foreground text-xs">OR</span>
          <hr className="flex-1" />
        </div>

        <GoogleLogin />
      </div>
    </AuthLayout>
  );
}
