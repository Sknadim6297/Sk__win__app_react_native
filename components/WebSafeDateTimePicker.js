import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../styles/theme';

function pad(n) {
  return String(n).padStart(2, '0');
}

/** datetime-local value: YYYY-MM-DDTHH:mm */
export function toDatetimeLocalValue(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Native DateTimePicker on iOS/Android; HTML datetime-local on web (native picker unsupported).
 */
export default function WebSafeDateTimePicker({
  value,
  onChange,
  mode = 'datetime',
  display,
  style,
}) {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();

  if (Platform.OS === 'web') {
    const inputType = mode === 'date' ? 'date' : mode === 'time' ? 'time' : 'datetime-local';
    return (
      <View style={[styles.webWrap, style]}>
        {React.createElement('input', {
          type: inputType,
          value: toDatetimeLocalValue(date),
          onChange: (e) => {
            const raw = e?.target?.value;
            if (!raw) return;
            const next = new Date(raw);
            if (!Number.isNaN(next.getTime())) {
              onChange?.({ type: 'set' }, next);
            }
          },
          style: {
            width: '100%',
            minHeight: 44,
            padding: '10px 12px',
            borderRadius: 10,
            border: `1px solid ${COLORS.gray}55`,
            backgroundColor: COLORS.lightGray || '#1a1f38',
            color: COLORS.white,
            fontSize: 15,
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          },
        })}
      </View>
    );
  }

  return (
    <DateTimePicker
      value={Number.isNaN(date.getTime()) ? new Date() : date}
      mode={mode}
      display={display || (Platform.OS === 'ios' ? 'spinner' : 'default')}
      onChange={onChange}
    />
  );
}

const styles = StyleSheet.create({
  webWrap: {
    marginTop: 8,
    width: '100%',
  },
});
