import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiCall } from '../services/api';
import { handleNotificationNavigation } from './navigationRef';
import { isExpoGo } from './googleEnvironment';

const TOKEN_CACHE_KEY = '@skwin_push_token';
const HANDLED_RESPONSE_KEY = '@warezone/push_handled_response';
/** Native + HTTPS PWA (system notifications when app is closed / backgrounded). */
const PUSH_SUPPORTED =
  !isExpoGo() &&
  (Platform.OS === 'ios' ||
    Platform.OS === 'android' ||
    (Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      'serviceWorker' in navigator &&
      'Notification' in window));

function getNotifications() {
  if (!PUSH_SUPPORTED) return null;
  try {
    return require('expo-notifications');
  } catch {
    return null;
  }
}

const Notifications = getNotifications();

if (Notifications) {
  // Show system banners while the app is open; OS still delivers when background/killed.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

let responseSub = null;
let receiveSub = null;
/** Ignore response listener until cold-start handling finishes (Android re-fires stale taps). */
let acceptResponseListener = false;

function getProjectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    null
  );
}

export async function ensureAndroidChannel() {
  if (!Notifications || Platform.OS !== 'android') return;
  const channel = {
    name: 'WAREZONE',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#22C55E',
    sound: 'default',
  };
  if (Notifications.AndroidNotificationVisibility?.PUBLIC != null) {
    channel.lockscreenVisibility = Notifications.AndroidNotificationVisibility.PUBLIC;
  }
  await Notifications.setNotificationChannelAsync('default', channel);
}

export async function registerForPushNotificationsAsync() {
  if (!Notifications) return null;

  try {
    await ensureAndroidChannel();

    // Web PWA runs in browser — still allow push when Notification API exists.
    if (Platform.OS !== 'web' && !Device.isDevice) {
      console.warn('[Push] Physical device required for push notifications');
      return null;
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Ensure our SW is ready before Expo/token registration
      try {
        await navigator.serviceWorker.ready;
      } catch {
        /* ignore */
      }
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('[Push] Permission not granted');
      return null;
    }

    const projectId = getProjectId();
    const tokenResult = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    const token = tokenResult?.data;
    if (!token) return null;

    await AsyncStorage.setItem(TOKEN_CACHE_KEY, token);
    return token;
  } catch (error) {
    console.warn('[Push] Registration failed:', error?.message || error);
    return null;
  }
}

export async function syncPushTokenWithBackend() {
  const token = await registerForPushNotificationsAsync();
  if (!token) return null;

  try {
    await apiCall('/users/push-token', {
      method: 'POST',
      body: JSON.stringify({
        pushToken: token,
        fcmToken: token,
        platform: Platform.OS,
      }),
    });
  } catch (error) {
    console.warn('[Push] Failed to sync token:', error?.message || error);
  }
  return token;
}

export async function clearPushTokenOnLogout() {
  try {
    const token = await AsyncStorage.getItem(TOKEN_CACHE_KEY);
    await apiCall('/users/push-token', {
      method: 'DELETE',
      body: JSON.stringify({ pushToken: token || undefined }),
    }).catch(() => {});
    await AsyncStorage.removeItem(TOKEN_CACHE_KEY);
  } catch {
    // ignore
  }
}

let initialNotificationHandled = false;

async function clearLastNotificationResponse() {
  if (!Notifications?.clearLastNotificationResponseAsync) return;
  try {
    await Notifications.clearLastNotificationResponseAsync();
  } catch {
    // ignore
  }
}

/** Call on login/register so a stale push tap does not open Notifications. */
export async function dismissPendingNotificationNavigation() {
  initialNotificationHandled = true;
  acceptResponseListener = true;
  await clearLastNotificationResponse();
}

function notificationAgeMs(response) {
  const raw = response?.notification?.date;
  if (raw == null) return null;
  const ts = typeof raw === 'number' ? (raw < 1e12 ? raw * 1000 : raw) : Date.parse(raw);
  return Number.isFinite(ts) ? Date.now() - ts : null;
}

function responseIdentity(response) {
  const id = response?.notification?.request?.identifier;
  const date = response?.notification?.date;
  return `${id || 'unknown'}:${date ?? ''}`;
}

/** Cold-start / stale-tap: only real deep links — never the Notifications inbox. */
function isActionableColdStartDeepLink(data) {
  if (!data || typeof data !== 'object') return false;
  const screen = String(data.screen || data.deepLink || '');
  if (screen === 'TournamentDetails' || screen === 'TournamentResults') {
    return Boolean(data.tournamentId);
  }
  if (
    screen === 'MyWallet' ||
    screen === 'Wallet' ||
    screen === 'ImportantUpdates' ||
    screen === 'AnnouncementDetail' ||
    screen === 'History' ||
    screen === 'MainApp'
  ) {
    return true;
  }
  if (data.tournamentId && (data.type === 'result' || data.type === 'tournament_reminder')) {
    return true;
  }
  if (data.type === 'wallet' || data.type === 'announcement') return true;
  return false;
}

export function setupNotificationListeners() {
  if (!Notifications) return () => {};

  if (receiveSub) receiveSub.remove();
  if (responseSub) responseSub.remove();

  receiveSub = Notifications.addNotificationReceivedListener(() => {
    // Foreground banner/alert controlled by setNotificationHandler
  });

  responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    if (!acceptResponseListener) return;
    const data = response?.notification?.request?.content?.data || {};
    handleNotificationNavigation(data, { inboxFallback: true });
    clearLastNotificationResponse();
  });

  return () => {
    receiveSub?.remove();
    responseSub?.remove();
    receiveSub = null;
    responseSub = null;
  };
}

/**
 * Only when the app was opened by tapping a recent deep-link notification.
 * Stale Android last-response must not open Notifications on every launch.
 */
export async function handleInitialNotificationResponse() {
  if (!Notifications || initialNotificationHandled) {
    acceptResponseListener = true;
    return;
  }
  initialNotificationHandled = true;

  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (!response) return;

    const identity = responseIdentity(response);
    const prev = await AsyncStorage.getItem(HANDLED_RESPONSE_KEY);
    if (prev && prev === identity) {
      await clearLastNotificationResponse();
      return;
    }

    const data = response?.notification?.request?.content?.data || {};
    const ageMs = notificationAgeMs(response);
    // Reject missing/negative age (Android clock quirks) and anything older than 30s
    const freshEnough = ageMs != null && ageMs >= 0 && ageMs <= 30_000;

    if (!freshEnough || !isActionableColdStartDeepLink(data)) {
      await clearLastNotificationResponse();
      return;
    }

    await AsyncStorage.setItem(HANDLED_RESPONSE_KEY, identity);

    await new Promise((r) => setTimeout(r, 700));
    handleNotificationNavigation(data, { inboxFallback: false });
    await clearLastNotificationResponse();
  } catch {
    await clearLastNotificationResponse();
  } finally {
    acceptResponseListener = true;
  }
}
