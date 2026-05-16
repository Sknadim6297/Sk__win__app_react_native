import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';

const GAME_LOGO = require('../assets/logo/game_logo.png');

const SKWinLogo = ({ size = 140, style, logoUrl, rounded }) => {
  const height = size * 1.15;
  const remote = logoUrl ? resolveMediaUrl(logoUrl) : '';

  return (
    <View style={[styles.logoContainer(size, height), style]}>
      <Image
        source={remote ? { uri: remote } : GAME_LOGO}
        style={[
          styles.logoImage(size, height),
          rounded && { borderRadius: size / 2 },
        ]}
        resizeMode="contain"
        accessibilityLabel="WarZone Free Fire Tournament logo"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  logoContainer: (width, height) => ({
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
  }),
  logoImage: (width, height) => ({
    width,
    height,
  }),
});

export default SKWinLogo;
