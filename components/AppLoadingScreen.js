import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND_COLORS } from '../constants/branding';
import WarezoneLogo from './WarezoneLogo';

export const WELCOME_BG = BRAND_COLORS.background;

const { width: SCREEN_W } = Dimensions.get('window');
const LOGO_SIZE = Math.min(SCREEN_W * 0.52, 220);

const AppLoadingScreen = ({ subtitle = 'Loading battleground...' }) => {
  const insets = useSafeAreaInsets();
  const shimmer = useRef(new Animated.Value(0.15)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 0.45,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0.15,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={WELCOME_BG} />

      <View style={styles.logoCenter}>
        <WarezoneLogo size={LOGO_SIZE} rounded />
      </View>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom + 36, 48) },
        ]}
      >
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressGlow, { opacity: shimmer }]} />
        </View>
        <Text style={styles.footerText}>{subtitle}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WELCOME_BG,
  },
  logoCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  footer: {
    position: 'absolute',
    left: 32,
    right: 32,
    bottom: 0,
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  progressGlow: {
    width: '100%',
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  footerText: {
    marginTop: 16,
    textAlign: 'center',
    color: '#ffffff',
    fontSize: 12,
    letterSpacing: 1.2,
    fontWeight: '500',
  },
});

export default AppLoadingScreen;
