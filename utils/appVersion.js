import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { isExpoGo } from './googleEnvironment';

/**
 * Installed app version — prefer native APK/IPA values outside Expo Go.
 */
export function getAppVersion() {
  if (!isExpoGo()) {
    const native = Constants.nativeAppVersion;
    if (native && String(native).trim()) return String(native).trim();
  }
  return (
    Constants.expoConfig?.version ||
    Constants.manifest2?.extra?.expoClient?.version ||
    Constants.manifest?.version ||
    '0.0.0'
  );
}

/**
 * Android versionCode / iOS buildNumber from the installed binary.
 */
export function getAppBuildNumber() {
  if (isExpoGo()) return null;
  const raw =
    Constants.nativeBuildVersion ||
    (Platform.OS === 'android'
      ? Constants.expoConfig?.android?.versionCode
      : Constants.expoConfig?.ios?.buildNumber) ||
    null;
  if (raw == null || raw === '') return null;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : null;
}

export function getAndroidVersionCode() {
  if (Platform.OS !== 'android') return null;
  return getAppBuildNumber();
}
