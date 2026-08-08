import React, { useEffect, useMemo, useState } from 'react';
import { Image, Platform, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ICON } from '../../styles/typography';
import { getIcons8Uri, resolveIconSlug } from '../../constants/icons8Map';
import { resolveMciIcon } from '../../constants/iconMciMap';

const USE_VECTOR_ICONS = Platform.OS === 'android';
const CDN_LOAD_TIMEOUT_MS = 4500;

/**
 * Brand glyphs via MaterialCommunityIcons (avoids bundling FontAwesome5 fonts ~360KB).
 */
const BRAND_MCI = {
  whatsapp: 'whatsapp',
  telegram: 'send',
  instagram: 'instagram',
  'instagram-new': 'instagram',
};

/**
 * App icons: vector on Android; Icons8 on iOS with vector fallback.
 * Uses only MaterialCommunityIcons — do not import unused icon font families.
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
  const [failed, setFailed] = useState(USE_VECTOR_ICONS);

  const pixelSize = useMemo(() => {
    if (important) return 28;
    if (typeof size === 'number') return size;
    return ICON[size] || ICON.md;
  }, [important, size]);

  const slug = resolveIconSlug(name);
  const uri = useMemo(() => {
    if (USE_VECTOR_ICONS) return null;
    if (muted) return getIcons8Uri(slug, pixelSize, { accent: '9CA3AF' });
    if (light) return getIcons8Uri(slug, pixelSize, { light: true });
    if (accent) return getIcons8Uri(slug, pixelSize, { accent });
    return getIcons8Uri(slug, pixelSize);
  }, [slug, pixelSize, light, muted, accent]);

  const brandMci = BRAND_MCI[name] || BRAND_MCI[slug];
  const mciName = brandMci || resolveMciIcon(name);
  const vectorColor =
    color ||
    (accent ? `#${String(accent).replace('#', '')}` : light || !muted ? '#FFFFFF' : '#9CA3AF');

  useEffect(() => {
    if (USE_VECTOR_ICONS || !uri) return undefined;
    const timer = setTimeout(() => setFailed(true), CDN_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [uri]);

  if (failed || !uri) {
    return (
      <View
        style={[
          { width: pixelSize, height: pixelSize, alignItems: 'center', justifyContent: 'center' },
          style,
        ]}
      >
        <MaterialCommunityIcons name={mciName} size={pixelSize} color={vectorColor} />
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
        onLoad={() => setFailed(false)}
        accessibilityRole="image"
        accessibilityLabel={name}
      />
    </View>
  );
}
