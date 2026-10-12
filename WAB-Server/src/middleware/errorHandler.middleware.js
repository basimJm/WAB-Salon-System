const { HTTP_STATUS } = require('../utils/constants');
const { sendError } = require('../utils/response');
const { t } = require('../utils/i18n');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = err.messageKey
    ? t(req.lang, err.messageKey)
    : err.message || t(req.lang, 'INTERNAL_ERROR');

  if (err.name === 'ValidationError') {
    statusCode = HTTP_STATUS.UNPROCESSABLE_ENTITY;
    message = t(req.lang, 'VALIDATION_ERROR');
  }

  if (err.code === 11000) {
    statusCode = HTTP_STATUS.CONFLICT;
    const field = Object.keys(err.keyValue)[0];
    message = field === 'mobile'
      ? t(req.lang, 'MOBILE_ALREADY_EXISTS')
      : t(req.lang, 'EMAIL_ALREADY_EXISTS');
  }

  if (err.name === 'CastError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = req.lang === 'en'
      ? `Invalid value for ${err.path}: ${err.value}`
      : `قيمة غير صالحة للحقل ${err.path}: ${err.value}`;
  }

  const payload = { message, statusCode };

  if (process.env.NODE_ENV === 'development') {
    payload.stack = err.stack;
  }

  sendError(res, payload);
};

module.exports = { errorHandler };
