import { useQuery } from "@tanstack/react-query";

import { useAuthStore } from "@/store/auth-store";

import { initializeE2EIdentity } from "../lib/key-manager";

export const E2E_IDENTITY_QUERY_KEY = ["e2e-identity"] as const;

export type E2EIdentityHookStatus =
  "idle" | "loading" | "ready" | "server-key-missing-local" | "error";

export function useE2EIdentity() {
  const token = useAuthStore((state) => state.token);
  const userId = useAuthStore((state) => state.user?.id ?? null);

  const identityQuery = useQuery({
    queryKey: [...E2E_IDENTITY_QUERY_KEY, userId],
    queryFn: () => initializeE2EIdentity(userId),
    enabled: Boolean(token && userId),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });

  const status: E2EIdentityHookStatus = !token
    ? "idle"
    : !userId || identityQuery.isPending
      ? "loading"
      : identityQuery.isError
        ? "error"
        : (identityQuery.data?.status ?? "error");

  return {
    keys: identityQuery.data?.keys ?? null,
    publicKey: identityQuery.data?.publicKey ?? null,
    status,
    error: identityQuery.error,
    refetch: identityQuery.refetch,
  };
}
