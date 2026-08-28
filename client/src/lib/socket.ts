import { io } from "socket.io-client";
import { SOCKET_URL } from "@/lib/env";

export const socket = io(SOCKET_URL);
