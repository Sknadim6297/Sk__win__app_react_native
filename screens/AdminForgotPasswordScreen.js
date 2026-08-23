import React from 'react';
import { View, StyleSheet } from 'react-native';
import AuthBackground from '../components/auth/AuthBackground';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import { COLORS } from '../styles/theme';

const TARGET_ADMIN_EMAIL = 'sknadim6297@gmail.com';

/**
 * Admin forgot password uses the same Email OTP flow as players.
 */
export default function AdminForgotPasswordScreen({ navigation }) {
  return (
    <View style={styles.root}>
      <AuthBackground />
      <ForgotPasswordModal
        visible
        initialEmail={TARGET_ADMIN_EMAIL}
        onClose={() => navigation.navigate('Auth', { mode: 'login' })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.backgroundDark },
});
