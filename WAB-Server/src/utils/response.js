const sendSuccess = (res, { data = null, message, statusCode = 200 } = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const sendError = (res, { message, statusCode = 500, stack = null } = {}) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(stack && { stack }),
  });
};

module.exports = { sendSuccess, sendError };
