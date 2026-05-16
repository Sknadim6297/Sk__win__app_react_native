import React from 'react';
import { Text } from 'react-native';
import { TYPO } from '../../styles/typography';

const VARIANTS = {
  display: TYPO.display,
  h1: TYPO.h1,
  h2: TYPO.h2,
  h3: TYPO.h3,
  bodyLg: TYPO.bodyLg,
  body: TYPO.body,
  bodyMedium: TYPO.bodyMedium,
  label: TYPO.label,
  labelSm: TYPO.labelSm,
  caption: TYPO.caption,
  overline: TYPO.overline,
  button: TYPO.button,
  buttonSm: TYPO.buttonSm,
  stat: TYPO.stat,
  tabLabel: TYPO.tabLabel,
};

/**
 * Premium readable text with Poppins / Rajdhani hierarchy.
 */
export default function AppText({
  variant = 'body',
  style,
  children,
  ...props
}) {
  return (
    <Text style={[VARIANTS[variant] || TYPO.body, style]} {...props}>
      {children}
    </Text>
  );
}
