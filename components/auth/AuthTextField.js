import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, TYPO, ICON } from '../../styles/theme';
import AppIcon from '../ui/AppIcon';

const AnimatedView = Animated.createAnimatedComponent(View);

export default function AuthTextField({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
  rightLabel,
  onRightPress,
}) {
  const [focused, setFocused] = useState(false);
  const focus = useSharedValue(0);

  const onFocus = () => {
    setFocused(true);
    focus.value = withTiming(1, { duration: 200 });
  };

  const onBlur = () => {
    setFocused(false);
    focus.value = withTiming(0, { duration: 200 });
  };

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focus.value,
      [0, 1],
      [COLORS.borderDark, COLORS.borderDarkFocus]
    ),
  }));

  return (
    <AnimatedView style={[styles.wrap, borderStyle]}>
      {icon ? (
        <AppIcon name={icon} size="sm" color={focused ? COLORS.purple : COLORS.gray} />
      ) : null}
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="rgba(148, 163, 184, 0.65)"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      {rightLabel ? (
        <TouchableOpacity onPress={onRightPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.rightLabel}>{rightLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 14,
    minHeight: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  input: {
    flex: 1,
    ...TYPO.body,
    color: COLORS.white,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  rightLabel: {
    ...TYPO.labelSm,
    color: COLORS.gray,
  },
});
