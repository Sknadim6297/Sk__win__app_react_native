import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CenterDialog from './CenterDialog';
import { authService } from '../services/api';
import { COLORS, FONTS, TEXT } from '../styles/theme';
import { PAGE } from '../styles/pageTheme';

const OTP_LEN = 6;

/** Email is live. WhatsApp / SMS stay Coming Soon until providers are configured. */
const CHANNELS = [
  {
    id: 'email',
    label: 'Email',
    icon: 'email-outline',
    color: '#00B368',
    available: true,
    hint: 'OTP to your registered email',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: 'whatsapp',
    color: '#25D366',
    available: false,
    hint: 'Coming soon',
  },
  {
    id: 'sms',
    label: 'SMS',
    icon: 'message-text',
    color: '#38BDF8',
    available: false,
    hint: 'Coming soon',
  },
];

/**
 * One hidden TextInput + 6 fixed visual cells.
 * Avoids multi-input flex collapse on web while typing.
 */
function OtpBoxes({ value, onChange, disabled }) {
  const inputRef = useRef(null);
  const digits = String(value || '').replace(/\D/g, '').slice(0, OTP_LEN);
  const activeIndex = Math.min(digits.length, OTP_LEN - 1);

  useEffect(() => {
    if (!disabled) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [disabled]);

  return (
    <Pressable
      style={styles.otpRow}
      onPress={() => !disabled && inputRef.current?.focus()}
      accessibilityRole="none"
    >
      {Array.from({ length: OTP_LEN }).map((_, i) => {
        const d = digits[i] || '';
        const isActive = !disabled && i === activeIndex && digits.length < OTP_LEN;
        const isComplete = digits.length === OTP_LEN;
        return (
          <View
            key={i}
            style={[
              styles.otpBox,
              d ? styles.otpBoxFilled : null,
              (isActive || (isComplete && i === OTP_LEN - 1)) && styles.otpBoxActive,
            ]}
          >
            <Text style={styles.otpDigit}>{d}</Text>
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        value={digits}
        onChangeText={(t) => onChange(String(t || '').replace(/\D/g, '').slice(0, OTP_LEN))}
        keyboardType="number-pad"
        maxLength={OTP_LEN}
        editable={!disabled}
        autoFocus
        caretHidden
        contextMenuHidden={false}
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        importantForAutofill="yes"
        style={styles.otpHiddenInput}
        accessibilityLabel="Enter 6-digit OTP"
      />
    </Pressable>
  );
}

/**
 * Shared forgot-password for users + admins: Email OTP (live), WhatsApp/SMS Coming Soon.
 */
export default function ForgotPasswordModal({ visible, onClose, initialEmail = '' }) {
  const [step, setStep] = useState('identify');
  const [channel, setChannel] = useState('email');
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
      setChannel('email');
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
    if (channel !== 'email') {
      setError('WhatsApp and SMS OTP are coming soon. Please use Email.');
      setChannel('email');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await authService.forgotPassword(trimmed, 'email');
      setAccountEmail(data.email || (trimmed.includes('@') ? trimmed.toLowerCase() : ''));
      setHint(data.message || 'OTP sent to your email. Enter the 6-digit code.');
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
    if (!accountEmail) {
      setError('Missing account email. Request OTP again.');
      setStep('identify');
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
            name={step === 'done' ? 'check-bold' : step === 'otp' ? 'email-outline' : 'lock-reset'}
            size={30}
            color={step === 'done' ? '#34D399' : channelMeta.color}
          />
        </View>
        <Text style={styles.title}>{title}</Text>

        {step === 'identify' && (
          <>
            <Text style={styles.message}>
              Works for players and admin. Enter your account email (or mobile). We send a 6-digit
              OTP by email.
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
                const locked = !item.available;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.channelChip,
                      active && !locked && styles.channelChipActive,
                      locked && styles.channelChipLocked,
                    ]}
                    onPress={() => {
                      if (locked) {
                        setError(`${item.label} OTP is coming soon. Use Email for now.`);
                        setChannel('email');
                        return;
                      }
                      setError('');
                      setChannel(item.id);
                    }}
                    activeOpacity={0.85}
                    disabled={loading}
                  >
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={20}
                      color={locked ? PAGE.mutedDim : active ? item.color : PAGE.muted}
                    />
                    <Text
                      style={[
                        styles.channelText,
                        active && !locked && styles.channelTextActive,
                        locked && styles.channelTextLocked,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {locked ? <Text style={styles.soonBadge}>SOON</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.channelHint}>Email OTP is live. WhatsApp & SMS coming soon.</Text>

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
                <Text style={styles.primaryText}>Send email OTP</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {step === 'otp' && (
          <>
            <Text style={styles.message}>{hint || 'Enter the 6-digit code from your email.'}</Text>
            {!!accountEmail && (
              <Text style={styles.otpTarget}>
                Code sent to{' '}
                <Text style={styles.otpTargetEmail}>{accountEmail}</Text>
              </Text>
            )}
            {!!debugOtp && <Text style={styles.debugHint}>Dev OTP: {debugOtp}</Text>}
            <OtpBoxes value={otp} onChange={setOtp} disabled={loading} />
            <Text style={styles.otpProgress}>
              {String(otp || '').replace(/\D/g, '').length}/{OTP_LEN}
            </Text>
            {!!error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (loading || String(otp || '').replace(/\D/g, '').length !== OTP_LEN) && styles.btnDisabled,
              ]}
              onPress={verifyOtp}
              disabled={loading || String(otp || '').replace(/\D/g, '').length !== OTP_LEN}
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
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.inputInner}
                placeholder="New password"
                placeholderTextColor={COLORS.grayDim}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={PAGE.muted}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.inputInner}
                placeholder="Confirm password"
                placeholderTextColor={COLORS.grayDim}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
            </View>
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
            <Text style={styles.message}>
              Password updated successfully. You can login with your new password now.
            </Text>
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
    backgroundColor: 'rgba(0, 179, 104, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 179, 104, 0.35)',
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
    lineHeight: 21,
    marginBottom: 14,
    fontSize: 13,
  },
  input: {
    backgroundColor: PAGE.cardAlt,
    borderWidth: 1,
    borderColor: PAGE.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: COLORS.white,
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    marginBottom: 10,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PAGE.cardAlt,
    borderWidth: 1,
    borderColor: PAGE.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    minHeight: 52,
  },
  inputInner: {
    flex: 1,
    color: COLORS.white,
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    paddingVertical: 12,
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
    marginBottom: 8,
  },
  channelChip: {
    flex: 1,
    minHeight: 72,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PAGE.border,
    backgroundColor: PAGE.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
  channelChipActive: {
    borderColor: 'rgba(0, 179, 104, 0.7)',
    backgroundColor: 'rgba(0, 179, 104, 0.16)',
  },
  channelChipLocked: {
    opacity: 0.72,
  },
  channelText: {
    ...TEXT.labelSm,
    fontFamily: FONTS.bold,
    color: PAGE.muted,
    fontSize: 11,
  },
  channelTextActive: {
    color: COLORS.white,
  },
  channelTextLocked: {
    color: PAGE.mutedDim,
  },
  soonBadge: {
    marginTop: 2,
    fontSize: 9,
    fontFamily: FONTS.bold,
    color: PAGE.gold,
    letterSpacing: 0.6,
  },
  channelHint: {
    ...TEXT.caption,
    color: PAGE.mutedDim,
    textAlign: 'center',
    marginBottom: 12,
  },
  otpTarget: {
    ...TEXT.caption,
    color: PAGE.muted,
    textAlign: 'center',
    marginBottom: 12,
    marginTop: -4,
  },
  otpTargetEmail: {
    color: PAGE.cyan,
    fontFamily: FONTS.semiBold,
  },
  otpRow: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 8,
    marginBottom: 8,
    minHeight: 54,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: PAGE.border,
    backgroundColor: PAGE.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFilled: {
    borderColor: 'rgba(0, 179, 104, 0.55)',
    backgroundColor: 'rgba(0, 179, 104, 0.14)',
  },
  otpBoxActive: {
    borderColor: PAGE.cyan,
    backgroundColor: 'rgba(79, 209, 197, 0.12)',
  },
  otpDigit: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.white,
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: 28,
  },
  otpHiddenInput: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.02,
    color: 'transparent',
    backgroundColor: 'transparent',
    borderWidth: 0,
    fontSize: 16,
    zIndex: 2,
  },
  otpProgress: {
    ...TEXT.caption,
    color: PAGE.mutedDim,
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: FONTS.semiBold,
    letterSpacing: 1,
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
