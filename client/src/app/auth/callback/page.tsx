"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Spinner } from "@/components/ui/spinner";
import { exchangeGoogleCode } from "@/features/auth/api/auth-api";
import { normalizeUser } from "@/types/api";
import { useAuthStore } from "@/store/auth-store";

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((state) => state.setSession);
  const exchangeStartedRef = useRef(false);

  useEffect(() => {
    if (exchangeStartedRef.current) return;
    exchangeStartedRef.current = true;

    const code = searchParams.get("code");

    if (!code) {
      router.replace("/login?error=google_auth_failed");
      return;
    }

    // Deliberately not cancelled on unmount: the one-time code is already
    // consumed by the request and dev StrictMode's mount/cleanup/mount cycle
    // must not abort the only exchange attempt.
    (async () => {
      try {
        const response = await exchangeGoogleCode(code);
        const session = response?.data;

        if (!session?.accessToken) {
          throw new Error("Missing access token");
        }

        const user = normalizeUser(session.user);
        if (!user) {
          throw new Error("Missing user");
        }

        setSession({ token: session.accessToken, user });
        router.replace(user.name ? "/chats" : "/complete-profile");
      } catch {
        router.replace("/login?error=google_auth_failed");
      }
    })();
  }, [router, searchParams, setSession]);

  return (
    <div className="flex h-dvh items-center justify-center">
      <Spinner />
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
