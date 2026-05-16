import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ONBOARDING } from '../../styles/onboardingTheme';

const PARTICLES = [
  { id: 1, top: '14%', left: '10%', size: 3, color: ONBOARDING.colors.particlePurple },
  { id: 2, top: '28%', left: '85%', size: 4, color: ONBOARDING.colors.particleOrange },
  { id: 3, top: '48%', left: '15%', size: 3, color: ONBOARDING.colors.particlePurple },
  { id: 4, top: '62%', left: '80%', size: 3, color: ONBOARDING.colors.particleOrange },
  { id: 5, top: '78%', left: '25%', size: 4, color: ONBOARDING.colors.particlePurple },
];

function Particle({ particle }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0.2);

  useEffect(() => {
    translateY.value = withDelay(
      particle.id * 90,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 3600, easing: Easing.inOut(Easing.sin) }),
          withTiming(6, { duration: 3600, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
    opacity.value = withDelay(
      particle.id * 70,
      withRepeat(
        withSequence(
          withTiming(0.55, { duration: 2400 }),
          withTiming(0.15, { duration: 2400 })
        ),
        -1,
        true
      )
    );
  }, [opacity, particle.id, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        animatedStyle,
        {
          top: particle.top,
          left: particle.left,
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size,
          backgroundColor: particle.color,
        },
      ]}
    />
  );
}

export default function ParticleField() {
  return (
    <View style={styles.container} pointerEvents="none">
      {PARTICLES.map((p) => (
        <Particle key={p.id} particle={p} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  particle: {
    position: 'absolute',
  },
});
