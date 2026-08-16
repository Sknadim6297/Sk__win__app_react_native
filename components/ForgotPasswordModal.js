import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CenterDialog from './CenterDialog';
import { authService } from '../services/api';
import { COLORS, FONTS, TEXT } from '../styles/theme';
import { PAGE } from '../styles/pageTheme';

const CHANNELS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp', color: '#25D366' },
  { id: 'sms', label: 'SMS', icon: 'message-text', color: '#38BDF8' },
  { id: 'email', label: 'Email', icon: 'email-outline', color: '#A78BFA' },
];

function OtpBoxes({ value, onChange, disabled }) {
  const refs = useRef([]);
  const digits = String(value || '').replace(/\D/g, '').slice(0, 6).split('');

  const setAt = (index, char) => {
    const next = [...Array(6)].map((_, i) => (i === index ? char : digits[i] || ''));
    const joined = next.join('').replace(/\D/g, '').slice(0, 6);
    onChange(joined);
    if (char && index < 5) refs.current[index + 1]?.focus();
  };

  return (
    <View style={styles.otpRow}>
      {Array.from({ length: 6 }).map((_, i) => (
        <TextInput
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          style={[styles.otpBox, digits[i] ? styles.otpBoxFilled : null]}
          value={digits[i] || ''}
          onChangeText={(t) => {
            const last = t.replace(/\D/g, '').slice(-1);
            setAt(i, last);
          }}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === 'Backspace' && !digits[i] && i > 0) {
              refs.current[i - 1]?.focus();
            }
          }}
          keyboardType="number-pad"
          maxLength={1}
          editable={!disabled}
          selectTextOnFocus
        />
      ))}
    </View>
  );
}

export default function ForgotPasswordModal({ visible, onClose, initialEmail = '' }) {
  const [step, setStep] = useState('identify');
  const [channel, setChannel] = useState('whatsapp');
  const [identifier, setIdentifier] = useState(initialEmail);
  const [accountEmail, setAccountEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugOtp, setDebugOtp] = useState('');

  useEffect(() => {
    if (visible) {
      setStep('identify');
      setChannel('whatsapp');
      setIdentifier(String(initialEmail || '').trim());
      setAccountEmail('');
      setOtp('');
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setResetToken('');
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

  const requestReset = async () => {
    const trimmed = String(identifier || '').trim();
    if (!trimmed) {
      setError('Enter your email or mobile number');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await authService.forgotPassword(trimmed, channel);
      setAccountEmail(data.email || (trimmed.includes('@') ? trimmed.toLowerCase() : ''));
      setHint(data.message || 'OTP sent. Check WhatsApp, SMS, or email.');
      if (data.debugOtp) setDebugOtp(String(data.debugOtp));
      setStep('otp');
    } catch (err) {
      setError(err.message || 'Could not send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.trim().length !== 6) {
      setError('Enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await authService.verifyAdminOtp(accountEmail, otp.trim());
      setResetToken(data.resetToken);
      setHint(data.message || 'Set a new password');
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
        email: accountEmail,
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
    step === 'otp'
      ? 'Enter OTP'
      : step === 'password'
        ? 'New Password'
        : step === 'done'
          ? 'Password Updated'
          : 'Forgot Password';

  const channelMeta = CHANNELS.find((c) => c.id === channel) || CHANNELS[0];

  return (
    <CenterDialog visible={visible} onClose={close} dismissOnOverlay={!loading} maxWidth={420}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[styles.iconWrap, step === 'done' && styles.iconWrapDone]}>
          <MaterialCommunityIcons
            name={step === 'done' ? 'check-bold' : step === 'otp' ? channelMeta.icon : 'lock-reset'}
            size={32}
            color={step === 'done' ? '#34D399' : channelMeta.color}
          />
        </View>
        <Text style={styles.title}>{title}</Text>

        {step === 'identify' && (
          <>
            <Text style={styles.message}>
              Enter your email or mobile. We will send a 6-digit OTP on WhatsApp, SMS, or email.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Email or mobile number"
              placeholderTextColor={COLORS.grayDim}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
            <Text style={styles.channelLabel}>Send OTP via</Text>
            <View style={styles.channelRow}>
              {CHANNELS.map((item) => {
                const active = channel === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.channelChip, active && styles.channelChipActive]}
                    onPress={() => setChannel(item.id)}
                    activeOpacity={0.85}
                    disabled={loading}
                  >
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={20}
                      color={active ? item.color : PAGE.muted}
                    />
                    <Text style={[styles.channelText, active && styles.channelTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
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
                <Text style={styles.primaryText}>Send OTP</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {step === 'otp' && (
          <>
            <Text style={styles.message}>{hint || 'Enter the 6-digit code we sent you.'}</Text>
            {!!debugOtp && <Text style={styles.debugHint}>Dev OTP: {debugOtp}</Text>}
            <OtpBoxes value={otp} onChange={setOtp} disabled={loading} />
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
            <TouchableOpacity style={styles.linkBtn} onPress={requestReset} disabled={loading} activeOpacity={0.8}>
              <Text style={styles.linkText}>Resend OTP</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'password' && (
          <>
            <Text style={styles.message}>{hint || 'Choose a new password for this account.'}</Text>
            <TextInput
              style={styles.input}
              placeholder="New password"
              placeholderTextColor={COLORS.grayDim}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!loading}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm password"
              placeholderTextColor={COLORS.grayDim}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              editable={!loading}
            />
            <TouchableOpacity style={styles.linkBtn} onPress={() => setShowPassword((v) => !v)}>
              <Text style={styles.linkText}>{showPassword ? 'Hide password' : 'Show password'}</Text>
            </TouchableOpacity>
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
            <Text style={styles.message}>Password updated. You can login with your new password now.</Text>
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
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: PAGE.cardAlt,
    borderWidth: 1,
    borderColor: PAGE.borderAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconWrapDone: {
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    borderColor: 'rgba(52, 211, 153, 0.35)',
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
    backgroundColor: PAGE.cardAlt,
    borderWidth: 1,
    borderColor: PAGE.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 15,
    marginBottom: 10,
  },
  channelLabel: {
    ...TEXT.label,
    color: PAGE.muted,
    marginBottom: 8,
    marginTop: 4,
  },
  channelRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  channelChip: {
    flex: 1,
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PAGE.border,
    backgroundColor: PAGE.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  channelChipActive: {
    borderColor: PAGE.borderAccent,
    backgroundColor: 'rgba(91, 57, 168, 0.28)',
  },
  channelText: {
    ...TEXT.labelSm,
    fontFamily: FONTS.bold,
    color: PAGE.muted,
  },
  channelTextActive: {
    color: COLORS.white,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 14,
  },
  otpBox: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PAGE.border,
    backgroundColor: PAGE.cardAlt,
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 22,
    textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: PAGE.accent,
    backgroundColor: 'rgba(123, 97, 255, 0.16)',
  },
  error: {
    ...TEXT.label,
    color: '#F87171',
    textAlign: 'center',
    marginBottom: 8,
  },
  debugHint: {
    ...TEXT.label,
    color: PAGE.gold,
    textAlign: 'center',
    marginBottom: 8,
  },
  primaryBtn: {
    backgroundColor: PAGE.green,
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
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
    color: PAGE.cyan,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    ...TEXT.body,
    color: PAGE.muted,
  },
});
