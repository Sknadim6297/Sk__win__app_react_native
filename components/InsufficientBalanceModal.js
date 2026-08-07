import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CenterDialog from './CenterDialog';
import { COLORS, FONTS, TEXT } from '../styles/theme';

/**
 * Professional centered insufficient-balance dialog.
 */
export default function InsufficientBalanceModal({
  visible,
  onClose,
  onAddCoins,
  title = 'Insufficient Balance',
  message = "You don't have enough coins to register your team for this tournament. Please add coins to continue.",
  requiredAmount,
  currentBalance,
}) {
  return (
    <CenterDialog visible={visible} onClose={onClose} dismissOnOverlay>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name="wallet-outline" size={36} color="#FBBF24" />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {(requiredAmount != null || currentBalance != null) && (
        <View style={styles.metaBox}>
          {requiredAmount != null ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Required</Text>
              <Text style={styles.metaValue}>₹{Number(requiredAmount).toLocaleString('en-IN')}</Text>
            </View>
          ) : null}
          {currentBalance != null ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Your balance</Text>
              <Text style={[styles.metaValue, styles.metaWarn]}>
                ₹{Number(currentBalance).toLocaleString('en-IN')}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      <TouchableOpacity style={styles.primaryBtn} onPress={onAddCoins} activeOpacity={0.88}>
        <MaterialCommunityIcons name="plus-circle" size={18} color={COLORS.white} />
        <Text style={styles.primaryText}>Add Coins</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </CenterDialog>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignSelf: 'center',
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    ...TEXT.h3,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    ...TEXT.body,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  metaBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    ...TEXT.label,
    color: COLORS.grayDim,
  },
  metaValue: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.white,
  },
  metaWarn: { color: '#F87171' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00B368',
    borderRadius: 14,
    paddingVertical: 14,
    minHeight: 50,
  },
  primaryText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  cancelBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelText: {
    ...TEXT.label,
    fontFamily: FONTS.semiBold,
    color: COLORS.gray,
  },
});
