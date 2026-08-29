import { io } from "socket.io-client";
import { SOCKET_URL } from "@/lib/env";
import { useAuthStore } from "@/store/auth-store";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  auth: (callback) => callback({ token: useAuthStore.getState().token }),
});
