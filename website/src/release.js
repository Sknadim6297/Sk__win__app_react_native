/** Keep in sync with /release.config.cjs */
export const APP_RELEASE = {
  version: '1.0.2',
  fileName: 'WAREZONE-v1.0.2.apk',
};

export const IOS_TESTFLIGHT_URL = String(import.meta.env.VITE_IOS_TESTFLIGHT_URL || '').trim();
export const IOS_APP_STORE_URL = String(import.meta.env.VITE_IOS_APP_URL || '').trim();
export const IOS_INSTALL_URL = IOS_APP_STORE_URL || IOS_TESTFLIGHT_URL;
