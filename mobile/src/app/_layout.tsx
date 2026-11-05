import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";

import { useAuthStore } from "@/store/auth-store";
import { registerExpoPushToken } from "@/features/push-notifications/register";

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 30_000 },
        },
      }),
  );

  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (token) {
      registerExpoPushToken().catch(() => {});
    }
  }, [token]);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
