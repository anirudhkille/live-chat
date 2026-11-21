import { randomUUID } from "node:crypto";
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
  verifyGoogleIdToken,
} from "./auth.google.js";
import { logger } from "../../config/logger.js";
import {
  createOAuthCode,
  createOAuthState,
  isVerifiedGoogleUser,
  normalizeGoogleEmail,
  OAUTH_CODE_TTL_SECONDS,
  OAUTH_STATE_TTL_SECONDS,
} from "./auth.helpers.js";

const OTP_TTL_SECONDS = 300;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const REFRESH_TOKEN_PREFIX = "refreshToken:";
const OAUTH_STATE_PREFIX = "oauthState:";
const OAUTH_CODE_PREFIX = "oauthCode:";

const CONSUME_SCRIPT =
  'local value = redis.call("GET", KEYS[1]) if value then redis.call("DEL", KEYS[1]) end return value';

// Atomically read and delete a key. GETDEL needs Redis 6.2+; the Lua fallback
// keeps older deployments working while remaining atomic.
const consumeRedisKey = async (key) => {
  if (typeof redis.getdel === "function") {
    return redis.getdel(key);
  }

  return redis.eval(CONSUME_SCRIPT, 1, key);
};

const issueSession = async (userId) => {
  const jti = randomUUID();
  const accessToken = generateAccessToken(userId);
  const refreshToken = generateRefreshToken(userId, jti);

  await redis.set(
    `${REFRESH_TOKEN_PREFIX}${jti}`,
    userId,
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

  await userRepository.upsertByEmail(email);

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

  if (!decoded._id || typeof decoded.jti !== "string" || !decoded.jti) {
    throw new AppError(401, "Invalid token");
  }

  // Consuming the old jti makes refresh rotation single-use. Two concurrent
  // requests carrying the same token cannot both succeed.
  const storedUserId = await consumeRedisKey(
    `${REFRESH_TOKEN_PREFIX}${decoded.jti}`,
  );

  if (!storedUserId) {
    throw new AppError(401, "Session expired or revoked");
  }

  if (storedUserId !== decoded._id) {
    logger.error(
      { userId: decoded._id },
      "Refresh token user mismatch, session revoked",
    );
    throw new AppError(401, "Invalid token");
  }

  return issueSession(decoded._id);
};

export const logout = async (token) => {
  if (!token) return;

  let decoded;

  try {
    decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
  } catch {
    return;
  }

  if (typeof decoded.jti === "string" && decoded.jti) {
    await redis.del(`${REFRESH_TOKEN_PREFIX}${decoded.jti}`);
  }
};

export const updateUserProfile = async (userId, body) => {
  const { name } = body;

  if (typeof name !== "string" || !name.trim()) {
    throw new AppError(400, "Name is required");
  }

  return userRepository.updateById(userId, { name: name.trim() });
};

export const getGoogleAuthURL = (state) => {
  return googleAuthUrl(state);
};

export const createGoogleOAuthState = async (redirect) => {
  const state = createOAuthState();

  await redis.set(
    `${OAUTH_STATE_PREFIX}${state}`,
    redirect,
    "EX",
    OAUTH_STATE_TTL_SECONDS,
  );

  return state;
};

export const consumeGoogleOAuthState = async (state) => {
  if (!state) return null;

  return consumeRedisKey(`${OAUTH_STATE_PREFIX}${state}`);
};

export const createGoogleExchangeCode = async (session) => {
  const code = createOAuthCode();

  await redis.set(
    `${OAUTH_CODE_PREFIX}${code}`,
    JSON.stringify(session),
    "EX",
    OAUTH_CODE_TTL_SECONDS,
  );

  return code;
};

export const exchangeGoogleCode = async (code) => {
  if (!code) return null;

  const payload = await consumeRedisKey(`${OAUTH_CODE_PREFIX}${code}`);
  if (!payload) return null;

  try {
    const session = JSON.parse(payload);

    if (
      !session?.user ||
      typeof session.accessToken !== "string" ||
      typeof session.refreshToken !== "string"
    ) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
};

export const googleLogin = async (code) => {
  const tokens = await getGoogleTokens(code);
  const googleUser = await getGoogleUser(tokens.access_token);

  if (!isVerifiedGoogleUser(googleUser)) {
    throw new AppError(401, "Google account email is not verified");
  }

  const email = normalizeGoogleEmail(googleUser.email);
  const { name } = googleUser;

  let user = await userRepository.upsertByEmail(email);

  if (!user.name && name) {
    user = await userRepository.updateById(user.id, { name });
  }

  const session = await issueSession(user.id);

  return { user, ...session };
};

export const googleLoginWithIdToken = async (idToken) => {
  const { email, name, avatar } = await verifyGoogleIdToken(idToken);

  let user = await userRepository.upsertByEmail(email);

  const updates = {};
  if (!user.name && name) updates.name = name;
  if (!user.avatar && avatar) updates.avatar = avatar;

  if (Object.keys(updates).length > 0) {
    user = await userRepository.updateById(user.id, updates);
  }

  const session = await issueSession(user.id);

  return { user, ...session };
};
