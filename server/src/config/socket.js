import { Server } from "socket.io";
import { env } from "./env.config.js";
import { logger } from "./logger.js";

let io;

export const createSocketServer = (httpServer) => {
  io= new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
  });

  io.on("connection",(socket)=>{
logger.info("User connected to",socket.id)

   socket.on("join-conversation",(conversationId)=>{
    socket.join(`conversation:${conversationId}`)
    logger.info(`User joined conversationId: ${conversationId}`)
   })
   
    socket.on("disconnect",()=>{
    logger.info(`User disconnected`)
   })

   socket.on("typing-conversation",(conversationId)=>{
socket.to(`conversationid:${conversationId}`).emit('user-typing',{
    userId:socket.userId,
    conversationId
})
   })
   
  })
  return io
};

export const getIO=()=>{
     if (!io) {
    throw new Error("Socket.IO has not been initialized");
  }

  return io;
}