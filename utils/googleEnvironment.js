import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/** True when running inside the Expo Go app (not a dev build or store build). */
export function isExpoGo() {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

export function getGoogleSignInEnvironmentMessage() {
  // Google OAuth with native client IDs only works in dev builds / release apps.
  if (isExpoGo() && Platform.OS === 'ios') {
    return (
      'Google Sign-In does not work in Expo Go on iPhone. ' +
      'Install the WAREZONE APK or run: eas build --profile preview --platform ios'
    );
  }
  if (isExpoGo() && Platform.OS === 'android') {
    return (
      'Google Sign-In does not work in Expo Go on Android. ' +
      'Install the WAREZONE release APK built with EAS.'
    );
  }
  return null;
}
