import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, TEXT } from '../../styles/theme';
import { PAGE } from '../../styles/pageTheme';
import BrandCoin from '../ui/BrandCoin';
import { formatTimeLeft } from '../../utils/tournamentHelpers';

export function useTimeLeft(targetDate) {
  const [label, setLabel] = useState(() => formatTimeLeft(targetDate));
  useEffect(() => {
    setLabel(formatTimeLeft(targetDate));
    const id = setInterval(() => setLabel(formatTimeLeft(targetDate)), 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return label;
}

export function CoinValue({ value, size = 16, color = COLORS.white, textStyle }) {
  return (
    <View style={styles.coinRow}>
      <BrandCoin size={size} />
      <Text style={[styles.coinText, { color }, textStyle]}>{value ?? 0}</Text>
    </View>
  );
}

export function TimeLeftBar({ startDate }) {
  const left = useTimeLeft(startDate);
  return (
    <View style={styles.timeBar}>
      <View style={styles.timeInner}>
        <Text style={styles.timeText}>Time Left: {left}</Text>
      </View>
    </View>
  );
}

export function InfoCell({ label, value, coin, flex }) {
  return (
    <View style={[styles.infoCell, flex != null && { flex }]}>
      <Text style={styles.infoLabel}>{label}</Text>
      {coin ? (
        <CoinValue value={value} size={15} color={COLORS.white} />
      ) : (
        <Text style={styles.infoValue} numberOfLines={2}>
          {value}
        </Text>
      )}
    </View>
  );
}

export function StatTriple({ items }) {
  return (
    <View style={styles.triple}>
      {items.map((item, i) => (
        <View key={item.label} style={styles.tripleCol}>
          <Text style={styles.tripleLabel}>{item.label}</Text>
          {item.coin ? (
            <CoinValue value={item.value} size={16} color={PAGE.gold} />
          ) : (
            <Text style={styles.tripleValue} numberOfLines={2}>
              {item.value}
            </Text>
          )}
          {i < items.length - 1 ? <View style={styles.tripleRule} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  coinRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  coinText: { fontFamily: FONTS.bold, fontSize: 15 },
  timeBar: {
    backgroundColor: PAGE.cardAlt,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: PAGE.border,
    marginVertical: 10,
  },
  timeInner: {
    backgroundColor: PAGE.card,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  timeText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.white,
  },
  infoCell: {
    backgroundColor: PAGE.card,
    borderWidth: 1,
    borderColor: PAGE.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    minHeight: 58,
    justifyContent: 'center',
  },
  infoLabel: {
    ...TEXT.caption,
    color: PAGE.cyan,
    marginBottom: 4,
  },
  infoValue: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.white,
  },
  triple: {
    flexDirection: 'row',
    marginTop: 10,
  },
  tripleCol: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  tripleLabel: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: PAGE.muted,
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  tripleValue: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.white,
    textAlign: 'center',
  },
  tripleRule: {
    position: 'absolute',
    right: 0,
    top: 8,
    bottom: 8,
    width: 1,
    backgroundColor: PAGE.border,
  },
});
