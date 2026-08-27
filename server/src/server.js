import app from "./app.js";
import { env } from "./config/env.config.js";
import { logger } from "./config/logger.js";

const PORT = env.PORT || 8080;
app.listen(PORT, logger.info("Server is Running..."));
