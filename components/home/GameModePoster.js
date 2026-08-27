import React from 'react';
import { View, Text, TouchableOpacity, ImageBackground, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../styles/theme';
import { toPlayerMatchLabel } from '../../utils/tournamentHelpers';

/** Accent palette per mode — gold LW, cyan CS, green BR. */
function modeAccent(name) {
  const n = String(name || '').toUpperCase();
  if (/LW|LONE\s*WOLF/.test(n)) {
    return {
      text: '#FFC53D',
      glow: 'rgba(255, 180, 40, 0.95)',
      border: 'rgba(255, 180, 40, 0.7)',
    };
  }
  if (/CS|CLASH|ONE\s*TAP|1V1|2V2|4V4/.test(n)) {
    return {
      text: '#5CFFF7',
      glow: 'rgba(0, 229, 255, 0.95)',
      border: 'rgba(0, 229, 255, 0.65)',
    };
  }
  if (/BR|BATTLE|ROYALE|FULL\s*MAP|SURVIVAL/.test(n)) {
    return {
      text: '#6EFF9A',
      glow: 'rgba(74, 222, 128, 0.9)',
      border: 'rgba(74, 222, 128, 0.6)',
    };
  }
  return {
    text: '#FFD76A',
    glow: 'rgba(251, 191, 36, 0.9)',
    border: 'rgba(251, 191, 36, 0.55)',
  };
}

/** Big white title + short colored label (matches reference UI). */
function modeParts(name) {
  const full = String(toPlayerMatchLabel(name) || 'MODE').toUpperCase().trim();
  const accent = modeAccent(full);

  if (/^LW\b|LONE\s*WOLF/.test(full)) {
    const short = /^LW\b/.test(full)
      ? full
      : full.replace(/LONE\s*WOLF\s*/i, 'LW ').trim() || 'LW 1V1/2V2';
    return { title: 'LONE WOLF', short, accent };
  }
  if (/ONE\s*TAP/.test(full)) {
    return { title: 'CS ONE TAP TOURNAMENT', short: 'CS ONE TAP', accent };
  }
  if (/^CS\b|CLASH\s*SQUAD/.test(full)) {
    const short = /^CS\b/.test(full) ? full : 'CS 1V1/2V2';
    let title = /CLASH/.test(full)
      ? full.replace(/\s*(1V1|2V2|4V4).*$/i, '').trim() || 'CLASH SQUAD'
      : 'CLASH SQUAD';
    if (title.length > 26) title = 'CLASH SQUAD';
    return { title, short, accent };
  }
  if (/SURVIVAL/.test(full)) return { title: 'BR SURVIVAL', short: 'BR SURVIVAL', accent };
  if (/FULL\s*MAP|^BR\s*FULL/.test(full)) return { title: 'BR FULL MAP', short: 'BR FULL MAP', accent };
  if (/^BR\b|BATTLE\s*ROYALE/.test(full)) {
    return {
      title: /BATTLE/.test(full) ? 'BATTLE ROYALE' : full,
      short: /^BR\b/.test(full) ? full : 'BR',
      accent,
    };
  }
  return { title: full, short: full, accent };
}

/**
 * Portrait Free Fire mode poster — tall artwork card for home grid.
 */
export default function GameModePoster({ item, width, height, onPress }) {
  const { title, short, accent } = modeParts(item.name);
  const hasImage = Boolean(item.image);
  const compact = width < 160;
  const titleSize = compact ? 15 : 17;

  return (
    <TouchableOpacity
      style={[styles.card, { width, height, borderColor: accent.border }]}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <ImageBackground
        source={hasImage ? item.image : undefined}
        style={styles.image}
        resizeMode="cover"
      >
        {!hasImage ? (
          <LinearGradient
            colors={['#1B2744', '#0F172A', '#0A1020']}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}

        {!hasImage ? (
          <View style={styles.placeholderIconWrap}>
            <MaterialCommunityIcons name="gamepad-variant" size={34} color={accent.text} />
          </View>
        ) : null}

        <LinearGradient
          colors={['rgba(5,10,22,0)', 'rgba(5,10,22,0.35)', 'rgba(5,10,22,0.96)']}
          locations={[0.25, 0.55, 1]}
          style={styles.bottomFade}
        />

        {item.tournamentCount > 0 ? (
          <View style={styles.countBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveCount}>{item.tournamentCount} LIVE</Text>
          </View>
        ) : null}

        <View style={styles.titleBar}>
          <Text
            style={[
              styles.title,
              { fontSize: titleSize, lineHeight: titleSize + 3 },
            ]}
            numberOfLines={3}
          >
            {title}
          </Text>
          <Text
            style={[
              styles.shortLabel,
              { color: accent.text, textShadowColor: accent.glow },
            ]}
            numberOfLines={1}
          >
            {short}
          </Text>
          <View style={styles.ctaRow}>
            <Text style={[styles.ctaText, { color: accent.text }]}>PLAY</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={accent.text} />
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0F1628',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  image: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  placeholderIconWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 28,
  },
  bottomFade: {
    ...StyleSheet.absoluteFillObject,
  },
  countBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(8, 16, 28, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.45)',
    zIndex: 3,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  liveCount: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  titleBar: {
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 11,
    zIndex: 2,
  },
  title: {
    fontFamily: FONTS.bold,
    color: COLORS.white,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  shortLabel: {
    marginTop: 4,
    fontFamily: FONTS.bold,
    fontSize: 12,
    letterSpacing: 0.5,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  ctaRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ctaText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    letterSpacing: 1,
  },
});
