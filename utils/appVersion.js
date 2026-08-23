import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Installed app / PWA version from Expo config (app.json).
 */
export function getAppVersion() {
  return (
    Constants.expoConfig?.version ||
    Constants.manifest2?.extra?.expoClient?.version ||
    Constants.manifest?.version ||
    '0.0.0'
  );
}

export function getAndroidVersionCode() {
  if (Platform.OS !== 'android') return null;
  return (
    Constants.expoConfig?.android?.versionCode ||
    Constants.manifest?.android?.versionCode ||
    null
  );
}
