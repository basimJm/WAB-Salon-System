const { VALIDATION_RULES } = require('./constants');

const formatToJordanian = (mobile) => {
  if (mobile.startsWith('+962')) return mobile;
  if (!VALIDATION_RULES.JORDANIAN_MOBILE_REGEX.test(mobile)) return null;
  return '+962' + mobile.slice(1);
};

module.exports = { formatToJordanian };
