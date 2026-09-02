import React from 'react';
import { View, Text, TouchableOpacity, ImageBackground, StyleSheet } from 'react-native';
import { FONTS } from '../../styles/theme';
import { toPlayerMatchLabel } from '../../utils/tournamentHelpers';

const FOOTER_HEIGHT = 32;

/** Short label for the bottom strip — matches reference home cards. */
function formatFooterLabel(name) {
  let label = String(toPlayerMatchLabel(name) || 'MODE').toUpperCase().trim();
  label = label.replace(/\s*ONE\s+TAP\s*/gi, ' ONETAP ').replace(/\s+/g, ' ').trim();
  label = label.replace(/(\d+V\d+)\s*\/\s*(\d+V\d+)/gi, '$1 / $2');
  return label;
}

/**
 * Esports game mode card — banner image + bottom label row with live count.
 */
export default function GameModePoster({ item, width, height, onPress }) {
  const label = formatFooterLabel(item.name);
  const count = Number(item.tournamentCount ?? item.liveCount ?? 0) || 0;
  const hasImage = Boolean(item.image);
  const cardHeight = height || Math.round(width * 0.58);
  const imageHeight = Math.max(cardHeight - FOOTER_HEIGHT, 48);

  return (
    <TouchableOpacity
      style={[styles.card, { width, height: cardHeight }]}
      activeOpacity={0.88}
      onPress={onPress}
    >
      <View style={[styles.banner, { height: imageHeight }]}>
        {hasImage ? (
          <ImageBackground
            source={item.image}
            style={styles.bannerImage}
            resizeMode="cover"
            imageStyle={styles.bannerImageCrop}
          />
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerLabel} numberOfLines={1}>
          {label}
        </Text>
        <View style={styles.countWrap}>
          <View style={styles.liveDot} />
          <Text style={styles.countText}>{count}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#141C2B',
    borderWidth: 1.5,
    borderColor: 'rgba(45, 212, 191, 0.55)',
    shadowColor: '#22D3EE',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  banner: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#1E293B',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerImageCrop: {
    resizeMode: 'cover',
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#B8C4CE',
  },
  footer: {
    height: FOOTER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    backgroundColor: 'rgba(12, 18, 30, 0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  footerLabel: {
    flex: 1,
    marginRight: 6,
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#F8FAFC',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  countWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    shadowColor: '#22C55E',
    shadowOpacity: 0.85,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  countText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: '#F8FAFC',
    minWidth: 14,
    textAlign: 'right',
  },
});
