import React, { useEffect, useMemo, useState } from 'react';
import { Image, Platform, View } from 'react-native';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { ICON } from '../../styles/typography';
import { getIcons8Uri, resolveIconSlug } from '../../constants/icons8Map';
import { resolveMciIcon } from '../../constants/iconMciMap';

const USE_VECTOR_ICONS = Platform.OS === 'android';
const CDN_LOAD_TIMEOUT_MS = 4500;

/** Brand glyphs — not available in MaterialCommunityIcons */
const BRAND_FA5 = {
  whatsapp: 'whatsapp',
  telegram: 'telegram',
  instagram: 'instagram',
  'instagram-new': 'instagram',
};

/**
 * App icons: vector on Android; Icons8 on iOS with vector fallback.
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

  const mciName = resolveMciIcon(name);
  const vectorColor =
    color ||
    (accent ? `#${String(accent).replace('#', '')}` : light || !muted ? '#FFFFFF' : '#9CA3AF');

  const brandIcon = BRAND_FA5[name] || BRAND_FA5[slug];

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
        {brandIcon ? (
          <FontAwesome5 name={brandIcon} size={pixelSize * 0.92} color={vectorColor} brand />
        ) : (
          <MaterialCommunityIcons name={mciName} size={pixelSize} color={vectorColor} />
        )}
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
