import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, TYPO } from '../../styles/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function PrimaryButton({ label, onPress, disabled = false }) {
  const scale = useSharedValue(1);
  const rippleOpacity = useSharedValue(0);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: rippleOpacity.value,
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        if (disabled) return;
        scale.value = withSpring(0.98, { damping: 14, stiffness: 320 });
        rippleOpacity.value = withTiming(0.25, { duration: 100 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 280 });
        rippleOpacity.value = withTiming(0, { duration: 300 });
      }}
      style={[styles.pressable, containerStyle, disabled && styles.disabled]}
    >
      <Animated.View style={[styles.ripple, rippleStyle]} />
      <Text style={styles.label}>{label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.55,
  },
  pressable: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: COLORS.purple,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    overflow: 'hidden',
    minHeight: 56,
  },
  ripple: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  label: {
    ...TYPO.button,
    color: COLORS.white,
  },
});
