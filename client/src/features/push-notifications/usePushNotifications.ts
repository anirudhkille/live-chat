"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getVapidPublicKey,
  removePushSubscription,
  savePushSubscription,
} from "./api";
import { subscriptionToStored, urlBase64ToUint8Array } from "./utils";

const QUERY_KEY = ["push-subscription"];

function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function getCurrentSubscription() {
  const registration = await navigator.serviceWorker.register("/sw.js");
  return registration.pushManager.getSubscription();
}

export function usePushNotifications() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      if (!isPushSupported()) return { state: "unsupported" as const };

      const subscription = await getCurrentSubscription();
      if (subscription) {
        await savePushSubscription(subscriptionToStored(subscription)).catch(
          () => undefined
        );
      }
      return {
        state: "ok" as const,
        enabled: Boolean(subscription),
        permission: Notification.permission,
      };
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const enable = useMutation({
    mutationFn: async () => {
      if (!isPushSupported()) {
        throw new Error("Push notifications aren't supported in this browser.");
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error(
          "Notifications are blocked in this browser. Allow them in your browser settings."
        );
      }

      const publicKey = await getVapidPublicKey();
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await savePushSubscription(subscriptionToStored(subscription));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const disable = useMutation({
    mutationFn: async () => {
      if (!isPushSupported()) return;
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await removePushSubscription(subscription.endpoint).catch(() => undefined);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return {
    supported: query.data?.state !== "unsupported",
    permission:
      query.data?.state === "ok" ? query.data.permission : undefined,
    enabled: query.data?.state === "ok" ? query.data.enabled : false,
    isLoading:
      query.isLoading || enable.isPending || disable.isPending || !query.data,
    enable: () => enable.mutateAsync(),
    disable: () => disable.mutateAsync(),
  };
}