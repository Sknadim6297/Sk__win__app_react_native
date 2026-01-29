import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { COLORS } from '../styles/theme';

const SKWinLogo = ({ size = 100, style }) => {
  return (
    <View style={[styles.logoContainer(size), style]}>
      <Image
        source={require('../assets/logo/App_logo.png')}
        style={styles.logoImage(size)}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  logoContainer: (size) => ({
    width: size,
    height: size,
    justifyContent: 'center',
    alignItems: 'center',
  }),
  logoImage: (size) => ({
    width: size,
    height: size,
  }),
});

export default SKWinLogo;
