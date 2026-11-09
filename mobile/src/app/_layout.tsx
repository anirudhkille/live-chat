import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";

import { useAuthStore } from "@/store/auth-store";
import { registerExpoPushToken } from "@/features/push-notifications/register";
import { useAppTheme } from "@/theme/use-app-theme";

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
  const { scheme, palette } = useAppTheme();

  useEffect(() => {
    if (token) {
      registerExpoPushToken().catch(() => {});
    }
  }, [token]);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
        }}
      >
        <Stack.Screen
          name="chat/[id]"
          options={{
            headerShown: true,
            title: "Chat",
            headerStyle: { backgroundColor: palette.background },
            headerTintColor: palette.text,
            headerTitleStyle: { color: palette.text, fontWeight: "600" },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="group/new"
          options={{
            headerShown: true,
            title: "New group",
            headerStyle: { backgroundColor: palette.background },
            headerTintColor: palette.text,
            headerTitleStyle: { color: palette.text, fontWeight: "600" },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="group/[id]"
          options={{
            headerShown: true,
            title: "Group info",
            headerStyle: { backgroundColor: palette.background },
            headerTintColor: palette.text,
            headerTitleStyle: { color: palette.text, fontWeight: "600" },
            headerShadowVisible: false,
          }}
        />
      </Stack>
    </QueryClientProvider>
  );
}
