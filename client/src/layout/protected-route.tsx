"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/use-auth";
import { socket } from "@/lib/socket";

/**
 * Client-side auth gate for the protected segment. The refresh cookie lives
 * on the API origin so Next middleware can't read it - session checks happen
 * here against the hydrated zustand store instead.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, user, hasHydrated } = useAuth();

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) {
      router.replace("/login");
      return;
    }
    if (!user?.name) {
      router.replace("/complete-profile");
    }
  }, [router, token, user, hasHydrated]);

    useEffect(() => {
    if (!hasHydrated || !token || !user?.name) return;

    socket.auth = { token };
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [hasHydrated, token, user?.name]);


  if (!hasHydrated || !token || !user?.name) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return <>{children}</>;
}
