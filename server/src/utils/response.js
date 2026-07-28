export const sendResponse = (
  res,
  status = 200,
  message = "Sucess",
  data = {},
) => {
  return res.status(status).json({
    success: status >= 200 && status < 300,
    message: message,
    data,
  });
};
