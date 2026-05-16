import React, { useEffect } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ONBOARDING } from '../../styles/onboardingTheme';

const GAME_LOGO = require('../../assets/logo/game_logo.png');
const GAME_IMG_1 = require('../../assets/images/1e84951ea4e43a94485c30851c151ad2.jpg');
const GAME_IMG_2 = require('../../assets/images/87904deacf9b547a95f019e0a322152a.jpg');

const GRID_COLORS = ['#E74C3C', '#3498DB', '#2ECC71', '#9B59B6', '#F39C12', '#1ABC9C', '#E67E22', '#34495E'];

const { mockupWidth, mockupHeight } = ONBOARDING.layout;
const GRID_SIZE = 4;

export default function MockupCard() {
  const floatY = useSharedValue(0);

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        withTiming(6, { duration: 2600, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, [floatY]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  const gridItems = Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
    if (i === 7) return { type: 'image', source: GAME_IMG_1 };
    if (i === 11) return { type: 'image', source: GAME_IMG_2 };
    return { type: 'color', color: GRID_COLORS[i % GRID_COLORS.length] };
  });

  return (
    <Animated.View style={[styles.wrapper, floatStyle]}>
      <View style={styles.phoneShadow} />
      <View style={styles.phone}>
        <View style={styles.notch} />
        <View style={styles.screen}>
          <View style={styles.gridSection}>
            <View style={styles.grid}>
              {gridItems.map((item, index) => (
                <View key={index} style={styles.gridCell}>
                  {item.type === 'image' ? (
                    <Image source={item.source} style={styles.gridImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.gridColor, { backgroundColor: item.color }]} />
                  )}
                </View>
              ))}
            </View>
            <View style={styles.logoOverlay}>
              <Image source={GAME_LOGO} style={styles.centerLogo} resizeMode="contain" />
            </View>
          </View>
          <View style={styles.darkSection}>
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        </View>
        <View style={styles.homeBar} />
      </View>
    </Animated.View>
  );
}

const cellSize = (mockupWidth - 20) / GRID_SIZE;

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneShadow: {
    position: 'absolute',
    width: mockupWidth + 16,
    height: mockupHeight + 16,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    transform: [{ translateY: 14 }],
  },
  phone: {
    width: mockupWidth,
    height: mockupHeight,
    borderRadius: 28,
    backgroundColor: ONBOARDING.colors.mockupBezel,
    padding: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  notch: {
    alignSelf: 'center',
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#334155',
    marginBottom: 6,
  },
  screen: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  gridSection: {
    flex: 1.15,
    backgroundColor: '#F5F5F5',
    position: 'relative',
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 2,
  },
  gridCell: {
    width: cellSize - 2,
    height: cellSize - 2,
    margin: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridColor: {
    flex: 1,
    borderRadius: 6,
  },
  logoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  centerLogo: {
    width: mockupWidth * 0.42,
    height: mockupWidth * 0.42,
  },
  darkSection: {
    flex: 0.85,
    backgroundColor: ONBOARDING.colors.mockupScreenDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeBar: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#475569',
    marginTop: 6,
  },
});
