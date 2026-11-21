import { io } from "socket.io-client";

import { useAuthStore } from "@/store/auth-store";
import { SOCKET_URL } from "./env";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  auth: (callback) => callback({ token: useAuthStore.getState().token }),
});

export function setSocketAuthToken(token: string | null) {
  // An object form lets us replace the handshake token before an explicit
  // reconnect without disturbing an already-established connection.
  socket.auth = { token };
}

/**
 * A single socket instance is shared by chats and calls. Room membership is
 * reference-counted so two mounted consumers cannot leave each other's room.
 */
const roomRefCounts = new Map<string, number>();

export function joinConversationRoom(conversationId: string) {
  if (!conversationId) return;

  const count = roomRefCounts.get(conversationId) ?? 0;
  roomRefCounts.set(conversationId, count + 1);

  if (count === 0 && socket.connected) {
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
  if (socket.connected) {
    socket.emit("leave-conversation", conversationId);
  }
}

export function clearConversationRooms() {
  roomRefCounts.clear();
}

/**
 * Disconnect and forget all session-scoped socket state. Called on logout and
 * account changes so the next user never inherits conversation rooms.
 */
export function resetSocketState() {
  clearConversationRooms();
  socket.disconnect();
  setSocketAuthToken(null);
}

socket.on("connect", () => {
  // Socket.IO rooms are lost on every disconnect. Re-join every room that
  // still has a mounted consumer, e.g. after a token refresh reconnect.
  for (const conversationId of roomRefCounts.keys()) {
    socket.emit("join-conversation", conversationId);
  }
});

type TokenRefresher = () => Promise<string | null>;

let refreshTokenForSocket: TokenRefresher | null = null;
let refreshingSocketAuth = false;

/** Registered once by the API layer to keep the socket independent of axios. */
export function setSocketTokenRefresher(refresher: TokenRefresher) {
  refreshTokenForSocket = refresher;
}

socket.on("connect_error", async (error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (!/auth|token/i.test(message)) return;
  if (refreshingSocketAuth || !refreshTokenForSocket) return;

  refreshingSocketAuth = true;
  try {
    const token = await refreshTokenForSocket();
    if (!token) return;

    setSocketAuthToken(token);
    if (!socket.connected) {
      socket.connect();
    }
  } catch {
    // Leave reconnection to Socket.IO. A transient network failure must not
    // tear down an otherwise healthy call.
  } finally {
    refreshingSocketAuth = false;
  }
});

// Refresh the handshake token whenever the session changes. If the socket is
// already connected we deliberately do not disconnect it, because that would
// drop an active call whose media is still flowing on the existing token.
useAuthStore.subscribe((state, previous) => {
  if (state.token === previous.token) return;

  if (!state.token) {
    resetSocketState();
    return;
  }

  setSocketAuthToken(state.token);
  if (!socket.connected) {
    socket.connect();
  }
});
