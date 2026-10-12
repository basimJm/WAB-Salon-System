const { body } = require('express-validator');
const { t } = require('../../../utils/i18n');
const { DEVICE_PLATFORMS } = require('../../../utils/constants');

const registerDeviceTokenValidator = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage((value, { req }) => t(req.lang, 'deviceToken_required'))
    .isString()
    .isLength({ min: 20 })
    .withMessage((value, { req }) => t(req.lang, 'deviceToken_invalid')),
  body('platform')
    .optional()
    .isIn(Object.values(DEVICE_PLATFORMS))
    .withMessage((value, { req }) => t(req.lang, 'platform_invalid')),
];

module.exports = { registerDeviceTokenValidator };
