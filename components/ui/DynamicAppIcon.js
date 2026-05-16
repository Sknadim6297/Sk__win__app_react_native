import React from 'react';
import { Image } from 'react-native';
import AppIcon from './AppIcon';
import { ICON } from '../../styles/typography';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';

/**
 * Renders an admin-uploaded PNG/WebP icon when available, otherwise falls back to AppIcon.
 */
export default function DynamicAppIcon({
  iconKey,
  icons = {},
  name,
  size = 'md',
  color = '#FFFFFF',
  style,
  imageStyle,
}) {
  const raw = icons[iconKey];
  const url = raw ? resolveMediaUrl(raw) : '';
  const pixelSize = typeof size === 'number' ? size : ICON[size] || ICON.md;

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={[{ width: pixelSize, height: pixelSize }, imageStyle, style]}
        resizeMode="contain"
      />
    );
  }

  return (
    <AppIcon
      name={name || iconKey}
      size={size}
      color={color}
      style={style}
    />
  );
}
