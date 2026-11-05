import { asyncHandler } from "../../utils/asyncHandler.js";
import * as authService from "./auth.service.js";
import { sendResponse } from "../../utils/response.js";
import { env } from "../../config/env.config.js";

const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const setRefreshCookie = (res, refreshToken) => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
};

export const sendLoginOtp = asyncHandler(async (req, res) => {
  await authService.loginUser(req.body.email);
  sendResponse(res, 200, "Login otp sent your email");
});

export const verifyLoginOtp = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.verifyOtp(
    req.body.email,
    req.body.otp,
  );

  setRefreshCookie(res, refreshToken);

  sendResponse(res, 200, "Logged in successfully", {
    user,
    accessToken,
    refreshToken,
  });
});

export const refreshToken = asyncHandler(async (req, res) => {
  const incomingToken = req.cookies?.refreshToken || req.body?.refreshToken;
  const { accessToken, refreshToken } =
    await authService.refreshToken(incomingToken);

  setRefreshCookie(res, refreshToken);

  sendResponse(res, 200, "Token refreshed", { accessToken, refreshToken });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.cookies.refreshToken);

  res.clearCookie("refreshToken");
  sendResponse(res, 200, "Logout successfully");
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await authService.updateUserProfile(req.user.id, req.body);
  sendResponse(res, 200, "Profile updated", { user });
});

const isAllowedRedirect = (redirect) => {
  if (typeof redirect !== "string" || !redirect) return false;
  if (redirect.startsWith(env.CLIENT_URL)) return true;
  if (redirect.startsWith("livechat://")) return true;
  return false;
};

export const googleAuth = asyncHandler(async (req, res) => {
  const redirect = isAllowedRedirect(req.query.redirect)
    ? req.query.redirect
    : env.CLIENT_URL;
  const url = authService.getGoogleAuthURL(redirect);
  res.redirect(url);
});

export const googleCallback = asyncHandler(async (req, res) => {
  const { code, state } = req.query;

  const requestedRedirect = isAllowedRedirect(
    typeof state === "string" ? decodeURIComponent(state) : "",
  )
    ? decodeURIComponent(state)
    : env.CLIENT_URL;

  if (!code) {
    return res.redirect(`${requestedRedirect}/login?error=google_auth_failed`);
  }

  const { user, accessToken, refreshToken } =
    await authService.googleLogin(code);

  setRefreshCookie(res, refreshToken);

  const userData = {
    _id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
  };

  const redirectURL = `${requestedRedirect}/auth/callback?accessToken=${accessToken}${requestedRedirect.startsWith("livechat://") ? `&refreshToken=${encodeURIComponent(refreshToken)}` : ""}&user=${encodeURIComponent(JSON.stringify(userData))}`;
  res.redirect(redirectURL);
});
