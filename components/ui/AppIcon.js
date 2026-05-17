import React, { useMemo, useState } from 'react';
import { Image, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ICON } from '../../styles/typography';
import { getIcons8Uri, resolveIconSlug } from '../../constants/icons8Map';

/** MaterialCommunityIcons fallback when CDN fails or slug missing */
const MCI_FALLBACK = {
  'account-outline': 'account-outline',
  at: 'at',
  'lock-outline': 'lock-outline',
  'lock-check-outline': 'lock-check',
  'gift-outline': 'gift-outline',
  'chart-timeline-variant': 'chart-timeline-variant',
  'trophy-outline': 'trophy-outline',
  'home-variant': 'home',
  'wallet-plus-outline': 'wallet-outline',
  'account-circle-outline': 'account-circle-outline',
  headset: 'headset',
  'circle-multiple': 'circle-multiple',
  coins: 'circle-multiple',
  percentage: 'percent',
  podium: 'podium',
  wallet: 'wallet-outline',
  'user-settings': 'account-cog-outline',
};

/**
 * Icons8 Fluent Color with vector fallback for offline / missing assets.
 */
export default function AppIcon({
  name,
  size = 'md',
  important = false,
  light = false,
  muted = false,
  accent,
  color,
  style,
  imageStyle,
  family: _family,
  ..._props
}) {
  const [failed, setFailed] = useState(false);

  const pixelSize = useMemo(() => {
    if (important) return 28;
    if (typeof size === 'number') return size;
    return ICON[size] || ICON.md;
  }, [important, size]);

  const slug = resolveIconSlug(name);
  const uri = useMemo(() => {
    if (muted) return getIcons8Uri(slug, pixelSize, { accent: '9CA3AF' });
    if (light) return getIcons8Uri(slug, pixelSize, { light: true });
    if (accent) return getIcons8Uri(slug, pixelSize, { accent });
    return getIcons8Uri(slug, pixelSize);
  }, [slug, pixelSize, light, muted, accent]);

  const mciName = MCI_FALLBACK[name] || MCI_FALLBACK[slug] || name;
  const mciColor = color || (light || !muted ? '#FFFFFF' : '#9CA3AF');

  if (failed || !uri) {
    return (
      <View
        style={[
          { width: pixelSize, height: pixelSize, alignItems: 'center', justifyContent: 'center' },
          style,
        ]}
      >
        <MaterialCommunityIcons name={mciName} size={pixelSize} color={mciColor} />
      </View>
    );
  }

  return (
    <View
      style={[
        { width: pixelSize, height: pixelSize, alignItems: 'center', justifyContent: 'center' },
        style,
      ]}
    >
      <Image
        source={{ uri }}
        style={[{ width: pixelSize, height: pixelSize }, imageStyle]}
        resizeMode="contain"
        onError={() => setFailed(true)}
        accessibilityRole="image"
        accessibilityLabel={name}
      />
    </View>
  );
}
