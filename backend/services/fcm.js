const admin = require('firebase-admin');

let initialized = false;

const initFcm = () => {
  if (initialized) return true;

  const serviceAccountJson = process.env.FCM_SERVICE_ACCOUNT_JSON;
  const serviceAccountPath = process.env.FCM_SERVICE_ACCOUNT_PATH;

  if (!serviceAccountJson && !serviceAccountPath) {
    if (process.env.FCM_VERBOSE === 'true') {
      console.warn('FCM not initialized: missing service account env vars');
    }
    return false;
  }

  try {
    const credential = serviceAccountJson
      ? admin.credential.cert(JSON.parse(serviceAccountJson))
      : admin.credential.cert(require(serviceAccountPath));

    if (!admin.apps.length) {
      admin.initializeApp({ credential });
    }
    initialized = true;
    return true;
  } catch (error) {
    console.error('Failed to initialize FCM:', error.message);
    return false;
  }
};

const stringifyData = (data = {}) => {
  const out = {};
  Object.entries(data || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    out[String(key)] = typeof value === 'string' ? value : String(value);
  });
  return out;
};

const isExpoPushToken = (token) =>
  typeof token === 'string' &&
  (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['));

/**
 * Send via Expo Push API (works with Expo-managed apps / EAS).
 */
const sendExpoPush = async (token, title, body, data = {}, options = {}) => {
  const payload = {
    to: token,
    title,
    body,
    sound: options.sound || 'default',
    priority: 'high',
    channelId: options.channelId || 'default',
    data: data || {},
  };
  if (options.badge != null) payload.badge = Number(options.badge) || 0;

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  const ticket = Array.isArray(json.data) ? json.data[0] : json.data;
  if (ticket?.status === 'error') {
    const err = new Error(ticket.message || 'Expo push failed');
    err.code = ticket.details?.error || 'EXPO_PUSH_ERROR';
    throw err;
  }
  return ticket;
};

/**
 * Send via Firebase Admin (raw FCM device tokens).
 */
const sendFcmPush = async (token, title, body, data = {}, options = {}) => {
  if (!initFcm()) return null;

  const message = {
    token,
    notification: { title, body },
    data: stringifyData(data),
    android: {
      priority: 'high',
      notification: {
        sound: options.sound || 'default',
        channelId: options.channelId || 'default',
        ...(options.badge != null ? { notificationCount: Number(options.badge) || 0 } : {}),
      },
    },
    apns: {
      payload: {
        aps: {
          sound: options.sound || 'default',
          ...(options.badge != null ? { badge: Number(options.badge) || 0 } : {}),
        },
      },
    },
  };

  return admin.messaging().send(message);
};

/**
 * Unified push send — Expo tokens use Expo API; others use FCM when configured.
 * Returns { ok, provider, invalidToken? }
 */
const sendPush = async (token, title, body, data = {}, options = {}) => {
  if (!token) return { ok: false, reason: 'NO_TOKEN' };

  try {
    if (isExpoPushToken(token)) {
      await sendExpoPush(token, title, body, data, options);
      return { ok: true, provider: 'expo' };
    }

    await sendFcmPush(token, title, body, data, options);
    return { ok: true, provider: 'fcm' };
  } catch (error) {
    const code = error.code || error.errorInfo?.code || '';
    const invalid =
      code === 'DeviceNotRegistered' ||
      code === 'messaging/registration-token-not-registered' ||
      code === 'messaging/invalid-registration-token' ||
      String(error.message || '').includes('not a valid Expo push token');

    if (process.env.FCM_VERBOSE === 'true' || process.env.PUSH_VERBOSE === 'true') {
      console.warn('Push send failed:', error.message);
    }

    return { ok: false, reason: error.message, invalidToken: invalid, code };
  }
};

const sendPushToMany = async (tokens, title, body, data = {}, options = {}) => {
  const unique = [...new Set((tokens || []).filter(Boolean))];
  const results = [];
  for (const token of unique) {
    // eslint-disable-next-line no-await-in-loop
    results.push({ token, ...(await sendPush(token, title, body, data, options)) });
  }
  return results;
};

module.exports = {
  initFcm,
  sendPush,
  sendPushToMany,
  isExpoPushToken,
};
