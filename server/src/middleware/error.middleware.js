import { sendResponse } from "../utils/response.js";

export const errorHandler = (err, req, res, _next) => {
  const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
  const message = err?.message || "Internal Server Error";
  sendResponse(res, statusCode, message);
};
