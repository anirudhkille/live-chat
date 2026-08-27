"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Spinner } from "@/components/ui/spinner";
import AuthLayout from "@/features/auth/components/auth-layout";
import { CompleteProfileForm } from "@/features/auth/components/complete-profile-form";
import { normalizeUser, type ApiResponse } from "@/types/api";
import { useAuthStore } from "@/store/auth-store";

function CompleteProfileInner() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    if (hasHydrated && !token) router.replace("/login");
  }, [hasHydrated, token, router]);

  if (!hasHydrated) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!token) return null;

  const handleSuccess = (result: ApiResponse<{ user: unknown }>) => {
    const user = normalizeUser(result.data.user);
    if (user) setUser(user);
    router.replace("/chats");
  };

  return (
    <AuthLayout
      title="Complete your profile"
      description="Pick a name your friends will see"
    >
      <CompleteProfileForm onSuccess={handleSuccess} />
    </AuthLayout>
  );
}

export default function CompleteProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <CompleteProfileInner />
    </Suspense>
  );
}
