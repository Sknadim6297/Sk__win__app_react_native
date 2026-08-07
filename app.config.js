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
    image: './assets/logo/ROUND_GAME_LOGO.png',
    resizeMode: 'contain',
    backgroundColor: splashBg,
  },
  web: {
    ...(config.web || {}),
    backgroundColor: splashBg,
    favicon: './assets/logo/ROUND_GAME_LOGO.png',
  },
  androidStatusBar: {
    ...(config.androidStatusBar || {}),
    backgroundColor: splashBg,
    barStyle: 'light-content',
    translucent: false,
  },
  androidNavigationBar: {
    ...(config.androidNavigationBar || {}),
    backgroundColor: splashBg,
  },
  android: {
    ...(config.android || {}),
    adaptiveIcon: {
      ...(config.android?.adaptiveIcon || {}),
      foregroundImage: './assets/logo/ROUND_GAME_LOGO.png',
      backgroundColor: splashBg,
    },
  },
  plugins: [
    ...(config.plugins || []),
    [
      'expo-splash-screen',
      {
        backgroundColor: splashBg,
        image: './assets/logo/ROUND_GAME_LOGO.png',
        imageWidth: 200,
        resizeMode: 'contain',
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          // Reanimated 4 (SDK 54) requires New Architecture
          newArchEnabled: true,
          usesCleartextTraffic: usesHttp,
          // Release APK size / performance
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          enablePngCrunchInReleaseBuilds: true,
          useLegacyPackaging: true,
          // Phone APKs: arm64 only (drops 32-bit + emulator ABIs). Biggest native size cut.
          // Trade-off: very old 32-bit-only Android devices cannot install this build.
          abiFilters: ['arm64-v8a'],
        },
        ios: {
          newArchEnabled: true,
        },
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
    // Always embed API URL in the native app config so release APKs
    // still resolve it via Constants.expoConfig.extra even if env inlining fails.
    apiUrl: (apiUrl || process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '') || undefined,
    appName: process.env.EXPO_PUBLIC_APP_NAME || config.name || 'WAREZONE Tournament',
  },
});
