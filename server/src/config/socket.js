import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "./env.config.js";
import { logger } from "./logger.js";
import {
  registerCallHandlers,
  handleCallDisconnect,
} from "../modules/call/call.socket.js";
import * as userService from "../modules/user/user.service.js";
import * as conversationRepository from "../modules/conversation/conversation.repository.js";

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

export const conversationRoom = (conversationId) =>
  `conversation:${conversationId}`;

export const emitToConversation = (conversationId, event, payload) => {
  if (!io) return;
  io.to(conversationRoom(conversationId)).emit(event, payload);
};

const visibleOnline = new Set();

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
      logger.error(
        { err: error.message, userId },
        "Failed to load preferences",
      );
    }

    const canShowOnline = preferences?.showOnline ?? true;
    socket.showOnline = canShowOnline;

    if (canShowOnline) {
      visibleOnline.add(userId);
      try {
        await userService.setUserPresence(userId, true);
        socket.broadcast.emit("user-online", { userId });
      } catch (error) {
        logger.error({ err: error.message, userId }, "Failed to set presence");
      }
    }
    logger.info(`User connected: ${userId}`);

    socket.on("join-conversation", async (conversationId) => {
      try {
        const member = await conversationRepository.findParticipant(
          conversationId,
          userId,
        );
        if (!member) {
          socket.emit("conversation-error", {
            conversationId,
            message: "You are not a participant of this conversation",
          });
          return;
        }
        socket.join(conversationRoom(conversationId));
        socket.emit("online-users", [...visibleOnline]);
        logger.info(`User joined conversationId: ${conversationId}`);
      } catch (error) {
        logger.error(
          { err: error.message, userId, conversationId },
          "Join failed",
        );
        socket.emit("conversation-error", {
          conversationId,
          message: "Failed to join conversation",
        });
      }
    });

    socket.on("leave-conversation", (conversationId) => {
      socket.leave(conversationRoom(conversationId));
    });

    socket.on("disconnect", async () => {
      try {
        const sockets = online.get(userId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            online.delete(userId);
            visibleOnline.delete(userId);
            if (socket.showOnline) {
              await userService.setUserPresence(userId, false);
              socket.broadcast.emit("user-offline", { userId });
            }
          }
        }
      } catch (error) {
        logger.error(
          { err: error.message, userId },
          "Disconnect presence cleanup failed",
        );
      } finally {
        try {
          await handleCallDisconnect(userId);
        } catch (error) {
          logger.error(
            { err: error.message, userId },
            "Disconnect call cleanup failed",
          );
        }
      }
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
      const room = conversationRoom(conversationId);
      if (!socket.rooms.has(room)) return;
      socket.to(room).emit("user-typing", {
        userId,
        conversationId,
        isTyping: typeof isTyping === "boolean" ? isTyping : true,
      });
    });
  });
  return io;
};
