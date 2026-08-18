import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AuthBackground from '../components/auth/AuthBackground';
import AuthTextField from '../components/auth/AuthTextField';
import PrimaryButton from '../components/auth/PrimaryButton';
import { COLORS, TYPO } from '../styles/theme';
import { PAGE } from '../styles/pageTheme';
import { authService } from '../services/api';

export default function AdminResetPasswordScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const token = String(route?.params?.token || '').trim();

  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const passwordRules = useMemo(() => {
    const pwdLenOk = newPassword.length >= 8;
    const matchOk = newPassword && confirmPassword && newPassword === confirmPassword;
    return { pwdLenOk, matchOk };
  }, [newPassword, confirmPassword]);

  const onReset = async () => {
    setError('');
    setSuccess('');

    if (!token) {
      setError('Reset token is missing. Please request a new reset link.');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authService.adminResetPassword({
        token,
        password: newPassword,
        passwordConfirmation: confirmPassword,
      });
      setSuccess('Password updated. Please login with your new password.');
      navigation.navigate('Auth', { mode: 'login' });
    } catch (e) {
      setError(e?.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <AuthBackground />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Reset Admin Password</Text>

          <Text style={styles.subtitle}>Set a new password for your admin account.</Text>

          <AuthTextField
            icon="lock-outline"
            placeholder="New password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showPassword}
            keyboardType="default"
            rightLabel={showPassword ? 'Hide' : 'Show'}
            onRightPress={() => setShowPassword((v) => !v)}
          />

          <AuthTextField
            icon="lock-check-outline"
            placeholder="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
          />

          {!error && (!passwordRules.pwdLenOk || !passwordRules.matchOk) && (newPassword.length > 0 || confirmPassword.length > 0) ? (
            <Text style={styles.hint}>
              {newPassword.length > 0 && !passwordRules.pwdLenOk ? 'Min 8 characters.' : null}
              {newPassword.length > 0 && confirmPassword.length > 0 && passwordRules.pwdLenOk && !passwordRules.matchOk
                ? ' Passwords must match.'
                : null}
            </Text>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.success}>{success}</Text> : null}

          <PrimaryButton
            label={loading ? 'PLEASE WAIT...' : 'UPDATE PASSWORD'}
            onPress={onReset}
            disabled={loading}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('Auth', { mode: 'login' })}
            style={styles.back}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Text style={styles.backText}>Back to Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.backgroundDark },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 26, width: '100%' },
  title: {
    ...TYPO.display,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    ...TYPO.body,
    color: PAGE.muted,
    textAlign: 'center',
    marginBottom: 22,
  },
  hint: {
    ...TYPO.label,
    color: PAGE.cyan,
    textAlign: 'center',
    marginBottom: 12,
  },
  error: {
    ...TYPO.body,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: 10,
  },
  success: {
    ...TYPO.body,
    color: COLORS.success,
    textAlign: 'center',
    marginBottom: 10,
  },
  back: { marginTop: 16, alignItems: 'center' },
  backText: { ...TYPO.label, color: COLORS.purple },
});

