import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Linking,
  Animated,
  ScrollView,
} from 'react-native';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';
import { COLORS } from '../../styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH - 32;
const SLIDER_HEIGHT = 180;
const AUTO_PLAY_MS = 4500;

function SliderSkeleton() {
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.65, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return <Animated.View style={[styles.skeleton, { opacity: pulse }]} />;
}

export default function HomeImageSlider({ sliders = [], loading = false }) {
  const scrollRef = useRef(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (sliders.length <= 1) return undefined;

    const timer = setInterval(() => {
      setIndex((prev) => {
        const next = (prev + 1) % sliders.length;
        scrollRef.current?.scrollTo({ x: next * SLIDER_WIDTH, animated: true });
        return next;
      });
    }, AUTO_PLAY_MS);

    return () => clearInterval(timer);
  }, [sliders.length]);

  if (loading) {
    return <SliderSkeleton />;
  }

  if (!sliders.length) {
    return null;
  }

  const openLink = (url) => {
    const trimmed = (url || '').trim();
    if (!trimmed) return;
    const target = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    Linking.openURL(target).catch(() => {});
  };

  return (
    <View style={styles.wrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / SLIDER_WIDTH);
          setIndex(idx);
        }}
      >
        {sliders.map((item, i) => {
          const uri = resolveMediaUrl(item.image);
          const hasLink = Boolean((item.link || '').trim());

          return (
            <TouchableOpacity
              key={item.id || item._id || `slider-${i}`}
              activeOpacity={hasLink ? 0.9 : 1}
              disabled={!hasLink}
              onPress={() => openLink(item.link)}
              style={styles.slide}
            >
              {uri ? (
                <Image source={{ uri }} style={styles.image} resizeMode="cover" />
              ) : (
                <View style={[styles.image, styles.imagePlaceholder]} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {sliders.length > 1 && (
        <View style={styles.dots}>
          {sliders.map((_, i) => (
            <View key={`dot-${i}`} style={[styles.dot, index === i && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
  },
  slide: {
    width: SLIDER_WIDTH,
    height: SLIDER_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceDark,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    backgroundColor: '#121B33',
  },
  skeleton: {
    width: SLIDER_WIDTH,
    height: SLIDER_HEIGHT,
    borderRadius: 16,
    backgroundColor: '#1a2340',
    marginBottom: 16,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: {
    width: 20,
    backgroundColor: '#38BDF8',
  },
});
