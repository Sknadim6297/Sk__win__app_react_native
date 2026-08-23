import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, TEXT } from '../../styles/theme';
import { PAGE } from '../../styles/pageTheme';
import BrandCoin from '../ui/BrandCoin';
import { formatTimeLeft } from '../../utils/tournamentHelpers';

function asText(value) {
  if (value == null) return '';
  if (typeof value === 'number') return String(value);
  return String(value);
}

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
      <Text style={[styles.coinText, { color }, textStyle]} numberOfLines={1}>
        {value ?? 0}
      </Text>
    </View>
  );
}

/** Entry fee / prize amounts shown as ₹ (not wallet coin icon). */
export function RupeeValue({ value, color = PAGE.gold, textStyle }) {
  const n = Number(value);
  const amount = Number.isFinite(n) ? n : 0;
  return (
    <Text style={[styles.coinText, { color }, textStyle]} numberOfLines={1}>
      ₹{amount}
    </Text>
  );
}

export function TimeLeftBar({ startDate }) {
  const left = useTimeLeft(startDate);
  return (
    <View style={styles.timeBar}>
      <View style={styles.timeInner}>
        <Text style={styles.timeText} numberOfLines={1}>
          Time left: {String(left || '')}
        </Text>
      </View>
    </View>
  );
}

export function InfoCell({ label, value, coin, rupee, flex, inline }) {
  const labelText = asText(label);
  const valueText = asText(value);
  const forceInline = Boolean(inline || coin || rupee);

  const renderValue = () => {
    if (rupee) return <RupeeValue value={value} color={PAGE.gold} />;
    if (coin) return <CoinValue value={value} size={15} color={PAGE.gold} />;
    return (
      <Text style={forceInline ? styles.infoValueInline : styles.infoValue} numberOfLines={forceInline ? 1 : 2}>
        {valueText}
      </Text>
    );
  };

  if (forceInline) {
    return (
      <View style={[styles.infoCell, styles.infoCellInline, flex != null && { flex }]}>
        <Text style={styles.infoLabelInline} numberOfLines={1}>
          {labelText}:{' '}
        </Text>
        <View style={styles.infoValueWrap}>{renderValue()}</View>
      </View>
    );
  }

  return (
    <View style={[styles.infoCell, flex != null && { flex }]}>
      <Text style={styles.infoLabel}>{labelText}:</Text>
      {renderValue()}
    </View>
  );
}

export function StatTriple({ items }) {
  const list = (items || []).filter(Boolean);
  if (!list.length) return null;
  return (
    <View style={styles.triple}>
      {list.map((item, i) => (
        <View key={`${item.label}-${i}`} style={styles.tripleCol}>
          <Text style={styles.tripleLabel} numberOfLines={1}>
            {asText(item.label)}
          </Text>
          {item.rupee ? (
            <RupeeValue value={item.value} color={PAGE.gold} />
          ) : item.coin ? (
            <CoinValue value={item.value} size={16} color={PAGE.gold} />
          ) : (
            <Text style={styles.tripleValue} numberOfLines={2}>
              {asText(item.value)}
            </Text>
          )}
          {i < list.length - 1 ? <View style={styles.tripleRule} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  coinRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  coinText: { fontFamily: FONTS.bold, fontSize: 14 },
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
    paddingHorizontal: 10,
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
    paddingHorizontal: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  infoCellInline: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    paddingVertical: 11,
  },
  infoLabel: {
    ...TEXT.caption,
    color: PAGE.muted,
    marginBottom: 4,
  },
  infoLabelInline: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: PAGE.muted,
    flexShrink: 1,
  },
  infoValueWrap: {
    flexShrink: 0,
  },
  infoValue: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.white,
  },
  infoValueInline: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.white,
    flexShrink: 1,
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
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    color: PAGE.muted,
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
