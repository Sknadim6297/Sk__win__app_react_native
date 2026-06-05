import 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { registerRootComponent } from 'expo';

import App from './App';
import { BRAND_COLORS } from './constants/branding';

// Run before React mounts so the window matches the splash/loading screen.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ fade: true, duration: 280 });
SystemUI.setBackgroundColorAsync(BRAND_COLORS.background).catch(() => {});

registerRootComponent(App);
