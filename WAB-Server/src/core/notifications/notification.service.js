const { getMessaging } = require('firebase-admin/messaging');
const DeviceToken = require('../../models/DeviceToken.model');
const User = require('../../models/User.model');
const { isFirebaseReady } = require('./firebase.config');

const sendToDevice = async ({ token, notification, data }) => {
  if (!isFirebaseReady()) {
    console.warn('[notifications] FCM not configured — push skipped:', JSON.stringify({ notification, data }));
    return { skipped: true, reason: 'FCM_NOT_CONFIGURED' };
  }

  const message = {
    token,
    ...(notification && { notification }),
    ...(data && { data }),
  };

  try {
    return await getMessaging().send(message);
  } catch (err) {
    if (
      err.code === 'messaging/registration-token-not-registered' ||
      err.code === 'messaging/invalid-argument'
    ) {
      await DeviceToken.updateOne({ token }, { isActive: false });
    }
    throw err;
  }
};

const sendToUser = async ({ userId, notification, data }) => {
  const tokens = await DeviceToken.find({ user: userId, isActive: true })
    .select('token')
    .lean();

  if (tokens.length === 0) {
    return { sent: 0, total: 0 };
  }

  const results = await Promise.allSettled(
    tokens.map((t) => sendToDevice({ token: t.token, notification, data }))
  );

  return {
    sent: results.filter((r) => r.status === 'fulfilled' && !r.value?.skipped).length,
    total: results.length,
  };
};

const sendToRole = async ({ role, notification, data }) => {
  const users = await User.find({ role }).select('_id').lean();
  const userIds = users.map((u) => u._id);

  const tokens = await DeviceToken.find({ user: { $in: userIds }, isActive: true })
    .select('token')
    .lean();

  if (tokens.length === 0) {
    return { sent: 0, total: 0 };
  }

  const results = await Promise.allSettled(
    tokens.map((t) => sendToDevice({ token: t.token, notification, data }))
  );

  return {
    sent: results.filter((r) => r.status === 'fulfilled' && !r.value?.skipped).length,
    total: results.length,
  };
};

const sendToTopic = async ({ topic, notification, data }) => {
  if (!isFirebaseReady()) {
    console.warn('[notifications] FCM not configured — topic push skipped:', topic);
    return { skipped: true, reason: 'FCM_NOT_CONFIGURED' };
  }

  const message = {
    topic,
    ...(notification && { notification }),
    ...(data && { data }),
  };

  return getMessaging().send(message);
};

module.exports = { sendToDevice, sendToUser, sendToRole, sendToTopic };
