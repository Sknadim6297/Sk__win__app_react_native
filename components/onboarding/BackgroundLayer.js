import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ONBOARDING } from '../../styles/onboardingTheme';

/** Lightweight gradient background — no particle images. */
export default function BackgroundLayer() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#050510', '#0A0E21', '#0D1230', '#050510']}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.glow, styles.glowPurple]} />
      <View style={[styles.glow, styles.glowBlue]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: ONBOARDING.colors.background,
  },
  glow: {
    position: 'absolute',
    borderRadius: 999,
  },
  glowPurple: {
    width: '70%',
    aspectRatio: 1,
    top: '-18%',
    alignSelf: 'center',
    backgroundColor: ONBOARDING.colors.purpleGlow,
  },
  glowBlue: {
    width: '50%',
    aspectRatio: 1,
    bottom: '12%',
    right: '-15%',
    backgroundColor: 'rgba(56, 89, 248, 0.12)',
  },
});
