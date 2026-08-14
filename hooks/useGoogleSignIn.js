import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import { getGoogleClientIds } from '../utils/googleConfig';
import { getGoogleSignInEnvironmentMessage, isExpoGo } from '../utils/googleEnvironment';
import {
  getGoogleAndroidRedirectUri,
  getGoogleIosRedirectUri,
  getGoogleRedirectUriOptions,
} from '../utils/googleRedirectUri';

let webBrowserReady = false;
function ensureWebBrowserSession() {
  if (webBrowserReady) return;
  webBrowserReady = true;
  try {
    // eslint-disable-next-line global-require
    const WebBrowser = require('expo-web-browser');
    WebBrowser.maybeCompleteAuthSession?.();
  } catch (e) {
    if (__DEV__) console.warn('[GoogleSignIn] expo-web-browser unavailable:', e.message);
  }
}

/**
 * Google OAuth via expo-auth-session → returns ID token for backend verification.
 */
export function useGoogleSignIn({ onToken, onError } = {}) {
  const ids = useMemo(() => getGoogleClientIds(), []);
  const configured = Boolean(ids.webClientId && ids.androidClientId && ids.iosClientId);
  const expoGoBlocked = isExpoGo();
  const handledRef = useRef(false);

  const redirectUri = useMemo(() => {
    if (Platform.OS === 'android') return getGoogleAndroidRedirectUri(ids.androidClientId);
    if (Platform.OS === 'ios') return getGoogleIosRedirectUri(ids.iosClientId);
    return undefined;
  }, [ids.androidClientId, ids.iosClientId]);

  const redirectUriOptions = useMemo(
    () =>
      getGoogleRedirectUriOptions({
        iosClientId: ids.iosClientId,
        androidClientId: ids.androidClientId,
      }),
    [ids.androidClientId, ids.iosClientId]
  );

  const authConfig = useMemo(
    () => ({
      webClientId: ids.webClientId,
      androidClientId: ids.androidClientId,
      iosClientId: ids.iosClientId,
      redirectUri: redirectUri || undefined,
      scopes: ['openid', 'profile', 'email'],
    }),
    [ids.androidClientId, ids.iosClientId, ids.webClientId, redirectUri]
  );

  const [request, response, promptAsync] = Google.useAuthRequest(authConfig, redirectUriOptions);

  const activeRedirectUri = request?.redirectUri || redirectUri;

  useEffect(() => {
    if (__DEV__ && configured) {
      console.log('[GoogleSignIn] platform:', Platform.OS);
      console.log('[GoogleSignIn] expoGo:', expoGoBlocked);
      console.log('[GoogleSignIn] redirectUri:', activeRedirectUri);
      console.log('[GoogleSignIn] androidClientId:', ids.androidClientId);
      console.log('[GoogleSignIn] iosClientId:', ids.iosClientId);
      console.log('[GoogleSignIn] webClientId:', ids.webClientId);
    }
  }, [
    activeRedirectUri,
    configured,
    expoGoBlocked,
    ids.androidClientId,
    ids.iosClientId,
    ids.webClientId,
  ]);

  useEffect(() => {
    if (!response || handledRef.current) return;

    if (response.type === 'success') {
      handledRef.current = true;
      const idToken = response.authentication?.idToken;
      if (idToken) {
        onToken?.(idToken);
      } else {
        onError?.('Google did not return a sign-in token. Check OAuth client IDs.');
      }
      return;
    }

    if (response.type === 'error') {
      handledRef.current = true;
      onError?.(response.error?.message || 'Google sign-in failed');
      return;
    }

    if (response.type === 'dismiss' || response.type === 'cancel') {
      handledRef.current = true;
      onError?.('Google sign-in cancelled');
    }
  }, [response, onToken, onError]);

  const signIn = useCallback(async () => {
    handledRef.current = false;
    ensureWebBrowserSession();

    const envMessage = getGoogleSignInEnvironmentMessage();
    if (envMessage) {
      onError?.(envMessage);
      return { ok: false };
    }

    if (!configured) {
      onError?.(
        'Google Sign-In not configured. Add OAuth client IDs to .env then rebuild the app.'
      );
      return { ok: false };
    }

    if (!request) {
      onError?.('Google Sign-In is still loading. Try again in a moment.');
      return { ok: false };
    }

    try {
      await promptAsync();
      return { ok: true };
    } catch (err) {
      onError?.(err.message || 'Google sign-in failed');
      return { ok: false };
    }
  }, [configured, onError, promptAsync, request]);

  return {
    signIn,
    configured,
    ready: Boolean(request),
    redirectUri: activeRedirectUri,
    expoGoBlocked,
  };
}
