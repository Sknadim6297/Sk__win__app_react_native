import React from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import { BRAND_COLORS } from '../constants/branding';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';

const APP_LOGO = require('../assets/logo/sk_win_logo.png');

const SKWinLogo = ({
  size = 140,
  style,
  logoUrl,
  rounded,
  width,
  height,
  backgroundColor = BRAND_COLORS.background,
}) => {
  const imgW = width ?? size;
  const imgH = height ?? size * 1.05;
  const remote = logoUrl ? resolveMediaUrl(logoUrl) : '';

  return (
    <View style={[styles.logoContainer(imgW, imgH, backgroundColor), style]}>
      <Image
        source={remote ? { uri: remote } : APP_LOGO}
        style={[
          styles.logoImage(imgW, imgH),
          rounded && { borderRadius: Math.min(imgW, imgH) / 2 },
        ]}
        resizeMode="contain"
        accessibilityLabel="SK WIN logo"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  logoContainer: (width, height, backgroundColor) => ({
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor,
    ...(Platform.OS === 'web' ? { overflow: 'hidden' } : {}),
  }),
  logoImage: (width, height) => ({
    width,
    height,
    backgroundColor: 'transparent',
  }),
});

export default SKWinLogo;
