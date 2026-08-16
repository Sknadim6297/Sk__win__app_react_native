import React from 'react';
import { Image } from 'react-native';
import { DEFAULT_AVATAR } from '../../constants/brandAssets';

/** Default 3D profile portrait when the user has no photo. */
export default function DefaultAvatar({ uri, size = 46, style, rounded = true }) {
  return (
    <Image
      source={uri ? { uri } : DEFAULT_AVATAR}
      style={[
        {
          width: size,
          height: size,
          borderRadius: rounded ? size / 2 : 0,
          backgroundColor: '#7EC8E3',
        },
        style,
      ]}
      resizeMode="cover"
    />
  );
}
