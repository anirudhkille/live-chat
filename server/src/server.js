import http from "http";
import * as Sentry from "@sentry/node";
import app from "./app.js";
import { env } from "./config/env.config.js";
import { logger } from "./config/logger.js";
import { createSocketServer } from "./config/socket.js";

const PORT = env.PORT || 8080;
const SENTRY_FLUSH_TIMEOUT_MS = 2_000;

const server = http.createServer(app);
createSocketServer(server);

server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

const shutdown = (signal) => {
  logger.info(`${signal} received, shutting down`);

  const forceExit = setTimeout(() => process.exit(1), 5_000);
  forceExit.unref();

  server.close();
  server.closeIdleConnections();

  Sentry.close(SENTRY_FLUSH_TIMEOUT_MS)
    .catch(() => {})
    .finally(() => process.exit(0));
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
