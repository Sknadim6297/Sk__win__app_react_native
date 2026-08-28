import React, { useEffect, useMemo, useState } from 'react';
import { View, Image, StyleSheet, useWindowDimensions } from 'react-native';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';

const DEFAULT_BANNER = require('../../assets/images/1e84951ea4e43a94485c30851c151ad2.jpg');
const DEFAULT_ASPECT = 16 / 9;
const MIN_ASPECT = 1.2;
const MAX_ASPECT = 2.4;

function clampAspect(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_ASPECT;
  return Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, n));
}

/**
 * Tournament promo banner — same compact layout as match list cards.
 */
export default function TournamentBanner({
  bannerImage,
  fallback = DEFAULT_BANNER,
  maxHeight = 220,
  style,
  imageStyle,
  borderRadius = 16,
  horizontalPadding = 32,
}) {
  const { width: screenWidth } = useWindowDimensions();
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_ASPECT);
  const uri = bannerImage ? resolveMediaUrl(bannerImage) : null;

  useEffect(() => {
    if (!uri) {
      setAspectRatio(DEFAULT_ASPECT);
      return undefined;
    }
    let cancelled = false;
    Image.getSize(
      uri,
      (width, height) => {
        if (!cancelled && width > 0 && height > 0) {
          setAspectRatio(clampAspect(width / height));
        }
      },
      () => {
        if (!cancelled) setAspectRatio(DEFAULT_ASPECT);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [uri]);

  const layoutWidth = Math.max(240, screenWidth - horizontalPadding);
  const safeAspect = clampAspect(aspectRatio);

  const { height, capped } = useMemo(() => {
    const natural = layoutWidth / safeAspect;
    if (maxHeight && natural > maxHeight) {
      return { height: maxHeight, capped: true };
    }
    return { height: natural, capped: false };
  }, [layoutWidth, safeAspect, maxHeight]);

  const source = uri ? { uri } : fallback;

  return (
    <View
      style={[
        styles.wrap,
        { borderRadius, height },
        style,
      ]}
    >
      <Image
        source={source}
        style={[
          capped
            ? { width: '100%', height: '100%' }
            : { width: '100%', aspectRatio: safeAspect },
          { borderRadius },
          imageStyle,
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#0f1628',
    justifyContent: 'center',
  },
});
