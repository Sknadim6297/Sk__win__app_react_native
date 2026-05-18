import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Pressable,
} from 'react-native';
import { BlurView } from 'expo-blur';
import AppIcon from './ui/AppIcon';
import { COLORS, FONTS } from '../styles/theme';
import { formatScheduleLine } from '../utils/tournamentHelpers';

const CYAN = '#00E5FF';

export default function JoinConfirmModal({
  visible,
  tournament,
  entryFee,
  remainingBalance,
  loading,
  onConfirm,
  onCancel,
}) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 8 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(0.9);
      opacity.setValue(0);
    }
  }, [visible, scale, opacity]);

  if (!tournament) return null;

  const prizePool =
    Number(tournament.prizePool) ||
    (Number(tournament.prizes?.first || 0) +
      Number(tournament.prizes?.second || 0) +
      Number(tournament.prizes?.third || 0));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <Animated.View style={[styles.cardWrap, { opacity, transform: [{ scale }] }]}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.card}>
              <View style={styles.iconRing}>
                <AppIcon name="trophy" size={28} color={CYAN} />
              </View>
              <Text style={styles.title}>Confirm Join</Text>
              <Text style={styles.subtitle}>Are you sure you want to join this match?</Text>

              <View style={styles.rows}>
                <Row label="Tournament" value={tournament.name} />
                <Row label="Entry Fee" value={`₹${entryFee}`} highlight />
                <Row label="Prize Pool" value={`₹${prizePool}`} />
                <Row label="Match Time" value={formatScheduleLine(tournament.startDate)} />
                <Row label="Remaining Balance" value={`₹${remainingBalance}`} />
              </View>

              <View style={styles.actions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={loading}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#050510" />
                  ) : (
                    <Text style={styles.confirmText}>Confirm Join</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function Row({ label, value, highlight }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.rowValueHighlight]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 20,
  },
  cardWrap: { width: '100%', maxWidth: 400 },
  card: {
    backgroundColor: '#121A28',
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.25)',
  },
  iconRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,229,255,0.12)',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.white,
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
    fontSize: 13,
  },
  rows: { gap: 10, marginBottom: 20 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  rowLabel: { color: COLORS.gray, fontSize: 13, flex: 1 },
  rowValue: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 14, flex: 1.2, textAlign: 'right' },
  rowValueHighlight: { color: CYAN, fontSize: 16 },
  actions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#2a3140',
    alignItems: 'center',
  },
  cancelText: { color: COLORS.white, fontFamily: FONTS.bold },
  confirmBtn: {
    flex: 1.2,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: CYAN,
    alignItems: 'center',
  },
  confirmText: { color: '#050510', fontFamily: FONTS.bold, letterSpacing: 0.3 },
});
