import Constants from 'expo-constants';

/** Read Google OAuth client IDs from app.config extra (reliable) then .env. */
export function getGoogleClientIds() {
  const extra = Constants.expoConfig?.extra || {};

  const webClientId = String(
    extra.googleWebClientId || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || ''
  ).trim();
  const androidClientId = String(
    extra.googleAndroidClientId ||
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
      webClientId
  ).trim();
  const iosClientId = String(
    extra.googleIosClientId || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || webClientId
  ).trim();

  return { webClientId, androidClientId, iosClientId };
}

export function isGoogleSignInConfigured() {
  const { webClientId, androidClientId, iosClientId } = getGoogleClientIds();
  const valid = (id) => id.includes('.apps.googleusercontent.com');
  return valid(webClientId) && valid(androidClientId) && valid(iosClientId);
}
