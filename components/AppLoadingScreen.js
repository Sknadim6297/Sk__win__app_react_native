import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS } from '../styles/theme';
import SKWinLogo from './SKWinLogo';

const AppLoadingScreen = ({
  title = 'SK WIN',
  subtitle = 'Loading battleground...'
}) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 300,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [progress]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.glowOrbTop} />
      <View style={styles.glowOrbBottom} />

      <View style={styles.content}>
        <SKWinLogo size={132} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  content: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },
  title: {
    marginTop: 12,
    color: COLORS.white,
    fontSize: 28,
    fontFamily: FONTS.black,
    letterSpacing: 2,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 24,
    color: COLORS.gray,
    fontSize: 13,
    fontFamily: FONTS.medium,
    letterSpacing: 0.8,
  },
  progressTrack: {
    width: 240,
    height: 10,
    borderRadius: 999,
    backgroundColor: COLORS.darkGray,
    borderWidth: 1,
    borderColor: '#2A355D',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: COLORS.accent,
  },
  glowOrbTop: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(229, 233, 0, 0.08)',
  },
  glowOrbBottom: {
    position: 'absolute',
    bottom: -150,
    left: -90,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(208, 94, 0, 0.10)',
  },
});

export default AppLoadingScreen;
