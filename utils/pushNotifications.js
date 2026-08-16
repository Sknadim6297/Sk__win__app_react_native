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
  await Notifications.setNotificationChannelAsync('default', {
    name: 'WAREZONE',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#22C55E',
    sound: 'default',
  });
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

export function setupNotificationListeners() {
  if (!Notifications) return () => {};

  if (receiveSub) receiveSub.remove();
  if (responseSub) responseSub.remove();

  receiveSub = Notifications.addNotificationReceivedListener(() => {
    // Foreground: system banner handled by setNotificationHandler
  });

  responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response?.notification?.request?.content?.data || {};
    handleNotificationNavigation(data);
  });

  return () => {
    receiveSub?.remove();
    responseSub?.remove();
    receiveSub = null;
    responseSub = null;
  };
}

export async function handleInitialNotificationResponse() {
  if (!Notifications) return;
  const response = await Notifications.getLastNotificationResponseAsync();
  if (response?.notification?.request?.content?.data) {
    setTimeout(() => {
      handleNotificationNavigation(response.notification.request.content.data);
    }, 600);
  }
}
