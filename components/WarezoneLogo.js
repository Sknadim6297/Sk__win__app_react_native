import React from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import { BRAND_COLORS } from '../constants/branding';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';

/** Official WAREZONE mark — used app-wide (splash, landing, headers, etc.) */
const APP_LOGO = require('../assets/logo/WAREZONE_LOGO.png');

/** Horizontal wordmark aspect when not using badge / app-icon mode */
const LOGO_ASPECT = 0.55;

/**
 * iOS-style app-icon corner (~22.37% of side).
 * Matches the rounded-square look of the reference game icon.
 */
export const APP_ICON_RADIUS_RATIO = 0.2237;

/**
 * Renders the WAREZONE logo.
 * - Pass `width` / `height` (or `size` as width) for the wordmark.
 * - Pass `rounded` or `shape="circle"` for a circular badge.
 * - Pass `shape="squircle"` (or `rounded="squircle"`) for app-icon corners.
 */
const WarezoneLogo = ({
  size,
  width,
  height,
  style,
  logoUrl,
  rounded = false,
  shape,
  backgroundColor = 'transparent',
}) => {
  const resolvedShape =
    shape ||
    (rounded === true || rounded === 'circle'
      ? 'circle'
      : rounded === 'squircle' || rounded === 'appIcon'
        ? 'squircle'
        : 'wordmark');

  const baseW = width ?? size ?? 200;
  const isSquare = resolvedShape === 'circle' || resolvedShape === 'squircle';
  const imgW = baseW;
  const imgH = isSquare ? baseW : height ?? Math.round(baseW * LOGO_ASPECT);
  const radius =
    resolvedShape === 'circle'
      ? imgW / 2
      : resolvedShape === 'squircle'
        ? Math.round(imgW * APP_ICON_RADIUS_RATIO)
        : 8;
  const remote = logoUrl ? resolveMediaUrl(logoUrl) : '';

  return (
    <View
      style={[
        resolvedShape === 'squircle' && styles.squircleShadow,
        resolvedShape === 'squircle' && { borderRadius: radius },
        style,
      ]}
    >
      <View style={styles.logoContainer(imgW, imgH, backgroundColor, radius)}>
        <Image
          source={remote ? { uri: remote } : APP_LOGO}
          style={styles.logoImage(imgW, imgH, radius)}
          resizeMode={isSquare ? 'cover' : 'contain'}
          fadeDuration={0}
          accessibilityLabel="WAREZONE logo"
        />
      </View>
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
  squircleShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
      },
      android: {
        elevation: 10,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
      },
    }),
  },
  logoImage: (width, height, borderRadius) => ({
    width,
    height,
    borderRadius,
    backgroundColor: 'transparent',
  }),
});

export default WarezoneLogo;
