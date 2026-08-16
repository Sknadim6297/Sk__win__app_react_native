import React from 'react';
import { Image } from 'react-native';
import { HEADER_BELL } from '../../constants/brandAssets';

/** Shared 3D bell used in header and notifications. */
export default function BrandBell({ size = 26, style }) {
  return (
    <Image
      source={HEADER_BELL}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
    />
  );
}
