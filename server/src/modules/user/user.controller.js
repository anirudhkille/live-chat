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
  sendResponse(res, 200, "User fetched successfully", user);
});
