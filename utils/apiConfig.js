import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Resolves backend API base URL for Expo dev, emulator, and production.
 * Set EXPO_PUBLIC_API_URL in .env or app.json → extra.apiUrl to override.
 */
export function getApiUrl() {
  const envUrl =
    process.env.EXPO_PUBLIC_API_URL ||
    Constants.expoConfig?.extra?.apiUrl ||
    Constants.manifest?.extra?.apiUrl;

  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname;
    const resolved = host === '127.0.0.1' ? 'localhost' : host;
    return `http://${resolved}:5000/api`;
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest?.debuggerHost ||
    Constants.expoConfig?.debuggerHost;

  if (hostUri) {
    let host = hostUri.split(':')[0];
    if (Platform.OS === 'android' && (host === 'localhost' || host === '127.0.0.1')) {
      host = '10.0.2.2';
    }
    return `http://${host}:5000/api`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }

  return 'http://localhost:5000/api';
}

export const API_URL = getApiUrl();
