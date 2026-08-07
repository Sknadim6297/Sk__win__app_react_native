import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import ScreenLayout from '../components/layout/ScreenLayout';
import { paymentService } from '../services/api';
import { navigateAfterWalletTopup } from '../utils/walletFlow';
import { resolveQrDisplay } from '../utils/resolveQrDisplay';
import { COLORS, FONTS, TEXT } from '../styles/theme';

/**
 * Expo Go–safe Cashfree UPI QR payment.
 * Secrets stay on the Express backend; this screen only talks to our API.
 */
const POLL_MS = 3000;
const STATUS_COPY = {
  CREATING: 'Generating secure QR…',
  PENDING: 'Waiting for UPI payment…',
  SUCCESS: 'Payment successful!',
  FAILED: 'Payment failed',
  CANCELLED: 'Payment cancelled',
  EXPIRED: 'QR code expired',
  ERROR: 'Something went wrong',
};

export default function CashfreeQrPaymentScreen({ navigation, route }) {
  const amount = Number(route.params?.amount || 0);
  const returnToTournamentId = route.params?.returnToTournamentId || null;
  const returnScreen = route.params?.returnScreen || 'TournamentDetails';
  const initialBalance = route.params?.walletBalance;

  const [phase, setPhase] = useState('CREATING');
  const [orderId, setOrderId] = useState(null);
  const [qrPayload, setQrPayload] = useState(null);
  const [qrImageUrl, setQrImageUrl] = useState(null);
  const [expiresIn, setExpiresIn] = useState(0);
  const [balance, setBalance] = useState(initialBalance);
  const [message, setMessage] = useState(STATUS_COPY.CREATING);
  const [errorCode, setErrorCode] = useState(null);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const pollRef = useRef(null);
  const tickRef = useRef(null);
  const doneRef = useRef(false);
  const successScale = useRef(new Animated.Value(0.4)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  const clearTimers = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const playSuccessAnimation = useCallback(() => {
    successScale.setValue(0.4);
    successOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(successScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
  }, [successOpacity, successScale]);

  const finishSuccess = useCallback(
    (res) => {
      if (doneRef.current) return;
      doneRef.current = true;
      clearTimers();
      setPhase('SUCCESS');
      setMessage(res?.message || STATUS_COPY.SUCCESS);
      if (res?.balance != null) setBalance(res.balance);
      playSuccessAnimation();

      setTimeout(() => {
        const returned = navigateAfterWalletTopup(navigation, returnToTournamentId, returnScreen);
        if (!returned) {
          navigation.navigate('MainTabs', { screen: 'WalletTab' });
        }
      }, 1800);
    },
    [clearTimers, navigation, playSuccessAnimation, returnScreen, returnToTournamentId]
  );

  const pollStatus = useCallback(
    async (id, { manual = false } = {}) => {
      if (!id || doneRef.current) return;
      if (manual) setRefreshing(true);
      try {
        const res = await paymentService.getCashfreeStatus(id);
        if (!res?.success && res?.code === 'NETWORK_ERROR') {
          setMessage(res.message || 'Network error. Retrying…');
          return;
        }

        const status = String(res?.status || '').toUpperCase();
        if (status === 'SUCCESS') {
          finishSuccess(res);
          return;
        }
        if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(status)) {
          clearTimers();
          setPhase(status);
          setErrorCode(res?.code || status);
          setMessage(res?.message || STATUS_COPY[status] || STATUS_COPY.FAILED);
          return;
        }
        setPhase('PENDING');
        setMessage(
          manual
            ? 'Still pending — complete payment in your UPI app.'
            : res?.message || STATUS_COPY.PENDING
        );
      } catch (err) {
        setMessage(err.message || 'Network error. Retrying…');
      } finally {
        if (manual) setRefreshing(false);
      }
    },
    [clearTimers, finishSuccess]
  );

  const startPolling = useCallback(
    (id, seconds) => {
      clearTimers();
      setExpiresIn(Math.max(0, Number(seconds) || 0));
      tickRef.current = setInterval(() => {
        setExpiresIn((s) => {
          if (s <= 1) {
            clearTimers();
            setPhase('EXPIRED');
            setMessage(STATUS_COPY.EXPIRED);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
      pollRef.current = setInterval(() => pollStatus(id), POLL_MS);
      pollStatus(id);
    },
    [clearTimers, pollStatus]
  );

  const createQr = useCallback(async () => {
    if (creating) return;
    if (!amount || amount < 10 || amount > 10000) {
      setPhase('ERROR');
      setMessage('Invalid amount. Go back and enter ₹10 – ₹10,000.');
      return;
    }

    doneRef.current = false;
    setCreating(true);
    setPhase('CREATING');
    setMessage(STATUS_COPY.CREATING);
    setErrorCode(null);
    setQrPayload(null);
    setQrImageUrl(null);
    setOrderId(null);

    try {
      const res = await paymentService.createCashfreeQr({ amount });
      if (!res?.success) {
        throw Object.assign(new Error(res?.message || 'Failed to create payment'), {
          code: res?.code,
        });
      }

      setOrderId(res.orderId);
      setQrPayload(res.qrPayload || null);
      setQrImageUrl(res.qrImageUrl || null);
      if (res.walletBalance != null) setBalance(res.walletBalance);
      setPhase('PENDING');
      setMessage(res.message || STATUS_COPY.PENDING);
      startPolling(res.orderId, res.expiresInSeconds || 600);
    } catch (err) {
      clearTimers();
      setPhase('ERROR');
      setErrorCode(err.code || 'ERROR');
      setMessage(err.message || STATUS_COPY.ERROR);
    } finally {
      setCreating(false);
    }
  }, [amount, clearTimers, creating, startPolling]);

  useEffect(() => {
    createQr();
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = async () => {
    if (phase === 'SUCCESS') return;
    clearTimers();
    if (orderId && phase === 'PENDING') {
      try {
        await paymentService.cancelCashfreeOrder(orderId);
      } catch (_) {
        /* ignore */
      }
    }
    navigation.goBack();
  };

  const handleRetry = () => {
    clearTimers();
    createQr();
  };

  const handleRefreshStatus = () => {
    if (!orderId || phase === 'SUCCESS' || creating) return;
    pollStatus(orderId, { manual: true });
  };

  const mm = String(Math.floor(expiresIn / 60)).padStart(2, '0');
  const ss = String(expiresIn % 60).padStart(2, '0');
  const qrDisplay = resolveQrDisplay(qrPayload, qrImageUrl);
  const showQr = phase === 'PENDING' && Boolean(qrDisplay);
  const isTerminal = ['SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED', 'ERROR'].includes(phase);

  return (
    <ScreenLayout edges={['top']} style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} hitSlop={12} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pay with UPI QR</Text>
        {phase === 'PENDING' && orderId ? (
          <TouchableOpacity
            onPress={handleRefreshStatus}
            hitSlop={12}
            style={styles.backBtn}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <MaterialCommunityIcons name="refresh" size={22} color={COLORS.white} />
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Wallet Balance</Text>
          <Text style={styles.balanceValue}>
            ₹{Number(balance ?? 0).toLocaleString('en-IN')}
          </Text>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Paying</Text>
            <Text style={styles.amountValue}>₹{amount.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        <View style={styles.qrCard}>
          {phase === 'CREATING' || creating ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.statusText}>{message}</Text>
            </View>
          ) : null}

          {showQr ? (
            <>
              <Text style={styles.scanTitle}>Scan with any UPI app</Text>
              <View style={styles.qrWrap}>
                {qrDisplay.mode === 'image' ? (
                  <Image source={{ uri: qrDisplay.uri }} style={styles.qrImage} resizeMode="contain" />
                ) : (
                  <QRCode
                    value={qrDisplay.value}
                    size={220}
                    backgroundColor="#FFFFFF"
                    color="#0F172A"
                    ecl="M"
                  />
                )}
              </View>
              <View style={styles.timerRow}>
                <MaterialCommunityIcons name="timer-outline" size={18} color={COLORS.primary} />
                <Text style={styles.timerText}>
                  Expires in {mm}:{ss}
                </Text>
              </View>
              <View style={styles.pendingRow}>
                <ActivityIndicator size="small" color={COLORS.green} />
                <Text style={styles.statusText}>{message}</Text>
              </View>
              {orderId ? <Text style={styles.orderId}>Order: {orderId}</Text> : null}
            </>
          ) : null}

          {phase === 'PENDING' && !qrDisplay && !creating ? (
            <View style={styles.centerBox}>
              <MaterialCommunityIcons name="qrcode-remove" size={48} color={COLORS.error} />
              <Text style={styles.failTitle}>QR unavailable</Text>
              <Text style={styles.statusText}>
                Payment was created but the QR could not be displayed. Tap Retry.
              </Text>
            </View>
          ) : null}

          {phase === 'SUCCESS' ? (
            <Animated.View
              style={[
                styles.centerBox,
                { opacity: successOpacity, transform: [{ scale: successScale }] },
              ]}
            >
              <View style={styles.successIcon}>
                <MaterialCommunityIcons name="check-circle" size={72} color={COLORS.green} />
              </View>
              <Text style={styles.successTitle}>₹{amount} Added</Text>
              <Text style={styles.statusText}>{message}</Text>
              <Text style={styles.statusText}>Returning to wallet…</Text>
            </Animated.View>
          ) : null}

          {isTerminal && phase !== 'SUCCESS' ? (
            <View style={styles.centerBox}>
              <MaterialCommunityIcons
                name={phase === 'CANCELLED' ? 'close-circle' : 'alert-circle'}
                size={56}
                color={COLORS.error}
              />
              <Text style={styles.failTitle}>{STATUS_COPY[phase] || 'Payment issue'}</Text>
              <Text style={styles.statusText}>{message}</Text>
              {errorCode ? <Text style={styles.orderId}>Code: {errorCode}</Text> : null}
              {orderId ? <Text style={styles.orderId}>Order: {orderId}</Text> : null}
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          {phase === 'PENDING' && orderId ? (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleRefreshStatus}
              disabled={refreshing}
              activeOpacity={0.88}
            >
              {refreshing ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.primaryText}>Refresh Status</Text>
              )}
            </TouchableOpacity>
          ) : null}

          {isTerminal && phase !== 'SUCCESS' ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleRetry} activeOpacity={0.88}>
              <Text style={styles.primaryText}>Retry Payment</Text>
            </TouchableOpacity>
          ) : null}

          {phase !== 'SUCCESS' ? (
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleCancel} activeOpacity={0.88}>
              <Text style={styles.secondaryText}>Cancel</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.hint}>
          Expo-safe flow: no Cashfree native SDK. Secrets stay on the server. Wallet updates only
          after backend verification (poll or webhook).
        </Text>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lightGray,
  },
  headerTitle: {
    ...TEXT.h3,
    color: COLORS.white,
    fontFamily: FONTS.bold,
  },
  content: { padding: 16, paddingBottom: 40 },
  balanceCard: {
    backgroundColor: COLORS.surfaceDark,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    marginBottom: 16,
  },
  balanceLabel: { color: COLORS.gray, ...TEXT.caption },
  balanceValue: {
    color: COLORS.white,
    fontSize: 28,
    fontFamily: FONTS.bold,
    marginTop: 4,
  },
  amountRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderDark,
  },
  amountLabel: { color: COLORS.gray, ...TEXT.body },
  amountValue: { color: COLORS.primary, fontSize: 20, fontFamily: FONTS.bold },
  qrCard: {
    backgroundColor: COLORS.surfaceDark,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBox: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  scanTitle: {
    color: COLORS.white,
    ...TEXT.bodyMedium,
    marginBottom: 16,
  },
  qrWrap: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
  },
  qrImage: { width: 220, height: 220 },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },
  timerText: { color: COLORS.primary, ...TEXT.bodyMedium },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  statusText: {
    color: COLORS.gray,
    ...TEXT.caption,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  orderId: {
    color: COLORS.grayDim,
    fontSize: 11,
    marginTop: 10,
    textAlign: 'center',
  },
  successIcon: { marginBottom: 8 },
  successTitle: {
    color: COLORS.green,
    fontSize: 22,
    fontFamily: FONTS.bold,
  },
  failTitle: {
    color: COLORS.error,
    fontSize: 18,
    fontFamily: FONTS.bold,
    marginTop: 8,
  },
  actions: { marginTop: 20, gap: 10 },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: { color: COLORS.white, ...TEXT.button },
  secondaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  secondaryText: { color: COLORS.gray, ...TEXT.body },
  hint: {
    marginTop: 16,
    color: COLORS.grayDim,
    ...TEXT.caption,
    textAlign: 'center',
    lineHeight: 18,
  },
});
