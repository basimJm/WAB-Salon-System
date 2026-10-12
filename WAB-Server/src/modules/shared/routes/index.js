const express = require('express');
const router = express.Router();
const deviceTokenController = require('../controllers/deviceToken.controller');
const { registerDeviceTokenValidator } = require('../validators/deviceToken.validator');
const { validate } = require('../../../middleware/validate.middleware');
const { authenticate } = require('../../../middleware/auth.middleware');

router.post(
  '/device-token',
  authenticate,
  registerDeviceTokenValidator,
  validate,
  deviceTokenController.registerDeviceToken
);

module.exports = router;
