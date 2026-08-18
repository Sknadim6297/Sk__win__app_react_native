import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AuthBackground from '../components/auth/AuthBackground';
import AuthTextField from '../components/auth/AuthTextField';
import PrimaryButton from '../components/auth/PrimaryButton';
import { authService } from '../services/api';
import { COLORS, TYPO } from '../styles/theme';
import { PAGE } from '../styles/pageTheme';

const TARGET_ADMIN_EMAIL = 'sknadim6297@gmail.com';

export default function AdminForgotPasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState(TARGET_ADMIN_EMAIL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isEmailValid = useMemo(() => String(email).trim().includes('@'), [email]);

  const onSend = async () => {
    setError('');
    setSuccess('');
    const trimmed = String(email || '').trim();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Enter a valid email address');
      return;
    }
    setLoading(true);
    try {
      await authService.adminForgotPassword({ email: trimmed });
      setSuccess('If the admin account exists, a reset link has been sent.');
    } catch (e) {
      setError(e?.message || 'Failed to send reset link');
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
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>Reset link will be sent to your admin email.</Text>

          <AuthTextField
            icon="at"
            placeholder="Admin email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.success}>{success}</Text> : null}

          <PrimaryButton
            label={loading ? 'PLEASE WAIT...' : 'SEND RESET LINK'}
            onPress={onSend}
            disabled={loading || !isEmailValid}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('Auth', { mode: 'login' })}
            style={styles.back}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Text style={styles.backText}>Back to Login</Text>
          </TouchableOpacity>
          {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 10 }} /> : null}
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

