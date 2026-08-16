import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AppIcon from './AppIcon';
import { FONTS } from '../../styles/theme';
import { ICON_TILE } from '../../constants/iconTheme';

/**
 * Gamex-style icon: white glyph inside a colored rounded-square.
 * Optional white card wrapper for "My Matches" tiles.
 */
export default function IconTile({
  icon,
  label,
  color = ICON_TILE.default,
  size = 52,
  iconSize = 28,
  onPress,
  count,
  whiteCard = false,
  labelDark = false,
  style,
  tileStyle,
}) {
  const radius = Math.round(size * 0.24);
  const content = (
    <>
      <View style={[whiteCard && styles.whiteCard, tileStyle]}>
        <View style={[styles.iconBox, { backgroundColor: color, width: size, height: size, borderRadius: radius }]}>
          <AppIcon name={icon} size={iconSize} light />
        </View>
      </View>
      {label ? (
        <Text style={[styles.label, labelDark && styles.labelDark]} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
      {count > 0 ? (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count > 99 ? '99+' : count}</Text>
        </View>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={[styles.wrap, style]} onPress={onPress} activeOpacity={0.85}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.wrap, style]}>{content}</View>;
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  whiteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 12,
    width: '100%',
    alignItems: 'center',
    minHeight: 110,
    justifyContent: 'center',
  },
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 10,
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  labelDark: {
    color: '#0F172A',
  },
  countBadge: {
    marginTop: 6,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: '#06B6D4',
  },
});
