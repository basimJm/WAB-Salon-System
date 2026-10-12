const { validationResult } = require('express-validator');
const { HTTP_STATUS } = require('../utils/constants');
const { sendError } = require('../utils/response');
const { t } = require('../utils/i18n');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const grouped = {};
    for (const err of errors.array()) {
      if (!grouped[err.path]) grouped[err.path] = [];
      if (!grouped[err.path].includes(err.msg)) grouped[err.path].push(err.msg);
    }

    const sep = req.lang === 'en' ? ' and ' : ' و';
    const dot = req.lang === 'en' ? '. ' : '. ';

    const parts = Object.entries(grouped).map(([field, msgs]) => {
      if (msgs.length === 1) return msgs[0];
      const first = msgs[0];
      const rest = msgs.slice(1).join(sep);
      const joiner = req.lang === 'en' ? ', ' : '، ';
      return `${first}${joiner}${rest}`;
    });

    const message = parts.join(dot) + '.';

    const payload = { message, statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY };

    if (process.env.NODE_ENV === 'development') {
      const stackErr = new Error(JSON.stringify(Object.fromEntries(
        Object.entries(grouped).map(([f, msgs]) => [f, msgs.join('; ')]), null, 2
      )));
      payload.stack = stackErr.stack;
    }

    return sendError(res, payload);
  }
  next();
};

module.exports = { validate };
