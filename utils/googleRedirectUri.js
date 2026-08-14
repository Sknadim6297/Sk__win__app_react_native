import * as Application from 'expo-application';
import { Platform } from 'react-native';

/** Google URL scheme derived from OAuth client ID. */
export function getGoogleReversedClientId(clientId) {
  const id = String(clientId || '').trim();
  if (!id.endsWith('.apps.googleusercontent.com')) return '';
  const prefix = id.replace('.apps.googleusercontent.com', '');
  return `com.googleusercontent.apps.${prefix}`;
}

function reversedRedirectUri(clientId) {
  const reversed = getGoogleReversedClientId(clientId);
  if (!reversed) return '';
  return `${reversed}:/oauthredirect`;
}

/** Redirect URI for Google OAuth on iOS. */
export function getGoogleIosRedirectUri(iosClientId) {
  return (
    reversedRedirectUri(iosClientId) ||
    `${Application.applicationId || 'com.skwin.tournament'}:/oauthredirect`
  );
}

/** Redirect URI for Google OAuth on Android (reversed Android client ID — required by Google). */
export function getGoogleAndroidRedirectUri(androidClientId) {
  return (
    reversedRedirectUri(androidClientId) ||
    `${Application.applicationId || 'com.skwin.tournament'}:/oauthredirect`
  );
}

/** Platform-specific redirect URI for standalone / dev builds. */
export function getGoogleOAuthRedirectUri({ iosClientId, androidClientId } = {}) {
  if (Platform.OS === 'ios') return getGoogleIosRedirectUri(iosClientId);
  if (Platform.OS === 'android') return getGoogleAndroidRedirectUri(androidClientId);
  return undefined;
}

export function getGoogleRedirectUriOptions({ iosClientId, androidClientId } = {}) {
  const native =
    Platform.OS === 'ios'
      ? getGoogleIosRedirectUri(iosClientId)
      : getGoogleAndroidRedirectUri(androidClientId);

  return { native };
}
