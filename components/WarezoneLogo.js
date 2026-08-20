import React from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import { BRAND_COLORS } from '../constants/branding';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';

/** Official WAREZONE mark — used app-wide (splash, landing, headers, etc.) */
const APP_LOGO = require('../assets/logo/WAREZONE_LOGO.png');

/** Horizontal wordmark aspect when not using circular badge mode */
const LOGO_ASPECT = 0.55;

/**
 * Renders the WAREZONE logo.
 * - Pass `width` / `height` (or `size` as width) for the wordmark.
 * - Pass `rounded` for a circular badge clip (loading / welcome).
 */
const WarezoneLogo = ({
  size,
  width,
  height,
  style,
  logoUrl,
  rounded = false,
  backgroundColor = 'transparent',
}) => {
  const baseW = width ?? size ?? 200;
  // Circular badge: force a square so borderRadius = half makes a true circle
  const imgW = baseW;
  const imgH = rounded ? baseW : height ?? Math.round(baseW * LOGO_ASPECT);
  const radius = rounded ? imgW / 2 : 8;
  const remote = logoUrl ? resolveMediaUrl(logoUrl) : '';

  return (
    <View
      style={[
        styles.logoContainer(imgW, imgH, backgroundColor, radius),
        style,
      ]}
    >
      <Image
        source={remote ? { uri: remote } : APP_LOGO}
        style={styles.logoImage(imgW, imgH, radius)}
        resizeMode={rounded ? 'cover' : 'contain'}
        fadeDuration={0}
        accessibilityLabel="WAREZONE logo"
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
    ...(Platform.OS === 'web'
      ? {
          borderRadius,
          overflow: 'hidden',
        }
      : null),
  }),
  logoImage: (width, height, borderRadius) => ({
    width,
    height,
    borderRadius,
    backgroundColor: 'transparent',
  }),
});

export default WarezoneLogo;
