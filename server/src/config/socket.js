import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "./env.config.js";
import { logger } from "./logger.js";
import {
  registerCallHandlers,
  handleCallDisconnect,
} from "../modules/call/call.socket.js";
import * as userService from "../modules/user/user.service.js";

let io;
const online = new Map(); // userId -> Set<socketId>

export const isUserOnline = (userId) => {
  const sockets = online.get(userId);
  return Boolean(sockets && sockets.size > 0);
};

export const isUserInRoom = (userId, room) => {
  if (!io) return false;
  const sockets = online.get(userId);
  if (!sockets || sockets.size === 0) return false;
  const roomSet = io.sockets.adapter.rooms.get(room);
  if (!roomSet) return false;
  for (const socketId of sockets) {
    if (roomSet.has(socketId)) return true;
  }
  return false;
};

export const emitToUser = (userId, event, payload) => {
  if (!io) return;
  const sockets = online.get(userId);
  if (!sockets || sockets.size === 0) return;
  for (const socketId of sockets) {
    io.to(socketId).emit(event, payload);
  }
};

export const createSocketServer = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Not authorized, no token"));
      }

      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
      socket.userId = decoded._id;
      next();
    } catch (error) {
      logger.error({ err: error.message, id: socket.id }, "Socket auth failed");
      next(new Error("Not authorized, token failed"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.userId;

    if (!online.has(userId)) {
      online.set(userId, new Set());
    }
    online.get(userId).add(socket.id);

    let preferences;
    try {
      preferences = await userService.getUserPreferences(userId);
    } catch (error) {
      logger.error({ err: error.message, userId }, "Failed to load preferences");
    }

    const canShowOnline = preferences?.showOnline ?? true;
    socket.showOnline = canShowOnline;

    if (canShowOnline) {
      await userService.setUserPresence(userId, true);
      socket.broadcast.emit("user-online", { userId });
    }
    logger.info(`User connected: ${userId}`);

    socket.on("join-conversation", (conversationId) => {
      socket.join(`conversation:${conversationId}`);
      socket.emit("online-users", [...online.keys()]);
      logger.info(`User joined conversationId: ${conversationId}`);
    });

    socket.on("disconnect", async () => {
      const sockets = online.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          online.delete(userId);
          if (socket.showOnline) {
            await userService.setUserPresence(userId, false);
            socket.broadcast.emit("user-offline", { userId });
          }
        }
      }
      handleCallDisconnect(userId);
      logger.info("User disconnected");
    });

    registerCallHandlers({
      io,
      socket,
      getOnline: (targetUserId) => online.get(targetUserId),
      emitToUser,
    });

    socket.on("typing-conversation", (payload) => {
      const { conversationId, isTyping } = payload ?? {};
      socket.to(`conversation:${conversationId}`).emit("user-typing", {
        userId,
        conversationId,
        isTyping: typeof isTyping === "boolean" ? isTyping : true,
      });
    });
  });
  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized");
  }

  return io;
};
