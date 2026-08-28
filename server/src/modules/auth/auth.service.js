import { env } from "../../config/env.config.js";
import { redis } from "../../config/redis.js";
import { otpTemplate } from "../../templates/otp.template.js";
import { AppError } from "../../utils/AppError.js";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt.js";
import { sendEmail } from "../../utils/sendEmail.js";
import { generateOtp } from "../../utils/otp.js";
import * as userService from "../user/user.service.js";
import jwt from "jsonwebtoken";
import * as userRepository from "../user/user.repository.js";
import {
  getGoogleAuthURL as googleAuthUrl,
  getGoogleTokens,
  getGoogleUser,
} from "./auth.google.js";
import { logger } from "../../config/logger.js";

export const loginUser = async (email) => {
  const user = await userRepository.findEmail(email);

  if (!user) {
    await userRepository.create(email);
  }

  const otp = generateOtp();

  await redis.set(`loginOtp:${email}`, otp, "EX", 300);

  return sendEmail(email, "Your Login OTP", otpTemplate(otp));
};

export const verifyOtp = async (email, otp) => {
  const otpKey = `loginOtp:${email}`;

  const otpValue = await redis.get(otpKey);
  if (!otpValue) {
    throw new AppError(401, "Otp expired");
  }

  if (otpValue !== otp) {
    throw new AppError(401, "Invalid Otp");
  }

  await redis.del(otpKey);

  const user = await userService.findUserByEmailOrThrow(email);
  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  await redis.set(
    `refreshToken:${user.id}`,
    refreshToken,
    "EX",
    60 * 60 * 24 * 7,
  );
  return { user, accessToken, refreshToken };
};

export const refreshToken = async (token) => {
  if (!token) {
    throw new AppError(401, "No token provided");
  }

  let decoded;

  try {
    decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
  } catch (err) {
    logger.error(err);
    throw new AppError(401, "Invalid or expired token");
  }

  if (!decoded._id) {
    throw new AppError(401, "Invalid token");
  }

  const storedToken = await redis.get(`refreshToken:${decoded._id}`);

  if (!storedToken) {
    throw new AppError(401, "Token doesn't exist");
  }

  if (storedToken !== token) {
    throw new AppError(401, "Token mismatch");
  }

  const accessToken = generateAccessToken(decoded._id);
  const refreshToken = generateRefreshToken(decoded._id);

  await redis.set(
    `refreshToken:${decoded._id}`,
    refreshToken,
    "EX",
    60 * 60 * 24 * 7,
  );

  return { accessToken, refreshToken };
};

export const logout = async (token) => {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);

  await redis.del(`refreshToken:${decoded._id}`);
};

export const updateUserProfile = async (userId, body) => {
  const { name } = body;

  if (!name) {
    throw new AppError(400, "Name is required");
  }

  return userRepository.updateById(userId, { name });
};

export const getGoogleAuthURL = () => {
  return googleAuthUrl();
};

export const googleLogin = async (code) => {
  const tokens = await getGoogleTokens(code);
  const googleUser = await getGoogleUser(tokens.access_token);

  const { email, name } = googleUser;

  let user = await userRepository.findEmail(email);

  if (!user) {
    user = await userRepository.create(email);
  }

  if (!user.name && name) {
    user = await userRepository.updateById(user.id, { name });
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  await redis.set(
    `refreshToken:${user.id}`,
    refreshToken,
    "EX",
    60 * 60 * 24 * 7,
  );

  return { user, accessToken, refreshToken };
};
