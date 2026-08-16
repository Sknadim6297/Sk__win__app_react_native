import './utils/silenceExpoGoLogs';
import 'react-native-gesture-handler';
import 'react-native-reanimated';
import Constants from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { registerRootComponent } from 'expo';

import App from './App';
import { BRAND_COLORS } from './constants/branding';

// Run before React mounts so the window matches the splash/loading screen.
SplashScreen.preventAutoHideAsync().catch(() => {});
// setOptions is unsupported in Expo Go — skip to avoid the console warning
if (Constants.appOwnership !== 'expo') {
  try {
    SplashScreen.setOptions({ fade: true, duration: 280 });
  } catch (_) {
    /* Expo Go / older SDKs */
  }
}
SystemUI.setBackgroundColorAsync(BRAND_COLORS.background).catch(() => {});

registerRootComponent(App);
