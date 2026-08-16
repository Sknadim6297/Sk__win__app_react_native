import React from 'react';
import { View, Text, TouchableOpacity, ImageBackground, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../../styles/theme';

/**
 * Free Fire mode poster card (2-col grid) — artwork + live count + mode name.
 */
export default function GameModePoster({ item, width, height, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.card, { width, height }, !item.image && styles.placeholder]}
      activeOpacity={0.88}
      onPress={onPress}
    >
      <ImageBackground
        source={item.image || undefined}
        style={styles.image}
        resizeMode="cover"
      >
        <View style={styles.countBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveCount}>{item.tournamentCount ?? 0}</Text>
        </View>
        <View style={styles.titleBar}>
          <Text style={styles.title} numberOfLines={2}>
            {item.name}
          </Text>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#12162B',
    borderWidth: 1.5,
    borderColor: '#00E5FF',
  },
  placeholder: {
    backgroundColor: '#1a2238',
  },
  image: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  countBadge: {
    position: 'absolute',
    right: 8,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    zIndex: 2,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  liveCount: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.white,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  titleBar: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    paddingRight: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.white,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
