/** Expo loads EXPO_PUBLIC_* from .env automatically when you run `npx expo start`. */
const { background: splashBg } = require('./constants/brandColors.cjs');

function googleReversedClientId(clientId) {
  const id = String(clientId || '').trim();
  if (!id.endsWith('.apps.googleusercontent.com')) return null;
  return `com.googleusercontent.apps.${id.replace('.apps.googleusercontent.com', '')}`;
}

const googleIosClientId =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  '';
const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';
const googleUrlScheme = googleReversedClientId(googleIosClientId);
const googleAndroidScheme = googleReversedClientId(googleAndroidClientId);

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
    name: 'WAREZONE',
    shortName: 'WAREZONE',
    lang: 'en',
    scope: '/',
    themeColor: splashBg,
    display: 'standalone',
    orientation: 'portrait',
    startUrl: '/',
    bundler: 'metro',
    output: 'single',
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
    ...(googleAndroidScheme
      ? {
          intentFilters: [
            ...((config.android?.intentFilters || []).filter(
              (entry) =>
                !entry?.data?.some((d) =>
                  String(d?.scheme || '').startsWith('com.googleusercontent.apps.')
                )
            )),
            {
              action: 'VIEW',
              autoVerify: false,
              data: [
                {
                  scheme: googleAndroidScheme,
                  pathPrefix: '/oauthredirect',
                },
              ],
              category: ['BROWSABLE', 'DEFAULT'],
            },
          ],
        }
      : {}),
  },
  plugins: [
    './plugins/withArm64CompressedApk',
    'expo-web-browser',
    ...(config.plugins || []),
    [
      'expo-splash-screen',
      {
        backgroundColor: splashBg,
        image: './assets/logo/ROUND_GAME_LOGO.png',
        imageWidth: 180,
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
          // Compress native .so libs in APK (largest practical size win for sideload APKs)
          useLegacyPackaging: true,
          // Compress JS bundle inside APK
          enableBundleCompression: true,
          // R8 minify + resource shrink + PNG crunch
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          enablePngCrunchInReleaseBuilds: true,
          // Disable network inspector tooling in release native builds
          networkInspector: false,
          // Phone APK: 64-bit only (drops armeabi-v7a / x86 / x86_64 from RN natives)
          buildArchs: ['arm64-v8a'],
          // Keep RN/Expo reflective entry points when R8 runs
          extraProguardRules: [
            '-keep class com.facebook.react.** { *; }',
            '-keep class com.facebook.hermes.** { *; }',
            '-keep class com.swmansion.** { *; }',
            '-keep class com.th3rdwave.safeareacontext.** { *; }',
            '-dontwarn com.facebook.react.**',
          ].join('\n'),
        },
        ios: {
          newArchEnabled: true,
        },
      },
    ],
  ].filter((plugin, index, list) => {
    // Prefer later entries (app.config.js overrides app.json duplicates)
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    // Always keep our ABI plugin (string path) even if duplicated
    if (name === './plugins/withArm64CompressedApk') {
      return list.indexOf(plugin) === index;
    }
    return (
      list.findLastIndex((p) => (Array.isArray(p) ? p[0] : p) === name) === index
    );
  }),
  ios: {
    ...config.ios,
    infoPlist: {
      ...(config.ios?.infoPlist || {}),
      ...(googleUrlScheme
        ? {
            CFBundleURLTypes: [
              ...((config.ios?.infoPlist?.CFBundleURLTypes || []).filter(
                (entry) =>
                  !entry?.CFBundleURLSchemes?.some((s) =>
                    String(s).startsWith('com.googleusercontent.apps.')
                  )
              )),
              {
                CFBundleURLSchemes: [googleUrlScheme],
              },
            ],
          }
        : {}),
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
    // Master payment switch (testing). Set EXPO_PUBLIC_PAYMENT_ENABLED=true to turn on.
    paymentEnabled:
      process.env.EXPO_PUBLIC_PAYMENT_ENABLED !== undefined
        ? ['true', '1', 'yes', 'on'].includes(
            String(process.env.EXPO_PUBLIC_PAYMENT_ENABLED).trim().toLowerCase()
          )
        : false,
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
    googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined,
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
  },
});
