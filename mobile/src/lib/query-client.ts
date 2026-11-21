import { QueryClient } from "@tanstack/react-query";

/**
 * A single cache shared by the React tree and the non-React session lifecycle
 * helpers. Keeping it outside the provider lets sign-out/account changes clear
 * user-scoped data without threading a client through every call site.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});
