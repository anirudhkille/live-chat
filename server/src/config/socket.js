import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "./env.config.js";
import { logger } from "./logger.js";

let io;

export const createSocketServer = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
  });
  
  const online = new Map(); // userId -> Set<socketId>

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

  io.on("connection", (socket) => {
    const userId = socket.userId;

    if (!online.has(userId)) {
      online.set(userId, new Set());
    }
    online.get(userId).add(socket.id);
    socket.broadcast.emit("user-online", { userId });
    logger.info(`User connected: ${userId}`);

    socket.on("join-conversation", (conversationId) => {
      socket.join(`conversation:${conversationId}`);
      socket.emit("online-users", [...online.keys()]);
      logger.info(`User joined conversationId: ${conversationId}`);
    });

    socket.on("disconnect", () => {
      const sockets = online.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          online.delete(userId);
          socket.broadcast.emit("user-offline", { userId });
        }
      }
      logger.info("User disconnected");
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