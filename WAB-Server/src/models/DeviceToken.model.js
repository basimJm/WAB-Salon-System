const mongoose = require('mongoose');
const { DEVICE_PLATFORMS } = require('../utils/constants');

const deviceTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    platform: {
      type: String,
      enum: Object.values(DEVICE_PLATFORMS),
      default: DEVICE_PLATFORMS.ANDROID,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

deviceTokenSchema.index({ user: 1, isActive: 1 });

module.exports = mongoose.model('DeviceToken', deviceTokenSchema);
