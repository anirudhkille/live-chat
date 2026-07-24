export class AppError extends Error {
  constructor(statuscode, message) {
    super(message);

    this.statusCode = statuscode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}
