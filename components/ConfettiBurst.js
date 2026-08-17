import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, useWindowDimensions, View } from 'react-native';

const WIN_PALETTE = ['#FBBF24', '#FF6B00', '#00E5FF', '#F472B6', '#22C55E', '#FFFFFF', '#A78BFA', '#F43F5E'];
const SAD_PALETTE = ['#60A5FA', '#93C5FD', '#64748B', '#38BDF8', '#94A3B8', '#1E3A5F'];

function Piece({ config, height }) {
  const translateY = useRef(new Animated.Value(-36)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const fall = Animated.parallel([
      Animated.timing(translateY, {
        toValue: height + 48,
        duration: config.duration,
        delay: config.delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: config.drift,
        duration: config.duration,
        delay: config.delay,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: 1,
        duration: config.duration,
        delay: config.delay,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(config.delay + config.duration * 0.72),
        Animated.timing(opacity, {
          toValue: 0,
          duration: config.duration * 0.28,
          useNativeDriver: true,
        }),
      ]),
    ]);
    fall.start();
    return () => fall.stop();
  }, [config, height, opacity, rotate, translateX, translateY]);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${config.spin}deg`],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.piece,
        {
          left: config.x,
          width: config.w,
          height: config.h,
          borderRadius: config.round,
          backgroundColor: config.color,
          opacity,
          transform: [{ translateY }, { translateX }, { rotate: spin }],
        },
      ]}
    />
  );
}

export default function ConfettiBurst({ active, mood = 'win', pieces }) {
  const { width, height } = useWindowDimensions();
  const sad = mood === 'sad' || mood === 'loss';
  const count = pieces || (sad ? 28 : 56);
  const configs = useMemo(() => {
    if (!active) return [];
    const palette = sad ? SAD_PALETTE : WIN_PALETTE;
    return Array.from({ length: count }, (_, i) => {
      const shape = i % 5;
      const size = sad ? 8 + (i % 4) : 7 + (i % 6);
      return {
        x: Math.round((width * ((i * 17) % 100)) / 100),
        delay: (i % 12) * (sad ? 90 : 55),
        duration: (sad ? 2800 : 2200) + (i % 8) * 180,
        drift: (i % 2 === 0 ? 1 : -1) * (sad ? 8 + (i % 14) : 18 + (i % 28)),
        spin: sad ? (i % 2 === 0 ? 25 : -25) : (i % 2 === 0 ? 1 : -1) * (420 + (i % 8) * 90),
        color: palette[i % palette.length],
        w: sad ? size * 0.55 : shape === 0 ? size * 0.45 : size,
        h: sad ? size : shape === 1 ? size : size * (shape === 2 ? 0.35 : 0.7),
        round: sad ? size / 2 : shape === 1 ? size / 2 : 2,
      };
    });
  }, [active, count, sad, width]);

  if (!active || !configs.length) return null;

  return (
    <View pointerEvents="none" style={styles.overlay}>
      {configs.map((config, index) => (
        <Piece key={index} config={config} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    elevation: 40,
  },
  piece: {
    position: 'absolute',
    top: -12,
  },
});
