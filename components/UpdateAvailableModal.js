import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import CenterDialog from './CenterDialog';
import { COLORS, FONTS, TEXT } from '../styles/theme';
import { PAGE } from '../styles/pageTheme';

/**
 * Soft update prompt — user can dismiss with X or Later.
 */
export default function UpdateAvailableModal({
  visible,
  onClose,
  onDownload,
  latestVersion,
  currentVersion,
  releaseNotes,
  sizeLabel,
}) {
  const isIos = Platform.OS === 'ios';

  return (
    <CenterDialog visible={visible} onClose={onClose} dismissOnOverlay maxWidth={340} style={styles.cardPad}>
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={onClose}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel="Dismiss update"
      >
        <Ionicons name="close" size={20} color={COLORS.gray} />
      </TouchableOpacity>

      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name="cellphone-arrow-down" size={28} color={COLORS.purple} />
      </View>

      <Text style={styles.title}>Update available</Text>
      <Text style={styles.message}>
        A newer version of WAREZONE is ready
        {latestVersion ? ` (v${latestVersion})` : ''}.
        {currentVersion ? ` You’re on v${currentVersion}.` : ''}
      </Text>

      {(latestVersion || sizeLabel) && (
        <View style={styles.metaBox}>
          {latestVersion ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Latest</Text>
              <Text style={styles.metaValue}>v{latestVersion}</Text>
            </View>
          ) : null}
          {sizeLabel && sizeLabel !== '—' ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Size</Text>
              <Text style={styles.metaValue}>{sizeLabel}</Text>
            </View>
          ) : null}
        </View>
      )}

      {releaseNotes ? (
        <Text style={styles.notes} numberOfLines={4}>
          {releaseNotes}
        </Text>
      ) : null}

      <TouchableOpacity style={styles.primaryBtn} onPress={onDownload} activeOpacity={0.88}>
        <MaterialCommunityIcons
          name={isIos ? 'open-in-new' : 'download'}
          size={18}
          color={COLORS.white}
        />
        <Text style={styles.primaryText}>{isIos ? 'Open download page' : 'Download update'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.laterBtn} onPress={onClose} activeOpacity={0.8}>
        <Text style={styles.laterText}>Later</Text>
      </TouchableOpacity>
    </CenterDialog>
  );
}

const styles = StyleSheet.create({
  cardPad: {
    paddingTop: 18,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  iconWrap: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.purpleSoft,
    borderWidth: 1,
    borderColor: PAGE.borderAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  title: {
    ...TEXT.h3,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 18,
  },
  message: {
    ...TEXT.body,
    color: PAGE.muted,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 13,
    marginBottom: 12,
  },
  metaBox: {
    backgroundColor: PAGE.cardAlt,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: PAGE.border,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    ...TEXT.label,
    color: PAGE.mutedDim,
    fontSize: 12,
  },
  metaValue: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.white,
  },
  notes: {
    ...TEXT.body,
    color: PAGE.mutedDim,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginBottom: 14,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PAGE.green,
    borderRadius: 12,
    paddingVertical: 12,
    minHeight: 46,
  },
  primaryText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.white,
  },
  laterBtn: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 8,
  },
  laterText: {
    ...TEXT.label,
    fontFamily: FONTS.semiBold,
    color: PAGE.muted,
    fontSize: 13,
  },
});
