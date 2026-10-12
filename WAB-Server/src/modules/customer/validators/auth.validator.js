const { body } = require('express-validator');
const { VALIDATION_RULES } = require('../../../utils/constants');
const { t } = require('../../../utils/i18n');

const nameValidation = (field) =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage((value, { req }) => t(req.lang, `${field}_required`))
    .isLength({ min: VALIDATION_RULES.NAME_MIN_LENGTH })
    .withMessage((value, { req }) => t(req.lang, `${field}_minLength`));

const emailValidation = body('email')
  .trim()
  .notEmpty()
  .withMessage((value, { req }) => t(req.lang, 'email_required'))
  .isEmail()
  .withMessage((value, { req }) => t(req.lang, 'email_invalid'))
  .normalizeEmail();

const mobileValidation = body('mobile')
  .trim()
  .notEmpty()
  .withMessage((value, { req }) => t(req.lang, 'mobile_required'))
  .matches(VALIDATION_RULES.JORDANIAN_MOBILE_REGEX)
  .withMessage((value, { req }) => t(req.lang, 'mobile_invalid'));

const otpValidation = body('otp')
  .trim()
  .notEmpty()
  .withMessage((value, { req }) => t(req.lang, 'otp_required'))
  .matches(VALIDATION_RULES.OTP_REGEX)
  .withMessage((value, { req }) => t(req.lang, 'otp_invalid'));

const imageValidation = body('image')
  .optional();

const registerValidator = [
  nameValidation('firstName'),
  nameValidation('lastName'),
  emailValidation,
  mobileValidation,
  imageValidation,
];

const loginValidator = [
  mobileValidation,
];

const verifyValidator = [
  mobileValidation,
  otpValidation,
];

module.exports = { registerValidator, loginValidator, verifyValidator };
