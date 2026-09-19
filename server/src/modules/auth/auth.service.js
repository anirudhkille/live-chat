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

const OTP_TTL_SECONDS = 300;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

const issueSession = async (userId) => {
  const accessToken = generateAccessToken(userId);
  const refreshToken = generateRefreshToken(userId);

  await redis.set(
    `refreshToken:${userId}`,
    refreshToken,
    "EX",
    REFRESH_TOKEN_TTL_SECONDS,
  );

  return { accessToken, refreshToken };
};

export const loginUser = async (email) => {
  const cooldownKey = `loginOtpCooldown:${email}`;
  const cooldown = await redis.get(cooldownKey);
  if (cooldown) {
    throw new AppError(429, "Please wait before requesting another OTP");
  }

  const user = await userRepository.upsertByEmail(email);

  const otp = generateOtp();

  await redis.set(`loginOtp:${email}`, otp, "EX", OTP_TTL_SECONDS);
  await redis.del(`loginOtpAttempts:${email}`);

  await sendEmail(email, "Your Login OTP", otpTemplate(otp));
  await redis.set(cooldownKey, "1", "EX", OTP_RESEND_COOLDOWN_SECONDS);
};

export const verifyOtp = async (email, otp) => {
  const otpKey = `loginOtp:${email}`;
  const attemptsKey = `loginOtpAttempts:${email}`;

  const otpValue = await redis.get(otpKey);
  if (!otpValue) {
    throw new AppError(401, "Otp expired");
  }

  if (otpValue !== otp) {
    const attempts = await redis.incr(attemptsKey);
    await redis.expire(attemptsKey, OTP_TTL_SECONDS);
    if (attempts >= OTP_MAX_ATTEMPTS) {
      await redis.del(otpKey);
      await redis.del(attemptsKey);
      throw new AppError(
        429,
        "Too many incorrect attempts. Request a new OTP.",
      );
    }
    throw new AppError(401, "Invalid Otp");
  }

  await redis.del(otpKey);
  await redis.del(attemptsKey);

  const user = await userService.findUserByEmailOrThrow(email);
  const tokens = await issueSession(user.id);
  return { user, ...tokens };
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

  return issueSession(decoded._id);
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

  let user = await userRepository.upsertByEmail(email);

  if (!user.name && name) {
    user = await userRepository.updateById(user.id, { name });
  }

  const session = await issueSession(user.id);

  return { user, ...session };
};
