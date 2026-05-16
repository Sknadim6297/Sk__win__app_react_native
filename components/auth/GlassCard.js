import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../../styles/theme';

export default function GlassCard({ children, style }) {
  const floatY = useSharedValue(0);

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
        withTiming(4, { duration: 2800, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, [floatY]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  return (
    <Animated.View style={[styles.shadowWrap, floatStyle, style]}>
      <BlurView intensity={55} tint="light" style={styles.blur}>
        <View style={styles.inner}>{children}</View>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  blur: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  inner: {
    padding: 22,
    backgroundColor: COLORS.glass,
  },
});
