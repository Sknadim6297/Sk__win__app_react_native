import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ONBOARDING } from '../../styles/onboardingTheme';

const STEPS = 4;
const ACTIVE_INDEX = 0;

export default function StepProgress() {
  return (
    <View style={styles.row}>
      {Array.from({ length: STEPS }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.pill,
            index === ACTIVE_INDEX ? styles.pillActive : styles.pillInactive,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  pill: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  pillActive: {
    backgroundColor: ONBOARDING.colors.purple,
    width: 52,
  },
  pillInactive: {
    backgroundColor: ONBOARDING.colors.primary,
    opacity: 0.85,
  },
});
