import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CenterDialog from './CenterDialog';
import { COLORS, FONTS, TEXT } from '../styles/theme';

/**
 * Centered Add Coins dialog — keyboard-safe, professional layout.
 */
export default function AddCoinsModal({
  visible,
  onClose,
  amount,
  onChangeAmount,
  onSubmit,
  processing = false,
  title = 'Add Coins',
  hint = 'Enter amount to add to your wallet (₹10 – ₹10,000)',
  submitLabel = 'Add Coins',
  quickAmounts = [100, 500, 1000, 2000],
}) {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return (
    <CenterDialog
      visible={visible}
      onClose={processing ? undefined : onClose}
      dismissOnOverlay={!processing}
      style={keyboardOpen ? styles.cardLift : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name="wallet-plus" size={26} color="#00B368" />
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={12} disabled={processing}>
            <MaterialCommunityIcons name="close" size={22} color={COLORS.gray} />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.hint}>{hint}</Text>

        <View style={styles.inputWrap}>
          <Text style={styles.currency}>₹</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor="#64748B"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={onChangeAmount}
            editable={!processing}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
            autoFocus={false}
          />
        </View>

        {quickAmounts?.length > 0 ? (
          <View style={styles.quickRow}>
            {quickAmounts.map((val) => {
              const active = String(amount) === String(val);
              return (
                <TouchableOpacity
                  key={val}
                  style={[styles.quickBtn, active && styles.quickBtnActive]}
                  onPress={() => onChangeAmount(String(val))}
                  disabled={processing}
                >
                  <Text style={[styles.quickText, active && styles.quickTextActive]}>₹{val}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.submitBtn, processing && styles.submitDisabled]}
          onPress={onSubmit}
          disabled={processing}
          activeOpacity={0.88}
        >
          {processing ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitText}>{submitLabel}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={processing}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </CenterDialog>
  );
}

const styles = StyleSheet.create({
  cardLift: { marginBottom: 24 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(0,179,104,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...TEXT.h3,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    marginTop: 8,
    marginBottom: 6,
  },
  hint: {
    ...TEXT.body,
    color: COLORS.gray,
    marginBottom: 16,
    lineHeight: 20,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B0E1E',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16,
    minHeight: 56,
  },
  currency: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.gray,
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 22,
    paddingVertical: 12,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  quickBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  quickBtnActive: {
    backgroundColor: 'rgba(0,179,104,0.18)',
    borderColor: '#00B368',
  },
  quickText: {
    ...TEXT.labelSm,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
  },
  quickTextActive: { color: '#4ADE80' },
  submitBtn: {
    marginTop: 18,
    backgroundColor: '#00B368',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  submitDisabled: { opacity: 0.65 },
  submitText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.white,
  },
  cancelBtn: {
    marginTop: 10,
    alignItems: 'center',
    padding: 10,
  },
  cancelText: {
    ...TEXT.label,
    color: COLORS.gray,
  },
});
