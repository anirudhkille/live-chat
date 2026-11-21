import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";

import { useAuthStore } from "@/store/auth-store";
import { useCallStore } from "@/features/calls/call-store";
import { CallProvider } from "@/features/calls/call-provider";
import { E2EIdentityBootstrap } from "@/features/e2e/components/e2e-identity-bootstrap";
import {
  registerExpoPushToken,
  registerNotificationCategories,
} from "@/features/push-notifications/register";
import { useAppTheme } from "@/theme/use-app-theme";

function NotificationRouter() {
  const response = Notifications.useLastNotificationResponse();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!response) return;

    const action = response.actionIdentifier;
    const key = `${response.notification.request.identifier}:${action}`;
    if (handledRef.current === key) return;
    handledRef.current = key;

    const data = response.notification.request.content.data ?? {};
    const conversationId =
      typeof data.conversationId === "string" ? data.conversationId : null;
    const callId = typeof data.callId === "string" ? data.callId : null;

    if (callId && (action === "accept" || action === "decline")) {
      useCallStore.getState().setAutoAction({
        callId,
        action: action === "accept" ? "accept" : "decline",
      });
    }

    if (conversationId && action !== "decline") {
      router.push(`/chat/${conversationId}`);
    }

    Notifications.clearLastNotificationResponseAsync().catch(() => {});
  }, [response]);

  return null;
}

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
    registerNotificationCategories().catch(() => {});
  }, []);

  useEffect(() => {
    if (token) {
      registerExpoPushToken().catch(() => {});
    }
  }, [token]);

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationRouter />
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
