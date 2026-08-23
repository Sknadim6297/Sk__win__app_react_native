import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiCall } from '../services/api';
import { handleNotificationNavigation } from './navigationRef';
import { isExpoGo } from './googleEnvironment';

const TOKEN_CACHE_KEY = '@skwin_push_token';
const PUSH_SUPPORTED = Platform.OS !== 'web' && !isExpoGo();

function getNotifications() {
  if (!PUSH_SUPPORTED) return null;
  return require('expo-notifications');
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

    if (!Device.isDevice) {
      console.warn('[Push] Physical device required for push notifications');
      return null;
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
  await clearLastNotificationResponse();
}

function notificationHasNavIntent(data) {
  if (!data || typeof data !== 'object') return false;
  return Boolean(
    data.screen ||
      data.deepLink ||
      data.tournamentId ||
      data.type ||
      data.resultId ||
      data.matchId
  );
}

function notificationAgeMs(response) {
  const raw = response?.notification?.date;
  if (raw == null) return null;
  const ts = typeof raw === 'number' ? (raw < 1e12 ? raw * 1000 : raw) : Date.parse(raw);
  return Number.isFinite(ts) ? Date.now() - ts : null;
}

export function setupNotificationListeners() {
  if (!Notifications) return () => {};

  if (receiveSub) receiveSub.remove();
  if (responseSub) responseSub.remove();

  receiveSub = Notifications.addNotificationReceivedListener(() => {
    // Foreground banner/alert controlled by setNotificationHandler
  });

  responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response?.notification?.request?.content?.data || {};
    handleNotificationNavigation(data);
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
 * Only when the app was opened by tapping a recent notification.
 * Stale getLastNotificationResponseAsync() must not hijack register/login → Home.
 */
export async function handleInitialNotificationResponse() {
  if (!Notifications || initialNotificationHandled) return;
  initialNotificationHandled = true;

  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) return;

  const data = response?.notification?.request?.content?.data;
  const ageMs = notificationAgeMs(response);
  const freshEnough = ageMs != null && ageMs <= 45_000;

  if (!freshEnough || !notificationHasNavIntent(data)) {
    await clearLastNotificationResponse();
    return;
  }

  setTimeout(() => {
    handleNotificationNavigation(data);
    clearLastNotificationResponse();
  }, 600);
}
