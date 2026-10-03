import { sendResponse } from "../utils/response.js";
import { logger } from "../config/logger.js";
import { captureError } from "../utils/sentry.js";

const PRISMA_ERRORS = {
  P2002: { status: 409, message: "Resource already exists" },
  P2003: { status: 400, message: "Request could not be completed" },
  P2014: { status: 400, message: "Request could not be completed" },
  P2025: { status: 404, message: "Not found" },
};

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const prismaError = err?.code ? PRISMA_ERRORS[err.code] : undefined;
  const statusCode =
    prismaError?.status ??
    (Number.isInteger(err?.statusCode) ? err.statusCode : 500);

  if (statusCode >= 500) {
    logger.error(
      {
        err: err?.message,
        prismaCode: err?.code,
        method: req.method,
        path: req.originalUrl,
        userId: req.user?.id,
        stack: err?.stack,
      },
      "Request failed",
    );
    captureError(err, {
      path: req.originalUrl,
      method: req.method,
      userId: req.user?.id,
    });

    return sendResponse(res, 500, "Internal Server Error");
  }

  sendResponse(res, statusCode, prismaError?.message ?? message(err));
};

const message = (err) => err?.message || "Bad Request";
