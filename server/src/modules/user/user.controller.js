import { asyncHandler } from "../../utils/asyncHandler.js";
import * as userService from "./user.service.js";
import { sendResponse } from "../../utils/response.js";

export const searchUser = asyncHandler(async (req, res) => {
  const { search, page, limit } = req.query;
  const { id } = req.user;

  const user = await userService.searchUser(search, page, limit, id);
  sendResponse(res, 200, "User fetched successfully", user);
});

export const getAvatarUploadUrl = asyncHandler(async (req, res) => {
  const { contentType } = req.body;

  const url = await userService.getAvatarUploadUrl(req.user.id, contentType);
  sendResponse(res, 200, "User avatar upload url generated successfully", url);
});

export const confirmAvatarUpload = asyncHandler(async (req, res) => {
  const { key } = req.body;

  const user = await userService.confirmAvatarUpload(req.user.id, key);
  sendResponse(res, 200, "Avatar saved successfully", user);
});

export const getWallpaperUploadUrl = asyncHandler(async (req, res) => {
  const { contentType } = req.body;

  const url = await userService.getWallpaperUploadUrl(req.user.id, contentType);
  sendResponse(res, 200, "Wallpaper upload url generated successfully", url);
});

export const confirmWallpaperUpload = asyncHandler(async (req, res) => {
  const { key } = req.body;

  const user = await userService.confirmWallpaperUpload(req.user.id, key);
  sendResponse(res, 200, "Wallpaper saved successfully", user);
});

export const getPreferences = asyncHandler(async (req, res) => {
  const preferences = await userService.getUserPreferences(req.user.id);
  sendResponse(res, 200, "Preferences fetched successfully", preferences);
});

export const updatePreferences = asyncHandler(async (req, res) => {
  const preferences = await userService.updateUserPreferences(
    req.user.id,
    req.body,
  );
  sendResponse(res, 200, "Preferences updated successfully", preferences);
});
