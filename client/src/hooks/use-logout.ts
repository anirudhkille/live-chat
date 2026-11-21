"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { resetClientSessionState } from "@/lib/session-reset";
import { logoutRequest } from "@/features/auth/api/auth-api";
import { useAuthStore } from "@/store/auth-store";

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((state) => state.clearSession);

  return useMutation({
    mutationFn: logoutRequest,
    onSettled: () => {
      // Clear local session and every account-scoped cache even if the server
      // call fails.
      resetClientSessionState(queryClient);
      clearSession();
      router.replace("/login");
    },
  });
}
