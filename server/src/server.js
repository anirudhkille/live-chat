import http from "http";
import app from "./app.js";
import { env } from "./config/env.config.js";
import { logger } from "./config/logger.js";
import { createSocketServer } from "./config/socket.js";

const PORT = env.PORT || 8080;

const server = http.createServer(app);
createSocketServer(server);

server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
