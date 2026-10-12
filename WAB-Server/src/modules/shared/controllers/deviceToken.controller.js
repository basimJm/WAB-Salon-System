const { sendSuccess } = require('../../../utils/response');
const { HTTP_STATUS, REALTIME_EVENTS } = require('../../../utils/constants');
const { t } = require('../../../utils/i18n');
const { emitToUser } = require('../../../core/realtime/realtime.service');
const deviceTokenService = require('../services/deviceToken.service');

const registerDeviceToken = async (req, res, next) => {
  try {
    const { token, platform } = req.body;

    await deviceTokenService.registerDeviceToken({
      userId: req.user.id,
      token,
      platform,
    });

    emitToUser(req.user.id, REALTIME_EVENTS.NOTIFICATION, {
      type: 'device-token-registered',
      platform: platform || 'android',
    });

    return sendSuccess(res, {
      message: t(req.lang, 'DEVICE_TOKEN_REGISTERED'),
      statusCode: HTTP_STATUS.OK,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = { registerDeviceToken };
