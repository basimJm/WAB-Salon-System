const mongoose = require('mongoose');

const mobileVerificationSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    otp: {
      type: String,
      required: true,
    },
    otpExpiresAt: {
      type: Date,
      required: true,
    },
    registrationData: {
      firstName: String,
      lastName: String,
      email: String,
      image: String,
    },
  },
  {
    timestamps: true,
  }
);

mobileVerificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 600 }
);

module.exports = mongoose.model('MobileVerification', mobileVerificationSchema);
