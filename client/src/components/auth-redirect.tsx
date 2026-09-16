"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

export function AuthRedirect() {
  const router = useRouter();
  const { isAuthenticated, isProfileComplete, hasHydrated } = useAuth();

  useEffect(() => {
    if (!hasHydrated) return;
    if (isAuthenticated && isProfileComplete) {
      router.replace("/chats");
    } else if (isAuthenticated && !isProfileComplete) {
      router.replace("/complete-profile");
    }
  }, [hasHydrated, isAuthenticated, isProfileComplete, router]);

  return null;
}
