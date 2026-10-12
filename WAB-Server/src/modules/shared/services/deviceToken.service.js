const DeviceToken = require('../../../models/DeviceToken.model');
const { DEVICE_PLATFORMS } = require('../../../utils/constants');

const registerDeviceToken = async ({ userId, token, platform }) => {
  const deviceToken = await DeviceToken.findOneAndUpdate(
    { token },
    {
      user: userId,
      token,
      platform: platform || DEVICE_PLATFORMS.ANDROID,
      isActive: true,
      lastUsedAt: new Date(),
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  return {
    id: deviceToken._id,
    token: deviceToken.token,
    platform: deviceToken.platform,
    isActive: deviceToken.isActive,
  };
};

module.exports = { registerDeviceToken };
