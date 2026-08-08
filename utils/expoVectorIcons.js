/**
 * Thin @expo/vector-icons surface — only icon families we actually use.
 * Metro redirects `@expo/vector-icons` here so unused icon .ttf fonts
 * (Entypo, FontAwesome6, Fontisto, etc.) are NOT packaged into the APK.
 *
 * Do NOT re-export unused families.
 */
export { default as Ionicons } from '@expo/vector-icons/Ionicons';
export { default as MaterialCommunityIcons } from '@expo/vector-icons/MaterialCommunityIcons';
