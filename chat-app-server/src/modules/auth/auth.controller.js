import { asyncHandler } from "../../utils/asyncHandler.js";
import * as authService from "./auth.service.js";
import { sendResponse } from "../../utils/response.js";
import { env } from "../../config/env.config.js";

export const sendLoginOtp = asyncHandler(async (req, res) => {
  await authService.loginUser(req.body.email);
  sendResponse(res, 200, "Login otp sent your email");
});

export const verifyLoginOtp = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.verifyOtp(
    req.body.email,
    req.body.otp,
  );

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  sendResponse(res, 200, "Logged in successfully", { user, accessToken });
});

export const refreshToken = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken } = await authService.refreshToken(
    req.cookies.refreshToken,
  );

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  sendResponse(res, 200, "Token refreshed", { accessToken });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.cookies.refreshToken);

  res.clearCookie("refreshToken");
  sendResponse(res, 200, "Logout successfully");
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await authService.updateUserProfile(req.user._id, req.body);
  sendResponse(res, 200, "Profile updated", { user });
});

export const googleAuth = asyncHandler(async (req, res) => {
  const url = authService.getGoogleAuthURL();
  res.redirect(url);
});

export const googleCallback = asyncHandler(async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.redirect(`${env.CLIENT_URL}/login?error=google_auth_failed`);
  }

  const { user, accessToken, refreshToken } =
    await authService.googleLogin(code);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  const userData = {
    _id: user._id,
    name: user.name,
    email: user.email,
  };

  const redirectURL = `${env.CLIENT_URL}/auth/callback?accessToken=${accessToken}&user=${encodeURIComponent(JSON.stringify(userData))}`;
  res.redirect(redirectURL);
});
