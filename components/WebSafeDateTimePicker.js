import React, { useRef, useState } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../styles/theme';

function pad(n) {
  return String(n).padStart(2, '0');
}

function toSafeDate(value) {
  const d = value instanceof Date ? value : value ? new Date(value) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function mergeDateAndTime(datePart, timePart) {
  const next = new Date(datePart);
  next.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);
  return next;
}

/** datetime-local value: YYYY-MM-DDTHH:mm */
export function toDatetimeLocalValue(date) {
  if (!date) return '';
  const d = toSafeDate(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Native pickers on iOS/Android; HTML datetime-local on web.
 * Android has no combined datetime dialog — date then time, and cancel is a no-op.
 */
export default function WebSafeDateTimePicker({
  value,
  onChange,
  mode = 'datetime',
  display,
  style,
}) {
  const date = toSafeDate(value);
  const pendingDate = useRef(date);
  const [androidStep, setAndroidStep] = useState(mode === 'time' ? 'time' : 'date');

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

  const nativeMode =
    Platform.OS === 'android' && mode === 'datetime' ? androidStep : mode === 'datetime' && Platform.OS !== 'ios' ? 'date' : mode;

  const handleChange = (event, selectedDate) => {
    if (event?.type === 'dismissed' || !selectedDate) {
      onChange?.({ type: 'dismissed' }, undefined);
      return;
    }

    if (Platform.OS === 'android' && mode === 'datetime' && androidStep === 'date') {
      pendingDate.current = selectedDate;
      setAndroidStep('time');
      return;
    }

    if (Platform.OS === 'android' && mode === 'datetime' && androidStep === 'time') {
      onChange?.({ type: 'set' }, mergeDateAndTime(pendingDate.current, selectedDate));
      return;
    }

    onChange?.(event, selectedDate);
  };

  return (
    <DateTimePicker
      key={nativeMode}
      value={androidStep === 'time' ? pendingDate.current : date}
      mode={nativeMode}
      display={display || (Platform.OS === 'ios' ? 'spinner' : 'default')}
      is24Hour
      onChange={handleChange}
    />
  );
}

const styles = StyleSheet.create({
  webWrap: {
    marginTop: 8,
    width: '100%',
  },
});
