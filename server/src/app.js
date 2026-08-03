import express from "express";
import cors from "cors";
import { errorHandler } from "./middleware/error.middleware.js";
import authRoutes from "./modules/auth/auth.route.js";
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

app.get("/api/health", (req, res) => {
  sendResponse(res, 200, "Api running successfully", {
    uptime: process.uptime(),
    timeStamp: Date.now(),
  });
});

app.use("/api/auth", authRoutes);

app.use((req, res) => {
  sendResponse(res, 404, "Route not found");
});

app.use(errorHandler);

export default app;
