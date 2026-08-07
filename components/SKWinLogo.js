import React from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import { BRAND_COLORS } from '../constants/branding';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';

/** Round WAREZONE mark — used app-wide (header, splash UI, account, etc.) */
const APP_LOGO = require('../assets/logo/ROUND_GAME_LOGO.png');

/**
 * Always renders as a circle. Pass rounded={false} only if you truly need a square.
 */
const SKWinLogo = ({
  size = 140,
  style,
  logoUrl,
  rounded = true,
  width,
  height,
  backgroundColor = 'transparent',
}) => {
  const imgW = width ?? size;
  const imgH = height ?? size;
  const side = Math.min(imgW, imgH);
  const radius = rounded ? side / 2 : 0;
  const remote = logoUrl ? resolveMediaUrl(logoUrl) : '';

  return (
    <View
      style={[
        styles.logoContainer(side, side, backgroundColor, radius),
        style,
      ]}
    >
      <Image
        source={remote ? { uri: remote } : APP_LOGO}
        style={styles.logoImage(side, side, radius)}
        resizeMode="cover"
        fadeDuration={0}
        accessibilityLabel="WAREZONE Tournament logo"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  logoContainer: (width, height, backgroundColor, borderRadius) => ({
    width,
    height,
    borderRadius,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: backgroundColor ?? BRAND_COLORS.background,
    ...(Platform.OS === 'web' ? { borderRadius } : {}),
  }),
  logoImage: (width, height, borderRadius) => ({
    width,
    height,
    borderRadius,
    backgroundColor: 'transparent',
  }),
});

export default SKWinLogo;
