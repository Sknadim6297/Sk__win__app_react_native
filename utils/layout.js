import { Dimensions, Platform } from 'react-native';

/** Desktop browsers show the PWA in a phone-width column. */
export const PHONE_SHELL_MAX_WIDTH = 480;

export function getLayoutWidth() {
  const w = Number(Dimensions.get('window')?.width) || 390;
  if (Platform.OS === 'web') {
    return Math.min(Math.max(w, 320), PHONE_SHELL_MAX_WIDTH);
  }
  return w;
}
