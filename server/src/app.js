import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middleware/error.middleware.js";
import authRoutes from "./modules/auth/auth.route.js";
import conversationRoutes from "./modules/conversation/conversation.route.js";
import messageRoutes from "./modules/message/message.route.js";
import userRoutes from "./modules/user/user.route.js";
import { sendResponse } from "./utils/response.js";
import { env } from "./config/env.config.js";

const app = express();

app.use(
  cors({
    origin: env.ALLOWED_ORIGNS,
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  sendResponse(res, 200, "Api running successfully", {
    uptime: process.uptime(),
    timeStamp: Date.now(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/conversation", conversationRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/user", userRoutes);

app.use((req, res) => {
  sendResponse(res, 404, "Route not found");
});

app.use(errorHandler);

export default app;
