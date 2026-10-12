const { VALIDATION_RULES } = require('./constants');

const generateOtp = () => {
  if (process.env.NODE_ENV === 'development') {
    return VALIDATION_RULES.DEV_OTP;
  }
  return String(Math.floor(1000 + Math.random() * 9000));
};

module.exports = { generateOtp };
