/** Expo loads EXPO_PUBLIC_* from .env automatically when you run `npx expo start`. */
const { background: splashBg } = require('./constants/brandColors.cjs');
const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
const usesHttp = apiUrl.startsWith('http://');

let iosExceptionDomains;
if (apiUrl && usesHttp) {
  try {
    const host = new URL(apiUrl).hostname;
    iosExceptionDomains = {
      [host]: {
        NSExceptionAllowsInsecureHTTPLoads: true,
        NSIncludesSubdomains: true,
      },
    };
  } catch {
    iosExceptionDomains = undefined;
  }
}

module.exports = ({ config }) => ({
  ...config,
  splash: {
    ...(config.splash || {}),
    image: './assets/logo/sk_win_logo.png',
    resizeMode: 'contain',
    backgroundColor: splashBg,
  },
  web: {
    ...(config.web || {}),
    backgroundColor: splashBg,
  },
  androidStatusBar: {
    ...(config.androidStatusBar || {}),
    backgroundColor: splashBg,
    barStyle: 'light-content',
  },
  androidNavigationBar: {
    ...(config.androidNavigationBar || {}),
    backgroundColor: splashBg,
  },
  android: {
    ...(config.android || {}),
    usesCleartextTraffic: usesHttp,
    adaptiveIcon: {
      ...(config.android?.adaptiveIcon || {}),
      foregroundImage: './assets/logo/sk_win_logo.png',
      backgroundColor: splashBg,
    },
  },
  plugins: [
    ...(config.plugins || []),
    [
      'expo-splash-screen',
      {
        backgroundColor: splashBg,
        image: './assets/logo/sk_win_logo.png',
        imageWidth: 220,
        resizeMode: 'contain',
      },
    ],
  ].filter((plugin, index, list) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    return list.findIndex((p) => (Array.isArray(p) ? p[0] : p) === name) === index;
  }),
  ios: {
    ...config.ios,
    infoPlist: {
      ...(config.ios?.infoPlist || {}),
      ...(usesHttp
        ? {
            NSAppTransportSecurity: {
              NSAllowsArbitraryLoads: false,
              NSExceptionDomains: iosExceptionDomains,
            },
          }
        : {}),
    },
  },
  extra: {
    ...config.extra,
    ...(apiUrl ? { apiUrl: apiUrl.replace(/\/$/, '') } : {}),
  },
});
