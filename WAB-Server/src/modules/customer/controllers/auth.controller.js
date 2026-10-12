const authService = require('../services/auth.service');
const { sendSuccess } = require('../../../utils/response');
const { HTTP_STATUS, CLOUDINARY_FOLDERS } = require('../../../utils/constants');
const { uploadToCloudinary } = require('../../../config/cloudinary');
const { t } = require('../../../utils/i18n');
const fs = require('fs');

const register = async (req, res, next) => {
  try {
    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file.path, CLOUDINARY_FOLDERS.USER_IMAGES);
      fs.unlinkSync(req.file.path);
    }

    await authService.register({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      mobile: req.body.mobile,
      imageUrl,
    });

    sendSuccess(res, {
      message: t(req.lang, 'OTP_SENT'),
      statusCode: HTTP_STATUS.OK,
    });
  } catch (error) {
    next(error);
  }
};

const verify = async (req, res, next) => {
  try {
    const result = await authService.verify({
      mobile: req.body.mobile,
      otp: req.body.otp,
    });

    sendSuccess(res, {
      data: result,
      message: t(req.lang, 'VERIFICATION_SUCCESS'),
      statusCode: HTTP_STATUS.OK,
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await authService.login({
      mobile: req.body.mobile,
    });

    sendSuccess(res, {
      message: t(req.lang, 'OTP_SENT'),
      statusCode: HTTP_STATUS.OK,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, verify, login };
