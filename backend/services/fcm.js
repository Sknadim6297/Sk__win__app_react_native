const admin = require('firebase-admin');

let initialized = false;

const initFcm = () => {
  if (initialized) return;

  const serviceAccountJson = process.env.FCM_SERVICE_ACCOUNT_JSON;
  const serviceAccountPath = process.env.FCM_SERVICE_ACCOUNT_PATH;

  if (!serviceAccountJson && !serviceAccountPath) {
    console.warn('FCM not initialized: missing service account env vars');
    return;
  }

  try {
    const credential = serviceAccountJson
      ? admin.credential.cert(JSON.parse(serviceAccountJson))
      : admin.credential.cert(require(serviceAccountPath));

    admin.initializeApp({ credential });
    initialized = true;
  } catch (error) {
    console.error('Failed to initialize FCM:', error.message);
  }
};

const sendPush = async (token, title, body, data = {}) => {
  initFcm();
  if (!initialized || !token) return null;

  const message = {
    token,
    notification: {
      title,
      body,
    },
    data,
  };

  return admin.messaging().send(message);
};

module.exports = { initFcm, sendPush };
