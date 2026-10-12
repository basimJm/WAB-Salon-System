const { initFirebase, isFirebaseReady, DEFAULT_SERVICE_ACCOUNT_PATH } = require('./firebase.config');
const notificationService = require('./notification.service');

const initNotifications = () => {
  const ready = initFirebase();
  if (ready) {
    console.log('[notifications] Firebase initialized successfully');
  }
  return ready;
};

module.exports = {
  initNotifications,
  isFirebaseReady,
  DEFAULT_SERVICE_ACCOUNT_PATH,
  notificationService,
};
