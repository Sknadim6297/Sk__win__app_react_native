import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, TEXT } from '../../styles/theme';
import { PAGE } from '../../styles/pageTheme';
import BrandCoin from '../ui/BrandCoin';
import { formatTimeLeft } from '../../utils/tournamentHelpers';

function toCaps(value) {
  if (value == null) return '';
  if (typeof value === 'number') return String(value);
  return String(value).toUpperCase();
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
          TIME LEFT: {toCaps(left || '')}
        </Text>
      </View>
    </View>
  );
}

export function InfoCell({ label, value, coin, rupee, flex, inline }) {
  const labelText = toCaps(label);
  const valueText = toCaps(value);

  const renderValue = () => {
    if (rupee) return <RupeeValue value={value} color={PAGE.gold} />;
    if (coin) return <CoinValue value={value} size={15} color={PAGE.gold} />;
    return (
      <Text style={inline ? styles.infoValueInline : styles.infoValue} numberOfLines={2}>
        {valueText}
      </Text>
    );
  };

  // Stacked layout (label above value) keeps long labels like MATCH TYPE fully readable.
  if (!inline) {
    return (
      <View
        style={[
          styles.infoCell,
          flex != null && { flex, minWidth: '46%', flexBasis: '46%' },
        ]}
      >
        <Text style={styles.infoLabel}>{labelText}</Text>
        {renderValue()}
      </View>
    );
  }

  return (
    <View style={[styles.infoCell, styles.infoCellInline, flex != null && { flex }]}>
      <Text style={styles.infoLabelInline}>{labelText}: </Text>
      <View style={styles.infoValueWrap}>{renderValue()}</View>
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
            {toCaps(item.label)}
          </Text>
          {item.rupee ? (
            <RupeeValue value={item.value} color={PAGE.gold} />
          ) : item.coin ? (
            <CoinValue value={item.value} size={16} color={PAGE.gold} />
          ) : (
            <Text style={styles.tripleValue} numberOfLines={2}>
              {toCaps(item.value)}
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
    paddingHorizontal: 10,
    minHeight: 58,
    justifyContent: 'center',
  },
  infoCellInline: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingVertical: 11,
    gap: 4,
  },
  infoLabel: {
    ...TEXT.caption,
    color: PAGE.muted,
    marginBottom: 6,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  infoLabelInline: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: PAGE.muted,
    flexShrink: 0,
  },
  infoValueWrap: {
    flexShrink: 1,
    flexGrow: 1,
  },
  infoValue: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.white,
  },
  infoValueInline: {
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
