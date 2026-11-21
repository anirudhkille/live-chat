import { asyncHandler } from "../../utils/asyncHandler.js";
import * as authService from "./auth.service.js";
import { sendResponse } from "../../utils/response.js";
import { env } from "../../config/env.config.js";
import { AppError } from "../../utils/AppError.js";
import { logger } from "../../config/logger.js";
import {
  buildOAuthRedirectUrl,
  buildSessionPayload,
  getRedirectTarget,
  getRefreshToken,
  getWebOrigin,
  isMobileClient,
} from "./auth.helpers.js";

const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const OAUTH_STATE_COOKIE = "oauthState";
const OAUTH_STATE_COOKIE_MAX_AGE = 10 * 60 * 1000;

const cookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
});

const setRefreshCookie = (res, refreshToken) => {
  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions(),
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie("refreshToken", cookieOptions());
};

const setOAuthStateCookie = (res, state) => {
  res.cookie(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: OAUTH_STATE_COOKIE_MAX_AGE,
  });
};

const clearOAuthStateCookie = (res) => {
  res.clearCookie(OAUTH_STATE_COOKIE, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
};

const webLoginErrorRedirect = () => {
  const origin = getWebOrigin(env.CLIENT_URL) ?? env.CLIENT_URL;
  return `${origin}/login?error=google_auth_failed`;
};

export const sendLoginOtp = asyncHandler(async (req, res) => {
  await authService.loginUser(req.body.email);
  sendResponse(res, 200, "Login otp sent your email");
});

export const verifyLoginOtp = asyncHandler(async (req, res) => {
  const session = await authService.verifyOtp(req.body.email, req.body.otp);

  setRefreshCookie(res, session.refreshToken);

  sendResponse(
    res,
    200,
    "Logged in successfully",
    buildSessionPayload(session, isMobileClient(req)),
  );
});

export const googleMobileLogin = asyncHandler(async (req, res) => {
  const session = await authService.googleLoginWithIdToken(req.body.idToken);

  setRefreshCookie(res, session.refreshToken);

  sendResponse(
    res,
    200,
    "Logged in successfully",
    buildSessionPayload(session, isMobileClient(req)),
  );
});

export const refreshToken = asyncHandler(async (req, res) => {
  const incomingToken = getRefreshToken(req);
  const tokens = await authService.refreshToken(incomingToken);

  // Native clients keep the rotated refresh token in their secure store; web
  // clients receive it only as an httpOnly cookie.
  if (isMobileClient(req)) {
    sendResponse(res, 200, "Token refreshed", {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
    return;
  }

  setRefreshCookie(res, tokens.refreshToken);
  sendResponse(res, 200, "Token refreshed", {
    accessToken: tokens.accessToken,
  });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(getRefreshToken(req));

  clearRefreshCookie(res);
  clearOAuthStateCookie(res);
  sendResponse(res, 200, "Logout successfully");
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await authService.updateUserProfile(req.user.id, req.body);
  sendResponse(res, 200, "Profile updated", { user });
});

export const googleAuth = asyncHandler(async (req, res) => {
  const redirect = getRedirectTarget(req.query.redirect, env.CLIENT_URL);
  const state = await authService.createGoogleOAuthState(redirect);

  setOAuthStateCookie(res, state);
  res.redirect(authService.getGoogleAuthURL(state));
});

export const googleCallback = asyncHandler(async (req, res) => {
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const cookieState = req.cookies?.[OAUTH_STATE_COOKIE];
  const requestedRedirect = await authService.consumeGoogleOAuthState(state);

  clearOAuthStateCookie(res);

  if (!state || !cookieState || state !== cookieState || !requestedRedirect) {
    return res.redirect(webLoginErrorRedirect());
  }

  const code = typeof req.query.code === "string" ? req.query.code : "";
  if (!code) {
    return res.redirect(webLoginErrorRedirect());
  }

  try {
    const { user, accessToken, refreshToken } =
      await authService.googleLogin(code);

    setRefreshCookie(res, refreshToken);

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    };

    const exchangeCode = await authService.createGoogleExchangeCode({
      user: userData,
      accessToken,
      refreshToken,
    });

    return res.redirect(buildOAuthRedirectUrl(requestedRedirect, exchangeCode));
  } catch (error) {
    logger.error(error);
    clearRefreshCookie(res);
    return res.redirect(webLoginErrorRedirect());
  }
});

export const googleExchange = asyncHandler(async (req, res) => {
  const session = await authService.exchangeGoogleCode(req.body.code);

  if (!session) {
    throw new AppError(401, "Invalid or expired authorization code");
  }

  const mobile = isMobileClient(req);

  if (!mobile) {
    setRefreshCookie(res, session.refreshToken);
  }

  sendResponse(
    res,
    200,
    "Logged in successfully",
    buildSessionPayload(session, mobile),
  );
});
