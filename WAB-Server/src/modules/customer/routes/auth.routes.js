const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { registerValidator, loginValidator, verifyValidator } = require('../validators/auth.validator');
const { validate } = require('../../../middleware/validate.middleware');
const { upload, handleUploadError } = require('../../../middleware/upload.middleware');

router.post(
  '/register',
  upload.single('image'),
  handleUploadError,
  registerValidator,
  validate,
  authController.register
);

router.post(
  '/verify',
  verifyValidator,
  validate,
  authController.verify
);

router.post(
  '/login',
  loginValidator,
  validate,
  authController.login
);

module.exports = router;
