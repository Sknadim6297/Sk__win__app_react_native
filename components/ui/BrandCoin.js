import React from 'react';
import { Image } from 'react-native';
import { HEADER_COIN } from '../../constants/brandAssets';

/** Shared 3D gold coin used in header, wallet, and prize amounts. */
export default function BrandCoin({ size = 22, style }) {
  return (
    <Image
      source={HEADER_COIN}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
    />
  );
}
