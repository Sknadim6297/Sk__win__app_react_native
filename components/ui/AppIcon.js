import React from 'react';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { ICON } from '../../styles/typography';

/** Icons that must use FontAwesome5 (brand icons). */
const FA5_MAP = {
  telegram: 'telegram-plane',
  instagram: 'instagram',
};

/** MaterialCommunityIcons aliases (invalid or renamed glyphs). */
const MCI_ALIAS = {
  telegram: 'send-circle',
};

/**
 * Consistent gaming-style icons.
 * @param {string} name
 * @param {'xs'|'sm'|'md'|'lg'|'xl'|'xxl'|number} size
 * @param {'mci'|'fa5'} family - force icon set
 */
export default function AppIcon({
  name,
  size = 'md',
  color = '#FFFFFF',
  style,
  family,
  ...props
}) {
  const pixelSize = typeof size === 'number' ? size : ICON[size] || ICON.md;

  if (family === 'fa5' || FA5_MAP[name]) {
    return (
      <FontAwesome5
        name={FA5_MAP[name] || name}
        size={pixelSize}
        color={color}
        style={style}
        {...props}
      />
    );
  }

  const mciName = MCI_ALIAS[name] || name;

  return (
    <MaterialCommunityIcons
      name={mciName}
      size={pixelSize}
      color={color}
      style={style}
      {...props}
    />
  );
}
