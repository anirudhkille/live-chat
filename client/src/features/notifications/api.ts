import type { ApiResponse, Notification } from "@/types/api";

let MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    type: "message",
    title: "New message from Priya",
    body: "Hey, are we still on for the demo?",
    read: false,
    link: "/chats/c1",
    createdAt: "2026-08-25T10:00:00Z",
  },
  {
    id: "n2",
    type: "follow",
    title: "Karan started using Chatly",
    body: "You can now message Karan directly.",
    read: false,
    link: null,
    createdAt: "2026-08-24T15:30:00Z",
  },
  {
    id: "n3",
    type: "system",
    title: "Welcome to Chatly!",
    body: "Start a conversation to get chatting.",
    read: true,
    link: "/chats",
    createdAt: "2026-08-23T08:00:00Z",
  },
  {
    id: "n4",
    type: "message",
    title: "New message from Sana",
    body: "Sure, sending now",
    read: true,
    link: "/chats/c3",
    createdAt: "2026-08-23T09:11:00Z",
  },
  {
    id: "n5",
    type: "message",
    title: "New message from Karan",
    body: "Rahul: shipped the update",
    read: true,
    link: "/chats/c2",
    createdAt: "2026-08-24T14:20:00Z",
  },
];

function delay(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ok<T>(data: T): ApiResponse<T> {
  return { success: true, message: "OK", data };
}

export async function getNotifications(): Promise<ApiResponse<Notification[]>> {
  await delay();
  return ok([...MOCK_NOTIFICATIONS]);
}

export async function markNotificationRead(id: string): Promise<ApiResponse> {
  await delay(150);
  const n = MOCK_NOTIFICATIONS.find((n) => n.id === id);
  if (n) n.read = true;
  return ok(null);
}

export async function markAllNotificationsRead(): Promise<ApiResponse> {
  await delay(200);
  MOCK_NOTIFICATIONS = MOCK_NOTIFICATIONS.map((n) => ({ ...n, read: true }));
  return ok(null);
}
