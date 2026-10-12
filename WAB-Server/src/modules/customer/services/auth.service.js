const jwt = require('jsonwebtoken');
const User = require('../../../models/User.model');
const MobileVerification = require('../../../models/MobileVerification.model');
const AppError = require('../../../utils/AppError');
const { generateOtp } = require('../../../utils/generateOtp');
const { formatToJordanian } = require('../../../utils/mobileFormat');
const {
  HTTP_STATUS,
  JWT_EXPIRES_IN,
  ROLES,
  OTP_EXPIRY_MINUTES,
  REALTIME_EVENTS,
  WELCOME_NOTIFICATION,
} = require('../../../utils/constants');
const { emitToUser } = require('../../../core/realtime/realtime.service');
const { sendToUser } = require('../../../core/notifications/notification.service');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, mobile: user.mobile, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || JWT_EXPIRES_IN }
  );
};

const register = async ({ firstName, lastName, email, mobile, imageUrl }) => {
  const formattedMobile = formatToJordanian(mobile);

  const existingMobile = await User.findOne({ mobile: formattedMobile });
  if (existingMobile) {
    throw new AppError('MOBILE_ALREADY_EXISTS', HTTP_STATUS.CONFLICT);
  }

  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    throw new AppError('EMAIL_ALREADY_EXISTS', HTTP_STATUS.CONFLICT);
  }

  const otp = generateOtp();
  const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await MobileVerification.findOneAndUpdate(
    { mobile: formattedMobile },
    {
      mobile: formattedMobile,
      otp,
      otpExpiresAt,
      registrationData: {
        firstName,
        lastName,
        email,
        image: imageUrl || null,
      },
    },
    { upsert: true }
  );

  return { otp };
};

const verify = async ({ mobile, otp }) => {
  const formattedMobile = formatToJordanian(mobile);

  const verification = await MobileVerification.findOne({
    mobile: formattedMobile,
    otp,
  });

  if (!verification) {
    throw new AppError('INVALID_OTP', HTTP_STATUS.BAD_REQUEST);
  }

  if (new Date() > verification.otpExpiresAt) {
    await MobileVerification.deleteOne({ _id: verification._id });
    throw new AppError('OTP_EXPIRED', HTTP_STATUS.BAD_REQUEST);
  }

  let user = await User.findOne({ mobile: formattedMobile });

  if (!user) {
    user = await User.create({
      firstName: verification.registrationData.firstName,
      lastName: verification.registrationData.lastName,
      email: verification.registrationData.email,
      mobile: formattedMobile,
      image: verification.registrationData.image || undefined,
      role: ROLES.CUSTOMER,
      isVerified: true,
    });
  }

  await MobileVerification.deleteOne({ _id: verification._id });

  const token = generateToken(user);

  const welcomePayload = { type: 'welcome', user: user.firstName };
  emitToUser(user._id, REALTIME_EVENTS.NOTIFICATION, welcomePayload);
  sendToUser({
    userId: user._id,
    notification: WELCOME_NOTIFICATION,
    data: welcomePayload,
  }).catch(() => {});

  return {
    token,
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      mobile: user.mobile,
      image: user.image,
      role: user.role,
    },
  };
};

const login = async ({ mobile }) => {
  const formattedMobile = formatToJordanian(mobile);

  const user = await User.findOne({ mobile: formattedMobile });
  if (!user) {
    throw new AppError('USER_NOT_FOUND', HTTP_STATUS.NOT_FOUND);
  }

  const otp = generateOtp();
  const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await MobileVerification.findOneAndUpdate(
    { mobile: formattedMobile },
    {
      mobile: formattedMobile,
      otp,
      otpExpiresAt,
      registrationData: null,
    },
    { upsert: true }
  );

  return { otp };
};

module.exports = { register, verify, login };
