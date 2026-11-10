import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";

import { useAuthStore } from "@/store/auth-store";
import { CallProvider } from "@/features/calls/call-provider";
import { E2EIdentityBootstrap } from "@/features/e2e/components/e2e-identity-bootstrap";
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
      <CallProvider>
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        <E2EIdentityBootstrap />
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
          <Stack.Screen
            name="settings/profile"
            options={{
              headerShown: true,
              title: "Edit profile",
              headerStyle: { backgroundColor: palette.background },
              headerTintColor: palette.text,
              headerTitleStyle: { color: palette.text, fontWeight: "600" },
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="settings/appearance"
            options={{
              headerShown: true,
              title: "Appearance",
              headerStyle: { backgroundColor: palette.background },
              headerTintColor: palette.text,
              headerTitleStyle: { color: palette.text, fontWeight: "600" },
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="settings/notifications"
            options={{
              headerShown: true,
              title: "Notifications",
              headerStyle: { backgroundColor: palette.background },
              headerTintColor: palette.text,
              headerTitleStyle: { color: palette.text, fontWeight: "600" },
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="search"
            options={{
              headerShown: true,
              title: "New chat",
              headerStyle: { backgroundColor: palette.background },
              headerTintColor: palette.text,
              headerTitleStyle: { color: palette.text, fontWeight: "600" },
              headerShadowVisible: false,
            }}
          />
        </Stack>
      </CallProvider>
    </QueryClientProvider>
  );
}
