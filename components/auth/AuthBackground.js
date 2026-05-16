import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../../styles/theme';

const BLOBS = [
  { id: 1, top: '8%', left: '5%', size: 120, color: 'rgba(123, 97, 255, 0.2)' },
  { id: 2, top: '35%', right: '-8%', size: 100, color: 'rgba(56, 89, 248, 0.15)' },
  { id: 3, bottom: '15%', left: '-5%', size: 140, color: 'rgba(255, 107, 0, 0.08)' },
];

function Blob({ blob }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withDelay(
      blob.id * 200,
      withRepeat(
        withSequence(
          withTiming(1.08, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.95, { duration: 4000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, [blob.id, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.blob,
        style,
        {
          width: blob.size,
          height: blob.size,
          borderRadius: blob.size / 2,
          backgroundColor: blob.color,
          top: blob.top,
          left: blob.left,
          right: blob.right,
          bottom: blob.bottom,
        },
      ]}
    />
  );
}

export default function AuthBackground() {
  return (
    <View style={styles.container} pointerEvents="none">
      <LinearGradient
        colors={['#050510', '#0A0E21', '#0D1230']}
        style={StyleSheet.absoluteFill}
      />
      {BLOBS.map((b) => (
        <Blob key={b.id} blob={b} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.backgroundDark,
  },
  blob: {
    position: 'absolute',
  },
});
