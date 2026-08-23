/** Keep in sync with /release.config.cjs */
export const APP_RELEASE = {
  version: '1.0.3',
  fileName: 'WAREZONE-v1.0.3.apk',
};

/** Expo Web PWA (same app screens). Override with VITE_PWA_URL on sk-win-web. */
export const PWA_URL = String(
  import.meta.env.VITE_PWA_URL || 'https://sk-win-pwa.onrender.com'
).replace(/\/$/, '');

export const IOS_TESTFLIGHT_URL = String(import.meta.env.VITE_IOS_TESTFLIGHT_URL || '').trim();
export const IOS_APP_STORE_URL = String(import.meta.env.VITE_IOS_APP_URL || '').trim();
export const IOS_INSTALL_URL = IOS_APP_STORE_URL || IOS_TESTFLIGHT_URL;
