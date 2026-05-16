import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ONBOARDING } from '../../styles/onboardingTheme';

const DOTS = [0, 1, 2];

function LoaderDot({ index }) {
  const scale = useSharedValue(0.65);
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    const delay = index * 160;
    scale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 380 + delay, easing: Easing.out(Easing.cubic) }),
        withTiming(0.65, { duration: 380, easing: Easing.in(Easing.cubic) })
      ),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 380 + delay }),
        withTiming(0.35, { duration: 380 })
      ),
      -1,
      false
    );
  }, [index, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

export default function GameLoader() {
  const ringRotation = useSharedValue(0);

  useEffect(() => {
    ringRotation.value = withRepeat(
      withTiming(360, { duration: 2200, easing: Easing.linear }),
      -1,
      false
    );
  }, [ringRotation]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ringRotation.value}deg` }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.ring, ringStyle]} />
      <View style={styles.dotsRow}>
        {DOTS.map((index) => (
          <LoaderDot key={index} index={index} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: 'rgba(34, 197, 94, 0.15)',
    borderTopColor: ONBOARDING.colors.primary,
    borderRightColor: ONBOARDING.colors.green,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ONBOARDING.colors.primary,
    marginHorizontal: 4,
  },
});
