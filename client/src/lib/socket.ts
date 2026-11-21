import { io } from "socket.io-client";
import { SOCKET_URL } from "@/lib/env";
import { useAuthStore } from "@/store/auth-store";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  auth: (callback) => callback({ token: useAuthStore.getState().token }),
});

const roomRefCounts = new Map<string, number>();

export function joinConversationRoom(conversationId: string) {
  if (!conversationId) return;

  const count = roomRefCounts.get(conversationId) ?? 0;
  roomRefCounts.set(conversationId, count + 1);

  if (count === 0) {
    socket.emit("join-conversation", conversationId);
  }
}

export function leaveConversationRoom(conversationId: string) {
  if (!conversationId) return;

  const count = roomRefCounts.get(conversationId);
  if (!count) return;

  if (count > 1) {
    roomRefCounts.set(conversationId, count - 1);
    return;
  }

  roomRefCounts.delete(conversationId);
  socket.emit("leave-conversation", conversationId);
}

// Socket.IO rooms are lost when the connection drops, so re-join every room
// that still has a mounted consumer after reconnecting.
socket.on("connect", () => {
  for (const conversationId of roomRefCounts.keys()) {
    socket.emit("join-conversation", conversationId);
  }
});

/**
 * Forget every tracked room and tell the server to leave it. Used on logout
 * and when the call provider unmounts so listeners for the previous account
 * can't keep receiving conversation traffic.
 */
export function resetConversationRooms(): void {
  for (const conversationId of roomRefCounts.keys()) {
    socket.emit("leave-conversation", conversationId);
  }
  roomRefCounts.clear();
}
