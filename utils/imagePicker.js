import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

/**
 * Expo SDK 54+: MediaType is 'images' | 'videos' | 'livePhotos'
 * Older SDKs used MediaTypeOptions.Images
 */
export function getImageLibraryMediaTypes() {
  // Prefer modern string / array API (avoids MediaTypeOptions deprecation warning)
  return 'images';
}

export async function launchImageLibrary(options = {}) {
  return ImagePicker.launchImageLibraryAsync({
    mediaTypes: getImageLibraryMediaTypes(),
    quality: 0.85,
    ...options,
  });
}

/** On web, permissions are not required for the file picker. */
export async function ensureMediaLibraryPermission() {
  if (Platform.OS === 'web') return true;
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}
