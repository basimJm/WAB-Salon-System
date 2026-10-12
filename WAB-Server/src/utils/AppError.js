class AppError extends Error {
  constructor(messageKey, statusCode) {
    super(messageKey);
    this.messageKey = messageKey;
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
