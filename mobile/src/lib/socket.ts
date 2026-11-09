import { io } from "socket.io-client";

import { useAuthStore } from "@/store/auth-store";
import { SOCKET_URL } from "./env";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  auth: (cb) => cb({ token: useAuthStore.getState().token }),
});
