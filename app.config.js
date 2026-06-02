/** Expo loads EXPO_PUBLIC_* from .env automatically when you run `npx expo start`. */
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
  extra: {
    ...config.extra,
    ...(apiUrl ? { apiUrl: apiUrl.replace(/\/$/, '') } : {}),
  },
  android: {
    ...config.android,
    usesCleartextTraffic: usesHttp,
  },
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
});
