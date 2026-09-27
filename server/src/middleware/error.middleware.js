import { sendResponse } from "../utils/response.js";
import { logger } from "../config/logger.js";

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
  const message = err?.message || "Internal Server Error";

  if (statusCode >= 500) {
    logger.error(
      {
        err: err?.message,
        method: req.method,
        path: req.originalUrl,
        userId: req.user?.id,
        stack: err?.stack,
      },
      "Request failed",
    );
  }

  sendResponse(res, statusCode, message);
};
