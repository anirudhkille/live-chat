import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { api } from "@/lib/api";

let registeredPushToken: string | null = null;

export function getRegisteredPushToken(): string | null {
  return registeredPushToken;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerNotificationCategories(): Promise<void> {
  await Notifications.setNotificationCategoryAsync("call", [
    {
      identifier: "accept",
      buttonTitle: "Accept",
      options: { opensAppToForeground: true },
    },
    {
      identifier: "decline",
      buttonTitle: "Decline",
      options: { isDestructive: true, opensAppToForeground: true },
    },
  ]);
}

export async function registerExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      // eslint-disable-next-line import/namespace
      importance: Notifications.AndroidImportance.MAX,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      enableLights: true,
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;

  if (!projectId) {
    console.warn("Missing EAS projectId; cannot get Expo push token");
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await api.post("/push/expo-token", { token });
  registeredPushToken = token;
  return token;
}

export function forgetRegisteredPushToken(token?: string | null) {
  if (!token || registeredPushToken === token) {
    registeredPushToken = null;
  }
}
