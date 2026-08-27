import { asyncHandler } from "../../utils/asyncHandler.js";
import * as userService from "./user.service.js";
import { sendResponse } from "../../utils/response.js";

export const searchUser = asyncHandler(async (req, res) => {
  const { search, page, limit } = req.query;
  const { id } = req.user;

  const user = await userService.searchUser(search, page, limit, id);
  sendResponse(res, 200, "User fetched successfully", user);
});
