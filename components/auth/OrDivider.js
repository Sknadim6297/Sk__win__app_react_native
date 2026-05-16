import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS } from '../../styles/theme';

export default function OrDivider({ label = 'or Login' }) {
  return (
    <Text style={styles.text}>{label}</Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.gray,
    textAlign: 'center',
    marginVertical: 18,
  },
});
