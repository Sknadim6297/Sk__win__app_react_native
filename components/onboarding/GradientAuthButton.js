import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ONBOARDING } from '../../styles/onboardingTheme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function GradientAuthButton({ label, onPress, variant = 'primary' }) {
  const scale = useSharedValue(1);
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value,
  }));

  const gradientColors =
    variant === 'green'
      ? [ONBOARDING.colors.green, ONBOARDING.colors.greenLight]
      : [ONBOARDING.colors.primary, ONBOARDING.colors.primaryLight, ONBOARDING.colors.orangeSoft];

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 14, stiffness: 320 });
    rippleScale.value = 0;
    rippleOpacity.value = 0.35;
    rippleScale.value = withTiming(1.6, { duration: 420 });
    rippleOpacity.value = withTiming(0, { duration: 420 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 280 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.pressable, containerStyle]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
        <Animated.View style={[styles.ripple, rippleStyle]} />
        <Text style={styles.label}>{label}</Text>
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradient: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  ripple: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    alignSelf: 'center',
  },
  label: {
    fontFamily: ONBOARDING.fonts.button,
    fontSize: 13,
    letterSpacing: 1.2,
    color: '#FFFFFF',
  },
});
