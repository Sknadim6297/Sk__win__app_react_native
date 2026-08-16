import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ICON } from '../../styles/typography';
import { getIcons8Uri, resolveIconSlug } from '../../constants/icons8Map';
import { resolveMciIcon } from '../../constants/iconMciMap';

const CDN_LOAD_TIMEOUT_MS = 12000;

const BRAND_MCI = {
  whatsapp: 'whatsapp',
  telegram: 'send',
  instagram: 'instagram',
  'instagram-new': 'instagram',
};

const COLOR_BRAND_ICONS = new Set(['whatsapp', 'telegram', 'instagram', 'instagram-new']);

/**
 * Colorful Icons8 fluency glyphs stay on screen once loaded.
 * Vector outlines are used only if the image never arrives.
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
  const loadedRef = useRef(false);
  const [failed, setFailed] = useState(false);

  const pixelSize = useMemo(() => {
    if (important) return 28;
    if (typeof size === 'number') return size;
    return ICON[size] || ICON.md;
  }, [important, size]);

  const slug = resolveIconSlug(name);
  const keepColorBrand = COLOR_BRAND_ICONS.has(name) || COLOR_BRAND_ICONS.has(slug);
  const uri = useMemo(() => {
    if (keepColorBrand) return getIcons8Uri(slug, pixelSize);
    if (muted) return getIcons8Uri(slug, pixelSize, { accent: '9CA3AF' });
    if (light) return getIcons8Uri(slug, pixelSize, { light: true });
    if (accent) return getIcons8Uri(slug, pixelSize, { accent });
    return getIcons8Uri(slug, pixelSize);
  }, [slug, pixelSize, light, muted, accent, keepColorBrand]);

  const brandMci = BRAND_MCI[name] || BRAND_MCI[slug];
  const mciName = brandMci || resolveMciIcon(name);
  const vectorColor =
    color ||
    (accent ? `#${String(accent).replace('#', '')}` : light || !muted ? '#FFFFFF' : '#9CA3AF');

  useEffect(() => {
    loadedRef.current = false;
    setFailed(false);
    if (!uri) return undefined;
    const timer = setTimeout(() => {
      if (!loadedRef.current) setFailed(true);
    }, CDN_LOAD_TIMEOUT_MS);
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
        onLoad={() => {
          loadedRef.current = true;
          setFailed(false);
        }}
        accessibilityRole="image"
        accessibilityLabel={name}
      />
    </View>
  );
}
