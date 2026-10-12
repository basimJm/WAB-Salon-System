const mongoose = require('mongoose');
const { ROLES, VALIDATION_RULES } = require('../utils/constants');

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      minlength: VALIDATION_RULES.NAME_MIN_LENGTH,
      maxlength: VALIDATION_RULES.NAME_MAX_LENGTH,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      minlength: VALIDATION_RULES.NAME_MIN_LENGTH,
      maxlength: VALIDATION_RULES.NAME_MAX_LENGTH,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: VALIDATION_RULES.EMAIL_REGEX,
    },
    mobile: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    image: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.CUSTOMER,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);
