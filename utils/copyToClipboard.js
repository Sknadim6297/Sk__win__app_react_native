import { Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';

/** Copy text to the device clipboard on native + web (never opens share sheet). */
export async function copyToClipboard(value) {
  const text = String(value ?? '').trim();
  if (!text) return false;

  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    /* fall through to web API */
  }

  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}
