import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../styles/theme';

/**
 * Lightweight select (no native Picker) — used by admin forms to keep APK smaller.
 * API mirrors the common RNPickerSelect props we use.
 */
function resolvePickerStyle(style) {
  if (!style || typeof style !== 'object' || Array.isArray(style)) {
    return { trigger: style, placeholder: null };
  }
  const hasPickerKeys =
    style.inputAndroid != null ||
    style.inputIOS != null ||
    style.inputWeb != null ||
    style.placeholder != null;
  if (!hasPickerKeys) return { trigger: style, placeholder: null };
  return {
    trigger: style.inputAndroid || style.inputIOS || style.inputWeb || null,
    placeholder: style.placeholder || null,
  };
}

export default function SimpleSelect({
  value,
  onValueChange,
  items = [],
  placeholder,
  disabled = false,
  style,
  textInputProps,
}) {
  const [open, setOpen] = useState(false);
  const options = useMemo(
    () => (Array.isArray(items) ? items.filter((i) => i && i.value != null) : []),
    [items]
  );
  const selected = options.find((i) => String(i.value) === String(value));
  const label =
    selected?.label ||
    placeholder?.label ||
    (typeof placeholder === 'string' ? placeholder : 'Select…');
  const isPlaceholder = !selected;
  const { trigger: triggerStyle, placeholder: placeholderStyle } = resolvePickerStyle(style);

  return (
    <>
      <Pressable
        style={[styles.trigger, disabled && styles.triggerDisabled, triggerStyle]}
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
      >
        <Text
          style={[
            styles.triggerText,
            isPlaceholder && styles.placeholder,
            isPlaceholder && placeholderStyle,
            textInputProps?.style,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color={COLORS.gray} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{placeholder?.label || 'Select'}</Text>
            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              {options.map((item) => {
                const active = String(item.value) === String(value);
                return (
                  <Pressable
                    key={String(item.value)}
                    style={[styles.option, active && styles.optionActive]}
                    onPress={() => {
                      onValueChange?.(item.value);
                      setOpen(false);
                    }}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>
                      {item.label}
                    </Text>
                    {active ? (
                      <MaterialCommunityIcons name="check" size={18} color={COLORS.purple} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={styles.cancelBtn} onPress={() => setOpen(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderDark || 'rgba(255,255,255,0.12)',
    backgroundColor: COLORS.surfaceDark || '#151D36',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  triggerDisabled: { opacity: 0.55 },
  triggerText: {
    flex: 1,
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 14,
  },
  placeholder: { color: COLORS.gray },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  sheet: {
    maxHeight: '70%',
    borderRadius: 16,
    backgroundColor: '#121826',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 14,
  },
  sheetTitle: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 15,
    marginBottom: 10,
  },
  list: { maxHeight: 360 },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  optionActive: { backgroundColor: COLORS.purpleSoft },
  optionText: { color: COLORS.gray, fontFamily: FONTS.bold, fontSize: 14, flex: 1 },
  optionTextActive: { color: COLORS.white },
  cancelBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  cancelText: { color: COLORS.gray, fontFamily: FONTS.bold },
});
