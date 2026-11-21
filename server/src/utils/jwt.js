import jwt from "jsonwebtoken";
import { env } from "../config/env.config.js";

export const generateAccessToken = (_id) => {
  return jwt.sign({ _id: _id }, env.JWT_ACCESS_SECRET, {
    expiresIn: "15m",
  });
};

export const generateRefreshToken = (_id, jti) => {
  return jwt.sign({ _id, jti }, env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
};
