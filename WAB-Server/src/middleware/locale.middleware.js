const { supportedLangs } = require('../utils/i18n');

const locale = (req, res, next) => {
  const header = req.headers['accept-language'];
  const lang = supportedLangs.includes(header) ? header : 'ar';
  req.lang = lang;
  next();
};

module.exports = { locale };
