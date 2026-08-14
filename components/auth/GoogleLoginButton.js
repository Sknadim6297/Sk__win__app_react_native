import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { COLORS, TYPO, ICON } from '../../styles/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function GoogleLoginButton({ onPress, disabled = false, loading = false }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled || loading ? 0.65 : 1,
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={() => {
        scale.value = withSpring(0.98, { damping: 14, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 280 });
      }}
      style={[styles.button, animatedStyle]}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
    >
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name="google" size={ICON.sm} color="#EA4335" />
      </View>
      <Text style={styles.label}>
        {loading ? 'Signing in with Google…' : 'Continue with Google'}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 16,
    minHeight: 56,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    gap: 10,
  },
  iconWrap: {
    width: 28,
    alignItems: 'center',
  },
  label: {
    ...TYPO.buttonSm,
    color: COLORS.textDark,
  },
});
