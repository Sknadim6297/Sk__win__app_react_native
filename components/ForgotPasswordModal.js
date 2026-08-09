import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Linking,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CenterDialog from './CenterDialog';
import { authService } from '../services/api';
import { SUPPORT_CONTACTS } from '../constants/supportContacts';
import { COLORS, FONTS, TEXT } from '../styles/theme';

/**
 * Forgot password:
 * - Players → contact support (phone + email)
 * - Admins → email OTP → set new password
 */
export default function ForgotPasswordModal({ visible, onClose, initialEmail = '' }) {
  const [step, setStep] = useState('email'); // email | contact | otp | password | done
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [support, setSupport] = useState(SUPPORT_CONTACTS);
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugOtp, setDebugOtp] = useState('');

  useEffect(() => {
    if (visible) {
      setStep('email');
      setEmail(String(initialEmail || '').trim());
      setOtp('');
      setPassword('');
      setConfirmPassword('');
      setResetToken('');
      setSupport(SUPPORT_CONTACTS);
      setHint('');
      setError('');
      setDebugOtp('');
      setLoading(false);
    }
  }, [visible, initialEmail]);

  const close = () => {
    if (loading) return;
    onClose?.();
  };

  const openMail = () => {
    const to = support.email || SUPPORT_CONTACTS.email;
    Linking.openURL(`mailto:${to}?subject=${encodeURIComponent('WAREZONE — Forgot Password')}`);
  };

  const openPhone = () => {
    const phone = String(support.phone || SUPPORT_CONTACTS.phone).replace(/\s/g, '');
    Linking.openURL(`tel:${phone}`);
  };

  const requestReset = async () => {
    const trimmed = String(email || '').trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Please enter a valid email');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await authService.forgotPassword(trimmed);
      setEmail(trimmed);
      if (data.type === 'admin') {
        setHint(data.message || 'OTP sent to your email');
        if (data.debugOtp) setDebugOtp(String(data.debugOtp));
        setStep('otp');
      } else {
        setSupport({
          ...SUPPORT_CONTACTS,
          ...(data.support || {}),
          phoneDisplay: data.support?.phone || SUPPORT_CONTACTS.phoneDisplay,
        });
        setHint(data.message || '');
        setStep('contact');
      }
    } catch (err) {
      setError(err.message || 'Could not start password reset');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp.trim()) {
      setError('Enter the OTP from your email');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await authService.verifyAdminOtp(email, otp.trim());
      setResetToken(data.resetToken);
      setHint(data.message || 'Set your new password');
      setStep('password');
    } catch (err) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const submitNewPassword = async () => {
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authService.resetAdminPassword({
        email,
        resetToken,
        password,
        confirmPassword,
      });
      setStep('done');
    } catch (err) {
      setError(err.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  const title =
    step === 'contact'
      ? 'Contact Support'
      : step === 'otp'
        ? 'Verify OTP'
        : step === 'password'
          ? 'New Password'
          : step === 'done'
            ? 'Password Updated'
            : 'Forgot Password';

  return (
    <CenterDialog visible={visible} onClose={close} dismissOnOverlay={!loading} maxWidth={420}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons
            name={
              step === 'contact'
                ? 'headset'
                : step === 'done'
                  ? 'check-circle-outline'
                  : 'lock-reset'
            }
            size={34}
            color={step === 'done' ? '#34D399' : COLORS.primary}
          />
        </View>
        <Text style={styles.title}>{title}</Text>

        {step === 'email' && (
          <>
            <Text style={styles.message}>
              Enter your account email. Admins get a fast email OTP. Players must contact the team.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={COLORS.grayDim}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
            {!!error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.btnDisabled]}
              onPress={requestReset}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.primaryText}>Continue</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {step === 'contact' && (
          <>
            <Text style={styles.message}>
              {hint ||
                'Password reset for players is handled by our team. Please contact support with your registered email.'}
            </Text>
            <View style={styles.metaBox}>
              <Text style={styles.teamLabel}>{support.teamLabel || SUPPORT_CONTACTS.teamLabel}</Text>
              <TouchableOpacity style={styles.contactRow} onPress={openMail} activeOpacity={0.85}>
                <MaterialCommunityIcons name="email-outline" size={20} color={COLORS.primary} />
                <Text style={styles.contactValue}>{support.email || SUPPORT_CONTACTS.email}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.contactRow} onPress={openPhone} activeOpacity={0.85}>
                <MaterialCommunityIcons name="phone-outline" size={20} color={COLORS.primary} />
                <Text style={styles.contactValue}>
                  {support.phoneDisplay || support.phone || SUPPORT_CONTACTS.phoneDisplay}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={openMail} activeOpacity={0.88}>
              <MaterialCommunityIcons name="email-fast-outline" size={18} color={COLORS.white} />
              <Text style={styles.primaryText}>Email Team</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={openPhone} activeOpacity={0.88}>
              <MaterialCommunityIcons name="phone" size={18} color={COLORS.white} />
              <Text style={styles.primaryText}>Call Team</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'otp' && (
          <>
            <Text style={styles.message}>{hint || 'Enter the 6-digit OTP sent to your admin email.'}</Text>
            {!!debugOtp && (
              <Text style={styles.debugHint}>Dev OTP: {debugOtp}</Text>
            )}
            <TextInput
              style={styles.input}
              placeholder="6-digit OTP"
              placeholderTextColor={COLORS.grayDim}
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              editable={!loading}
            />
            {!!error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.btnDisabled]}
              onPress={verifyOtp}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.primaryText}>Verify OTP</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={requestReset}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.linkText}>Resend OTP</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'password' && (
          <>
            <Text style={styles.message}>{hint || 'Choose a new admin password.'}</Text>
            <TextInput
              style={styles.input}
              placeholder="New password"
              placeholderTextColor={COLORS.grayDim}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm password"
              placeholderTextColor={COLORS.grayDim}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!loading}
            />
            {!!error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.btnDisabled]}
              onPress={submitNewPassword}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.primaryText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {step === 'done' && (
          <>
            <Text style={styles.message}>Admin password updated. You can login with your new password.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={close} activeOpacity={0.88}>
              <Text style={styles.primaryText}>Back to Login</Text>
            </TouchableOpacity>
          </>
        )}

        {step !== 'done' && (
          <TouchableOpacity style={styles.cancelBtn} onPress={close} disabled={loading} activeOpacity={0.8}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </CenterDialog>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignSelf: 'center',
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    ...TEXT.h3,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    ...TEXT.body,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 14,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.white,
    fontFamily: FONTS.regular,
    fontSize: 15,
    marginBottom: 10,
  },
  error: {
    ...TEXT.label,
    color: '#F87171',
    textAlign: 'center',
    marginBottom: 8,
  },
  debugHint: {
    ...TEXT.label,
    color: '#FBBF24',
    textAlign: 'center',
    marginBottom: 8,
  },
  metaBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  teamLabel: {
    ...TEXT.label,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactValue: {
    ...TEXT.body,
    color: COLORS.white,
    flexShrink: 1,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  btnDisabled: { opacity: 0.7 },
  primaryText: {
    ...TEXT.bodyMedium,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  linkBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  linkText: {
    ...TEXT.label,
    color: COLORS.primary,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  cancelText: {
    ...TEXT.body,
    color: COLORS.gray,
  },
});
