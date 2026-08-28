import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import jwt from "jsonwebtoken";
import { env } from "../config/env.config.js";
import { findUserByIdOrThrow } from "../modules/user/user.service.js";
import { logger } from "../config/logger.js";

export const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    throw new AppError(401, "Not authorized, no token");
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    req.user = await findUserByIdOrThrow(decoded._id);
    next();
  } catch (error) {
    logger.error(error);
    throw new AppError(401, "Not authorized, token failed");
  }
});
