import { asyncHandler } from "../../utils/asyncHandler.js";
import * as callService from "./call.service.js";
import { sendResponse } from "../../utils/response.js";

export const getCallLogs = asyncHandler(async (req, res) => {
  const filter =
    typeof req.query.filter === "string" ? req.query.filter : undefined;
  const logs = await callService.getCallLogsForUser(req.user.id, { filter });
  sendResponse(res, 200, "Call logs fetched successfully", logs);
});
