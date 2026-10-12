const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

const DEFAULT_SERVICE_ACCOUNT_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'config',
  'firebase-service-account.json'
);

let ready = false;

const getServiceAccount = () => {
  const configuredPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : DEFAULT_SERVICE_ACCOUNT_PATH;

  if (!fs.existsSync(configuredPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(configuredPath, 'utf8'));
  } catch (err) {
    return null;
  }
};

const initFirebase = () => {
  if (ready || admin.getApps().length > 0) {
    ready = true;
    return true;
  }

  const serviceAccount = getServiceAccount();
  if (!serviceAccount) {
    console.warn('[notifications] Firebase service account not found — push notifications disabled (fallback mode).');
    ready = false;
    return false;
  }

  admin.initializeApp({
    credential: admin.cert(serviceAccount),
  });

  ready = true;
  return true;
};

const isFirebaseReady = () => ready && admin.getApps().length > 0;

module.exports = { initFirebase, isFirebaseReady, DEFAULT_SERVICE_ACCOUNT_PATH };
