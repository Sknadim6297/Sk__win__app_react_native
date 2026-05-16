import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ONBOARDING } from '../../styles/onboardingTheme';
import ParticleField from './ParticleField';

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
      <View style={[styles.glow, styles.glowOrange]} />

      <ParticleField />
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
    width: ONBOARDING.layout.width * 0.7,
    height: ONBOARDING.layout.width * 0.7,
    top: -ONBOARDING.layout.width * 0.2,
    alignSelf: 'center',
    backgroundColor: ONBOARDING.colors.purpleGlow,
  },
  glowBlue: {
    width: ONBOARDING.layout.width * 0.5,
    height: ONBOARDING.layout.width * 0.5,
    bottom: ONBOARDING.layout.height * 0.12,
    right: -ONBOARDING.layout.width * 0.15,
    backgroundColor: 'rgba(56, 89, 248, 0.12)',
  },
  glowOrange: {
    width: ONBOARDING.layout.width * 0.35,
    height: ONBOARDING.layout.width * 0.35,
    top: '42%',
    left: -ONBOARDING.layout.width * 0.12,
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
  },
});
