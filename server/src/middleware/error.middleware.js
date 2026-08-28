import { sendResponse } from "../utils/response.js";

export const errorHandler = (err, req, res, _next) => {
  if (err) {
    return sendResponse(res, err.statusCode, err.message);
  }

  sendResponse(res, 500, "Internal Server Error");
};
