import { asyncHandler } from "../../utils/asyncHandler.js";
import * as authService from "./auth.service.js";
import { sendResponse } from "../../utils/response.js";

export const sendLoginOtp = asyncHandler(async (req, res) => {
  await authService.loginUser(req.body.email);
  sendResponse(res, 200, "Login otp sent your email");
});

export const verifyLoginOtp = asyncHandler(async (req, res) => {
  const { user } = await authService.verifyLoginOtp(
    req.body.email,
    req.body.otp,
  );
  sendResponse(res, 200, "Logged in successfully");
});

export const refreshToken = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken } = await authService.refreshToken(
    req.cookies.refreshToken,
  );

  res.cookie("refreshToken", refreshToken, cookieOptions);

  sendResponse(res, 200, "Token refreshed", { accessToken });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.cookies.refreshToken);

  res.clearCookie("refreshToken");
  sendResponse(res, 200, "Logout successfully");
});
