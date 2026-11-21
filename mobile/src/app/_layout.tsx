import { QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { router, Stack, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";

import { CallProvider } from "@/features/calls/call-provider";
import { useCallStore } from "@/features/calls/call-store";
import { E2EIdentityBootstrap } from "@/features/e2e/components/e2e-identity-bootstrap";
import {
  registerExpoPushToken,
  registerNotificationCategories,
} from "@/features/push-notifications/register";
import { clearSharedSessionState } from "@/lib/session-cleanup";
import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/store/auth-store";
import { useAppTheme } from "@/theme/use-app-theme";

const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

function isSafeId(value: unknown): value is string {
  return typeof value === "string" && SAFE_ID_PATTERN.test(value);
}

function NotificationRouter() {
  const response = Notifications.useLastNotificationResponse();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const token = useAuthStore((state) => state.token);
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasHydrated || !token || !response) return;

    const action = response.actionIdentifier;
    const key = `${response.notification.request.identifier}:${action}`;
    if (handledRef.current === key) return;
    handledRef.current = key;

    const data = response.notification.request.content.data ?? {};
    const conversationId = isSafeId(data.conversationId)
      ? data.conversationId
      : null;
    const callId = isSafeId(data.callId) ? data.callId : null;

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
  }, [hasHydrated, response, token]);

  return null;
}

/**
 * Root-level guard for every non-auth route. This covers notification taps and
 * deep links as well as normal navigation, because the guard reacts to the
 * resolved segment rather than to individual screens.
 */
function useAuthGate() {
  const segments = useSegments();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (!hasHydrated) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!token && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (token && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [hasHydrated, segments, token]);
}

/**
 * Clears user-scoped caches when the account behind an existing token changes,
 * so a re-login cannot inherit the previous account's chats or call state.
 */
function SessionLifecycle() {
  const token = useAuthStore((state) => state.token);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!token) {
      previousUserId.current = null;
      return;
    }

    if (previousUserId.current && userId && previousUserId.current !== userId) {
      clearSharedSessionState();
    }

    if (userId) {
      previousUserId.current = userId;
    }
  }, [token, userId]);

  return null;
}

export default function RootLayout() {
  const token = useAuthStore((state) => state.token);
  const { scheme, palette } = useAppTheme();

  useAuthGate();

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
      <SessionLifecycle />
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
